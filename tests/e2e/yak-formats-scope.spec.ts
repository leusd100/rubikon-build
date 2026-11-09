import { expect, test, type Page } from '@playwright/test';
import { participationChoices } from '../../app/lib/deliveryModelPresentation';

// /yak-pratsyuiemo «Який обсяг робіт можемо взяти на себе» — the three formats side by side, compared row by row; a
// value several formats share is one cell across their columns, a value that sets a format apart carries a copper
// mark (owner 09.11, mockup 02 · B «Спільне й різне»; until then one drawing redrawn for the format in focus, behind
// three buttons). These checks pin what the block promises: every format's words are the Delivery Model's; the
// whole building is RUBIKON's in the first format and one package at a time in the other two; a general contractor's
// project gets its outer frame; the contract with the customer, shared by the first two formats, is said once; the
// cells keep their columns for assistive technology (ARIA table roles and spans, as the responsibility map — the page
// has no <table>); nothing here is a choice. At ≤ 1050 px the rows stack under three titles and drawings side by side.

const GRID = '#obsiah .dfmt-grid';
const choices = participationChoices();
/** Neighbouring formats with the same value, as the block groups them */
const grouped = (values: readonly string[]) => values.reduce<{ value: string; span: number }[]>((runs, value) => {
  const last = runs.at(-1);
  if (last?.value === value) last.span += 1;
  else runs.push({ value, span: 1 });
  return runs;
}, []);
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [1440, 390]) {
  test(`the three formats stand side by side in the model’s words; what they share is said once: ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
    const grid = page.locator(GRID);
    const table = page.getByRole('table', { name: 'Формати участі' });
    await expect(table).toBeVisible();
    // a column per format, under a column of row names
    await expect(table.getByRole('columnheader')).toHaveCount(choices.length + 1);
    await expect(grid.locator('.dfmt-head .dfmt-title')).toHaveText(choices.map((choice) => choice.title));
    await expect(grid.locator('[data-row="text"] .dfmt-value')).toHaveText(choices.map((choice) => choice.text));
    // the other party of the contract: the customer twice in a row — one cell across two columns
    const contract = grouped(choices.map((choice) => `${choice.contractWith} — RUBIKON`));
    expect(contract.map((run) => run.span)).toEqual([2, 1]);
    const contractCells = grid.locator('[data-row="contract"] [role="cell"]');
    await expect(contractCells.locator('.dfmt-value')).toHaveText(contract.map((run) => run.value));
    await expect(contractCells.first()).toHaveAttribute('aria-colspan', '2');
    await expect(contractCells.last()).toHaveAttribute('data-differs', 'true');
    // who coordinates: three different answers, each marked as what sets its format apart
    const coordinator = grid.locator('[data-row="coordinator"] [role="cell"]');
    await expect(coordinator.locator('.dfmt-value')).toHaveText(choices.map((choice) => choice.coordinator));
    for (const cell of await coordinator.all()) await expect(cell).toHaveAttribute('data-differs', 'true');
    // RUBIKON's scope: the whole complex, then one package for the other two, said once
    const scope = grid.locator('[data-row="scope"] [role="cell"]');
    await expect(scope).toHaveCount(2);
    await expect(scope.last()).toHaveAttribute('aria-colspan', '2');
    await expect(scope.first().locator('.dfmt-packages li[data-scope]')).toHaveCount(3);
    await expect(scope.last().locator('.dfmt-packages li[data-scope]')).toHaveCount(1);
    // a drawing per format: the whole building copper in the first; one package at rest (the foundation) in the others;
    // the outer frame is a general contractor's project and nothing else
    const drawings = grid.locator('svg.fs');
    await expect(drawings).toHaveCount(choices.length);
    for (const [index, choice] of choices.entries()) {
      const drawing = drawings.nth(index);
      await expect(drawing).toHaveAttribute('data-format', choice.id);
      await expect(drawing.locator('.fs-layer[data-scope]')).toHaveCount(choice.id === 'comprehensive' ? 4 : 1);
      await expect(drawing.locator('.fs-outer')).toHaveCount(choice.id === 'subcontract' ? 1 : 0);
    }
    // nothing here is a choice: the responsibility map below keeps its own switcher
    await expect(grid.locator('button, input')).toHaveCount(0);
    expect(await overflow(page)).toBe(0);
  });
}

test('in «one package» the packages take one turn each and rest on the first, once, in both formats together', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.install();
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  const drawings = grid.locator('.dfmt-row-draw');
  const scoped = () => grid.locator('svg.fs').evaluateAll((all) => all.slice(1)
    .map((drawing) => drawing.querySelector('.fs-layer[data-scope]')?.getAttribute('data-layer')).join(' '));
  expect(await scoped()).toBe('foundation foundation');
  await drawings.evaluate((row) => row.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(grid).toHaveAttribute('data-live', 'true');
  // The site's auto-show (useFirstViewWalk): its observer is not on the clock, so the first step is polled for
  await expect.poll(async () => { await page.clock.runFor(400); return scoped(); }, { timeout: 15_000 }).toBe('frame frame');
  // the tags follow the drawings
  await expect(grid.locator('[data-row="scope"] [role="cell"]').last().locator('li[data-scope]')).toHaveText('Каркас');
  await page.clock.runFor(2200);
  expect(await scoped()).toBe('roof roof');
  await page.clock.runFor(2200);
  expect(await scoped()).toBe('foundation foundation');
  // Once: the block back in view does not walk again
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.clock.runFor(1000);
  await drawings.evaluate((row) => row.scrollIntoView({ block: 'center', behavior: 'instant' }));
  for (let wait = 0; wait < 5; wait += 1) {
    await page.clock.runFor(2200);
    expect(await scoped()).toBe('foundation foundation');
  }
});

test('the packages walk waits until half the drawings are on screen, and a press on the block ends it at rest', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.install();
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  const drawings = grid.locator('.dfmt-row-draw');
  const scoped = () => grid.locator('svg.fs').nth(1).locator('.fs-layer[data-scope]').getAttribute('data-layer');
  // the drawings' row a little over the fold: under half of it on screen
  await drawings.evaluate((row) => window.scrollTo({ top: row.getBoundingClientRect().top + window.scrollY - window.innerHeight + row.getBoundingClientRect().height * 0.3, behavior: 'instant' }));
  for (let wait = 0; wait < 4; wait += 1) {
    await page.clock.runFor(2200);
    expect(await scoped()).toBe('foundation');
  }
  await expect(grid).not.toHaveAttribute('data-live');
  await drawings.evaluate((row) => row.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect.poll(async () => { await page.clock.runFor(400); return scoped(); }, { timeout: 15_000 }).toBe('frame');
  await grid.locator('[data-row="text"]').click();
  await expect.poll(scoped).toBe('foundation');
  await page.clock.runFor(10_000);
  expect(await scoped()).toBe('foundation');
});

test('/yak-pratsyuiemo nothing in the formats block loops while it is on screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  await grid.locator('.dfmt-row-draw').evaluate((row) => row.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(grid).toHaveAttribute('data-live', 'true');
  const endless = () => page.evaluate(() => document.getAnimations()
    .filter((animation) => animation.effect?.getTiming().iterations === Infinity)
    .map((animation) => (animation as CSSAnimation).animationName));
  expect(await endless()).toEqual([]);
});

// ---- ≤ 1050 px: the titles and the drawings three across, every row below stacked with its formats' numbers ----

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }]) {
  test(`on ≤ 1050 px the rows stack under three titles and drawings side by side: ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
    const grid = page.locator(GRID);
    const where = `${viewport.width}px`;
    // three across: the titles on one line of columns, the drawings on the next
    for (const selector of ['.dfmt-head', '.dfmt-fig']) {
      const tops = await grid.locator(selector).evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
      expect(new Set(tops).size, `${where}: ${selector}`).toBe(1);
    }
    // the frames are named under the drawings, readable (PDO-20), each inside its column; not inside the drawings
    const names = grid.locator('.dfmt-frame-name');
    await expect(names).toHaveText(['Обсяг RUBIKON', 'Об’єкт замовника', 'Об’єкт у проєкті генпідрядника']);
    const boxes = await grid.locator('.dfmt-fig').evaluateAll((figures) => figures.map((figure) => {
      const name = figure.querySelector('.dfmt-frame-name')!;
      const [box, own] = [figure.getBoundingClientRect(), name.getBoundingClientRect()];
      return { size: parseFloat(getComputedStyle(name).fontSize), inside: own.left >= box.left - 1 && own.right <= box.right + 1 };
    }));
    for (const box of boxes) expect(box, where).toEqual({ size: expect.any(Number), inside: true });
    for (const box of boxes) expect(box.size, where).toBeGreaterThanOrEqual(11);
    await expect(grid.locator('svg.fs .fs-label').first()).toBeHidden();
    // and no word of a name breaks mid-letter («ГЕНПІДРЯДНИКА» in capitals did at 320 px)
    const split = await names.evaluateAll((all) => all.flatMap((name) => {
      const text = name.firstChild!;
      const words = [...(text.textContent ?? '').matchAll(/\S+/g)];
      return words.filter((word) => {
        const range = document.createRange();
        range.setStart(text, word.index);
        range.setEnd(text, word.index + word[0].length);
        return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size > 1;
      }).map((word) => word[0]);
    }));
    expect(split, where).toEqual([]);
    // every value carries its formats' numbers; the shared one all of them
    await expect(grid.locator('[data-row="contract"] .dfmt-tag')).toHaveText(['01 · 02', '03']);
    await expect(grid.locator('[data-row="coordinator"] .dfmt-tag')).toHaveText(['01', '02', '03']);
    await expect(grid.locator('[data-row="contract"] .dfmt-tag').first()).toBeVisible();
    expect(await overflow(page), where).toBe(0);
  });
}

