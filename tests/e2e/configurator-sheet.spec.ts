import { expect, test, type Locator, type Page } from '@playwright/test';
import { openControlGroup, scrollToMiniHold } from './configurator.helpers';

// /angary's configurator on the «Креслення» sheet and its first view (owner, 03.10): the preview lies on a drawing
// sheet — square, no shadow, a dark field in both themes, what is shown and the object in the title block — the phone's
// mini drawing reads its sizes in one readout, and the drawing builds itself once, in build order, the first time it
// comes into view. /configurator-preview keeps its card. Since 07.10 3D is a secondary look: a chip on the drawing,
// «Подивитися в 3D», opens it and «← Креслення» goes back (no view switch in the title block, no colours on /angary);
// the controls are steps, one open at a time (openControlGroup).

async function openHangarPage(page: Page) {
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  await essentialCookies.click();
}

const sheetOf = (page: Page) => page.locator('#configurator .hc-preview-sheet');
const pictureOf = (page: Page) => page.locator('#configurator .hc-preview-image');
/** The chip on the drawing that opens 3D: rendered once the page has hydrated and the WebGL probe has said yes */
const threeChipOf = (page: Page) => pictureOf(page).getByRole('button', { name: 'Подивитися в 3D', exact: true });
const drawingChipOf = (page: Page) => pictureOf(page).getByRole('button', { name: /Креслення$/ });

/** The height of a control's hit target: its box, or the box its ::after reaches past it (the sheet's 32 px chips) */
async function targetHeight(locator: Locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const after = getComputedStyle(element, '::after');
    if (after.content === 'none' || after.position !== 'absolute') return box.height;
    const reach = -(parseFloat(after.top) || 0) - (parseFloat(after.bottom) || 0);
    return box.height + Math.max(reach, 0);
  });
}

/** Relative luminance of a computed rgb() colour */
async function luminance(locator: Locator, property: 'backgroundColor' | 'color' = 'backgroundColor') {
  return locator.evaluate((element, key) => {
    const [r, g, b] = (getComputedStyle(element)[key].match(/[\d.]+/g) ?? []).map(Number).map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }, property);
}

/** Puts the top of the configurator's layout just under the header, the sheet in full view */
async function bringSheetIntoView(page: Page) {
  await page.evaluate(() => {
    const layout = document.querySelector('#configurator .hc-layout');
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
    if (layout) window.scrollTo({ top: window.scrollY + layout.getBoundingClientRect().top - header - 12, behavior: 'instant' });
  });
}

const LAYERS = {
  foundation: '.hc-foundation',
  frame: '.hc-columns line',
  walls: '.hc-side-right polygon',
  roof: '.hc-top polygon',
  gates: '.hc-gate',
} as const;

