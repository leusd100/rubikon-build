import { expect, test } from '@playwright/test';

for (const route of [{ path: '/', page: 'home', selector: '.hv2-hero-still' }, { path: '/pro-nas', page: 'about', selector: '.about-hero-still' }]) {
  for (const os of ['light', 'dark'] as const) {
    for (const preference of ['system', 'light', 'dark'] as const) {
      test(`${route.page} B1 loads only the selected artwork with OS ${os} and preference ${preference}`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.emulateMedia({ colorScheme: os });
        await page.addInitScript((saved) => {
          localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
          if (!sessionStorage.getItem('b1-seeded')) {
            if (saved !== 'system') localStorage.setItem('rubikon-theme', saved);
            sessionStorage.setItem('b1-seeded', 'true');
          }
        }, preference);
        const requests: string[] = [];
        page.on('request', (request) => {
          if (/\/media\/(mobile-b1\/|.*line-concept-v3)/.test(request.url())) requests.push(request.url());
        });
        await page.goto(route.path, { waitUntil: 'load' });
        const theme = preference === 'system' ? os : preference;
        const image = page.locator(route.selector);
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).currentSrc)).toContain(`/mobile-b1/${route.page}-${theme}-`);
        await image.evaluate((el) => (el as HTMLImageElement).decode());
        expect(requests).toHaveLength(1);
        // The menu preference overrides the OS, then survives a normal navigation/reload.
        await page.locator('.mobile-menu summary').click();
        const other = theme === 'light' ? 'Темна' : 'Світла';
        await page.locator('.mobile-menu .theme-options').getByLabel(other, { exact: true }).check();
        const next = theme === 'light' ? 'dark' : 'light';
        await expect.poll(() => image.evaluate((el) => (el as HTMLImageElement).currentSrc)).toContain(`/mobile-b1/${route.page}-${next}-`);
        await page.reload({ waitUntil: 'load' });
        await expect.poll(() => page.locator(route.selector).evaluate((el) => (el as HTMLImageElement).currentSrc)).toContain(`/mobile-b1/${route.page}-${next}-`);
      });
    }
  }
}
