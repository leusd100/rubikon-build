import { expect, test, type Page } from '@playwright/test';
import { openControlGroup, scrollToMiniHold } from './configurator.helpers';

// /angary's configurator, iteration 4 «Ясно й рівно» — the polish (10.10): one visual language, readable on a phone. Each
// test holds a measurable rule from the 08.10 audit: the phone's small print, the 3D picture and the cladding legend on a
// phone, the frame's legend-like list, its play control and its node targets, one tick for every answer, «Ще не знаю»
// that does not read as an answer, square boxes, a size shown once, the stamp's values on one line.

async function openHangarPage(page: Page, { width, height }: { width: number; height: number }, motion: 'reduce' | 'no-preference' = 'reduce') {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto('/angary', { waitUntil: 'load' });
  // the banner asks once per browser: a test that walks several widths answers it on the first
  if (await page.evaluate(() => window.localStorage.getItem('rubikon-consent-state') !== null)) return;
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  await essentialCookies.click();
}

const pictureOf = (page: Page) => page.locator('#configurator .hc-preview-image');
const sheetOf = (page: Page) => page.locator('#configurator .hc-preview-sheet');

/** Puts the top of the configurator's layout just under the header, the sheet in full view */
async function bringSheetIntoView(page: Page) {
  await page.evaluate(() => {
    const layout = document.querySelector('#configurator .hc-layout');
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
    if (layout) window.scrollTo({ top: window.scrollY + layout.getBoundingClientRect().top - header - 12, behavior: 'instant' });
  });
}

const fontSizes = (page: Page, selector: string) => page.locator(selector).evaluateAll((elements) => elements
  .filter((element) => element.getClientRects().length > 0 && element.textContent?.trim())
  .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)));

/** «Каркас» with one of its five shown (0 = the span, 1 = the frame) */
async function showFrameItem(page: Page, item: number) {
  await openControlGroup(page, 'space');
  await page.locator('#hc-frame-panel .hc-frame-item').nth(item).click();
}

test('a phone’s small print: hints and notes at 14 px, no larger than the answers, the stamp’s tags at 12 (F54)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport runs once');
  await openHangarPage(page, { width: 360, height: 800 });
  const answers = await fontSizes(page, '#hc-step-task .hc-option-card span');
  const notes = [...await fontSizes(page, '#hc-step-task .hc-field-note')];
  await openControlGroup(page, 'dimensions');
  await page.locator('#hc-step-size .hc-more > summary').click();
  notes.push(...await fontSizes(page, '#hc-step-size :is(.hc-field-hint, .hc-field-note)'));
  await openControlGroup(page, 'openings');
  notes.push(...await fontSizes(page, '#hc-step-shell .hc-field-note'));
  // «Стіни й ворота» asks one question since 10.10 (round 5) and its notes come only with a cold store or a scope without
  // walls: «Каркас» and «Обсяг» carry the rest of the small print
  await openControlGroup(page, 'space');
  notes.push(...await fontSizes(page, '#hc-step-frame .hc-field-note'));
  await openControlGroup(page, 'scope');
  notes.push(...await fontSizes(page, '#hc-step-check .hc-field-note'));
  expect(notes.length).toBeGreaterThanOrEqual(4);
  for (const size of notes) expect(size).toBe(14);
  expect(Math.max(...notes)).toBeLessThanOrEqual(Math.min(...answers));
  // the stamp: a changed width makes the example's values say «з прикладу»
  await openControlGroup(page, 'dimensions');
  await page.fill('#hc-dimension-width', '20');
  await page.locator('#hc-dimension-width').blur();
  const tags = await fontSizes(page, '#hc-stamp .hc-fact-status');
  expect(tags.length).toBeGreaterThan(0);
  for (const size of tags) expect(size).toBe(12);
  for (const size of await fontSizes(page, '#hc-stamp :is(.hc-summary-handoff p, .hc-summary-disclaimer)')) expect(size).toBe(14);
});