for (const theme of ['light', 'dark'] as const) {
  test(`the preview lies on a drawing sheet with a dark field, in ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the sheet contract is viewport-independent; the phone has its own test');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((value) => window.localStorage.setItem('rubikon-theme', value), theme);
    await openHangarPage(page);
    const sheet = sheetOf(page);
    const picture = pictureOf(page);
    await expect(sheet).toHaveClass(/\bsheet\b/);
    await expect(sheet.locator('.sheet-ruler-x')).toBeAttached();
    await expect(sheet.locator('.sheet-ruler-y')).toBeAttached();
    // square, no shadow — and no pill or rounded panel left around it
    await expect(sheet).toHaveCSS('border-radius', '0px');
    await expect(sheet).toHaveCSS('box-shadow', 'none');
    await expect(page.locator('#configurator .hc-controls')).toHaveCSS('border-radius', '0px');
    await expect(page.locator('#configurator .hc-preview-toolbar')).toHaveCount(0);
    // the field stays dark in both themes, on the theme's paper
    expect(await luminance(picture)).toBeLessThan(0.05);
    expect(Math.abs((await luminance(sheet)) - (await luminance(picture)))).toBeGreaterThan(0.01);

    // the title block: what is shown and the object — no view switch in it any more (07.10)
    const stamp = sheet.locator('.sheet-stamp');
    await expect(stamp).toContainText('Що показано');
    await expect(stamp).toContainText('Загальний вигляд · попередня схема');
    await expect(stamp).toContainText('Об’єкт');
    await expect(stamp).toContainText('Приклад · 24 × 60 × 8 м');
    // the title block sets its values in capitals, but the metre stays «м»
    await expect(stamp.locator('.sheet-unit')).toHaveText('м');
    await expect(stamp.locator('.sheet-unit')).toHaveCSS('text-transform', 'none');
    await expect(stamp.getByRole('group', { name: 'Вид візуалізації' })).toHaveCount(0);
    // the phone's mini readout and its fold stay out of the whole sheet
    await expect(stamp.locator('.hc-sheet-readout')).toBeHidden();
    await expect(stamp.getByRole('button', { name: 'Згорнути', exact: true })).toBeHidden();

    // the technical view carries the cladding's section as a callout on the field, in the sheet's square language
    const section = picture.locator('.hc-section');
    await expect(section).toBeVisible();
    // the surfaces by name (10.10, audit F36)
    await expect(section.locator('figcaption')).toHaveText('Переріз стіни й покрівлі · схема');
    await expect(section).toHaveCSS('border-radius', '0px');

    // 3D is a chip on the drawing, square too
    const chip = threeChipOf(page);
    await expect(chip).toBeVisible();
    await expect(chip).toHaveCSS('border-radius', '0px');
    expect(await targetHeight(chip)).toBeGreaterThanOrEqual(44);

    // 3D fills the same field edge to edge: no ring, no seam, and nothing around it moves
    const before = await sheet.boundingBox();
    await chip.click();
    await expect(picture.locator('canvas')).toBeVisible({ timeout: 20_000 });
    await expect(stamp).toContainText('3D-модель · попередня схема');
    await expect(section).toHaveCount(0);
    await expect(drawingChipOf(page)).toBeVisible();
    // /angary's 3D has no colours and no scale figure (07.10, owner): light steel on the dark sheet
    await expect(page.locator('#configurator .hc-preview-secondary-panel')).toHaveCount(0);
    await expect(page.getByRole('radiogroup', { name: 'Обшивка', exact: true })).toHaveCount(0);
    await expect(page.locator('#configurator .hc-scale-figure-toggle')).toHaveCount(0);
    // the canvas slot (R3F's canvas fills it once it has measured it) covers the field to the pixel
    await expect.poll(async () => {
      const [field, slot] = [await picture.boundingBox(), await picture.locator('.hc-preview-canvas').boundingBox()];
      if (!field || !slot) return Infinity;
      return Math.max(...(['x', 'y', 'width', 'height'] as const).map((key) => Math.abs(field[key] - slot[key])));
    }).toBeLessThanOrEqual(1);
    await expect.poll(async () => {
      const [field, canvas] = [await picture.boundingBox(), await picture.locator('canvas').boundingBox()];
      return field && canvas ? Math.abs(field.width - canvas.width) + Math.abs(field.height - canvas.height) : Infinity;
    }).toBeLessThanOrEqual(2);
    await expect(picture).toHaveCSS('background-color', 'rgb(14, 15, 17)');
    expect((await sheet.boundingBox())!.height).toBeCloseTo(before!.height, 0);
    await expect(page.locator('#configurator .hc-three-overlay-toggle')).toHaveCSS('border-radius', '0px');

    // «Розгорнути» is on the 3D picture, and the expanded view — square too — hands focus back to it
    const expand = picture.getByRole('button', { name: 'Розгорнути', exact: true });
    await expand.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription(/^Тривимірна візуалізація ангара: 24 на 60 метрів, висота стін 8 м, .* приблизно 10,6 м\./);
    for (const part of ['.hc-fullscreen-close', '.hc-three-overlay', '.hc-three-overlay-toggle']) {
      await expect(dialog.locator(part)).toHaveCSS('border-radius', '0px');
    }
    expect((await dialog.locator('.hc-fullscreen-close').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: /Закрити/ }).click();
    await expect(expand).toBeFocused();
    await drawingChipOf(page).click();
    await expect(picture.locator('svg.hc-preview-svg')).toBeVisible();
    await expect(stamp).toContainText('Загальний вигляд · попередня схема');
    await expect(threeChipOf(page)).toBeVisible();
  });
}

test('the title block names the visitor’s own hangar once it is theirs', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the wording is viewport-independent');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const stamp = sheetOf(page).locator('.sheet-stamp');
  await expect(stamp).toContainText('Приклад · 24 × 60 × 8 м');
  await openControlGroup(page, 'dimensions');
  const width = page.locator('#hc-dimension-width');
  // opening the step and the field alone answers nothing
  await width.focus();
  await width.blur();
  await expect(stamp).toContainText('Приклад · 24 × 60 × 8 м');
  // what the visitor types counts, even the example's own number (08.10) — typed key by key, as a visitor does: a fill
  // of the same value is no change for React's input, so it would answer nothing
  await width.fill('');
  await width.pressSequentially('24');
  await width.blur();
  await expect(stamp).toContainText('Ваш ангар · 24 × 60 × 8 м');
  await width.fill('30');
  await width.blur();
  await expect(stamp).toContainText('Ваш ангар · 30 × 60 × 8 м');
  // «Точних розмірів ще немає»: the sizes on the drawing are an orientation, and the title block says so
  const unknown = page.getByRole('checkbox', { name: /Точних розмірів ще немає/ });
  await unknown.check();
  await expect(stamp).toContainText('Орієнтовно · 30 × 60 × 8 м');
  await unknown.uncheck();
  await expect(stamp).toContainText('Ваш ангар · 30 × 60 × 8 м');
});

test('/configurator-preview keeps its card and its view switch', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the research screen is checked once');
  await page.goto('/configurator-preview', { waitUntil: 'load' });
  await expect(page.locator('.hc-preview-sheet, .sheet')).toHaveCount(0);
  await expect(page.locator('.hc-preview-toolbar .hc-mode-switch')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Технічний вид', exact: true })).toHaveText('Технічний вид');
  await expect(page.locator('.hc-preview-surface')).not.toHaveCSS('border-radius', '0px');
});

test('on a phone the mini drawing reads its sizes in one readout, and nothing under it moves', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const layout = page.locator('#configurator .hc-layout');
  const sheet = sheetOf(page);
  const controls = page.locator('#configurator .hc-controls');
  const readout = sheet.locator('.hc-sheet-readout');
  const header = await page.locator('.site-header').evaluate((element) => Math.round(element.getBoundingClientRect().height));
  const pageTop = (locator: Locator) => locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);

  // In its own place the sheet is whole: the readout waits for the mini drawing
  await bringSheetIntoView(page);
  await expect(layout).not.toHaveAttribute('data-configuring', '');
  await expect(readout).toBeHidden();
  await expect(sheet.locator('.hc-dimension').first()).toBeVisible();
  const controlsTop = await pageTop(controls);

  // Scrolled on, it is held under the header as the mini drawing, and gives back the height it lost: the controls stay.
  // 08.10: under reduced motion the hold and the let-go alternated every frame (scrollY 810 ↔ 1024 ↔ 1109, the sheet at
  // −156 or 143 instead of 77) — the give eased over .01 ms and lagged the hold; the sheet no longer eases at all under
  // reduced motion (configurator-sheet.css). A product bug if this fails again, not a test to loosen.
  // 09.10 (audit F120): it turns mini as its bottom edge reaches the mini drawing's, so the steps stand right under the
  // mini drawing the moment it appears — the layout's own gap — where a ~240 px empty band used to open. Scrolled on 20 px
  // a frame, as a finger does, until it holds.
  const gap = await layout.evaluate((element) => Number.parseFloat(getComputedStyle(element).rowGap));
  await expect.poll(() => layout.evaluate((element: HTMLElement) => element.style.getPropertyValue('--hc-mini-h'))).not.toBe('');
  const band = await layout.evaluate(async (element) => {
    for (let step = 0; step < 60 && !('configuring' in (element as HTMLElement).dataset); step += 1) {
      window.scrollBy({ top: 20, behavior: 'instant' });
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    }
    const sheetBottom = element.querySelector('.hc-preview-surface')!.getBoundingClientRect().bottom;
    return element.querySelector('.hc-controls')!.getBoundingClientRect().top - sheetBottom;
  });
  await expect(layout).toHaveAttribute('data-configuring', '');
  expect(band).toBeGreaterThanOrEqual(0);
  expect(band).toBeLessThanOrEqual(gap + 20 + 1);
  expect(await sheet.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(header);
  expect(Math.abs((await pageTop(controls)) - controlsTop)).toBeLessThanOrEqual(1);
  expect((await sheet.boundingBox())!.height).toBeLessThan(844 * 0.3);
  expect((await pictureOf(page).boundingBox())!.height).toBeCloseTo(140, 0);
  await expect(sheet).toHaveCSS('box-shadow', 'none');

  // The sizes in one readout of 13 px figures, one line, in place of the drawing's labels; the fold stays in reach
  await expect(readout).toBeVisible();
  expect((await readout.innerText()).replaceAll(/\s+/g, ' ').trim()).toBe('24 × 60 × 8 м');
  await expect(readout.locator('b')).toHaveCSS('font-size', '13px');
  await expect(readout.locator('b')).toHaveCSS('font-variant-numeric', 'tabular-nums');
  await expect(sheet.locator('.hc-dimension').first()).toBeHidden();
  await expect(sheet.locator('.sheet-cell-main')).toBeHidden();
  const fold = sheet.getByRole('button', { name: 'Згорнути', exact: true });
  await expect(fold).toBeVisible();
  // its words are its state, said once (10.10, audit F131): no aria-expanded besides them
  await expect(fold).not.toHaveAttribute('aria-expanded');
  expect(await targetHeight(fold)).toBeGreaterThanOrEqual(44);

  // The readout is live
  await openControlGroup(page, 'dimensions');
  await page.locator('#hc-dimension-length').fill('48');
  await page.locator('#hc-dimension-length').blur();
  await expect(readout).toContainText('24 × 48 × 8 м');

  // Back in its own place it is the whole sheet again, and the controls are where they were
  await bringSheetIntoView(page);
  await expect(layout).not.toHaveAttribute('data-configuring', '');
  await expect(readout).toBeHidden();
});

test('on a phone the mini drawing folds to its sizes’ line and back, and says «≈» while they are an orientation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const layout = page.locator('#configurator .hc-layout');
  const sheet = sheetOf(page);
  const readout = sheet.locator('.hc-sheet-readout');
  await openControlGroup(page, 'dimensions');
  // held well into the controls (the 160 px case above is the hold's own test)
  await bringSheetIntoView(page);
  await page.evaluate(() => window.scrollBy({ top: 480, behavior: 'instant' }));
  await expect(layout).toHaveAttribute('data-configuring', '');
  await expect(readout).toBeVisible();

  const unknown = page.getByRole('checkbox', { name: /Точних розмірів ще немає/ });
  await unknown.check();
  await expect(readout).toHaveText('≈ 24 × 60 × 8 м');
  await unknown.uncheck();
  await expect(readout).toHaveText('24 × 60 × 8 м');

  // Folded, the picture goes and the sizes' line stays with the way back; shown again, the picture returns
  await expect(layout).toHaveAttribute('data-configuring', '');
  const fold = sheet.getByRole('button', { name: 'Згорнути', exact: true });
  await fold.click();
  const show = sheet.getByRole('button', { name: 'Показати креслення', exact: true });
  await expect(show).not.toHaveAttribute('aria-expanded');
  await expect(pictureOf(page)).toBeHidden();
  await expect(readout).toBeVisible();
  expect((await sheet.boundingBox())!.height).toBeLessThan(100);
  await show.click();
  await expect(sheet.getByRole('button', { name: 'Згорнути', exact: true })).not.toHaveAttribute('aria-expanded');
  await expect(pictureOf(page)).toBeVisible();

  // Back in its own place the whole sheet has no fold
  await bringSheetIntoView(page);
  await expect(layout).not.toHaveAttribute('data-configuring', '');
  await expect(sheet.getByRole('button', { name: 'Згорнути', exact: true })).toBeHidden();
});

test('on a phone the page scrolls on without measuring the sheet: only holding and letting go do', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  // 07.10: every scroll event read the sheet's box, and each read forced the page's style and layout, all down the page
  await page.addInitScript(() => {
    const read = Element.prototype.getBoundingClientRect;
    const counter = window as unknown as { sheetReads: number };
    counter.sheetReads = 0;
    Element.prototype.getBoundingClientRect = function getBoundingClientRect(this: Element) {
      if (this.matches('#configurator .hc-preview-surface')) counter.sheetReads += 1;
      return read.call(this);
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const layout = page.locator('#configurator .hc-layout');
  const reads = () => page.evaluate(() => (window as unknown as { sheetReads: number }).sheetReads);
  /** Scroll steps a frame apart, each with its scroll event */
  const scrollSteps = (steps: number, by: number) => page.evaluate(async ([count, offset]) => {
    for (let step = 0; step < count; step += 1) {
      window.scrollBy({ top: offset, behavior: 'instant' });
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    }
  }, [steps, by] as const);

  // Above the configurator, the sheet on its way up the screen
  await bringSheetIntoView(page);
  await page.evaluate(() => window.scrollBy({ top: -600, behavior: 'instant' }));
  await expect(layout).not.toHaveAttribute('data-configuring', '');
  const before = await reads();
  await scrollSteps(12, 40);
  await expect(layout).not.toHaveAttribute('data-configuring', '');
  expect(await reads()).toBe(before);

  // Held through the controls
  await scrollSteps(4, 120);
  await expect(layout).toHaveAttribute('data-configuring', '');
  const held = await reads();
  await scrollSteps(12, 40);
  await expect(layout).toHaveAttribute('data-configuring', '');
  expect(await reads()).toBe(held);

  // A jump back up lets go, and the way down holds it again
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(layout).not.toHaveAttribute('data-configuring', '');
  await bringSheetIntoView(page);
  await scrollSteps(4, 120);
  await expect(layout).toHaveAttribute('data-configuring', '');
});

test.describe('the first view builds the drawing', () => {
  test('in build order, once, the first time the sheet comes into view', async ({ page }) => {
    await openHangarPage(page);
    const picture = pictureOf(page);
    // armed after hydration, out of sight: every scope layer is put away at once
    await expect(picture).toHaveAttribute('data-build', 'armed');
    for (const layer of ['foundation', 'frame', 'gates'] as const) {
      await expect(picture.locator(LAYERS[layer]).first()).toHaveClass(/hc-phase-hidden/);
    }
    await page.evaluate((layers) => {
      const seen: Record<string, number> = {};
      (window as unknown as { __firstSeen: Record<string, number> }).__firstSeen = seen;
      const root = document.querySelector('#configurator .hc-preview-image');
      if (!root) return;
      const check = () => {
        for (const [name, selector] of Object.entries(layers)) {
          const element = root.querySelector(selector);
          if (seen[name] || !element || /hc-phase-(hidden|dematerializing)/.test(element.getAttribute('class') ?? '')) continue;
          seen[name] = performance.now();
        }
      };
      new MutationObserver(check).observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }, LAYERS);

    await bringSheetIntoView(page);
    await expect(picture).not.toHaveAttribute('data-build', 'armed');
    await expect(picture.locator(LAYERS.gates)).toHaveClass(/hc-phase-visible/, { timeout: 8000 });
    const seen = await page.evaluate(() => (window as unknown as { __firstSeen: Record<string, number> }).__firstSeen);
    const order = (Object.keys(LAYERS) as (keyof typeof LAYERS)[]).map((layer) => seen[layer]);
    for (const at of order) expect(at).toBeGreaterThan(0);
    for (let index = 1; index < order.length; index += 1) expect(order[index]).toBeGreaterThan(order[index - 1]);
    // ≈2.5 s from the foundation to the gates, however busy the machine
    expect(order[order.length - 1] - order[0]).toBeGreaterThan(1500);
    expect(order[order.length - 1] - order[0]).toBeLessThan(4500);

    // once per page load: away and back, the drawing stays complete
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await bringSheetIntoView(page);
    await page.waitForTimeout(400);
    for (const selector of Object.values(LAYERS)) await expect(picture.locator(selector).first()).toHaveClass(/hc-phase-visible/);
    await expect(picture).not.toHaveAttribute('data-build', 'armed');
  });

  test('a visitor who reaches for a control has the whole drawing at once', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the interruption contract is viewport-independent');
    await openHangarPage(page);
    const picture = pictureOf(page);
    await expect(picture).toHaveAttribute('data-build', 'armed');
    await bringSheetIntoView(page);
    await expect(picture.locator(LAYERS.foundation)).not.toHaveClass(/hc-phase-hidden/, { timeout: 4000 });
    // the first control in reach: the next step's tab (the sizes' fields are behind it since 07.10)
    await page.locator('#hc-step-size-tab').focus();
    for (const selector of Object.values(LAYERS)) {
      await expect(picture.locator(selector).first()).toHaveClass(/hc-phase-(materializing|visible)/, { timeout: 500 });
    }
    // at once, the frame with the walls: the rafters and purlins no longer fade in after the envelope (03.10)
    const opacity = (selector: string) => picture.locator(selector).first().evaluate((element) => Number(getComputedStyle(element).opacity));
    for (const selector of ['.hc-rafters line', '.hc-purlins line', LAYERS.walls, LAYERS.roof]) {
      expect(await opacity(selector), selector).toBe(1);
    }
  });

  test('switching to 3D mid-build shows the whole hangar, and so does the way back', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the 3D hand-over is viewport-independent');
    await openHangarPage(page);
    const picture = pictureOf(page);
    await expect(picture).toHaveAttribute('data-build', 'armed');
    await bringSheetIntoView(page);
    await expect(picture.locator(LAYERS.foundation)).not.toHaveClass(/hc-phase-hidden/, { timeout: 4000 });
    await expect(picture.locator(LAYERS.gates)).toHaveClass(/hc-phase-hidden/);
    await threeChipOf(page).click();
    await expect(picture.locator('canvas')).toBeVisible({ timeout: 20_000 });
    await drawingChipOf(page).click();
    for (const selector of Object.values(LAYERS)) await expect(picture.locator(selector).first()).toHaveClass(/hc-phase-visible/);
  });

  test('reduced motion, or a visitor already there, gets the complete drawing', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the motion contract is viewport-independent');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);
    // hydrated (the WebGL probe has answered: the 3D chip is on the drawing) — and nothing armed
    await expect(threeChipOf(page)).toBeVisible();
    await expect(pictureOf(page)).not.toHaveAttribute('data-build', 'armed');
    for (const selector of Object.values(LAYERS)) await expect(pictureOf(page).locator(selector).first()).toHaveClass(/hc-phase-visible/);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // a fresh load straight at the configurator (the consent is already given, so no banner to dismiss)
    await page.goto('about:blank');
    await page.goto('/angary#configurator', { waitUntil: 'load' });
    await expect(threeChipOf(page)).toBeVisible();
    await expect(sheetOf(page)).toHaveAttribute('data-sheet-state', /.+/);
    await expect(pictureOf(page)).not.toHaveAttribute('data-build', 'armed');
    for (const selector of Object.values(LAYERS)) await expect(pictureOf(page).locator(selector).first()).toHaveClass(/hc-phase-visible/);
  });

  test('the server markup is the complete drawing', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the server markup is viewport-independent');
    const response = await page.request.get('/angary');
    expect(response.status()).toBe(200);
    const markup = await response.text();
    const phases = await page.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return [...doc.querySelectorAll('#configurator .hc-buildlayer')].map((element) => element.getAttribute('class')?.match(/hc-phase-\w+/)?.[0]);
    }, markup);
    expect(phases.length).toBeGreaterThan(20);
    expect(new Set(phases)).toEqual(new Set(['hc-phase-visible']));
  });
});

// 03.10 sweep: the drawing reads at any size, the band keeps the page's edges, the mini drawing stays small and never
// hides the focused control, and the 3D view fits the sheet's square language on every screen.

/** Opens /angary for the first viewport of a loop, then again for the next ones: the consent is given once */
async function openForViewport(page: Page, first: boolean) {
  if (first) await openHangarPage(page);
  else await page.goto('/angary', { waitUntil: 'load' });
  await expect(threeChipOf(page)).toBeVisible();
}

/** The smallest dimension label of the drawing as rendered on screen, CSS px */
async function smallestLabelPx(page: Page) {
  return page.locator('#configurator .hc-preview-svg').evaluate((svg: SVGSVGElement) => {
    const scale = svg.getScreenCTM()?.a ?? 1;
    return Math.min(...[...svg.querySelectorAll('.hc-dimension text')].map((text) => parseFloat(getComputedStyle(text).fontSize) * scale));
  });
}

test('the drawing’s own sizes read at 12 px or more wherever it is shown small, with a decimal comma for screen readers', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [index, [width, height]] of ([[390, 844], [320, 640], [1024, 768]] as const).entries()) {
    await page.setViewportSize({ width, height });
    await openForViewport(page, index === 0);
    await bringSheetIntoView(page);
    await expect.poll(() => smallestLabelPx(page), { message: `${width}×${height}` }).toBeGreaterThanOrEqual(11.9);
  }
  await openControlGroup(page, 'dimensions');
  await page.locator('#hc-dimension-height').fill('7.5');
  await page.locator('#hc-dimension-height').blur();
  await expect(page.locator('#configurator .hc-preview-svg')).toHaveAttribute('aria-label', /висота стін 7,5 м, .* приблизно 10,1 м$/);
});

test('at 1024–1200 px the field keeps a landscape proportion and «Що показано» takes its own row', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'a desktop band');
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const field = (await pictureOf(page).boundingBox())!;
  // The drawing's own stage: on a sheet under 700 px the field also holds the cladding's section as the drawing's legend,
  // under the drawing and never on the hangar (07.10) — the stage, not the legend, is what was letterboxed at 03.10
  const stage = (await pictureOf(page).locator('.hc-preview-svg').boundingBox())!;
  expect(stage.width).toBeGreaterThan(field.width - 1);
  expect(stage.width / stage.height).toBeGreaterThan(1.3);
  const legend = (await pictureOf(page).locator('.hc-section').boundingBox())!;
  expect(legend.y).toBeGreaterThanOrEqual(stage.y + stage.height - 1);
  expect(legend.y + legend.height).toBeLessThanOrEqual(field.y + field.height + 1);
  // and in 3D, where the field is the canvas alone, the same proportion
  await threeChipOf(page).click();
  await expect(pictureOf(page).locator('canvas')).toBeVisible({ timeout: 20_000 });
  const three = (await pictureOf(page).boundingBox())!;
  expect(three.width / three.height).toBeGreaterThan(1.3);
  const main = (await sheetOf(page).locator('.sheet-cell-main').boundingBox())!;
  expect(main.width).toBeGreaterThan(field.width * 0.9);
  expect(main.height).toBeLessThan(60);
});

test('the configurator band shares the page’s shell edges at every width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [index, width] of [1920, 820, 390].entries()) {
    await page.setViewportSize({ width, height: 1000 });
    await openForViewport(page, index === 0);
    const edges = await page.evaluate(() => {
      const span = (selector: string) => {
        const box = document.querySelector(selector)!.getBoundingClientRect();
        return [Math.round(box.left), Math.round(box.right)];
      };
      return {
        shell: span('.angary-cost .shell'),
        heading: span('#configurator .hc-hero')[0],
        layout: span('#configurator .hc-layout'),
        stamp: span('#configurator .hc-stamp-row'),
      };
    });
    expect(edges.heading, `${width}`).toBe(edges.shell[0]);
    expect(edges.layout, `${width}`).toEqual(edges.shell);
    expect(edges.stamp, `${width}`).toEqual(edges.shell);
  }
});

test('on a short phone the mini drawing stays under a third of the screen, its sizes on one line', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  await bringSheetIntoView(page);
  await scrollToMiniHold(page);
  expect((await sheetOf(page).boundingBox())!.height).toBeLessThan(568 / 3);
  // the longest sizes still hold one line beside the switch, whole
  await openControlGroup(page, 'dimensions');
  for (const [field, value] of [['width', '30'], ['length', '120'], ['height', '12.5']] as const) {
    await page.locator(`#hc-dimension-${field}`).fill(value);
    await page.locator(`#hc-dimension-${field}`).blur();
  }
  const readout = sheetOf(page).locator('.hc-sheet-readout b');
  await expect(readout).toHaveText('30 × 120 × 12,5 м');
  expect(await readout.evaluate((element) => element.scrollWidth <= element.clientWidth + 1 && element.getClientRects().length === 1)).toBe(true);
});

