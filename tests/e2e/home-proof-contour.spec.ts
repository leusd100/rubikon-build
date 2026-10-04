import { expect, test, type Locator, type Page } from '@playwright/test';
import { homeProofContour } from '../../app/data/homeProofContour';

// HOME's proof, variant A «Калька» (owner, 04.10): one «Креслення» sheet, the photo left of a seam and its contour —
// the lines measured from the photos — right of it. The seam is a real range input (keys, screen readers); a mouse
// drags anywhere in the frame, a finger only the handle, and on a phone «Фото» / «Контур» show one side whole.
// «Лінії на фото» lays the lines over the photo too. Without motion or JavaScript the sheet stands complete.

const DEFAULT_SPLIT = 64;
const SLIDER = 'Порівняти фото і контур за фото';
const FORBIDDEN = /digital\s*twin|двійник|3\s*d\s*модел|точн|обмір|x-?ray|рентген/i;

async function open(page: Page) {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.addInitScript(() => {
    try {
      localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
    } catch { /* storage unavailable */ }
  });
  await page.goto('/', { waitUntil: 'load' });
  const sheet = page.locator('#real-object .hv2-contour');
  await sheet.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.hv2-contour img')].every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0));
  // With motion the picture is still being plotted in for a second, clipped, and a clipped frame takes no pointer
  await page.waitForFunction(() => {
    const figure = document.querySelector<HTMLElement>('.hv2-contour');
    const image = figure?.querySelector('.sheet-image');
    if (!figure || !image || figure.dataset.sheetState === 'armed') return false;
    return image.getAnimations().every((animation) => animation.playState === 'finished');
  });
  return { sheet, stage: sheet.locator('.hv2-contour-stage'), slider: sheet.getByRole('slider', { name: SLIDER }) };
}

/** A screenshot of the region once two in a row agree (the photo may still be painting after it has loaded) */
async function steadyShot(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  let previous = await page.screenshot({ clip });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.waitForTimeout(150);
    const next = await page.screenshot({ clip });
    if (next.equals(previous)) return next;
    previous = next;
  }
  return previous;
}

/** Where the seam stands, in per cent of the frame */
async function seamAt(stage: Locator) {
  return stage.evaluate((element) => {
    const frame = element.getBoundingClientRect();
    const seam = element.querySelector('.hv2-contour-seam')!.getBoundingClientRect();
    return ((seam.left + seam.width / 2 - frame.left) / frame.width) * 100;
  });
}

async function expectSplit(slider: Locator, stage: Locator, value: number) {
  await expect(slider).toHaveValue(String(value));
  await expect.poll(() => seamAt(stage)).toBeCloseTo(value, 0);
}

test('the sheet names both sides, states the retouch and the legend, and carries every measured line', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage } = await open(page);
  const stamp = sheet.locator('figcaption');
  for (const words of ['Ліворуч', 'Фото об’єкта', 'Праворуч', 'Контур за фото', 'виміряно', 'наближено', 'Реальний об’єкт і його контур.', 'Фото з ретушшю переднього плану']) {
    await expect(stamp).toContainText(words);
  }
  await expect(stamp.locator('.sheet-cell-note')).toContainText('за вісьмома фото цього ангара');
  await expect(stamp.locator('.sheet-cell-note')).toContainText('розміри, масштаб і каркас із фото не прочитати');
  await expect(stage.locator('picture img').first()).toHaveAttribute('src', homeProofContour.photo.src);

  // The lines: one per record, the approximate ones dashed, each with its words, in the photo's own pixels
  const lines = stage.locator('svg.hv2-contour-lines .hv2-contour-ink path');
  await expect(lines).toHaveCount(homeProofContour.lines.length);
  expect(await lines.evaluateAll((paths) => paths.map((path) => path.getAttribute('data-line')))).toEqual(homeProofContour.lines.map((line) => line.id));
  await expect(stage.locator('.hv2-contour-ink path[data-approximate]')).toHaveCount(homeProofContour.lines.filter((line) => line.approximate).length);
  for (const path of await stage.locator('.hv2-contour-ink path[data-approximate]').all()) {
    expect(await path.evaluate((element) => getComputedStyle(element).strokeDasharray)).toMatch(/^[\d.]+px,? [\d.]+px$/);
  }
  await expect(stage.locator('svg.hv2-contour-lines')).toHaveAttribute('viewBox', `0 0 ${homeProofContour.photo.width} ${homeProofContour.photo.height}`);
  await expect(stage.locator('svg.hv2-contour-lines')).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');

  // No figures anywhere in the sheet, not even in the lines' titles, and none of the words that claim more than a photo
  expect(await sheet.evaluate((element) => element.textContent)).not.toMatch(/\d/);
  expect(await sheet.innerText()).not.toMatch(FORBIDDEN);
  expect(await page.locator('#real-object').evaluate((element) => element.textContent)).not.toMatch(FORBIDDEN);
});

