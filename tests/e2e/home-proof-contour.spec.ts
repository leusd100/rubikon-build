import { expect, test, type Locator, type Page } from '@playwright/test';
import { homeProofContour } from '../../app/data/homeProofContour';
import { homeProofFrame } from '../../app/data/homeProofFrame';
import { homeProofMeasures } from '../../app/data/homeProofMeasures';

// HOME's proof (owner, 04.10): one «Креслення» sheet, the photo left of a seam and right of it its tracing with one of
// three layers chosen in the title block — «Контур» (the lines and figures measured from the photos), «Каркас» (the
// default: a SCHEME of a frame of this object's type in its silhouette, labelled so) and «Навантаження» (the snow's way
// through that scheme). The seam is a real range input (keys, screen readers); a mouse drags anywhere in the frame, a
// finger only the handle, and on a phone «Фото» / «Схема» show one side whole. «Контур на фото» lays the measured lines
// — and only those — over the photo too. Arriving with motion, the scheme builds and the seam glides once; without
// motion or JavaScript the sheet stands complete. On a laptop the whole sheet fits under the header.

const DEFAULT_SPLIT = 62;
const SLIDER = /^Порівняти фото й (?:схему|контур за фото|ескіз)$/;
// Words that claim more than a photo and a scheme can give. «Не креслення цього ангара» — the scheme saying what it is
// not — stays allowed by the look-behind.
const FORBIDDEN = /digital\s*twin|двійник|3\s*d\b|тривимір|модел|точн|обмір|x-?ray|рентген|(?<!не\s)креслення\s+(?:цього|ангара)|конструкція цього ангара|паспорт|load\s*path|explorer|наш каркас/i;
// No length, area, mass or level anywhere on the sheet: the photos give no scale
const UNITS = /\d\s*(?:мм|см|м|км|м²|кг|т)(?![а-яіїєґʼ’])|метр|відмітк|[+−]\d|\d\.\d/iu;
const COPPER = 'rgb(204, 132, 85)';

async function open(page: Page, path = '/') {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.addInitScript(() => {
    try {
      localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
    } catch { /* storage unavailable */ }
  });
  await page.goto(path, { waitUntil: 'load' });
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
  const slider = sheet.getByRole('slider', { name: SLIDER });
  // The controls come alive with hydration
  await expect(slider).toBeEnabled();
  return { sheet, stage: sheet.locator('.hv2-contour-stage'), slider, layers: sheet.getByRole('group', { name: 'Що показати праворуч' }) };
}

/** The keyboard's focus ring, drawn on the handle's disc */
const ringOf = (stage: Locator) => stage.locator('.hv2-contour-handle').evaluate((element) => getComputedStyle(element, '::before').outlineStyle);

async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 10) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let step = 1; step <= steps; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + ((to.x - from.x) * step) / steps, y: from.y + ((to.y - from.y) * step) / steps }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
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

/** Moves the seam by the keys (they work the same on every project) */
async function splitTo(page: Page, slider: Locator, value: number) {
  await slider.focus();
  await page.keyboard.press('Home');
  for (let step = 0; step < Math.floor(value / 10); step += 1) await page.keyboard.press('PageUp');
  for (let step = 0; step < value % 10; step += 1) await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue(String(value));
}