test('on a phone a control that takes keyboard focus is never hidden behind the mini drawing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  // The step with the most controls (07.10): the shell — insulation, materials, gates and doors — from its last stop back
  await openControlGroup(page, 'openings');
  await page.locator('#hc-step-shell .hc-step-next').focus();
  await expect(page.locator('#configurator .hc-layout')).toHaveAttribute('data-configuring', '');
  let inControls = 0;
  for (let stop = 0; stop < 8; stop += 1) {
    await page.keyboard.press('Shift+Tab');
    if (await page.evaluate(() => Boolean(document.activeElement?.closest('#configurator .hc-controls')))) inControls += 1;
    const covered = await page.evaluate(() => {
      const focused = document.activeElement as HTMLElement | null;
      if (!focused?.closest('#configurator .hc-controls')) return null;
      const target = focused.closest('label') ?? focused;
      const box = target.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return top !== null && !target.contains(top) ? (top.closest('.hc-preview-sheet, .site-header')?.className ?? null) : null;
    });
    expect(covered, `stop ${stop + 1}`).toBeNull();
  }
  // every stop was a control of the step, not a way out of it
  expect(inControls).toBe(8);
});

test('at 320 px the 3D view stays inside the page, square, with 44 px targets', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  await bringSheetIntoView(page);
  // no empty cell in the title block: each cell shown takes the whole row it is alone on
  const stamp = sheetOf(page).locator('.sheet-stamp');
  const rows = await stamp.evaluate((element) => {
    const inner = element.getBoundingClientRect();
    return [...element.children]
      .filter((cell) => getComputedStyle(cell).display !== 'none')
      .map((cell) => Math.round(inner.width - cell.getBoundingClientRect().width));
  });
  expect(rows.length).toBeGreaterThanOrEqual(2);
  for (const gap of rows) expect(gap).toBeLessThanOrEqual(2);

  const drawingSheet = (await sheetOf(page).boundingBox())!;
  await threeChipOf(page).click();
  await expect(pictureOf(page).locator('canvas')).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  // A phone's 3D has no table of the four sizes (10.10, audit F55: it took 84 of the picture's 246 px; the sizes are in
  // the title block and the stamp), nor its toggle, and the sheet is as tall as with the drawing and its legend
  const field = (await pictureOf(page).boundingBox())!;
  await expect(pictureOf(page).locator('.hc-three-overlay')).toBeHidden();
  await expect(pictureOf(page).locator('.hc-three-overlay-toggle')).toBeHidden();
  expect(Math.abs((await sheetOf(page).boundingBox())!.height - drawingSheet.height)).toBeLessThanOrEqual(1);
  // the picture's own actions: square, inside the picture, 44 px targets
  for (const action of [drawingChipOf(page), pictureOf(page).getByRole('button', { name: 'Розгорнути', exact: true })]) {
    await expect(action).toBeVisible();
    await expect(action).toHaveCSS('border-radius', '0px');
    const box = (await action.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(field.x);
    expect(box.x + box.width).toBeLessThanOrEqual(field.x + field.width);
    expect(await targetHeight(action)).toBeGreaterThanOrEqual(44);
  }
  // the colour swatches and the scale figure are gone from /angary (07.10, owner)
  await expect(page.locator('#configurator .hc-material-swatch-row')).toHaveCount(0);
  await expect(page.locator('#configurator .hc-scale-figure-toggle')).toHaveCount(0);
});