test('on a wide screen the frames are named inside the drawings, readable from 1051 px, and the numbers are the columns', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1051, 1180, 1280, 1300, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
    const grid = page.locator(GRID);
    // PDO-20: the names are the only words for the frames — at least 11 px as drawn, inside the drawing
    const labels = await grid.locator('svg.fs').evaluateAll((drawings) => drawings.flatMap((drawing) => {
      const box = drawing.getBoundingClientRect();
      const scale = box.width / (drawing as SVGSVGElement).viewBox.baseVal.width;
      return [...drawing.querySelectorAll('.fs-label')].map((label) => {
        const own = label.getBoundingClientRect();
        return { px: parseFloat(getComputedStyle(label).fontSize) * scale, inside: own.left >= box.left - 1 && own.right <= box.right + 1 };
      });
    }));
    expect(labels.length).toBe(4);
    for (const label of labels) {
      expect(label.px, `${width}px`).toBeGreaterThanOrEqual(11);
      expect(label.inside, `${width}px`).toBe(true);
    }
    await expect(grid.locator('.dfmt-frame-name').first()).toBeHidden();
    await expect(grid.locator('.dfmt-tag').first()).toBeHidden();
    // a shared value runs across its columns: the contract with the customer is as wide as two formats
    const widths = await grid.locator('[data-row="contract"] [role="cell"]').evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
    const column = await grid.locator('.dfmt-head').first().evaluate((head) => head.getBoundingClientRect().width);
    expect(Math.abs(widths[0] - 2 * column)).toBeLessThan(2);
    expect(Math.abs(widths[1] - column)).toBeLessThan(2);
  }
});

test('with reduced motion nothing in the scope block animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.clock.install();
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  await grid.scrollIntoViewIfNeeded();
  await page.clock.runFor(5000);
  const motion = await page.evaluate(() => document.getAnimations()
    .filter((animation) => { const target = (animation.effect as KeyframeEffect | null)?.target; return Boolean(target?.closest('#obsiah')); })
    .map((animation) => Number(animation.effect!.getComputedTiming().duration)));
  for (const duration of motion) expect(duration).toBeLessThanOrEqual(1);
  // the packages stand still on the first
  await expect(grid.locator('svg.fs').nth(1).locator('.fs-layer[data-scope]')).toHaveAttribute('data-layer', 'foundation');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the formats keep their words and their numbers on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
    const grid = page.locator(GRID);
    for (const text of await grid.locator('[data-row="text"] .dfmt-value').all()) await expect(text).toBeVisible();
    await expect(grid.locator('[data-row="contract"] .dfmt-tag')).toHaveText(['01 · 02', '03']);
    expect(await overflow(page)).toBe(0);
  });
});
