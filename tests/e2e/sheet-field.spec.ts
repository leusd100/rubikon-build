import { expect, test } from '@playwright/test';

// The sheet's field — the pages' margin decor (owner, 05.10): a dash-dot axis down the left margin with a numbered
// bubble where each block starts, a registration cross in the right margin, the sheet's inscription beside the first
// block and a ruler's ticks on a charcoal band's top edge. These pin the layer's rules: it is drawn in the margins
// only — never over the shell, where the content is — the hero is not a block of the sheet, the blocks are numbered in
// order, and a screen without margins has none of it.

const PAGES = ['/', '/napryamky', '/pro-nas', '/yak-pratsyuiemo', '/angary', '/metalokonstruktsii'];
const BLOCKS = 'main[data-field] > section:not(.subhero, .proc-hero, .hero, .service-subhero, .hangar-configurator)';

for (const path of PAGES) {
  test(`${path}: on a wide screen the field's marks stand in the margins, numbered block by block`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'a wide-screen layer');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path, { waitUntil: 'load' });
    const marks = await page.locator(BLOCKS).evaluateAll((blocks) => blocks.map((block) => {
      const shell = block.querySelector(':scope > .shell');
      const box = block.getBoundingClientRect();
      const content = shell ? shell.getBoundingClientRect() : box;
      const px = (value: string) => parseFloat(value);
      const axis = getComputedStyle(block, '::before');
      const bubble = getComputedStyle(block, '::after');
      const cross = shell ? getComputedStyle(shell, '::after') : null;
      return {
        axis: axis.content !== 'none' && px(axis.width) === 1,
        // the marks' right edges, and the cross's left edge, against the content's box
        axisClear: content.left - (px(axis.left) + 1),
        bubbleClear: content.left - (px(bubble.left) + px(bubble.width)),
        bubble: bubble.content,
        crossClear: cross && cross.content !== 'none' ? (box.width - px(cross.right) - px(cross.width)) - content.right : null,
      };
    }));
    expect(marks.length).toBeGreaterThanOrEqual(3);
    for (const [index, mark] of marks.entries()) {
      expect(mark.axis, `block ${index + 1} has its axis`).toBe(true);
      // the block's number, with an empty text alternative: decor is not read aloud
      expect(mark.bubble).toMatch(/^counter\(field\)( \/ "")?$/);
      // in the margin, with air between the mark and the content
      expect(mark.axisClear, `block ${index + 1}: axis clear of the content`).toBeGreaterThanOrEqual(12);
      expect(mark.bubbleClear, `block ${index + 1}: bubble clear of the content`).toBeGreaterThanOrEqual(6);
      if (mark.crossClear !== null) expect(mark.crossClear, `block ${index + 1}: cross clear of the content`).toBeGreaterThanOrEqual(6);
    }
    // the hero is not a block of the sheet
    const hero = page.locator('main[data-field] > section').first();
    expect(await hero.evaluate((section) => getComputedStyle(section, '::after').content)).not.toContain('counter(field)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

test('the first block carries the sheet’s inscription in its margin, and a charcoal band a ruler on its top edge', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a wide-screen layer');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/napryamky', { waitUntil: 'load' });
  const first = page.locator(`${BLOCKS} > .shell`).first();
  const inscription = await first.evaluate((shell) => {
    const style = getComputedStyle(shell, '::before');
    return { content: style.content, mode: style.writingMode, left: parseFloat(style.left), shellLeft: shell.getBoundingClientRect().left };
  });
  expect(inscription.content).toContain('RUBIKON BUILD · Напрямки');
  expect(inscription.mode).toBe('vertical-rl');
  expect(inscription.left).toBeLessThan(inscription.shellLeft - 20);
  const ruler = await page.locator('main[data-field] > section.page-section-dark > .shell').first().evaluate((shell) => {
    const style = getComputedStyle(shell, '::before');
    return { content: style.content, top: parseFloat(style.top), height: parseFloat(style.height) };
  });
  expect(ruler).toEqual({ content: '""', top: 0, height: 12 });
});

for (const width of [1199, 390]) {
  test(`at ${width}px there is no margin to draw in, and no field`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/napryamky', { waitUntil: 'load' });
    const drawn = await page.locator('main[data-field] > section').evaluateAll((blocks) => blocks.filter((block) => getComputedStyle(block, '::before').content !== 'none' || getComputedStyle(block, '::after').content !== 'none').length);
    expect(drawn).toBe(0);
  });
}