test('in the sticky pane the 3D view fits the screen, its actions on the picture and clear of the sizes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the sticky pane is the desktop’s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [index, [width, height]] of ([[1440, 900], [1024, 768]] as const).entries()) {
    await page.setViewportSize({ width, height });
    await openForViewport(page, index === 0);
    await bringSheetIntoView(page);
    await threeChipOf(page).click();
    await expect(pictureOf(page).locator('canvas')).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
    // nothing under the sheet any more: the pane ends where the sheet does, inside the screen
    await expect(page.locator('#configurator .hc-preview-pane > .hc-preview-secondary-panel')).toHaveCount(0);
    const pane = (await page.locator('#configurator .hc-preview-pane').boundingBox())!;
    expect(pane.y + pane.height, `${width}×${height}`).toBeLessThanOrEqual(height);
    // «Сховати розміри» sits at the top, clear of the readout and of the chips on the other side
    const toggle = (await pictureOf(page).locator('.hc-three-overlay-toggle').boundingBox())!;
    const readout = (await pictureOf(page).locator('.hc-three-overlay').boundingBox())!;
    expect(toggle.y + toggle.height).toBeLessThan(readout.y);
    const tools = (await pictureOf(page).locator('.hc-sheet-tools').boundingBox())!;
    expect(toggle.x + toggle.width).toBeLessThan(tools.x);
    expect(tools.y + tools.height).toBeLessThan(readout.y);

    // /angary's 3D has no colours (07.10, owner): no chip for them, no swatches
    await expect(pictureOf(page).getByRole('button', { name: 'Кольори й масштаб', exact: true })).toHaveCount(0);
    await expect(page.getByRole('radiogroup', { name: 'Обшивка', exact: true })).toHaveCount(0);
    // «← Креслення» comes first among the picture's actions, «Розгорнути» after it
    const back = drawingChipOf(page);
    await back.focus();
    await page.keyboard.press('Tab');
    await expect(pictureOf(page).getByRole('button', { name: 'Розгорнути', exact: true })).toBeFocused();
  }
});

