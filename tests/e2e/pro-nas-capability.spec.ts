import { expect, test } from '@playwright/test';

// /pro-nas «Що робимо самі, а що організовуємо» — the calm section scheme (owner, 04.10: the axonometric drawing was
// overloaded; the spoil heap and the depth mark had to go) and its legend of name tags (owner, 05.10: too much text —
// only the necessary stays). The works' names stay pinned in pr-critical.spec.ts; these pin what the block promised:
// a scheme that reads at rest in three line types, nothing drawn that is not a work of the ledger, names without
// sentences, one walk through the drawn works on first view (owner, 05.10 evening), pointing that works both ways,
// a much shorter block, and a phone that is not asked to tap at a drawing off screen.

const FIGURE = '.about-cap .cap-fig';

test('the scheme draws only works that the ledger lists, and stays out of the accessibility tree', async ({ page }) => {
  await page.goto('/pro-nas', { waitUntil: 'load' });
  await expect(page.locator(FIGURE)).toHaveAttribute('aria-hidden', 'true');

  const listed = await page.locator('.about-ledger li[data-cap]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-cap')));
  const drawn = await page.locator(`${FIGURE} .cap-part`).evaluateAll((parts) => parts.flatMap((part) => (part.getAttribute('data-caps') ?? '').split(' ')));
  expect(drawn.length).toBeGreaterThan(0);
  for (const cap of drawn) expect(listed, cap).toContain(cap);

  // A handful of parts, not a wireframe: the first version drew 139 equal segments
  expect(await page.locator(`${FIGURE} .cap-part`).count()).toBeLessThanOrEqual(12);
  // Each of the three groups has its own kind of line at rest
  expect(new Set(await page.locator(`${FIGURE} .cap-part`).evaluateAll((parts) => parts.map((part) => part.getAttribute('data-tier')))).size).toBe(3);
});

test('the legend is names only: no sentences, and a tag wears its group’s line', async ({ page }) => {
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const block = page.locator('.about-cap');
  // A work is a tag with its name and nothing else; a group is a heading and its tags
  await expect(block.locator('.about-ledger-col p, .about-ledger-col li > span')).toHaveCount(0);
  const tags = await block.locator('li[data-cap] b').allTextContents();
  expect(tags.length).toBeGreaterThanOrEqual(10);
  for (const tag of tags) expect(tag.length, tag).toBeLessThanOrEqual(52);
  // No tag repeats its group's title after a dash
  for (const column of await block.locator('.about-ledger-col').all()) {
    const title = (await column.locator('h3').innerText()).replace(/^\d+\s*/, '').toLowerCase();
    for (const tag of await column.locator('li b').allTextContents()) expect(tag.toLowerCase(), tag).not.toContain(`— ${title}`);
  }
  // Three groups, three kinds of line on the tags — the scheme's own
  const borders = await block.locator('.about-ledger-col').evaluateAll((columns) => columns.map((column) => {
    const style = getComputedStyle(column.querySelector('li')!);
    return `${style.borderTopStyle} ${style.borderTopColor}`;
  }));
  expect(new Set(borders).size).toBe(3);
  expect(borders[2]).toMatch(/^dashed /);
});

test('the scheme walks once through the works it draws when it first comes into view, then rests', async ({ page }) => {
  // The page's clock is ours: the walk's timers are run through instead of waited for
  await page.clock.install();
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const block = page.locator('.about-cap');
  const lit = block.locator('li[data-on]');
  await page.locator(FIGURE).scrollIntoViewIfNeeded();
  // (the observer that arms the walk is not on the clock, so the first step is polled for)
  await expect.poll(async () => { await page.clock.runFor(400); return lit.count(); }, { timeout: 15_000 }).toBe(1);
  const first = await lit.getAttribute('data-cap');
  // A tag and its part of the scheme light together
  await expect(page.locator(`${FIGURE} .cap-part[data-on]`)).toHaveCount(1);
  await page.clock.runFor(1300);
  await expect(lit).not.toHaveAttribute('data-cap', first!);
  // …and after the last work it rests, with nothing lit
  await page.clock.runFor(20_000);
  await expect(lit).toHaveCount(0);
  expect(await block.getAttribute('data-tier')).toBeNull();
});