test('the sheet names both sides, states the retouch and what the scheme is, and carries every measured line', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, layers } = await open(page);
  const stamp = sheet.locator('figcaption');
  for (const words of ['Ліворуч', 'Фото об’єкта', 'Праворуч', 'виміряно', 'наближено', 'схема', 'Реальний об’єкт: фото, виміри, схема.', 'Фото з ретушшю переднього плану']) {
    await expect(stamp).toContainText(words);
  }
  const note = stamp.locator('.sheet-cell-note');
  for (const words of ['за вісьмома фото цього ангара', 'без масштабу', 'Креслень саме цього ангара в нас немає', 'схемою', 'такого типу, як на цьому об’єкті', 'без розмірів']) {
    await expect(note).toContainText(words);
  }
  // The layers: «Каркас» is the default, and the frame says what its right side is — a scheme, without sizes
  await expect(layers.getByRole('button')).toHaveText(['Контур', 'Каркас', 'Навантаження']);
  await expect(layers.getByRole('button', { name: 'Каркас' })).toHaveAttribute('aria-pressed', 'true');
  await expect(stage.locator('.hv2-contour-stamp')).toHaveText(/Схема · без розмірів\s*каркас такого типу, як на цьому об’єкті/);
  await expect(stage.locator('.hv2-contour-canvas > picture img')).toHaveAttribute('src', homeProofContour.photo.src);

  // The lines: one per record, the approximate ones dashed, each with its words, in the photo's own pixels
  const lines = stage.locator('svg.hv2-contour-lines .hv2-contour-ink path');
  await expect(lines).toHaveCount(homeProofContour.lines.length);
  expect(await lines.evaluateAll((paths) => paths.map((path) => path.getAttribute('data-line')))).toEqual(homeProofContour.lines.map((line) => line.id));
  await expect(stage.locator('.hv2-contour-ink path[data-approximate]')).toHaveCount(homeProofContour.lines.filter((line) => line.approximate).length);
  for (const path of await stage.locator('.hv2-contour-ink path[data-approximate]').all()) {
    expect(await path.evaluate((element) => getComputedStyle(element).strokeDasharray)).toMatch(/^[\d.]+px,? [\d.]+px$/);
  }
  for (const svg of ['svg.hv2-contour-lines', 'svg.hv2-proof-frame', 'svg.hv2-proof-marks']) {
    await expect(stage.locator(svg)).toHaveAttribute('viewBox', `0 0 ${homeProofContour.photo.width} ${homeProofContour.photo.height}`);
  }
  // Under role="img" the lines' own titles reach no one: the accessible names say which lines are approximate, and
  // what the scheme is and is not
  await expect(stage.getByRole('img', { name: homeProofContour.label })).toBeVisible();
  await expect(stage.getByRole('img', { name: homeProofFrame.label })).toBeVisible();
  // …and the figures, drawn for the eye, are a list for a screen reader
  await expect(stage.getByRole('list', { name: 'Виміряно за фото, без масштабу' }).getByRole('listitem')).toHaveText(homeProofMeasures.map((measure) => measure.spoken));

  // Figures only where something was measured, each with its sign; never a size; none of the words that claim more
  const text = await sheet.evaluate((element) => element.textContent ?? '');
  const outsideMeasures = await sheet.evaluate((element) => {
    const copy = element.cloneNode(true) as HTMLElement;
    for (const measure of copy.querySelectorAll('[data-measure]')) measure.remove();
    return copy.textContent ?? '';
  });
  expect(outsideMeasures).not.toMatch(/\d/);
  for (const figure of await sheet.locator('[data-measure]').allTextContents()) {
    for (const match of figure.matchAll(/\d+(?:,\d+)?/g)) expect(figure.slice(0, match.index), figure).toMatch(/(?:[≈±<] |приблизно |похибка |менше )$/);
  }
  expect(text).not.toMatch(UNITS);
  expect(homeProofContour.label).not.toMatch(/\d/);
  expect(homeProofFrame.label).not.toMatch(/\d/);
  await expect(stage.getByRole('slider', { name: SLIDER })).toHaveAttribute('aria-valuetext', 'Фото ліворуч, схема праворуч: більше фото');
  for (const words of [await sheet.innerText(), text, homeProofFrame.label, await page.locator('#real-object').evaluate((element) => element.textContent ?? '')]) {
    expect(words).not.toMatch(FORBIDDEN);
  }
});

test('the scheme is its own layer: paper-white, never dashed as «approximate», never copper, and always under its stamp', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, slider } = await open(page);
  const scheme = stage.locator('svg.hv2-proof-frame[data-layer="scheme"]');
  await expect(scheme).toBeVisible();
  // Every member of the scheme is in it, none of them carries the measured lines' «approximate» mark, and none is drawn
  // in the measured copper: the legend's «суцільна — виміряно» cannot be read onto it
  await expect(scheme.locator('[data-group]')).toHaveCount(homeProofFrame.members.filter((member) => member.group !== 'footing').length);
  await expect(scheme.locator('[data-approximate]')).toHaveCount(0);
  await expect(stage.locator('.hv2-contour-lines [data-group]')).toHaveCount(0);
  const strokes = new Set(await scheme.locator('.hv2-proof-scheme [data-group]').evaluateAll((paths) => paths.map((path) => getComputedStyle(path).stroke)));
  expect([...strokes]).toEqual(['rgb(237, 232, 222)']);
  expect(await stage.locator('.hv2-contour-ink path').first().evaluate((path) => getComputedStyle(path).stroke)).toBe(COPPER);
  // Its names are words on the scheme, its legend says «схема» in the scheme's own colour
  for (const tag of homeProofFrame.tags) await expect(stage.locator(`.hv2-proof-tag[data-tag="${tag.id}"]`)).toHaveText(tag.text);
  await expect(page.locator('#real-object .hv2-contour-legend [data-key="scheme"]')).toBeVisible();

  // Wherever the seam stands, if a pixel of the scheme shows, its stamp shows whole inside the frame
  const frame = (await stage.boundingBox())!;
  for (const value of [0, 30, DEFAULT_SPLIT, 90, 99]) {
    await splitTo(page, slider, value);
    const box = (await stage.locator('.hv2-contour-stamp').boundingBox())!;
    await expect(stage.locator('.hv2-contour-stamp'), `${value}`).toBeVisible();
    expect(box.x, `${value}`).toBeGreaterThanOrEqual(frame.x);
    expect(box.x + box.width, `${value}`).toBeLessThanOrEqual(frame.x + frame.width);
    expect(box.y, `${value}`).toBeGreaterThanOrEqual(frame.y);
  }
  // Only the photo: no scheme, no stamp
  await splitTo(page, slider, 100);
  await expect(stage.locator('.hv2-contour-stamp')).toBeHidden();
});