// 3D and «Каркас» (09.10, owner: «Давай спробуємо прибрати»; audit F14, F76): the frame's step is its line drawing, with
// no 3D chip on it — 3D showed the clad hangar there and took the step's own list from beside it. 3D opened over the
// general view is forgotten when the step changes the view: it came back by itself on «Обсяг». The chip is one button
// whose words change, so keyboard focus stays on it both ways (it fell to the page's start), and the hidden status line
// says what the sheet now shows.
test('3D is not offered on «Каркас», does not come back by itself after it, and its chip keeps focus both ways', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the view contract is viewport-independent');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  await bringSheetIntoView(page);
  const chip = threeChipOf(page);
  await expect(chip).toBeVisible();
  // the sheet's own status line (the expanded view's is quiet while it is closed)
  const status = page.locator('#configurator p.hc-presentation-announcement[role="status"]');

  await chip.focus();
  await page.keyboard.press('Enter');
  await expect(pictureOf(page).locator('canvas')).toBeVisible({ timeout: 20_000 });
  const back = drawingChipOf(page);
  await expect(back).toBeFocused();
  await expect(status).toHaveText('3D-модель · попередня схема');
  await page.keyboard.press('Enter');
  await expect(pictureOf(page).locator('svg.hc-preview-svg')).toBeVisible();
  await expect(chip).toBeFocused();
  await expect(status).toHaveText('Загальний вигляд · попередня схема');

  // opened on «Задача», then «Каркас»: the frame's drawing, and no chip on it
  await chip.click();
  await expect(pictureOf(page).locator('canvas')).toBeVisible({ timeout: 20_000 });
  await openControlGroup(page, 'space');
  await expect(pictureOf(page).locator('.hc-frame')).toBeVisible();
  await expect(pictureOf(page).locator('.hc-sheet-tools')).toHaveCount(0);
  await expect(page.locator('#hc-frame-panel .hc-frame-item')).toHaveCount(5);
  // …then «Обсяг»: the general view, not the 3D left open three steps back
  await openControlGroup(page, 'scope');
  await expect(pictureOf(page).locator('svg.hc-preview-svg')).toBeVisible();
  await expect(pictureOf(page).locator('canvas')).toHaveCount(0);
  await expect(sheetOf(page).locator('.sheet-stamp')).toContainText('Загальний вигляд · попередня схема');
  await expect(chip).toBeVisible();
});

