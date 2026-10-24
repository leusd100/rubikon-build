import { expect, test } from '@playwright/test';

// W2-17 · PDO-92 B (owner 24.10): no picture behind the form or behind «Кошторис і строки». The stock frame of hands on a
// drawing (51 / 111 KB on every page with the form) and the AI watercolour behind the estimate (241 KB on /yak) were the
// last backdrops under content; the sheet's own marks stay in the margins (sheet-field.css). Every test denies the optional
// cookies and answers any Google request with an empty 200, so no tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

const GONE = /conversation-bg|about-industrial-concept\.webp/;

for (const [path, section] of [['/', '#inquiry'], ['/yak-pratsyuiemo', '#koshtorys'], ['/yak-pratsyuiemo', '#inquiry']] as const) {
  test(`${path} ${section}: the page's own ground, and no backdrop is fetched`, async ({ page }) => {
    for (const width of [390, 1440]) {
      const fetched: string[] = [];
      page.on('request', (request) => { if (GONE.test(request.url())) fetched.push(request.url()); });
      await page.setViewportSize({ width, height: width < 761 ? 844 : 900 });
      await page.goto(path, { waitUntil: 'load' });
      // lazy images load as they come near: bring the section into view first
      await page.locator(section).scrollIntoViewIfNeeded();
      await page.waitForLoadState('networkidle');
      const ground = await page.locator(section).evaluate((element) => ({
        backdrops: element.querySelectorAll('.conversation-bg, .proc-terms-bg, .proc-terms-image').length,
        section: getComputedStyle(element).backgroundColor,
        page: getComputedStyle(document.body).backgroundColor,
      }));
      expect(ground.backdrops, `${width}px`).toBe(0);
      expect(ground.section, `${width}px`).toBe(ground.page);
      expect(fetched, `${width}px`).toEqual([]);
    }
  });
}
