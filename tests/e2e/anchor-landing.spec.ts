import { expect, test, type Page } from '@playwright/test';

// Where a smoothed jump lands on a long inner page (MT-03, 27.10). The page scrolls smoothly to its anchors — `html
// { scroll-behavior: smooth }` on every width, Lenis's own `anchors` from 1181 px — and a smooth scroll fixes its end
// before it starts. Anything that changes the height of the blocks it passes on the way (content-visibility's stand-in
// heights replaced by the real ones, a block that grows late) leaves the target away from where the visitor was sent:
// the `content-visibility: auto` prototype (MT-03, 28.10) left /yak-pratsyuiemo's #koshtorys 882 px and #inquiry
// 1 027 px below the header at 1440 px, and #inquiry 1 870 px below it on a phone. The target's top must come to rest at
// its own scroll-margin-top, under the header, as it does without any of that. The phone's smoothing is the CSS one:
// smooth-scroll-idle.spec.ts covers Lenis's own anchor glide on the desktop.

async function settledTop(page: Page, id: string) {
  let previous = Number.NaN;
  await expect
    .poll(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        const current = await page.evaluate(() => window.scrollY);
        const settled = current === previous;
        previous = current;
        return settled;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  return page.evaluate((target) => {
    const element = document.getElementById(target);
    if (!element) return null;
    return { top: element.getBoundingClientRect().top, margin: Number.parseFloat(getComputedStyle(element).scrollMarginTop) };
  }, id);
}

test.describe('smoothed anchor jumps land under the header', () => {
  test.beforeEach(async ({ page }) => {
    // the visitor's default: smoothing on (reduced motion makes every jump instant, which lands either way)
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  // The cross-page links of /pro-nas, /angary and the direction pages («Як готуємо кошторис…») open this one
  test('a link from another page lands on /yak-pratsyuiemo#koshtorys', async ({ page }) => {
    await page.goto('/yak-pratsyuiemo#koshtorys', { waitUntil: 'load' });
    const landed = await settledTop(page, 'koshtorys');
    expect(landed).not.toBeNull();
    expect(Math.abs(landed!.top - landed!.margin)).toBeLessThanOrEqual(2);
  });

  test('the header\'s «Контакти» lands on the page\'s own #inquiry', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'The desktop header\'s link; a phone keeps it in the menu.');
    await page.goto('/pro-nas', { waitUntil: 'load' });
    // Lenis mounts after load (useEffect); its click listener is what smooths the jump from 1181 px
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(true);
    await page.locator('.site-header .desktop-nav').getByRole('link', { name: 'Контакти', exact: true }).click();
    const landed = await settledTop(page, 'inquiry');
    expect(landed).not.toBeNull();
    expect(Math.abs(landed!.top - landed!.margin)).toBeLessThanOrEqual(2);
  });
});