// The frame's field is the sheet's dark one in both themes (09.10, audit F16 — «never flips paper ↔ dark», top of
// configurator-sheet.css): in Light it turned cream on «Каркас» and back on «Обсяг». The loads' legend reads in their
// Dark colours on it (audit F75: 3.38 : 1 and 3.04 : 1 on the cream field).
for (const theme of ['light', 'dark'] as const) {
  test(`the frame's field is the general view's dark field, in ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the field contract is viewport-independent');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((value) => window.localStorage.setItem('rubikon-theme', value), theme);
    await openHangarPage(page);
    const general = await pictureOf(page).evaluate((element) => getComputedStyle(element).backgroundColor);
    await openControlGroup(page, 'space');
    const frame = pictureOf(page).locator('.hc-frame');
    await expect(frame).toBeVisible();
    await expect(pictureOf(page)).toHaveCSS('background-color', general);
    expect(await luminance(pictureOf(page))).toBeLessThan(0.05);
    for (const [item, load] of [[3, 'snow'], [4, 'wind']] as const) {
      await page.locator('#hc-frame-panel .hc-frame-item').nth(item).click();
      const link = frame.locator(`.ft-chain[data-load="${load}"] li`).first();
      await expect(link).toBeVisible();
      const [ink, field] = [await luminance(link, 'color'), await luminance(pictureOf(page))];
      expect((Math.max(ink, field) + 0.05) / (Math.min(ink, field) + 0.05), load).toBeGreaterThanOrEqual(4.5);
    }
    await openControlGroup(page, 'scope');
    await expect(pictureOf(page)).toHaveCSS('background-color', general);
  });
}

// One field height on a computer (09.10, audit F15 + F45): from «Стіни й ворота» to «Каркас» to «Обсяг» the sheet keeps
// its size, and held under the header it stays whole inside the window — on «Каркас» its title block went 94–113 px
// under the window's edge on short laptops, and at 1280 px wide the general view's legend under the drawing pushed it
// 25–45 px out on the other steps. The frame's window keeps its own proportion, centred in the field.
test('on a computer the sheet keeps one size from step to step and stays inside the window', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the sticky pane is the desktop’s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [index, [width, height]] of ([[1366, 657], [1536, 730], [1280, 600], [1280, 720], [1440, 900], [1100, 700], [1024, 768]] as const).entries()) {
    await page.setViewportSize({ width, height });
    if (index === 0) await openHangarPage(page);
    else await page.goto('/angary', { waitUntil: 'load' });
    const sizes: number[] = [];
    for (const step of ['shell', 'frame', 'check'] as const) {
      await page.evaluate(() => {
        const layout = document.querySelector('#configurator .hc-layout')!;
        window.scrollTo({ top: window.scrollY + layout.getBoundingClientRect().top - 117, behavior: 'instant' });
      });
      const tab = page.locator(`#hc-step-${step}-tab`);
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      // the pane held under the header
      await page.evaluate(() => window.scrollBy({ top: 150, behavior: 'instant' }));
      const box = (await sheetOf(page).boundingBox())!;
      sizes.push(Math.round(box.height));
      expect(box.y + box.height, `${width}×${height} ${step}`).toBeLessThanOrEqual(height);
      if (step === 'frame') {
        const [field, camera] = [(await pictureOf(page).boundingBox())!, (await pictureOf(page).locator('.ft-window').boundingBox())!];
        expect(camera.width / camera.height, `${width}×${height}`).toBeCloseTo(720 / 440, 1);
        expect(camera.y + camera.height).toBeLessThanOrEqual(field.y + field.height + 0.5);
        expect(Math.abs(camera.x + camera.width / 2 - (field.x + field.width / 2))).toBeLessThanOrEqual(1);
      }
    }
    expect(Math.max(...sizes) - Math.min(...sizes), `${width}×${height}: ${sizes.join(' → ')}`).toBeLessThanOrEqual(2);
  }
});