test('3D on a phone: no table of sizes, the sheet as tall as the drawing’s, and the mini drawing brings the drawing back (F55)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport runs once');
  await openHangarPage(page, { width: 390, height: 844 });
  await bringSheetIntoView(page);
  const drawing = (await sheetOf(page).boundingBox())!;
  await pictureOf(page).getByRole('button', { name: 'Подивитися в 3D', exact: true }).click();
  await expect(pictureOf(page).locator('canvas')).toBeVisible({ timeout: 20_000 });
  await expect(pictureOf(page).locator('.hc-three-overlay')).toBeHidden();
  await expect(pictureOf(page).locator('.hc-three-overlay-toggle')).toBeHidden();
  expect(Math.abs((await sheetOf(page).boundingBox())!.height - drawing.height)).toBeLessThanOrEqual(1);
  // the chips stay at the top right of the picture
  const field = (await pictureOf(page).boundingBox())!;
  const tools = (await pictureOf(page).locator('.hc-sheet-tools').boundingBox())!;
  expect(tools.y - field.y).toBeLessThan(16);
  expect(field.x + field.width - (tools.x + tools.width)).toBeLessThan(16);
  // the mini drawing has no chip to go back by: 3D goes as it comes
  await scrollToMiniHold(page);
  await expect(pictureOf(page).locator('canvas')).toHaveCount(0);
  await expect(pictureOf(page).locator('.hc-preview-svg')).toBeVisible();
});

test('the cladding legend names its materials on a phone’s whole sheet, inside it, and the mini keeps the glyphs (F56)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
  for (const [width, height] of [[320, 568], [360, 800], [390, 844]] as const) {
    await openHangarPage(page, { width, height });
    await bringSheetIntoView(page);
    const legend = pictureOf(page).locator('.hc-section');
    await expect(legend.locator('figcaption')).toBeVisible();
    await expect(legend.locator('dd span')).toHaveCount(2);
    for (const name of await legend.locator('dd span').all()) await expect(name).toBeVisible();
    const field = (await pictureOf(page).boundingBox())!;
    const box = (await legend.boundingBox())!;
    expect(box.x + box.width, `${width}`).toBeLessThanOrEqual(field.x + field.width);
    for (const size of await fontSizes(page, '#configurator .hc-section dd span')) expect(size).toBeGreaterThanOrEqual(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (height >= 800) {
      await scrollToMiniHold(page);
      await expect(legend.locator('figcaption')).toBeHidden();
      for (const name of await legend.locator('dd span').all()) await expect(name).toBeHidden();
    }
  }
});

test('the frame’s node numbers read at 8 px or more on a 320 px phone (6.9 before), in rings of the same size (F74)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport runs once');
  await openHangarPage(page, { width: 320, height: 568 });
  await showFrameItem(page, 1);
  const marks = await page.locator('#configurator .ft-node').evaluateAll((nodes) => nodes.map((node) => {
    const number = node.querySelector<SVGTextElement>('.ft-node-number')!;
    const ring = node.querySelector('.ft-node-ring')!.getBoundingClientRect();
    const ctm = number.getScreenCTM()!;
    const box = number.getBoundingClientRect();
    return {
      px: Number.parseFloat(getComputedStyle(number).fontSize) * Math.hypot(ctm.a, ctm.b),
      inside: box.left >= ring.left && box.right <= ring.right,
      centre: Math.abs((box.top + box.bottom) / 2 - (ring.top + ring.bottom) / 2),
    };
  }));
  expect(marks.length).toBeGreaterThanOrEqual(3);
  for (const mark of marks) {
    // 6.9 px before (10.5 → 12.5 in the ring, the audit's own figure)
    expect(mark.px).toBeGreaterThanOrEqual(8);
    expect(mark.inside).toBe(true);
    expect(mark.centre).toBeLessThanOrEqual(1.5);
  }
});

test('«Як працює ваш каркас» is a legend: no boxes, rules between rows, a copper rule on the shown one, a line above (F29)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the look is viewport-independent');
  await openHangarPage(page, { width: 1440, height: 900 });
  await showFrameItem(page, 1);
  const items = page.locator('#hc-frame-panel .hc-frame-item');
  const looks = await items.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { top: style.borderTopWidth, right: style.borderRightWidth, bottom: style.borderBottomWidth, left: style.borderLeftWidth, leftColor: style.borderLeftColor, background: style.backgroundColor, height: element.getBoundingClientRect().height };
  }));
  const accent = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--color-accent)';
    document.querySelector('#hc-frame-panel')!.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  for (const [index, look] of looks.entries()) {
    expect(look.top).toBe('0px');
    expect(look.right).toBe('0px');
    expect(look.bottom).toBe('1px');
    expect(look.background).toBe('rgba(0, 0, 0, 0)');
    expect(look.height).toBeGreaterThanOrEqual(44);
    if (index === 1) expect(look.leftColor).toBe(accent);
    else expect(look.leftColor).not.toBe(accent);
  }
  // the line that says what the list is for, between the heading and the list
  const intro = page.locator('#hc-frame-panel .hc-frame-intro');
  await expect(intro).toHaveText(/^Для довідки/);
  const introBox = (await intro.boundingBox())!;
  expect(introBox.y).toBeGreaterThan((await page.locator('#hc-frame-panel .hc-frame-heading').boundingBox())!.y);
  expect(introBox.y + introBox.height).toBeLessThanOrEqual((await page.locator('#hc-frame-panel .hc-frame-list').boundingBox())!.y);
});