test('the seam rests between the gates, and nothing of the right side lies over the photo — the contour only when asked', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { stage, slider } = await open(page);
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  // The seam sits right of the left gate and left of the right one, on the photo's own pixels
  const [gateLeft, gateRight] = homeProofContour.lines.filter((line) => line.kind === 'gate');
  const rightmost = Math.max(...gateLeft.points.map(([x]) => x)) / homeProofContour.photo.width * 100;
  const leftmost = Math.min(...gateRight.points.map(([x]) => x)) / homeProofContour.photo.width * 100;
  expect(DEFAULT_SPLIT).toBeGreaterThan(rightmost);
  expect(DEFAULT_SPLIT).toBeLessThan(leftmost);

  // Pixels of the photo side (clear of the seam, its handle and the seam's names) are the same with and without every
  // layer of the right side: the scheme, the lines, the figures and the names…
  const frame = (await stage.boundingBox())!;
  const photoSide = { x: frame.x + 1, y: frame.y + 40, width: frame.width * (DEFAULT_SPLIT / 100) - 30, height: frame.height - 41 };
  const layers = stage.locator('.hv2-contour-canvas > :is(svg, .hv2-proof-labels)');
  const hide = (hidden: boolean) => layers.evaluateAll((elements, value) => { for (const element of elements) (element as HTMLElement).style.visibility = value ? 'hidden' : ''; }, hidden);
  const withLayers = await steadyShot(page, photoSide);
  await hide(true);
  const withoutLayers = await steadyShot(page, photoSide);
  expect(withLayers.equals(withoutLayers)).toBe(true);
  await hide(false);

  // …and differ once «Контур на фото» lays the measured lines over the photo (so the comparison can see a line) —
  // the lines only: with them on, the photo side is the same with and without the scheme
  const toggle = page.locator('#real-object').getByRole('button', { name: 'Контур на фото', exact: true });
  const lines = stage.locator('svg.hv2-contour-lines');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => lines.evaluate((element) => getComputedStyle(element).clipPath)).toMatch(/^inset\(0px\)$|^none$/);
  const linesOnPhoto = await steadyShot(page, photoSide);
  expect(linesOnPhoto.equals(withoutLayers)).toBe(false);
  await stage.locator('svg.hv2-proof-frame').evaluate((element) => { (element as SVGElement).style.visibility = 'hidden'; });
  expect((await steadyShot(page, photoSide)).equals(linesOnPhoto)).toBe(true);
  await stage.locator('svg.hv2-proof-frame').evaluate((element) => { (element as SVGElement).style.visibility = ''; });
  expect(await stage.locator('svg.hv2-proof-frame').evaluate((element) => getComputedStyle(element).clipPath)).toContain(`${DEFAULT_SPLIT}%`);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => lines.evaluate((element) => getComputedStyle(element).clipPath)).toContain(`${DEFAULT_SPLIT}%`);
});