test('the seam rests between the gates, and nothing of the contour lies over the photo until asked', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, slider } = await open(page);
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  // The seam sits right of the left gate and left of the right one, on the photo's own pixels
  const [gateLeft, gateRight] = homeProofContour.lines.filter((line) => line.kind === 'gate');
  const rightmost = Math.max(...gateLeft.points.map(([x]) => x)) / homeProofContour.photo.width * 100;
  const leftmost = Math.min(...gateRight.points.map(([x]) => x)) / homeProofContour.photo.width * 100;
  expect(DEFAULT_SPLIT).toBeGreaterThan(rightmost);
  expect(DEFAULT_SPLIT).toBeLessThan(leftmost);

  // Pixels of the photo side (clear of the seam and its handle) are the same with and without the lines layer…
  const frame = (await stage.boundingBox())!;
  const photoSide = { x: frame.x + 1, y: frame.y + 1, width: frame.width * (DEFAULT_SPLIT / 100) - 30, height: frame.height - 2 };
  const lines = stage.locator('svg.hv2-contour-lines');
  const withLines = await steadyShot(page, photoSide);
  await lines.evaluate((element) => { (element as SVGElement).style.visibility = 'hidden'; });
  const withoutLines = await steadyShot(page, photoSide);
  expect(withLines.equals(withoutLines)).toBe(true);
  // …and differ once «Лінії на фото» lays them over the photo (so the comparison can see a line)
  await lines.evaluate((element) => { (element as SVGElement).style.visibility = ''; });
  const toggle = page.locator('#real-object').getByRole('button', { name: 'Лінії на фото', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => lines.evaluate((element) => getComputedStyle(element).clipPath)).toMatch(/^inset\(0px\)$|^none$/);
  expect((await steadyShot(page, photoSide)).equals(withoutLines)).toBe(false);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => lines.evaluate((element) => getComputedStyle(element).clipPath)).toContain(`${DEFAULT_SPLIT}%`);
});

