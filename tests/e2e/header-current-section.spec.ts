import { expect, test, type Page } from '@playwright/test';

// W1-09 · the current section in the navigation (PDO-57; owner 20.10: OD-PX-08 a). Every test denies the optional cookies and answers any Google request with an empty
// 200, so no tag can load.

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, path: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

test.describe('PDO-57 · the current section', () => {
  const sections = [
    ['/pro-nas', 'Про компанію', 'page'],
    ['/yak-pratsyuiemo', 'Як працюємо', 'page'],
    ['/napryamky', 'Напрямки', 'page'],
    ['/metalokonstruktsii', 'Напрямки', 'true'],
    ['/angary', 'Напрямки', 'true'],
    ['/zernoskhovyshcha', 'Напрямки', 'true'],
  ] as const;

  test('the header marks exactly one link, with the copper rule kept under it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the desktop header');
    test.setTimeout(60_000);
    const rules = () => page.locator('.desktop-nav a').evaluateAll((links) => links.map((link) => ({
      label: link.textContent?.trim(),
      current: link.getAttribute('aria-current'),
      rule: Math.round(Number.parseFloat(getComputedStyle(link, '::after').width)),
      width: Math.round(link.getBoundingClientRect().width),
    })));
    for (const [path, label, kind] of sections) {
      await open(page, path, 1440);
      await page.mouse.move(700, 600);
      await expect(page.locator('.desktop-nav a[aria-current]'), path).toHaveCount(1);
      await expect(page.locator(`.desktop-nav a[aria-current="${kind}"]`), path).toHaveText(label);
      await expect.poll(async () => (await rules()).map(({ label: name, rule, width }) => (rule === width ? name : rule)), path)
        .toEqual(['Напрямки', 'Як працюємо', 'Про компанію', 'Контакти'].map((name) => (name === label ? name : 0)));
    }
    await open(page, '/', 1440);
    await expect(page.locator('.desktop-nav a[aria-current]')).toHaveCount(0);
  });

  test('the menu marks the same link in copper, and never «Контакти»', async ({ page }) => {
    for (const [path, label] of [sections[1], sections[3]]) {
      await open(page, path, 390, 844);
      await page.locator('.site-header .mobile-menu summary').click();
      const marked = page.locator('.mobile-menu nav a[aria-current]');
      await expect(marked, path).toHaveCount(1);
      await expect(marked, path).toContainText(label);
      await expect(marked, path).toHaveCSS('color', 'rgb(204, 132, 85)');
      await expect(page.locator('.mobile-menu nav a[href="#inquiry"]'), path).not.toHaveAttribute('aria-current');
      await expect(page.locator('.mobile-menu nav a[href="#inquiry"]'), path).not.toHaveCSS('color', 'rgb(204, 132, 85)');
    }
  });
});
