import { expect, test } from '@playwright/test';

// Motion v1, M1-3: Lenis's own frame loop (autoRaf) asked for a frame on every display refresh for as long as the page
// was open, scrolling or not (about 60 calls a second at rest on main). The smooth-scroll layer now asks for frames
// only while it is smoothing a wheel or an anchor scroll (app/components/lenisLoop.ts).

const CONSENT = JSON.stringify({ analytics: 'denied', advertising: 'denied' });

test.beforeEach(async ({ context, page }) => {
  // The page must never reach Google from a test host (see tests/unit/e2e-google-intercept.test.ts)
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await page.addInitScript((value) => {
    window.localStorage.setItem('rubikon-consent-state', value);
    // Counts every requestAnimationFrame call from the first script on; Lenis looks the global up when it asks
    const counter = { calls: 0 };
    (window as unknown as { __rafCalls: typeof counter }).__rafCalls = counter;
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      counter.calls += 1;
      return original(callback);
    };
  }, CONSENT);
});

test.describe('smooth scroll at rest (desktop)', () => {
  test('at rest the page requests no frames', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/polityka-konfidentsiinosti', { waitUntil: 'load' });

    // Not vacuous: the smooth-scroll layer is the one that is running
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(true);

    // Everything the page starts on load has finished by now
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => (window as unknown as { __rafCalls: { calls: number } }).__rafCalls.calls);
    await page.waitForTimeout(1000);
    const after = await page.evaluate(() => (window as unknown as { __rafCalls: { calls: number } }).__rafCalls.calls);

    // main: about 60 in that second, one for each display refresh
    expect(after - before, 'requestAnimationFrame calls in one second at rest').toBeLessThanOrEqual(2);
  });
});
