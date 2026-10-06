import { expect, test } from '@playwright/test';

// HOME «Як ми дивимося на об’єкт» — one drawing sheet where two cards stood (owner, 04.10: the cards lagged behind
// the drawings on the other pages). A small frame shows the load's way, «Вузол 1» is called out on it and drawn large
// beside it on real leaders; the generated raster of the node is gone from the page. These pin what the change
// promised: one sheet with both texts, labelled as a scheme, no image, the node lit from its note, a shorter phone
// block, and the one contextual link from HOME to «Як працюємо».

const SHEET = '#engineering .hv2-sheet';

test('the engineering block explains with one scheme sheet: both notes, no image, labelled as a scheme', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const sheet = page.locator(SHEET);
  await expect(sheet).toHaveCount(1);
  await expect(sheet.locator('img')).toHaveCount(0);
  await expect(sheet.locator('.sig-note h3')).toHaveText(['Як працює конструкція', 'Вузол у деталях']);
  await expect(sheet.locator('.sig-strip')).toContainText('Схема');
  await expect(sheet.locator('.sig-strip b')).toHaveText('Вузол 1');
  // One picture for a screen reader; the two layout drawings under it are hidden from the tree
  await expect(sheet.locator('[role="img"]')).toHaveCount(1);
  expect(await sheet.locator('svg.sig-svg').evaluateAll((drawings) => drawings.every((drawing) => drawing.getAttribute('aria-hidden') === 'true'))).toBe(true);
  // A scheme carries letters and names, never sizes: the only figure among its labels is the node's mark
  const labels = await sheet.locator('svg.sig-svg text').allTextContents();
  // (no \b here: in JavaScript it knows only ASCII word characters, so «\bм\b» never matched a Cyrillic letter)
  for (const label of labels) expect(label, label).not.toMatch(/\d{2,}|\d\s*(?:мм|см|м)(?![а-яіїєґ’])/iu);
  const text = await sheet.innerText();
  for (const forbidden of [/digital twin/i, /двійник/i, /x-?ray/i, /рентген/i]) expect(text).not.toMatch(forbidden);
  // The boundary sentence still closes the block
  await expect(page.locator('#engineering .hv2-boundary')).toContainText('не замінюють проєкт');
});

test('HOME has one contextual link to «Як працюємо», after the explanation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const link = page.locator('#engineering a.hv2-process-link');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', '/yak-pratsyuiemo');
  await expect(link).toContainText('Як працюємо');
  expect(await link.evaluate((anchor) => anchor.getBoundingClientRect().height)).toBeGreaterThanOrEqual(24);
});

test('pointing at the node’s note lights the node on the drawing', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover lighting is a pointer affordance');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'load' });
  const sheet = page.locator(SHEET);
  await sheet.scrollIntoViewIfNeeded();
  const part = sheet.locator('svg.sig-wide .sig-part path').first();
  const strokeOf = () => part.evaluate((path) => getComputedStyle(path).stroke);
  await page.mouse.move(2, 2);
  const atRest = await strokeOf();
  await sheet.locator('.sig-note[data-note="node"]').hover();
  await expect.poll(strokeOf).not.toBe(atRest);
  // …and it is the block's copper, read from the token rather than a literal colour
  const copper = await sheet.evaluate((root) => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--hv2-copper-text)';
    root.appendChild(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  await expect.poll(strokeOf).toBe(copper);
});

test('the load is alive while the sheet is on screen — not only under the pointer — and still with reduced motion', async ({ page, isMobile }) => {
  await page.goto('/', { waitUntil: 'load' });
  const sheet = page.locator(SHEET);
  const figure = sheet.locator('.sig-figure');
  const shown = isMobile ? 'svg.sig-tall' : 'svg.sig-wide';
  const running = (selector: string) => sheet.locator(`${shown} ${selector}`).first().evaluate((element) => {
    const style = getComputedStyle(element);
    return `${style.animationName} ${style.animationIterationCount}`;
  });
  await sheet.scrollIntoViewIfNeeded();
  await expect(figure).toHaveAttribute('data-motion-live', 'on');
  // The pointer is parked: this is not the hover state
  await page.mouse.move(2, 2);
  expect(await running('.sig-thread')).toBe('hv2-sheet-flow infinite');
  expect(await running('.sig-press')).toBe('hv2-sheet-press infinite');
  expect(await running('.sig-breathe')).toBe('hv2-sheet-breathe infinite');
  // Out of sight nothing runs
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(figure).toHaveAttribute('data-motion-live', 'off');
  expect(await running('.sig-thread')).toBe('none 1');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'load' });
  await page.locator(SHEET).scrollIntoViewIfNeeded();
  expect(await running('.sig-thread')).toBe('none 1');
});

for (const width of [360, 390]) {
  test(`on a ${width}px phone the sheet is shorter than the two cards were and nothing overflows`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'load' });
    const sheet = page.locator(SHEET);
    await sheet.scrollIntoViewIfNeeded();
    // 922 px for the two cards at 390
    expect(await sheet.evaluate((block) => block.getBoundingClientRect().height)).toBeLessThan(width === 390 ? 922 : 980);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    // The part names are the only place a sighted visitor reads them: never below 12.5 px on screen
    const smallest = await sheet.locator('svg.sig-tall .sig-name text').evaluateAll((names) => Math.min(...names.map((name) => {
      const drawing = (name as SVGTextElement).ownerSVGElement!;
      const scale = drawing.getBoundingClientRect().width / drawing.viewBox.baseVal.width;
      return name.getBoundingClientRect().height > 0 ? parseFloat(getComputedStyle(name).fontSize) * scale : Infinity;
    })));
    expect(smallest).toBeGreaterThanOrEqual(12.5);
  });
}