test('the stamp’s values in a row stand on one line, with and without a status tag (F108)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
  for (const [width, height] of [[1440, 900], [1180, 820], [375, 812]] as const) {
    await openHangarPage(page, { width, height });
    await openControlGroup(page, 'envelope');
    // the envelope answered, the cladding not: «з прикладу» beside one label, none beside the other
    await page.locator('#hc-step-shell .hc-option-card').filter({ hasText: 'Без утеплення' }).click();
    const rows = await page.locator('#hc-stamp .hc-summary-facts > div').evaluateAll((cells) => {
      const byRow = new Map<number, number[]>();
      for (const cell of cells) {
        const top = Math.round(cell.getBoundingClientRect().top);
        byRow.set(top, [...(byRow.get(top) ?? []), cell.querySelector('dd')!.getBoundingClientRect().top]);
      }
      return [...byRow.values()];
    });
    expect(rows.some((row) => row.length > 1)).toBe(true);
    for (const row of rows) expect(Math.max(...row) - Math.min(...row), `${width}`).toBeLessThanOrEqual(1);
  }
});

test('one tick for every answer: the chips’ is the tiles’ corner tick, clear of the words at 320–390 px (F109)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
  for (const width of [320, 360, 390, 1440]) {
    await openHangarPage(page, { width, height: 844 });
    await openControlGroup(page, 'openings');
    const ticks = await page.locator('#hc-step-shell .hc-option-card input:checked + span').evaluateAll((spans) => spans.map((span) => {
      const tick = getComputedStyle(span, '::before');
      const range = document.createRange();
      range.selectNodeContents(span);
      const words = range.getBoundingClientRect();
      const box = span.getBoundingClientRect();
      return { chip: span.closest('.hc-chips') !== null, geometry: `${tick.width} ${tick.height} ${tick.left} ${tick.top}`, wordsLeft: words.left - box.left, wordsTop: words.top - box.top, lines: range.getClientRects().length };
    }));
    const tiles = ticks.filter((tick) => !tick.chip);
    const chips = ticks.filter((tick) => tick.chip);
    expect(tiles.length).toBeGreaterThan(0);
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(chip.geometry).toBe(tiles[0].geometry);
      // a one-line chip's words start past the tick's corner (7 + 7 px) and under its lowest point
      expect(chip.lines).toBe(1);
      expect(chip.wordsLeft, `${width}`).toBeGreaterThanOrEqual(14);
      expect(chip.wordsTop, `${width}`).toBeGreaterThanOrEqual(12);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
});

test('«Ще не знаю» chosen is outlined, not filled like an answer (F110)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the look is viewport-independent');
  await openHangarPage(page, { width: 1440, height: 900 });
  // matched whole: «Склад» stands beside «Холодильний склад» since 10.10 (round 5)
  const exactly = (label: string) => new RegExp(`^${label}$`);
  const look = (label: string) => page.locator('#hc-step-task .hc-option-card span').filter({ hasText: exactly(label) }).evaluate((span) => {
    const style = getComputedStyle(span);
    return { border: style.borderTopStyle, background: style.backgroundColor, checked: (span.previousElementSibling as HTMLInputElement).checked };
  });
  const unsure = await look('Ще не знаю');
  const other = await look('Склад');
  expect(unsure.checked).toBe(true);
  expect(unsure.border).toBe('dashed');
  // not filled: the same paper as an answer not chosen
  expect(unsure.background).toBe(other.background);
  await page.locator('#hc-step-task .hc-option-card').filter({ hasText: exactly('Склад') }).click();
  const chosen = await look('Склад');
  expect(chosen.checked).toBe(true);
  expect(chosen.border).toBe('solid');
  expect(chosen.background).not.toBe(other.background);
  // «Допоможіть визначити» is an answer: solid
  await openControlGroup(page, 'scope');
  const help = await page.locator('#hc-step-check .hc-option-card span').filter({ hasText: 'Допоможіть визначити' }).evaluate((span) => getComputedStyle(span).borderTopStyle);
  expect(help).toBe('solid');
});

