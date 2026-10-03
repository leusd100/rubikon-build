import { expect, test, type Locator, type Page } from '@playwright/test';
import { openControlGroup } from './configurator.helpers';

// /angary's configurator on the «Креслення» sheet and its first view (owner, 03.10): the preview lies on a drawing
// sheet — square, no shadow, a dark field in both themes, the view switch, what is shown and the object in the title
// block — the phone's mini drawing reads its sizes in one readout, and the drawing builds itself once, in build order,
// the first time it comes into view. /configurator-preview keeps its card.

async function openHangarPage(page: Page) {
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  await essentialCookies.click();
}

const sheetOf = (page: Page) => page.locator('#configurator .hc-preview-sheet');
const pictureOf = (page: Page) => page.locator('#configurator .hc-preview-image');

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

    // the title block: what is shown, the object, the view
    const stamp = sheet.locator('.sheet-stamp');
    await expect(stamp).toContainText('Що показано');
    await expect(stamp).toContainText('Загальний вид · попередня схема');
    await expect(stamp).toContainText('Об’єкт');
    await expect(stamp).toContainText('Приклад · 24 × 60 × 8 м');
    // the title block sets its values in capitals, but the metre stays «м»
    await expect(stamp.locator('.sheet-unit')).toHaveText('м');
    await expect(stamp.locator('.sheet-unit')).toHaveCSS('text-transform', 'none');
    const views = stamp.getByRole('group', { name: 'Вид візуалізації' });
    await expect(views).toHaveCSS('border-radius', '0px');
    const technical = views.getByRole('button', { name: 'Технічний вид', exact: true });
    await expect(technical).toHaveText('Технічний вид');
    await expect(technical).toHaveAttribute('aria-pressed', 'true');
    // the cell says «Технічний»; «вид» stays in its name only
    await expect(technical.locator('.hc-visually-hidden')).toHaveText('вид');
    await expect(technical.locator('.hc-visually-hidden')).toHaveCSS('position', 'absolute');

    // 3D fills the same field edge to edge: no ring, no seam, and nothing around it moves
    const before = await sheet.boundingBox();
    await views.getByRole('button', { name: '3D', exact: true }).click();
    await expect(picture.locator('canvas')).toBeVisible({ timeout: 20_000 });
    await expect(views.getByRole('button', { name: '3D', exact: true })).toHaveAttribute('aria-pressed', 'true');
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
    await views.getByRole('button', { name: 'Технічний вид', exact: true }).click();
    await expect(picture.locator('svg.hc-preview-svg')).toBeVisible();
  });
}

test('the title block names the visitor’s own hangar once it is theirs', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the wording is viewport-independent');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const stamp = sheetOf(page).locator('.sheet-stamp');
  await expect(stamp).toContainText('Приклад · 24 × 60 × 8 м');
  await page.locator('#hc-dimension-width').fill('30');
  await page.locator('#hc-dimension-width').blur();
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

  // Scrolled on, it is held under the header as the mini drawing, and gives back the height it lost: the controls stay
  await page.evaluate((offset) => window.scrollBy({ top: offset, behavior: 'instant' }), 160);
  await expect(layout).toHaveAttribute('data-configuring', '');
  expect(await sheet.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(header);
  expect(Math.abs((await pageTop(controls)) - controlsTop)).toBeLessThanOrEqual(1);
  expect((await sheet.boundingBox())!.height).toBeLessThan(844 * 0.3);
  expect((await pictureOf(page).boundingBox())!.height).toBeCloseTo(140, 0);
  await expect(sheet).toHaveCSS('box-shadow', 'none');

  // The sizes in one readout of 13 px figures, one line, in place of the drawing's labels; the view switch stays in reach
  await expect(readout).toBeVisible();
  expect((await readout.innerText()).replaceAll(/\s+/g, ' ').trim()).toBe('24 × 60 × 8 м');
  await expect(readout.locator('b')).toHaveCSS('font-size', '13px');
  await expect(readout.locator('b')).toHaveCSS('font-variant-numeric', 'tabular-nums');
  await expect(sheet.locator('.hc-dimension').first()).toBeHidden();
  await expect(sheet.locator('.sheet-cell-main')).toBeHidden();
  await expect(sheet.getByRole('button', { name: '3D', exact: true })).toBeVisible();

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
    await page.locator('#hc-dimension-width').focus();
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
    await sheetOf(page).getByRole('button', { name: '3D', exact: true }).click();
    await expect(picture.locator('canvas')).toBeVisible({ timeout: 20_000 });
    await sheetOf(page).getByRole('button', { name: 'Технічний вид', exact: true }).click();
    for (const selector of Object.values(LAYERS)) await expect(picture.locator(selector).first()).toHaveClass(/hc-phase-visible/);
  });

  test('reduced motion, or a visitor already there, gets the complete drawing', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the motion contract is viewport-independent');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);
    // hydrated (the WebGL probe has answered) — and nothing armed
    await expect(sheetOf(page).getByRole('button', { name: '3D', exact: true })).toBeEnabled();
    await expect(pictureOf(page)).not.toHaveAttribute('data-build', 'armed');
    for (const selector of Object.values(LAYERS)) await expect(pictureOf(page).locator(selector).first()).toHaveClass(/hc-phase-visible/);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // a fresh load straight at the configurator (the consent is already given, so no banner to dismiss)
    await page.goto('about:blank');
    await page.goto('/angary#configurator', { waitUntil: 'load' });
    await expect(sheetOf(page).getByRole('button', { name: '3D', exact: true })).toBeEnabled();
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
  await expect(sheetOf(page).getByRole('button', { name: '3D', exact: true })).toBeEnabled();
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
  expect(field.width / field.height).toBeGreaterThan(1.3);
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
  await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'instant' }));
  await expect(page.locator('#configurator .hc-layout')).toHaveAttribute('data-configuring', '');
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
  await page.locator('#configurator .hc-control-group[data-group="scope"] .hc-group-toggle').focus();
  await expect(page.locator('#configurator .hc-layout')).toHaveAttribute('data-configuring', '');
  for (let stop = 0; stop < 8; stop += 1) {
    await page.keyboard.press('Shift+Tab');
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
});