test('the title block switches the right side: the contour with its figures, the scheme with its names, the load link by link', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider, layers } = await open(page);
  const desktop = (await page.viewportSize())!.width > 760;
  const figure = (id: string) => stage.locator(`.hv2-proof-measure[data-measure="${id}"]`);
  const pressed = async (name: string) => {
    for (const button of await layers.getByRole('button').all()) {
      await expect(button).toHaveAttribute('aria-pressed', String((await button.textContent()) === name));
    }
  };

  // «Каркас»: the scheme, its names, the three figures' titles; the load waits
  await expect(stage.locator('.hv2-proof-scheme')).toBeVisible();
  await expect(stage.locator('.hv2-proof-load')).toBeHidden();
  if (desktop) {
    for (const id of ['slope', 'ridge', 'gates']) await expect(figure(id)).toBeVisible();
    await expect(figure('proportion')).toBeHidden();
    await expect(figure('slope').locator('small')).toBeHidden();
    await expect(stage.locator('.hv2-proof-tag')).toHaveCount(homeProofFrame.tags.length);
    for (const tag of await stage.locator('.hv2-proof-tag').all()) await expect(tag).toBeVisible();
    await expect(stage.locator('.hv2-contour-seamtags > span').nth(1)).toHaveText('Схема ›');
  } else {
    // A phone: no words inside the frame — the figures are chips under the note
    await expect(stage.locator('.hv2-proof-labels')).toBeHidden();
    await expect(sheet.locator('.hv2-contour-chips > span')).toHaveText(['Схил ≈ 10,5°', 'Гребінь посередині', 'Ворота однакові']);
  }

  // «Контур»: no scheme; every figure with the line under it
  await layers.getByRole('button', { name: 'Контур' }).click();
  await pressed('Контур');
  await expect(stage.locator('.hv2-proof-scheme')).toBeHidden();
  await expect(stage.locator('.hv2-contour-stamp')).toHaveText(/Виміряно за фото\s*без масштабу/);
  await expect(slider).toHaveAccessibleName('Порівняти фото й контур за фото');
  await expect(slider).toHaveAttribute('aria-valuetext', 'Фото ліворуч, контур за фото праворуч: більше фото');
  if (desktop) {
    for (const measure of homeProofMeasures) {
      await expect(figure(measure.id)).toBeVisible();
      await expect(figure(measure.id)).toHaveText(`${measure.title}${measure.detail}`);
    }
    await expect(stage.locator('.hv2-proof-tag').first()).toBeHidden();
    await expect(stage.locator('.hv2-contour-seamtags > span').nth(1)).toHaveText('Контур ›');
  } else {
    await expect(sheet.getByRole('button', { name: 'Контур', exact: true }).last()).toBeVisible();
  }

  // «Навантаження»: the scheme stepped back, the snow's way lit, its chain in words
  await layers.getByRole('button', { name: 'Навантаження' }).click();
  await pressed('Навантаження');
  await expect(stage.locator('.hv2-proof-load')).toBeVisible();
  expect(Number(await stage.locator('.hv2-proof-scheme').evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(0.6);
  await expect(stage.locator('.hv2-proof-flow')).toHaveCount(3);
  await expect(stage.locator('.hv2-proof-snow path')).toHaveCount(homeProofFrame.load.arrows.length);
  await expect(figure('slope')).toBeHidden();
  const chain = 'Сніг → покрівля → прогони → ферма → стіни й середня опора → фундаменти → ґрунт';
  if (desktop) {
    await expect(stage.locator('.hv2-contour-chain')).toBeVisible();
    await expect(stage.locator('.hv2-contour-chain > span')).toHaveText(chain.split(' → '));
  } else {
    await expect(sheet.locator('.hv2-contour-chain-text')).toHaveText(chain);
    // its way down the frame wants the wider right side
    await expectSplit(slider, stage, 40);
  }
  // With reduced motion the way stands lit, nothing running
  expect(await stage.locator('.hv2-proof-load').evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);

  // And back: the default layer, the seam where the visitor left it
  await layers.getByRole('button', { name: 'Каркас' }).click();
  await pressed('Каркас');
  await expect(stage.locator('.hv2-proof-load')).toBeHidden();
});

test('the keys move the seam: arrows by one, PageUp / PageDown by ten, Home and End to the edges', async ({ page }) => {
  const { stage, slider } = await open(page);
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expectSplit(slider, stage, DEFAULT_SPLIT + 1);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expectSplit(slider, stage, DEFAULT_SPLIT - 1);
  await page.keyboard.press('PageUp');
  await expectSplit(slider, stage, DEFAULT_SPLIT + 9);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  await expectSplit(slider, stage, DEFAULT_SPLIT - 11);
  await page.keyboard.press('Home');
  await expectSplit(slider, stage, 0);
  await expect(slider).toHaveAttribute('aria-valuetext', 'Лише схема');
  await page.keyboard.press('End');
  await expectSplit(slider, stage, 100);
  await expect(slider).toHaveAttribute('aria-valuetext', 'Лише фото');
  // The focus shows on the handle, the input itself being invisible
  expect(await ringOf(stage)).toBe('solid');
});