test('the keys move the seam: arrows by one, PageUp / PageDown by ten, Home and End to the edges', async ({ page }) => {
  const { stage, slider } = await open(page);
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expectSplit(slider, stage, 65);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expectSplit(slider, stage, 63);
  await page.keyboard.press('PageUp');
  await expectSplit(slider, stage, 73);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  await expectSplit(slider, stage, 53);
  await page.keyboard.press('Home');
  await expectSplit(slider, stage, 0);
  await page.keyboard.press('End');
  await expectSplit(slider, stage, 100);
  // The focus shows on the handle, the input itself being invisible
  expect(await stage.locator('.hv2-contour-handle').evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
});

test('a mouse drags anywhere in the frame; a finger scrolls the page there and drags only the handle', async ({ page }, testInfo) => {
  const { stage, slider } = await open(page);
  expect(await stage.evaluate((element) => getComputedStyle(element).touchAction)).toBe('pan-y');
  expect(await stage.locator('.hv2-contour-handle').evaluate((element) => getComputedStyle(element).touchAction)).toBe('none');
  const frame = (await stage.boundingBox())!;
  const y = frame.y + frame.height * 0.25;

  if (testInfo.project.name === 'desktop-chromium') {
    await page.mouse.move(frame.x + frame.width * 0.3, y);
    await page.mouse.down();
    await page.mouse.move(frame.x + frame.width * 0.8, y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => seamAt(stage)).toBeCloseTo(80, 0);
    await expect(slider).toHaveValue('80');
    return;
  }

  // A tap on the photo is a scroll's start, not a seam move
  await page.touchscreen.tap(frame.x + frame.width * 0.2, y);
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  // The handle follows the finger, from where it was grabbed
  const handle = (await stage.locator('.hv2-contour-handle').boundingBox())!;
  const from = { x: handle.x + handle.width / 2 + 6, y: handle.y + handle.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let step = 1; step <= 8; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x - (frame.width * 0.34 * step) / 8, y: from.y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => seamAt(stage)).toBeCloseTo(30, 0);
});

test('on a phone «Фото» and «Контур» show one side whole, and bring the seam back when pressed again', async ({ page }, testInfo) => {
  const { sheet, stage, slider } = await open(page);
  const photo = sheet.getByRole('button', { name: 'Фото', exact: true });
  const contour = sheet.getByRole('button', { name: 'Контур', exact: true });
  if (testInfo.project.name === 'desktop-chromium') {
    // A mouse has the whole frame to drag; the two buttons are for fingers
    await expect(photo).toBeHidden();
    await expect(contour).toBeHidden();
    return;
  }
  await expect(photo).toHaveAttribute('aria-pressed', 'false');
  await photo.click();
  await expect(photo).toHaveAttribute('aria-pressed', 'true');
  await expectSplit(slider, stage, 100);
  await contour.click();
  await expect(contour).toHaveAttribute('aria-pressed', 'true');
  await expect(photo).toHaveAttribute('aria-pressed', 'false');
  await expectSplit(slider, stage, 0);
  await contour.click();
  await expect(contour).toHaveAttribute('aria-pressed', 'false');
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  for (const button of [photo, contour, sheet.getByRole('button', { name: 'Лінії на фото', exact: true })]) {
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('arriving with motion, the lines draw once after the sheet, then stand complete', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.goto('/', { waitUntil: 'load' });
  const sheet = page.locator('#real-object .hv2-contour');
  const solid = sheet.locator('.hv2-contour-ink path:not([data-approximate])').first();
  const dashed = sheet.locator('.hv2-contour-ink path[data-approximate]').first();
  // Armed below the fold: the lines wait, hidden
  await expect(sheet).toHaveAttribute('data-sheet-state', 'armed');
  expect(await solid.evaluate((element) => getComputedStyle(element).strokeDashoffset)).toMatch(/^1(px)?$/);
  expect(await dashed.evaluate((element) => getComputedStyle(element).opacity)).toBe('0');
  await sheet.scrollIntoViewIfNeeded();
  await expect(sheet).toHaveAttribute('data-sheet-state', 'on');
  await expect.poll(() => sheet.locator('.hv2-contour-lines path').evaluateAll((paths) => paths.flatMap((path) => path.getAnimations()).filter((animation) => animation.playState !== 'finished').length), { timeout: 10_000 }).toBe(0);
  expect(await solid.evaluate((element) => getComputedStyle(element).strokeDashoffset)).toMatch(/^0(px)?$/);
  expect(await dashed.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
});

test('with reduced motion the sheet stands static and complete at its resting split', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider } = await open(page);
  await expect(sheet).not.toHaveAttribute('data-sheet-state', /.+/);
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  const paths = sheet.locator('.hv2-contour-lines path');
  expect(await paths.evaluateAll((elements) => elements.flatMap((element) => element.getAnimations()).length)).toBe(0);
  expect(await paths.evaluateAll((elements) => elements.filter((element) => {
    const style = getComputedStyle(element);
    return !/^0(px)?$/.test(style.strokeDashoffset) || style.opacity !== '1';
  }).length)).toBe(0);
  // The seam and the lines do not glide (the site's reduced-motion rule leaves a hundredth of a millisecond at most)
  for (const part of ['svg.hv2-contour-lines', '.hv2-contour-trace', '.hv2-contour-seam', '.hv2-contour-handle']) {
    expect(await stage.locator(part).evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration)), part).toBeLessThanOrEqual(0.0001);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the sheet is complete at its resting split: photo, tracing, every line', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const stage = page.locator('#real-object .hv2-contour-stage');
    await stage.scrollIntoViewIfNeeded();
    await expect(page.locator('#real-object .hv2-contour')).not.toHaveAttribute('data-sheet-state', /.+/);
    await expect.poll(() => seamAt(stage)).toBeCloseTo(DEFAULT_SPLIT, 0);
    await expect(stage.locator('.hv2-contour-ink path')).toHaveCount(homeProofContour.lines.length);
    await expect(stage.locator('picture img')).toHaveCount(2);
    await expect(stage.locator('picture img').first()).toBeVisible();
    expect(await stage.locator('.hv2-contour-trace').evaluate((element) => getComputedStyle(element).clipPath)).toContain(`${DEFAULT_SPLIT}%`);
  });
});

test('no horizontal overflow at 320 px, and the title block keeps every word whole inside its cell', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const { sheet } = await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const box = (await sheet.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  const overflowing = await sheet.locator('figcaption, figcaption .sheet-cell, figcaption .sheet-cell b, figcaption .sheet-action, figcaption button').evaluateAll((elements) =>
    elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent));
  expect(overflowing).toEqual([]);
});