test('at 320 px the 3D view stays inside the page, square, with 44 px targets', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  await bringSheetIntoView(page);
  // no empty cell in the title block: «Вид» takes the row it is alone on
  const action = (await sheetOf(page).locator('.sheet-action').boundingBox())!;
  const object = (await sheetOf(page).locator('.sheet-stamp > .sheet-cell').nth(1).boundingBox())!;
  expect(Math.abs(action.width - object.width)).toBeLessThanOrEqual(1);

  await sheetOf(page).getByRole('button', { name: '3D', exact: true }).click();
  await expect(pictureOf(page).locator('canvas')).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  // the readout of the four sizes stays inside the picture
  const field = (await pictureOf(page).boundingBox())!;
  const readout = (await pictureOf(page).locator('.hc-three-overlay').boundingBox())!;
  expect(readout.x + readout.width).toBeLessThanOrEqual(field.x + field.width);
  for (const swatch of await page.locator('#configurator .hc-material-swatch-row button').all()) {
    await expect(swatch).toHaveCSS('border-radius', '0px');
    expect((await swatch.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect((await page.locator('#configurator .hc-scale-figure-toggle').boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('in the sticky pane the 3D view fits the screen: its colours open from a chip on the picture', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the sticky pane is the desktop’s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [index, [width, height]] of ([[1440, 900], [1024, 768]] as const).entries()) {
    await page.setViewportSize({ width, height });
    await openForViewport(page, index === 0);
    await bringSheetIntoView(page);
    await sheetOf(page).getByRole('button', { name: '3D', exact: true }).click();
    await expect(pictureOf(page).locator('canvas')).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
    // nothing under the sheet any more: the pane ends where the sheet does, inside the screen
    await expect(page.locator('#configurator .hc-preview-pane > .hc-preview-secondary-panel')).toHaveCount(0);
    expect((await page.locator('#configurator .hc-preview-pane').boundingBox())!.y + (await page.locator('#configurator .hc-preview-pane').boundingBox())!.height).toBeLessThanOrEqual(height);
    // «Сховати розміри» sits at the top, clear of the readout
    const toggle = (await pictureOf(page).locator('.hc-three-overlay-toggle').boundingBox())!;
    const readout = (await pictureOf(page).locator('.hc-three-overlay').boundingBox())!;
    expect(toggle.y + toggle.height).toBeLessThan(readout.y);

    const chip = pictureOf(page).getByRole('button', { name: 'Кольори й масштаб', exact: true });
    await expect(chip).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('radiogroup', { name: 'Обшивка', exact: true })).toBeHidden();
    await chip.click();
    await expect(chip).toHaveAttribute('aria-expanded', 'true');
    const walls = page.getByRole('radiogroup', { name: 'Обшивка', exact: true });
    await expect(walls).toBeVisible();
    // the colours follow their chip in the tab order, and Escape folds them back to it
    await page.keyboard.press('Tab');
    await expect(walls.getByRole('radio').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(chip).toHaveAttribute('aria-expanded', 'false');
    await expect(chip).toBeFocused();
  }
});
