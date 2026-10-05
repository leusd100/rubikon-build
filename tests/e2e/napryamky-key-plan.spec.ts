import { expect, test } from '@playwright/test';
import { directions } from '../../app/data/directions';

// HOME «П’ять напрямів» — the key plan in the header's empty right (owner, 04.10: «креслення, осі», and not added for
// the sake of adding). A schematic plan whose five position numbers are the cards' own 01–05. These pin what it
// promised: it costs the header nothing (same height with and without it), it shows only where it is large enough to
// read, every card lights its own part — walked from the data, because the link is by route — and it stays out of the
// accessibility tree, the cards saying everything in words. Since 05.10 it has no title strip and no rule (the owner
// saw the strip's line run through the drawing where a browser sized the drawing by its width): the plan stands free,
// named in its own corner, and must stay inside its box.

const HEADER = '#directions .section-header';
const FIGURE = `${HEADER} .dkey`;
// The line that carries each position's light
const PART_LINE = ':is(.dkey-wall, .dkey-base, .dkey-col, .dkey-hidden, .dkey-over)';

for (const width of [1200, 1440]) {
  test(`at ${width}px the key plan stands in the header and costs it no height`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'a wide-screen figure');
    await page.setViewportSize({ width, height: 900 });
    // Geometry is measured at rest, not in the middle of the draw-in
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'load' });
    const figure = page.locator(FIGURE);
    await expect(figure).toBeVisible();
    await expect(page.locator(`${HEADER} .section-header-aside`)).toHaveAttribute('aria-hidden', 'true');
    // No strip and no rule: the name is two words in the drawing's corner
    await expect(figure.locator('figcaption, .dkey-strip')).toHaveCount(0);
    await expect(figure.locator('.dkey-cap')).toHaveText('Схема · План');
    // The numbers on the drawing are the cards' numbers, each once
    expect((await figure.locator('.dkey-num').allTextContents()).sort()).toEqual(directions.map(({ number }) => number).sort());
    // A scheme: letters and position numbers, never a size
    for (const label of await figure.locator('svg text:not(.dkey-cap)').allTextContents()) expect(label, label).toMatch(/^(0[1-5]|[АБLBi])$/);

    const geometry = await page.locator(HEADER).evaluate((header) => {
      const aside = header.querySelector<HTMLElement>('.section-header-aside')!;
      const drawing = aside.querySelector('svg')!;
      const textRight = (selector: string) => {
        const range = document.createRange();
        range.selectNodeContents(header.querySelector(selector)!);
        return Math.max(...[...range.getClientRects()].map((rect) => rect.right));
      };
      const column = drawing.querySelector('.dkey-col')!.getBoundingClientRect();
      const scale = Math.min(drawing.getBoundingClientRect().width / drawing.viewBox.baseVal.width, drawing.getBoundingClientRect().height / drawing.viewBox.baseVal.height);
      // Everything drawn, as the browser laid it out (the drawing is overflow: visible, so its own box proves nothing)
      const drawn = [...drawing.querySelectorAll<SVGGraphicsElement>('path, circle, rect, text')].map((shape) => shape.getBoundingClientRect());
      const measured = {
        drawnTop: Math.min(...drawn.map((box) => box.top)) - aside.getBoundingClientRect().top,
        drawnBottom: aside.getBoundingClientRect().bottom - Math.max(...drawn.map((box) => box.bottom)),
        drawnLeft: Math.min(...drawn.map((box) => box.left)) - aside.getBoundingClientRect().left,
        withFigure: header.getBoundingClientRect().height,
        left: aside.getBoundingClientRect().left,
        right: aside.getBoundingClientRect().right,
        headerRight: header.getBoundingClientRect().right,
        words: Math.max(textRight('h2'), textRight('.section-header-support')),
        frameWidth: column.width,
        scale,
      };
      aside.style.display = 'none';
      const without = header.getBoundingClientRect().height;
      aside.style.display = '';
      return { ...measured, without };
    });
    expect(geometry.withFigure).toBeCloseTo(geometry.without, 1);
    // The plan is inside its box on every side: nothing runs into the header's rule or the title
    expect(geometry.drawnTop).toBeGreaterThanOrEqual(-1);
    expect(geometry.drawnBottom).toBeGreaterThanOrEqual(-1);
    expect(geometry.drawnLeft).toBeGreaterThanOrEqual(-1);
    expect(Math.abs(geometry.right - geometry.headerRight)).toBeLessThanOrEqual(1);
    // Clear of the title and the note
    expect(geometry.left - geometry.words).toBeGreaterThanOrEqual(40);
    // Large enough to read: a column's section (11 × 12 units of the drawing) is never under 12 px
    expect(11 * geometry.scale).toBeGreaterThanOrEqual(12);
    expect(geometry.frameWidth).toBeGreaterThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

test('every card lights its own part of the plan, by keyboard as well as by pointer', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a wide-screen figure');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'load' });
  const figure = page.locator(FIGURE);
  const accent = await figure.evaluate((root) => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--color-accent)';
    root.appendChild(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  const strokes = () => figure.locator(`.dkey-part ${PART_LINE}`).evaluateAll((lines) => Object.fromEntries(lines.map((line) => [line.closest('.dkey-part')!.getAttribute('data-n'), getComputedStyle(line).stroke])));

  // At rest nothing is copper but the numbers
  expect(Object.values(await strokes())).not.toContain(accent);
  for (const { href, number } of directions) {
    await page.locator(`#directions a.direction-card[href="${href}"]`).focus();
    const own = String(Number(number));
    await expect.poll(async () => (await strokes())[own], { message: `card ${number} lights part ${own}` }).toBe(accent);
    const lit = Object.entries(await strokes()).filter(([, stroke]) => stroke === accent).map(([part]) => part);
    expect(lit, `card ${number} lights only its own part`).toEqual([own]);
  }
  // The pointer does the same
  await page.locator('#directions a.direction-card').first().hover();
  await expect.poll(async () => (await strokes())['1']).toBe(accent);
});

test('the plan draws in once when it comes into view, and stands complete without motion', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a wide-screen figure');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'load' });
  const figure = page.locator(FIGURE);
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toHaveAttribute('data-motion-state', 'on');
  // …and ends as a complete drawing: nothing left hidden
  await expect.poll(() => figure.locator('.dkey-num').first().evaluate((number) => getComputedStyle(number).opacity), { timeout: 4000 }).toBe('1');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'load' });
  await expect(page.locator('main[data-home="v2"]')).not.toHaveAttribute('data-motion-ready', /.+/);
  expect(await page.locator(`${FIGURE} .dkey-num`).first().evaluate((number) => getComputedStyle(number).opacity)).toBe('1');
});

for (const width of [1199, 768, 390]) {
  test(`at ${width}px the header is as it was: no key plan`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator(FIGURE)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