/** The gap between the held mini drawing's bottom edge and the steps' tabs (negative: the tabs are under it) */
async function miniToTabs(page: Page) {
  return page.locator('#configurator .hc-layout').evaluate((layout) => {
    const tabs = layout.querySelector('[role="tablist"]')!.getBoundingClientRect().top;
    return tabs - layout.querySelector('.hc-preview-surface')!.getBoundingClientRect().bottom;
  });
}

/** What a finger lands on at the middle of each step tab: the tab itself, or what covers it */
async function tabHits(page: Page) {
  return page.locator('#configurator [role="tab"]').evaluateAll((tabs) => tabs.map((tab) => {
    const box = tab.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return hit !== null && tab.contains(hit) ? 'tab' : (hit?.getAttribute('class') ?? 'nothing');
  }));
}

// 09.10, audit F21: scroll anchoring held the steps where they were, so «Згорнути» left a 120–150 px empty band under the
// folded drawing, and «Показати ескіз» (now «Показати креслення») opened it over the tabs. The steps follow the fold now, both ways.
for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`on a phone the steps follow the mini drawing's fold, folded and shown again (motion: ${reducedMotion})`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion });
    await openHangarPage(page);
    const sheet = sheetOf(page);
    await scrollToMiniHold(page);
    // «Далі» from «Задача»: the steps land right under the mini drawing
    await page.locator('#hc-step-task .hc-step-next').click();
    await expect(page.locator('#hc-step-size-tab')).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => miniToTabs(page)).toBeGreaterThanOrEqual(0);
    expect(await miniToTabs(page)).toBeLessThanOrEqual(16);

    await sheet.getByRole('button', { name: 'Згорнути', exact: true }).click();
    await expect(sheet).toHaveClass(/is-folded/);
    await expect.poll(() => miniToTabs(page)).toBeLessThanOrEqual(16);
    expect(await miniToTabs(page)).toBeGreaterThanOrEqual(0);

    await sheet.getByRole('button', { name: 'Показати креслення', exact: true }).click();
    await expect(pictureOf(page)).toBeVisible();
    await expect.poll(() => miniToTabs(page)).toBeGreaterThanOrEqual(0);
    expect(await miniToTabs(page)).toBeLessThanOrEqual(16);
    expect(await tabHits(page)).toEqual(['tab', 'tab', 'tab', 'tab', 'tab']);
    // anchoring is the page's again
    await expect.poll(() => page.evaluate(() => document.body.style.overflowAnchor)).toBe('');
  });
}

