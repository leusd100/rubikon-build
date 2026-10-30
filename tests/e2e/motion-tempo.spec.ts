import { expect, test, type Page } from '@playwright/test';

// Motion v1, M1-2 (docs/ui-system-v1.md §6): a block's reveal runs at --motion-enter on every page, and HOME's direction
// sheets answer a pointer with the copper frame alone (the owner's decision, 26.10: no lift).

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 204, body: '' }));
});

/** The page, the root its controller arms, and a block that root reveals */
const REVEALS = [
  ['/pro-nas', '.about-page', '.about-principles-grid li'],
  ['/yak-pratsyuiemo', '.process-page', '.proc-principle'],
  ['/metalokonstruktsii', '.direction-page', '.feature-list > article'],
] as const;

for (const [path, root, block] of REVEALS) {
  test(`${path} reveals a block in 700 ms`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(path, { waitUntil: 'load' });
    await expect(page.locator(`${root}[data-motion-ready="on"]`)).toHaveCount(1);
    const duration = await page.locator(block).first().evaluate((element) => {
      const style = getComputedStyle(element);
      const properties = style.transitionProperty.split(', ');
      const durations = style.transitionDuration.split(', ');
      return durations[properties.indexOf('opacity') % durations.length];
    });
    expect(duration).toBe('0.7s');
  });
}

test.describe('HOME direction sheets', () => {
  const sheet = '.hv2-directions .dsh-sheet[href="/angary"]';
  const accent = (page: Page) => page.locator(sheet).evaluate((element) => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--color-accent)';
    element.appendChild(probe);
    const { color } = getComputedStyle(probe);
    probe.remove();
    return color;
  });
  const frame = (page: Page) => page.locator(sheet).evaluate((element) => {
    const { transform, boxShadow, borderTopColor } = getComputedStyle(element);
    return { transform, boxShadow, borderTopColor };
  });

  for (const target of [sheet, '.hv2-directions .direction-card[href="/angary"]']) {
    test(`answer hover on ${target} with the copper frame, not a lift`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/', { waitUntil: 'load' });
      await page.locator(target).scrollIntoViewIfNeeded();
      await page.locator(target).hover();
      const borderTopColor = await accent(page);
      await expect.poll(() => frame(page)).toEqual({ transform: 'none', boxShadow: 'none', borderTopColor });
    });
  }
});
