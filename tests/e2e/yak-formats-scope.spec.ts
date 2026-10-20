import { expect, test, type Locator, type Page } from '@playwright/test';
import { participationChoices } from '../../app/lib/deliveryModelPresentation';

// /yak-pratsyuiemo «Який обсяг робіт можемо взяти на себе» — one flat section of a building, redrawn for the format in
// focus (owner, 05.10: the oblique wireframe did not explain enough). Until Phase 3 the same block stood on /napryamky
// too, and these checks ran there; that page now links here (DEC-45, PROPOSED). They pin what the drawing promises:
// the whole building is RUBIKON's in the first format and exactly one package at a time in the other two; a general
// contractor's project gets its outer frame; the two facts under the drawing are the Delivery Model's; and the block
// walks through the formats once on first view, which a press ends (here pointing does not choose: it would rewrite
// the responsibility map below on the way to it).
// On a phone or a tablet (≤ 1050 px; owner 20.10, PDO-06 / OD-PX-22 a) the three formats are one segmented row above
// the drawing, so a tap redraws what is right under the finger, and the block does not walk through them by itself.

const GRID = '#obsiah .dfmt-grid';

test('each format redraws the section: the whole complex, one package, one package inside a general contractor’s project', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  const drawing = grid.locator('svg.fs');
  const options = grid.locator('.dfmt-option');
  const choices = participationChoices();
  await expect(options).toHaveCount(choices.length);
  await expect(grid.locator('.dfmt-figure img')).toHaveCount(0);
  await expect(grid.locator('.dfmt-caption')).toContainText('Схема');
  // Every button carries its format's two facts for a screen reader (the copy under the drawing is aria-hidden) —
  // as hidden text: it takes no room on the page
  await expect(options.locator('.dfmt-sr')).toHaveText(choices.map((choice) => `Договір: ${choice.contractWith} і RUBIKON. Координує об’єкт: ${choice.coordinator}.`));
  expect(await options.locator('.dfmt-sr').evaluateAll((notes) => Math.max(...notes.map((note) => note.getBoundingClientRect().height)))).toBeLessThanOrEqual(1);

  for (const [index, choice] of choices.entries()) {
    await options.nth(index).click();
    await expect(options.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect(drawing).toHaveAttribute('data-format', choice.id);
    // RUBIKON's scope on the drawing and in the tags under it
    const whole = choice.id === 'comprehensive';
    await expect(drawing.locator('.fs-layer[data-scope]')).toHaveCount(whole ? 4 : 1);
    await expect(grid.locator('.dfmt-packages li[data-scope]')).toHaveCount(whole ? 3 : 1);
    // The two facts, in the model's words (each line keeps every format's words in one place, the shown one visible)
    await expect(grid.locator('.dfmt-terms dd').first().locator('[data-on]')).toHaveText(`${choice.contractWith} — RUBIKON`);
    await expect(grid.locator('.dfmt-terms dd').nth(1).locator('[data-on]')).toHaveText(choice.coordinator);
    await expect(grid.locator('.dfmt-terms dd [data-on]')).toHaveCount(2);
    // The outer frame is a general contractor's project and nothing else
    await expect(drawing.locator('.fs-outer')).toHaveCSS('opacity', choice.id === 'subcontract' ? '1' : '0');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test('the block walks through the formats once on first view and comes back to the first; in «one package» the packages take turns', async ({ page }) => {
  // The walk is a wide screen's: at ≤ 1050 px it is off (PDO-06), so every project checks it at 1440
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.install();
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  const drawing = grid.locator('svg.fs');
  await grid.scrollIntoViewIfNeeded();
  await expect(drawing).toHaveAttribute('data-format', 'comprehensive');
  // (the observer that arms the walk is not on the clock, so its first step is polled for)
  await expect.poll(async () => { await page.clock.runFor(400); return drawing.getAttribute('data-format'); }, { timeout: 15_000 }).toBe('work-package');
  const scoped = () => drawing.locator('.fs-layer[data-scope]').getAttribute('data-layer');
  const first = await scoped();
  await page.clock.runFor(1200);
  expect(await scoped()).not.toBe(first);
  await page.clock.runFor(20_000);
  await expect(drawing).toHaveAttribute('data-format', 'comprehensive');
});

test('a press ends the walk', async ({ page }) => {
  await page.clock.install();
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  await grid.scrollIntoViewIfNeeded();
  await grid.locator('.dfmt-option').nth(2).click();
  await page.clock.runFor(20_000);
  await expect(grid.locator('svg.fs')).toHaveAttribute('data-format', 'subcontract');
});

// ---- PDO-06: at ≤ 1050 px the formats are a segmented row above the drawing ----

const NARROW = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
] as const;

/** The top of what the fixed header leaves of the window */
const headerEdge = (page: Page) => page.evaluate(() => Math.max(0, document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0));

/** Scrolls so that the element is where a visitor reads it: its centre at the window's centre, or its top just under
 *  the header. Twice, as the header may change height once the page has scrolled. */
async function place(page: Page, element: Locator, where: 'centre' | 'top') {
  for (let pass = 0; pass < 2; pass += 1) {
    const edge = await headerEdge(page);
    await element.evaluate((node, { where, edge }) => {
      const box = node.getBoundingClientRect();
      const top = where === 'centre' ? box.top + window.scrollY + box.height / 2 - window.innerHeight / 2 : box.top + window.scrollY - edge - 12;
      window.scrollTo({ top, behavior: 'instant' });
    }, { where, edge });
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  }
}

/** A tap where a finger taps: at the button's centre, with no scrolling first (Playwright's own tap and click scroll a
 *  button that is inside its scroll margin — 116 px under the top — into view, which a finger does not) */
async function tapAt(page: Page, element: Locator, isMobile: boolean) {
  const box = await element.boundingBox();
  if (!box) throw new Error('the button is not on the page');
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await (isMobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
}

/** The share of the element between the header's bottom edge and the window's bottom edge */
const onScreen = (page: Page, element: Locator) => headerEdge(page).then((edge) => element.evaluate((node, edge) => {
  const box = node.getBoundingClientRect();
  return Math.max(0, Math.min(box.bottom, window.innerHeight) - Math.max(box.top, edge)) / box.height;
}, edge));

for (const viewport of NARROW) {
  test(`on ≤ 1050 px the formats are one row above the drawing, and every tap leaves the drawing on screen: ${viewport.width}×${viewport.height}`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(viewport);
    await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const grid = page.locator(GRID);
    const drawing = grid.locator('svg.fs');
    const options = grid.locator('.dfmt-option');
    const choices = participationChoices();

    // From a reading position — the tapped button centred, or the row just under the header — in the order 2 → 3 → 1,
    // so every tap redraws: the drawing is on screen (≥ 90 %) and the page has not jumped
    const misses: string[] = [];
    for (const where of ['centre', 'top'] as const) {
      for (const index of [1, 2, 0]) {
        const option = options.nth(index);
        await place(page, option, where);
        const before = await page.evaluate(() => window.scrollY);
        await tapAt(page, option, isMobile);
        await expect(drawing).toHaveAttribute('data-format', choices[index].id);
        await expect(option).toHaveAttribute('aria-pressed', 'true');
        const share = await onScreen(page, drawing);
        const moved = Math.abs((await page.evaluate(() => window.scrollY)) - before);
        if (share < 0.9 || moved > 8) misses.push(`${where}, format ${index + 1}: drawing ${Math.round(share * 100)} % on screen, page moved ${Math.round(moved)} px`);
      }
    }
    expect(misses).toEqual([]);

    // The row: three segments side by side above the drawing, each at least a finger tall, none overflowing
    const boxes = await options.evaluateAll((buttons) => buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { top: Math.round(box.top), height: box.height, overflow: button.scrollWidth - button.clientWidth };
    }));
    expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
    for (const box of boxes) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.overflow).toBe(0);
    }
    const listBottom = await grid.locator('.dfmt-list').evaluate((list) => list.getBoundingClientRect().bottom);
    const drawingBox = await drawing.evaluate((svg) => { const box = svg.getBoundingClientRect(); return { top: box.top, bottom: box.bottom }; });
    expect(drawingBox.top).toBeGreaterThan(listBottom);
    // …and the row and the whole drawing fit one screen under the header
    const listTop = await grid.locator('.dfmt-list').evaluate((list) => list.getBoundingClientRect().top);
    expect(drawingBox.bottom - listTop).toBeLessThanOrEqual(viewport.height - (await headerEdge(page)));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }] as const) {
  test(`on ≤ 1050 px the block does not walk through the formats: ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize(viewport);
    await page.clock.install();
    await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
    const grid = page.locator(GRID);
    const drawing = grid.locator('svg.fs');
    await place(page, grid.locator('.dfmt-figure'), 'top');
    // The observer that would arm the walk is not on the clock: wait until it has seen the drawing
    await expect(grid.locator('.dfmt-figure')).toHaveAttribute('data-live');
    for (let step = 0; step < 40; step += 1) {
      await page.clock.runFor(500);
      expect(await drawing.getAttribute('data-format'), `after ${(step + 1) * 0.5} s`).toBe('comprehensive');
    }
    await expect(grid.locator('.dfmt-option[aria-pressed="true"]')).toHaveCount(1);
    await expect(grid.locator('.dfmt-option').first()).toHaveAttribute('aria-pressed', 'true');
  });
}

test('on ≤ 1050 px the keyboard chooses: focus alone changes nothing, Enter and Space choose, the ring stands outside the segment', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  const drawing = grid.locator('svg.fs');
  const options = grid.locator('.dfmt-option');
  await place(page, grid.locator('.dfmt-list'), 'top');
  await expect(grid.locator('.dfmt-figure')).toHaveAttribute('data-live');
  await options.first().focus();
  await page.keyboard.press('Tab');
  await expect(options.nth(1)).toBeFocused();
  // Ten seconds on the second format: neither the focus nor anything else has chosen it
  await page.clock.runFor(10_000);
  await expect(options.nth(1)).toHaveAttribute('aria-pressed', 'false');
  await expect(drawing).toHaveAttribute('data-format', 'comprehensive');
  await expect(page.locator('.proc-resp-switch input[value="comprehensive"]')).toBeChecked();
  // The site's own ring, outside the segment and over its neighbours (not the map switcher's inset one)
  const ring = await options.nth(1).evaluate((button) => { const style = getComputedStyle(button); return { style: style.outlineStyle, offset: parseFloat(style.outlineOffset) }; });
  expect(ring.style).toBe('solid');
  expect(ring.offset).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Enter');
  await expect(options.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(drawing).toHaveAttribute('data-format', 'work-package');
  await expect(page.locator('.proc-resp-switch input[value="work-package"]')).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(options.nth(2)).toBeFocused();
  await expect(drawing).toHaveAttribute('data-format', 'work-package');
  await page.keyboard.press('Space');
  await expect(options.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(drawing).toHaveAttribute('data-format', 'subcontract');
});

test('with reduced motion nothing in the scope block animates after a tap', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  const options = grid.locator('.dfmt-option');
  const motion = () => page.evaluate(() => document.getAnimations()
    .filter((animation) => { const target = (animation.effect as KeyframeEffect | null)?.target; return Boolean(target?.closest('#obsiah')); })
    .map((animation) => {
      const timing = animation.effect!.getComputedTiming();
      return { duration: Number(timing.duration), iterations: Number(timing.iterations), state: animation.playState };
    }));
  await place(page, grid.locator('.dfmt-list'), 'top');
  for (const index of [1, 2, 0]) {
    await (isMobile ? options.nth(index).tap() : options.nth(index).click());
    // whatever starts is a step (≤ 1 ms), and nothing loops
    for (const animation of await motion()) {
      expect(animation.duration).toBeLessThanOrEqual(1);
      expect(Number.isFinite(animation.iterations)).toBe(true);
    }
    // and nothing is left running: polled on the page's own animation list, not a fixed wait
    await expect.poll(async () => (await motion()).filter((animation) => animation.state === 'running'), { timeout: 2_000 }).toEqual([]);
  }
});

test('the chosen format’s summary stands under the drawing, out of the accessibility tree; the button keeps it in its name', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  const options = grid.locator('.dfmt-option');
  const chosen = grid.locator('.dfmt-figure .dfmt-chosen');
  const choices = participationChoices();
  await expect(grid.locator('.dfmt-list')).toHaveAttribute('aria-label', 'Формат участі');
  await expect(chosen).toHaveAttribute('aria-hidden', 'true');
  // under the caption, before the facts
  expect(await chosen.evaluate((line) => line.previousElementSibling?.matches('figcaption') && line.nextElementSibling?.matches('.dfmt-facts'))).toBe(true);
  // the summary is the button's own text — no new words — and hidden there only to the eye
  expect(await options.locator('.dfmt-text').evaluateAll((texts) => Math.max(...texts.map((text) => text.getBoundingClientRect().height)))).toBeLessThanOrEqual(1);
  const escape = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  for (const [index, choice] of choices.entries()) {
    await (isMobile ? options.nth(index).tap() : options.nth(index).click());
    await expect(chosen.locator('[data-on]')).toHaveText(choice.text);
    await expect(chosen.locator('[data-on]')).toBeVisible();
    for (const words of [choice.title, choice.text, `Договір: ${choice.contractWith} і RUBIKON.`, `Координує об’єкт: ${choice.coordinator}.`]) {
      await expect(options.nth(index)).toHaveAccessibleName(escape(words));
    }
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the formats keep their words on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
    const grid = page.locator(GRID);
    for (const text of await grid.locator('.dfmt-option .dfmt-text').all()) await expect(text).toBeVisible();
    expect(await grid.locator('.dfmt-option .dfmt-text').evaluateAll((texts) => Math.min(...texts.map((text) => text.getBoundingClientRect().height)))).toBeGreaterThan(20);
    await expect(grid.locator('.dfmt-chosen')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
});