test('a mouse drags anywhere in the frame; a finger scrolls and zooms the page there and drags only the handle', async ({ page }, testInfo) => {
  const { stage, slider } = await open(page);
  // Pinch-zoom stays the page's everywhere in the frame, the handle too: the photo is what a visitor zooms into
  expect(await stage.evaluate((element) => getComputedStyle(element).touchAction)).toBe('pan-y pinch-zoom');
  expect(await stage.locator('.hv2-contour-handle').evaluate((element) => getComputedStyle(element).touchAction)).toBe('pan-y pinch-zoom');
  const frame = (await stage.boundingBox())!;
  const y = frame.y + frame.height * 0.25;

  if (testInfo.project.name === 'desktop-chromium') {
    // The handle says «drag me» under a mouse: a grab cursor, a heavier disc
    expect(await stage.evaluate((element) => getComputedStyle(element).cursor)).toBe('ew-resize');
    const handle = stage.locator('.hv2-contour-handle');
    expect(await handle.evaluate((element) => getComputedStyle(element).cursor)).toBe('grab');
    await handle.hover();
    await expect.poll(() => handle.evaluate((element) => getComputedStyle(element, '::before').borderTopWidth)).toBe('3px');

    await page.mouse.move(frame.x + frame.width * 0.3, y);
    await page.mouse.down();
    await page.mouse.move(frame.x + frame.width * 0.8, y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => seamAt(stage)).toBeCloseTo(80, 0);
    await expect(slider).toHaveValue('80');
    // The mouse put the focus on the range, but the keyboard's ring waits for a key
    await expect(slider).toBeFocused();
    expect(await ringOf(stage)).toBe('none');
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveValue('81');
    expect(await ringOf(stage)).toBe('solid');
    return;
  }

  // A tap on the photo is a scroll's start, not a seam move
  await page.touchscreen.tap(frame.x + frame.width * 0.2, y);
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  // The handle follows the finger, from where it was grabbed
  const handle = (await stage.locator('.hv2-contour-handle').boundingBox())!;
  const from = { x: handle.x + handle.width / 2 + 6, y: handle.y + handle.height / 2 };
  await touchDrag(page, from, { x: from.x - frame.width * 0.32, y: from.y });
  await expect.poll(() => seamAt(stage)).toBeCloseTo(30, 0);
  expect(await ringOf(stage)).toBe('none');

  // A vertical swipe that starts on the handle scrolls the page and leaves the seam alone
  const grip = (await stage.locator('.hv2-contour-handle').boundingBox())!;
  const before = { scroll: await page.evaluate(() => window.scrollY), split: await slider.inputValue() };
  const start = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
  await touchDrag(page, start, { x: start.x, y: start.y - 140 });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before.scroll + 40);
  await expect(slider).toHaveValue(before.split);
});

test('grabbed at either end of the frame, the handle stays under the finger', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', '«Фото», «Схема» and the finger are the phone\'s');
  // Without the glide, so the handle is measured where it rests
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider } = await open(page);
  const handle = stage.locator('.hv2-contour-handle');
  for (const [side, edge, move] of [['Схема', 0, 120], ['Фото', 100, -120]] as const) {
    await sheet.getByRole('button', { name: side, exact: true }).click();
    await expectSplit(slider, stage, edge);
    // The buttons sit under the frame: bring the frame back clear of the sticky header
    await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    const frame = (await stage.boundingBox())!;
    // At the edge the handle is held clear of the frame, off the seam: the finger takes it where it is drawn
    const grip = (await handle.boundingBox())!;
    const from = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
    const to = { x: from.x + move, y: from.y };
    await touchDrag(page, from, to);
    const centre = async () => { const box = (await handle.boundingBox())!; return box.x + box.width / 2; };
    await expect.poll(async () => Math.abs((await centre()) - to.x), { message: side }).toBeLessThanOrEqual(2);
    await expect.poll(() => seamAt(stage)).toBeCloseTo(((to.x - frame.x) / frame.width) * 100, 0);
  }
});

