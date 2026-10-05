import { expect, test } from '@playwright/test';

// /pro-nas «Що робимо самі, а що організовуємо» — the calm section scheme (owner, 04.10: the axonometric drawing was
// overloaded; the spoil heap and the depth mark had to go). The ledger's words stay pinned in pr-critical.spec.ts;
// these pin what the redraw promised: a scheme that reads at rest in three line types, nothing drawn that is not a
// row of the ledger, no tour of its own, a shorter block, and a phone that is not asked to tap at a drawing off screen.

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

test('the scheme runs no tour of its own: nothing is lit until the visitor points', async ({ page }) => {
  // The page's clock is ours: ten seconds of its timers and frames are run through, instead of waiting for them
  await page.clock.install();
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const block = page.locator('.about-cap');
  await block.scrollIntoViewIfNeeded();
  await page.clock.runFor(10_000);
  expect(await block.getAttribute('data-tier')).toBeNull();
  expect(await block.getAttribute('data-cap')).toBeNull();
  await expect(page.locator(`${FIGURE} [data-on]`)).toHaveCount(0);
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

test('the block is shorter than the framed sticky drawing it replaced', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pro-nas', { waitUntil: 'load' });
  // 2429 px before, with a sticky panel beside a long list
  expect(await page.locator('section.about-build').evaluate((section) => section.getBoundingClientRect().height)).toBeLessThan(2200);
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
    // 2658 px before at 390 (the list is most of it; a 360 px phone was never measured, so it has no bar here)
    if (width === 390) expect(await page.locator('section.about-build').evaluate((section) => section.getBoundingClientRect().height)).toBeLessThan(2658);
  });
}