test('the wide legend’s caption lies in two lines (F111)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the wide sheet is the desktop’s');
  await openHangarPage(page, { width: 1440, height: 900 });
  await bringSheetIntoView(page);
  const lines = await pictureOf(page).locator('.hc-section figcaption').evaluate((caption) => {
    const range = document.createRange();
    range.selectNodeContents(caption);
    return new Set([...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top))).size;
  });
  expect(lines).toBe(2);
});

test('the 3D picture’s actions speak in words, as «Подивитися в 3D», and the drawing’s labels in capitals (F112)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
  for (const [width, height] of [[1440, 900], [360, 800], [320, 640]] as const) {
    await openHangarPage(page, { width, height });
    await bringSheetIntoView(page);
    const three = pictureOf(page).getByRole('button', { name: 'Подивитися в 3D', exact: true });
    const voice = await three.evaluate((element) => `${getComputedStyle(element).fontSize} ${getComputedStyle(element).textTransform} ${getComputedStyle(element).fontFamily}`);
    await three.click();
    await expect(pictureOf(page).locator('canvas')).toBeVisible({ timeout: 20_000 });
    const actions = pictureOf(page).locator(':is(.hc-sheet-tools button, .hc-three-overlay-toggle)');
    const boxes: { x: number; y: number; width: number; height: number }[] = [];
    for (const action of await actions.all()) {
      if (!(await action.isVisible())) continue;
      expect(await action.evaluate((element) => `${getComputedStyle(element).fontSize} ${getComputedStyle(element).textTransform} ${getComputedStyle(element).fontFamily}`)).toBe(voice);
      boxes.push((await action.boundingBox())!);
    }
    expect(boxes.length).toBeGreaterThanOrEqual(2);
    for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) {
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${width}`).toBe(true);
    }
    if (width === 1440) {
      await expect(pictureOf(page).locator('.hc-three-overlay dt').first()).toHaveCSS('text-transform', 'uppercase');
      const readout = (await pictureOf(page).locator('.hc-three-overlay').boundingBox())!;
      for (const box of boxes) expect(box.y + box.height).toBeLessThan(readout.y);
    }
  }
});

test('the configurator’s boxes are square 18 px boxes with the copper tick, words at 14 px, native in forced colours (F113)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the look is viewport-independent');
  await openHangarPage(page, { width: 1440, height: 900 });
  await openControlGroup(page, 'dimensions');
  const row = page.locator('#hc-step-size .hc-checkbox-row');
  const box = row.locator('input');
  const look = () => box.evaluate((input) => {
    const style = getComputedStyle(input);
    const tick = getComputedStyle(input.nextElementSibling!, '::before');
    return { appearance: style.appearance, radius: style.borderTopLeftRadius, size: `${input.getBoundingClientRect().width}×${input.getBoundingClientRect().height}`, background: style.backgroundColor, tick: tick.opacity, words: getComputedStyle(input.nextElementSibling!).fontSize };
  });
  const off = await look();
  expect(off).toMatchObject({ appearance: 'none', radius: '0px', size: '18×18', tick: '0', words: '14px' });
  await row.click();
  const on = await look();
  expect(on.tick).toBe('1');
  expect(on.background).not.toBe(off.background);
  // «Окремі роботи» on step 5 has the same boxes
  await openControlGroup(page, 'scope');
  await page.locator('#hc-step-check .hc-option-card').filter({ hasText: 'Окремі роботи' }).click();
  for (const input of await page.locator('#hc-step-check .hc-checkbox-row input').all()) {
    await expect(input).toHaveCSS('appearance', 'none');
    await expect(input).toHaveCSS('border-top-left-radius', '0px');
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await openControlGroup(page, 'dimensions');
  expect(await box.evaluate((input) => getComputedStyle(input).appearance)).toBe('auto');
});

test('each size is shown once, in its field, with its metre inside the field — «10,55» holds at 320 px (F114)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
  for (const [width, height] of [[1440, 900], [320, 640]] as const) {
    await openHangarPage(page, { width, height });
    await openControlGroup(page, 'dimensions');
    await expect(page.locator('#hc-step-size .hc-field-value')).toHaveCount(0);
    for (const key of ['width', 'length', 'height']) {
      const field = page.locator(`#hc-dimension-${key}`);
      const unit = page.locator(`#hc-step-size .hc-field:has(#hc-dimension-${key}) .hc-field-unit`);
      await expect(unit).toHaveText('м');
      const [f, u] = [(await field.boundingBox())!, (await unit.boundingBox())!];
      expect(u.x).toBeGreaterThan(f.x);
      expect(u.x + u.width).toBeLessThan(f.x + f.width);
      expect(u.y).toBeGreaterThan(f.y);
      expect(u.y + u.height).toBeLessThan(f.y + f.height);
    }
    const height3 = page.locator('#hc-dimension-height');
    await height3.fill('10,55');
    // the typed figures fit before the metre: nothing scrolls inside the field
    expect(await height3.evaluate((input: HTMLInputElement) => input.scrollWidth <= input.clientWidth)).toBe(true);
    await height3.blur();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
});