// 09.10, audit F23: on a short screen — a window zoomed to 200–400 %, a phone on its side — the header and the mini
// drawing covered 55–100 % of it, and on «Каркас» every control of the step, the fold and the tabs too. There the sheet
// scrolls by whole; a phone in portrait keeps the mini drawing, and its frame's window stays within 30 % of the screen.
test('on a short screen the sheet is not held, and a held frame stays within its share of the screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const layout = page.locator('#configurator .hc-layout');
  for (const viewport of [{ width: 740, height: 360 }, { width: 720, height: 450 }, { width: 360, height: 225 }]) {
    await page.setViewportSize(viewport);
    await openControlGroup(page, 'space');
    await page.locator('#configurator .hc-controls').evaluate((controls) => window.scrollTo({ top: window.scrollY + controls.getBoundingClientRect().top - 40, behavior: 'instant' }));
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    await expect(layout, `${viewport.width}×${viewport.height}`).not.toHaveAttribute('data-configuring', '');
    expect(await layout.evaluate((element: HTMLElement) => element.style.getPropertyValue('--hc-mini-h'))).toBe('');
    // a control taken by keyboard is not under anything but the header
    await page.locator('#hc-step-frame-tab').focus();
    await page.keyboard.press('Tab');
    const box = await page.evaluate(() => document.activeElement!.getBoundingClientRect().toJSON() as DOMRect);
    expect(box.bottom, `${viewport.width}×${viewport.height}`).toBeGreaterThan(await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().bottom));
  }
  // 760 × 500 still holds it (a phone's width, enough height); the frame's window is capped at 30 % of the screen
  await page.setViewportSize({ width: 760, height: 500 });
  await page.goto('/angary', { waitUntil: 'load' });
  await openControlGroup(page, 'space');
  await scrollToMiniHold(page);
  expect((await sheetOf(page).locator('.ft-window').boundingBox())!.height).toBeLessThanOrEqual(500 * 0.3 + 1);
  const fold = sheetOf(page).getByRole('button', { name: 'Згорнути', exact: true });
  const foldBox = (await fold.boundingBox())!;
  expect(foldBox.y + foldBox.height).toBeLessThan(500);
  // and a portrait phone keeps it: an iPhone SE in Safari has about 548 px
  for (const viewport of [{ width: 375, height: 548 }, { width: 375, height: 667 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/angary', { waitUntil: 'load' });
    await openControlGroup(page, 'dimensions');
    await scrollToMiniHold(page);
  }
});

// 09.10, audit F22: on a portrait tablet the layout is one column and the drawing does not stay: after «Далі», and down a
// long step, 0 px of it was on the screen while the step was edited. The whole sheet sticks under the header now.
test('on a portrait tablet the whole sheet stays under the header while a step is edited, and no focus hides behind it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport runs once');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const sheet = sheetOf(page);
  const header = await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().bottom);
  await openControlGroup(page, 'dimensions');
  await page.locator('#hc-step-size .hc-step-next').scrollIntoViewIfNeeded();
  await page.locator('#hc-step-size .hc-step-next').click();
  await expect(page.locator('#hc-step-shell-tab')).toHaveAttribute('aria-selected', 'true');
  // the sheet stuck under the header, its picture whole on the screen, the tabs right under it, the step's first answers below
  await expect.poll(() => sheet.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(header, 0);
  const box = (await sheet.boundingBox())!;
  const picture = (await pictureOf(page).boundingBox())!;
  expect(picture.y).toBeGreaterThanOrEqual(header);
  expect(picture.y + picture.height).toBeLessThanOrEqual(box.y + box.height);
  const tabsTop = await page.locator('#configurator [role="tablist"]').evaluate((element) => element.getBoundingClientRect().top);
  expect(tabsTop - (box.y + box.height)).toBeGreaterThanOrEqual(0);
  expect(tabsTop - (box.y + box.height)).toBeLessThanOrEqual(16);
  const answer = (await page.locator('#hc-step-shell input[name="hc-envelope"]').first().locator('xpath=..').boundingBox())!;
  expect(answer.y + answer.height).toBeLessThan(1024);
  // down the step it stays
  await page.mouse.wheel(0, 400);
  await expect.poll(() => sheet.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(header, 0);
  // the step keeps nearly half the screen (09.10, owner: the drawing lower — it kept 36 %)
  expect(1024 - (box.y + box.height)).toBeGreaterThan(1024 * 0.45);

  // keyboard from the step's last stop back: no control is behind the sheet
  await page.locator('#hc-step-shell .hc-step-next').focus();
  for (let stop = 0; stop < 8; stop += 1) {
    await page.keyboard.press('Shift+Tab');
    const covered = await page.evaluate(() => {
      const focused = document.activeElement as HTMLElement | null;
      if (!focused?.closest('#configurator .hc-controls')) return null;
      const target = focused.closest('label') ?? focused;
      const rect = target.getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return top !== null && !target.contains(top) ? (top.closest('.hc-preview-sheet, .site-header')?.className ?? null) : null;
    });
    expect(covered, `stop ${stop + 1}`).toBeNull();
  }

  // «Каркас»: the frame's field as tall as the general view's (09.10), so the stuck sheet and the tabs under it stay put
  // from step to step, and the frame's window takes the sheet's width
  await openControlGroup(page, 'space');
  await expect(sheet.locator('.ft-window')).toBeVisible();
  const frameSheet = (await sheet.boundingBox())!;
  expect(Math.abs(frameSheet.height - box.height)).toBeLessThanOrEqual(1);
  const frameWindow = (await sheet.locator('.ft-window').boundingBox())!;
  expect(frameWindow.width).toBeGreaterThan(box.width * 0.9);
  await openControlGroup(page, 'scope');
  expect(Math.abs((await sheet.boundingBox())!.height - box.height)).toBeLessThanOrEqual(1);
});