test('pointing ends the walk, and no walk starts with reduced motion', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const lit = page.locator('.about-cap li[data-on]');
  await page.locator(FIGURE).scrollIntoViewIfNeeded();
  // the observer that would arm a walk is not on the clock: give it rounds of real time between steps of fake time
  for (let round = 0; round < 8; round += 1) { await page.clock.runFor(1000); await expect(lit).toHaveCount(0); }
  test.skip(isMobile, 'the rest is a pointer affordance');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload({ waitUntil: 'load' });
  await page.locator(FIGURE).scrollIntoViewIfNeeded();
  await page.locator('.about-ledger li[data-cap="gates"]').hover();
  await expect(lit).toHaveAttribute('data-cap', 'gates');
  // …and once the pointer has left, nothing lights by itself: the walk is over for good
  await page.mouse.move(2, 2);
  for (let round = 0; round < 8; round += 1) { await page.clock.runFor(1000); await expect(lit).toHaveCount(0); }
});

test('pointing at a work lights its part of the scheme', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover lighting is a pointer affordance; on a phone the scheme is a static legend');
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const row = page.locator('.about-ledger li[data-cap="steel"]');
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  await expect(page.locator(`${FIGURE} .cap-part[data-on]`)).not.toHaveCount(0);
  await page.mouse.move(2, 2);
  await expect(page.locator(`${FIGURE} .cap-part[data-on]`)).toHaveCount(0);
});

test('pointing at a part of the scheme lights its tag', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover lighting is a pointer affordance');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const figure = page.locator(FIGURE);
  await figure.scrollIntoViewIfNeeded();
  // The frame's ridge: a point of the steel part's own path, mapped from the drawing's units to the screen
  const ridge = await figure.locator('.cap-hit[data-caps~="steel"]').evaluate((path) => {
    const geometry = path as SVGGeometryElement;
    const point = geometry.getPointAtLength(geometry.getTotalLength() / 2).matrixTransform(geometry.getScreenCTM()!);
    return { x: point.x, y: point.y };
  });
  await page.mouse.move(ridge.x, ridge.y);
  await expect(page.locator('.about-ledger li[data-cap="steel"]')).toHaveAttribute('data-on', '');
  await expect(page.locator('.about-ledger li[data-on]')).toHaveCount(1);
  await page.mouse.move(2, 2);
  await expect(page.locator('.about-ledger li[data-on]')).toHaveCount(0);
});

test('on a wide screen the scheme stands beside all three groups, and the block is much shorter than before', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const layout = await page.locator('.about-cap').evaluate((block) => {
    const box = (selector: string) => block.querySelector(selector)!.getBoundingClientRect();
    const figure = box('.cap-fig');
    const groups = [...block.querySelectorAll('.about-ledger-col')].map((group) => group.getBoundingClientRect());
    return { figureRight: figure.right, figureTop: figure.top, groupsLeft: Math.min(...groups.map((group) => group.left)), firstTop: groups[0].top, height: block.getBoundingClientRect().height };
  });
  expect(layout.figureRight).toBeLessThan(layout.groupsLeft);
  expect(Math.abs(layout.figureTop - layout.firstTop)).toBeLessThanOrEqual(1);
  // 2429 px with the framed sticky drawing, 2003 px with the first section scheme and its sentences
  expect(await page.locator('section.about-build').evaluate((section) => section.getBoundingClientRect().height)).toBeLessThan(1800);
});

for (const width of [360, 390]) {
  test(`on a ${width}px phone the scheme sits between the first two groups and nothing overflows`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/pro-nas', { waitUntil: 'load' });
    const order = await page.locator('.about-cap').evaluate((block) => {
      const top = (selector: string) => block.querySelector(selector)!.getBoundingClientRect().top;
      return { own: top('.is-core'), figure: top('.cap-fig'), organised: top('.is-partner') };
    });
    expect(order.own).toBeLessThan(order.figure);
    expect(order.figure).toBeLessThan(order.organised);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    // 2658 px before at 390, almost all of it sentences; 2116 px as name tags (a 360 px phone was never measured, so it has no bar here)
    if (width === 390) expect(await page.locator('section.about-build').evaluate((section) => section.getBoundingClientRect().height)).toBeLessThan(2200);
    // A finger's target
    const smallest = await page.locator('.about-cap li[data-cap]').evaluateAll((tags) => Math.min(...tags.map((tag) => tag.getBoundingClientRect().height)));
    expect(smallest).toBeGreaterThanOrEqual(38);
  });
}