test('the frame tour’s progress bars show only while it plays (F115)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the tour is viewport-independent');
  await openHangarPage(page, { width: 1440, height: 900 }, 'no-preference');
  await showFrameItem(page, 3);
  const bars = page.locator('#configurator .hc-frame .dn-progress');
  await expect(bars).toBeHidden();
  const play = page.locator('#hc-frame-panel .hc-frame-play button');
  await play.click();
  await expect(bars).toBeVisible();
  await play.click();
  await expect(bars).toBeHidden();
});

test('the frame tour’s play control stays put over the list while the tour plays (F118)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
  test.setTimeout(90_000);
  for (const [width, height] of [[390, 844], [1440, 900]] as const) {
    await openHangarPage(page, { width, height }, 'no-preference');
    await openControlGroup(page, 'space');
    const play = page.locator('#hc-frame-panel .hc-frame-play button');
    await play.scrollIntoViewIfNeeded();
    expect((await play.boundingBox())!.y).toBeLessThan((await page.locator('#hc-frame-panel .hc-frame-list').boundingBox())!.y);
    await play.click();
    await expect(play).toHaveText('Зупинити показ');
    // through the span and into «Ферма», whose nodes' buttons come under the list: where the control is, and what is shown
    // sampled in the page every 250 ms until «Ферма» has shown and at least 24 samples are in (at most 200)
    const samples = await page.evaluate(() => new Promise<{ top: number; shown: number }[]>((resolve) => {
      const taken: { top: number; shown: number }[] = [];
      const sample = () => {
        taken.push({
          top: document.querySelector('#hc-frame-panel .hc-frame-play button')!.getBoundingClientRect().top,
          shown: [...document.querySelectorAll('#hc-frame-panel .hc-frame-item')].findIndex((item) => item.getAttribute('aria-pressed') === 'true'),
        });
        if ((taken.some((one) => one.shown === 1) && taken.length >= 24) || taken.length >= 200) resolve(taken);
        else setTimeout(sample, 250);
      };
      sample();
    }));
    expect(samples.length).toBeLessThan(200);
    const tops = samples.map((sample) => sample.top);
    expect(Math.max(...tops) - Math.min(...tops), `${width}`).toBeLessThanOrEqual(1);
    const box = (await play.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(height);
  }
});

test('the frame’s nodes: 44 px buttons under the drawing, and on it targets of about 30 px that never meet (F119)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
  for (const [width, height, least] of [[320, 568, 23], [390, 844, 28], [1440, 900, 40]] as const) {
    await openHangarPage(page, { width, height });
    await showFrameItem(page, 1);
    for (const button of await page.locator('#hc-frame-panel .hc-frame-node').all()) {
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    const zones = await page.locator('#configurator .ft-node').evaluateAll((nodes) => nodes.map((node) => {
      const hit = node.querySelector('.ft-node-hit')!.getBoundingClientRect();
      return { x: hit.left + hit.width / 2, y: hit.top + hit.height / 2, r: hit.width / 2 };
    }));
    expect(zones.length).toBeGreaterThanOrEqual(3);
    for (const [i, a] of zones.entries()) {
      expect(a.r * 2, `${width}`).toBeGreaterThanOrEqual(least);
      for (const b of zones.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
    }
  }
});