test('on a phone the handle rests under the gable, clear of both gates and the base line', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'a phone\'s frame');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [412, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const { stage, slider } = await open(page);
    await expectSplit(slider, stage, DEFAULT_SPLIT);
    // The gates' corners and jambs next to the seam, and where the base line crosses it, in the photo's own pixels
    const [gateLeft, gateRight] = homeProofContour.lines.filter((line) => line.kind === 'gate');
    const base = homeProofContour.lines.find((line) => line.id === 'gable-base')!.points;
    const seamX = (DEFAULT_SPLIT / 100) * homeProofContour.photo.width;
    const baseY = base[0][1] + ((base[1][1] - base[0][1]) * (seamX - base[0][0])) / (base[1][0] - base[0][0]);
    const marks = [...gateLeft.points.slice(1), ...gateRight.points.slice(0, 2), [seamX, baseY] as const];
    const covered = await stage.evaluate((element, points) => {
      const svg = element.querySelector<SVGSVGElement>('svg.hv2-contour-lines')!;
      const ctm = svg.getScreenCTM()!;
      const handle = element.querySelector('.hv2-contour-handle')!;
      const disc = handle.getBoundingClientRect();
      const style = getComputedStyle(handle, '::before');
      // The disc as drawn: the handle's box less the pseudo-element's insets
      const left = disc.left + parseFloat(style.left), right = disc.right - parseFloat(style.right);
      const bottom = disc.bottom - parseFloat(style.bottom), top = bottom - parseFloat(style.height);
      const cx = (left + right) / 2, cy = (top + bottom) / 2, radius = (right - left) / 2;
      // A line's own width counts: its casing is about three CSS pixels across
      return points.filter(([x, y]) => Math.hypot(ctm.a * x + ctm.e - cx, ctm.d * y + ctm.f - cy) < radius + 2);
    }, marks);
    expect(covered, `${width}`).toEqual([]);
  }
});

test('on a phone «Фото» and «Схема» show one side whole, and bring the seam back when pressed again', async ({ page }, testInfo) => {
  const { sheet, stage, slider } = await open(page);
  const photo = sheet.getByRole('button', { name: 'Фото', exact: true });
  const scheme = sheet.getByRole('button', { name: 'Схема', exact: true });
  if (testInfo.project.name === 'desktop-chromium') {
    // A mouse has the whole frame to drag; the two buttons are for fingers
    await expect(photo).toBeHidden();
    await expect(scheme).toBeHidden();
    return;
  }
  await expect(photo).toHaveAttribute('aria-pressed', 'false');
  await photo.click();
  await expect(photo).toHaveAttribute('aria-pressed', 'true');
  await expectSplit(slider, stage, 100);
  await scheme.click();
  await expect(scheme).toHaveAttribute('aria-pressed', 'true');
  await expect(photo).toHaveAttribute('aria-pressed', 'false');
  await expectSplit(slider, stage, 0);
  await scheme.click();
  await expect(scheme).toHaveAttribute('aria-pressed', 'false');
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  for (const button of [photo, scheme, sheet.getByRole('button', { name: 'Контур на фото', exact: true }), ...await sheet.getByRole('group', { name: 'Що показати праворуч' }).getByRole('button').all()]) {
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('arriving with motion, the lines draw, the scheme builds, and the seam glides once left and back', async ({ page }) => {
  test.setTimeout(45_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.goto('/', { waitUntil: 'load' });
  const sheet = page.locator('#real-object .hv2-contour');
  const stage = sheet.locator('.hv2-contour-stage');
  const solid = sheet.locator('.hv2-contour-ink path:not([data-approximate])').first();
  const dashed = sheet.locator('.hv2-contour-ink path[data-approximate]').first();
  const truss = sheet.locator('.hv2-proof-scheme [data-group="truss"]').first();
  // Armed below the fold: the lines and the scheme wait, hidden
  await expect(sheet).toHaveAttribute('data-sheet-state', 'armed');
  expect(await solid.evaluate((element) => getComputedStyle(element).strokeDashoffset)).toMatch(/^1(px)?$/);
  expect(await dashed.evaluate((element) => getComputedStyle(element).opacity)).toBe('0');
  expect(await truss.evaluate((element) => getComputedStyle(element).strokeDashoffset)).toMatch(/^1(px)?$/);
  await page.evaluate(() => Promise.all([...document.querySelectorAll<HTMLImageElement>('.hv2-contour img')].map((image) => { image.loading = 'eager'; return image.decode().catch(() => undefined); })));
  await sheet.scrollIntoViewIfNeeded();
  await expect(sheet).toHaveAttribute('data-sheet-state', 'on');
  // The glide: the seam goes left past the middle and comes back, while the range itself never moves
  let leftmost = 100;
  const range = sheet.locator('.hv2-contour-range');
  await expect.poll(async () => {
    leftmost = Math.min(leftmost, await seamAt(stage));
    expect(await range.inputValue()).toBe(String(DEFAULT_SPLIT));
    return leftmost;
  }, { timeout: 12_000, intervals: [100] }).toBeLessThan(45);
  await expect.poll(() => seamAt(stage), { timeout: 5_000 }).toBeCloseTo(DEFAULT_SPLIT, 0);
  await expect.poll(() => sheet.locator('.hv2-contour-lines path, .hv2-proof-scheme [data-group]').evaluateAll((paths) => paths.flatMap((path) => path.getAnimations()).filter((animation) => animation.playState !== 'finished').length), { timeout: 10_000 }).toBe(0);
  expect(await solid.evaluate((element) => getComputedStyle(element).strokeDashoffset)).toMatch(/^0(px)?$/);
  expect(await dashed.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  expect(await truss.evaluate((element) => getComputedStyle(element).strokeDashoffset)).toMatch(/^0(px)?$/);
});

test('any input in the sheet before the glide stops it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.goto('/', { waitUntil: 'load' });
  const sheet = page.locator('#real-object .hv2-contour');
  const stage = sheet.locator('.hv2-contour-stage');
  await sheet.scrollIntoViewIfNeeded();
  await expect(sheet).toHaveAttribute('data-sheet-state', 'on');
  await sheet.locator('.hv2-contour-range').focus();
  await page.keyboard.press('ArrowRight');
  let leftmost = 100;
  for (let tick = 0; tick < 40; tick += 1) {
    leftmost = Math.min(leftmost, await seamAt(stage));
    await page.waitForTimeout(150);
  }
  // the key's own step glides 62 → 63; the first view's glide would have reached 42
  expect(leftmost).toBeGreaterThan(DEFAULT_SPLIT - 0.5);
  await expect(stage).not.toHaveAttribute('data-gliding', /.*/);
});

test('with reduced motion the sheet stands static and complete at its resting split', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { sheet, stage, slider } = await open(page);
  await expect(sheet).not.toHaveAttribute('data-sheet-state', /.+/);
  await expectSplit(slider, stage, DEFAULT_SPLIT);
  const paths = sheet.locator('.hv2-contour-lines path, .hv2-proof-scheme [data-group]');
  expect(await sheet.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
  expect(await paths.evaluateAll((elements) => elements.filter((element) => {
    const style = getComputedStyle(element);
    return !/^0(px)?$/.test(style.strokeDashoffset) || style.opacity !== '1';
  }).length)).toBe(0);
  for (const part of ['.hv2-proof-hatch', '.hv2-proof-nodes', '.hv2-proof-labels', '.hv2-proof-marks']) {
    expect(await stage.locator(part).first().evaluate((element) => getComputedStyle(element).opacity), part).toBe('1');
  }
  // The seam and the layers do not glide (the site's reduced-motion rule leaves a hundredth of a millisecond at most)
  for (const part of ['svg.hv2-contour-lines', 'svg.hv2-proof-frame', '.hv2-contour-trace', '.hv2-contour-seam', '.hv2-contour-handle']) {
    expect(await stage.locator(part).evaluate((element) => Math.max(...getComputedStyle(element).transitionDuration.split(',').map(parseFloat))), part).toBeLessThanOrEqual(0.0001);
  }
  // No glide and no rings, ever
  await page.waitForTimeout(6_000);
  await expect(stage).not.toHaveAttribute('data-gliding', /.*/);
  await expect(stage).not.toHaveAttribute('data-pulse', /.*/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the sheet is complete at its resting split: photo, tracing, scheme, lines, figures; the controls say they cannot move it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const stage = page.locator('#real-object .hv2-contour-stage');
    await stage.scrollIntoViewIfNeeded();
    await expect(page.locator('#real-object .hv2-contour')).not.toHaveAttribute('data-sheet-state', /.+/);
    await expect.poll(() => seamAt(stage)).toBeCloseTo(DEFAULT_SPLIT, 0);
    await expect(stage.locator('.hv2-contour-ink path')).toHaveCount(homeProofContour.lines.length);
    await expect(stage.locator('picture img')).toHaveCount(2);
    await expect(stage.locator('picture img').first()).toBeVisible();
    await expect(stage.locator('.hv2-proof-scheme')).toBeVisible();
    await expect(stage.locator('.hv2-contour-stamp')).toContainText('каркас такого типу, як на цьому об’єкті');
    expect(await stage.locator('.hv2-contour-trace').evaluate((element) => getComputedStyle(element).clipPath)).toContain(`${DEFAULT_SPLIT}%`);
    if ((page.viewportSize()?.width ?? 0) > 760) await expect(stage.locator('.hv2-proof-measure[data-measure="slope"]')).toBeVisible();
    // Nothing offers a move the static sheet cannot make: the slider and the buttons are disabled, out of the tab order
    await expect(stage.getByRole('slider', { name: SLIDER })).toBeDisabled();
    for (const button of await page.locator('#real-object .hv2-contour figcaption button').all()) await expect(button).toBeDisabled();
  });
});

test('on a laptop the whole sheet fits under the header, and the crop keeps the gable whole', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'laptop windows');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const { sheet, stage } = await open(page);
    await sheet.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 117, behavior: 'instant' }));
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.y), `${width}×${height}`).toBe(117);
    expect(box.y + box.height, `${width}×${height}`).toBeLessThanOrEqual(height);
    // The title block keeps its place under the picture, not over it
    const image = (await sheet.locator('.sheet-image').boundingBox())!;
    const stamp = (await sheet.locator('figcaption').boundingBox())!;
    expect(stamp.y, `${width}×${height}`).toBeGreaterThanOrEqual(image.y + image.height);
    expect(stamp.y + stamp.height, `${width}×${height}`).toBeLessThanOrEqual(box.y + box.height);
    // The canvas keeps the sheet's width; the stage shows the photo's rows from above the apex to below the base
    const rows = await stage.evaluate((element) => {
      const frame = element.getBoundingClientRect();
      const canvas = element.querySelector('.hv2-contour-canvas')!.getBoundingClientRect();
      const scale = canvas.height / 788;
      return { width: canvas.width - frame.width, top: (frame.top - canvas.top) / scale, bottom: (frame.bottom - canvas.top) / scale };
    });
    expect(Math.abs(rows.width), `${width}×${height}`).toBeLessThanOrEqual(1);
    expect(rows.top, `${width}×${height}`).toBeLessThanOrEqual(100);
    expect(rows.bottom, `${width}×${height}`).toBeGreaterThanOrEqual(640);
  }
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

test('the sheet stays dark in the light theme', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  const { sheet } = await open(page);
  const light = await sheet.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  expect(await sheet.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(light);
  expect(light).toBe('rgb(29, 32, 30)');
});

// Test only (owner, 04.10): /?xray=sketch puts the old generated sketch on the right, to compare it with the scheme.
// Read on the client: the server HTML is the default page's, so no second indexable version exists, and the default
// page never loads the sketch.
test('the sketch shows only in its test mode, read on the client, never on the default page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const server = async (path: string) => {
    const response = await page.request.get(path);
    expect(response.status(), path).toBe(200);
    return page.evaluate((markup) => new DOMParser().parseFromString(markup, 'text/html').querySelector('#real-object')?.outerHTML ?? '', await response.text());
  };
  const plain = await server('/');
  expect(plain).not.toContain('/concepts/');
  expect(await server('/?xray=sketch')).toBe(plain);

  const { stage } = await open(page);
  await expect(page.locator('#real-object img[src*="/concepts/"], #real-object [srcset*="/concepts/"]')).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/concepts/hangar-')).length)).toBe(0);
  await expect(stage.locator('.hv2-contour-sketch')).toHaveCount(0);

  const sketch = await open(page, '/?xray=sketch');
  await expect(sketch.layers.getByRole('button')).toHaveText(['Ескіз', 'Каркас']);
  await expect(sketch.layers.getByRole('button', { name: 'Ескіз' })).toHaveAttribute('aria-pressed', 'true');
  const image = sketch.stage.getByRole('img', { name: /^Згенероване зображення/ });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', /\/concepts\/hangar-xray-/);
  await expect(sketch.slider).toHaveAccessibleName('Порівняти фото й ескіз');
  await expect(sketch.stage.locator('.hv2-contour-stamp')).toHaveText(/Тест\s*згенероване зображення/);
  await expect(sketch.sheet.locator('.sheet-cell-note')).toContainText('Тестовий режим для порівняння.');
  // The scheme is one press away, for the comparison
  await sketch.layers.getByRole('button', { name: 'Каркас' }).click();
  await expect(sketch.stage.locator('.hv2-proof-scheme')).toBeVisible();
  await expect(sketch.stage.locator('.hv2-contour-sketch')).toBeHidden();
  // No visible word names the old idea
  expect(await sketch.sheet.innerText()).not.toMatch(/x-?ray|рентген/i);
});
