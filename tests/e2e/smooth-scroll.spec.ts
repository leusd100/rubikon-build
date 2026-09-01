import { expect, test, type Page } from '@playwright/test';

// `window.lenis` is a one-way marker (Lenis sets it on construction but never clears it on
// destroy — confirmed by reading node_modules/lenis/dist/lenis.mjs), so it can't tell "was
// created at some point" apart from "is active right now". The `lenis` class Lenis adds to
// `<html>` on construction and removes via cleanUpClassName() inside destroy() is the
// documented, reliably-torn-down signal for that instead.
function hasLenis(page: Page) {
  return page.evaluate(() => document.documentElement.classList.contains('lenis'));
}

// Waits for the smoothed scroll to actually finish interpolating, not just cross a
// threshold mid-flight. `expect.poll` alone resolves the instant a condition first becomes
// true, which can be while Lenis is still easing toward its final position — firing the
// next key press into that in-flight interpolation compounds rather than settling. Real
// keyboard use doesn't hit End/Home/PageDown back-to-back with zero gap either way.
async function waitForScrollSettled(page: Page) {
  let previous = await page.evaluate(() => window.scrollY);
  await expect
    .poll(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 120));
        const current = await page.evaluate(() => window.scrollY);
        const settled = current === previous;
        previous = current;
        return settled;
      },
      { timeout: 5_000 },
    )
    .toBe(true);
}

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  return errors;
}

test.describe('smooth scroll (sitewide, desktop-only)', () => {
  test('desktop viewport (1440) mounts smooth scroll on Home', async ({ page }, testInfo) => {
    // Same viewport-only rationale as the desktop-mount cases below.
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });

    await expect.poll(() => hasLenis(page)).toBe(true);
  });

  test('laptop viewport (1366) mounts smooth scroll on Home', async ({ page }, testInfo) => {
    // Same viewport-only rationale as the desktop-mount cases below.
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/', { waitUntil: 'load' });

    await expect.poll(() => hasLenis(page)).toBe(true);
  });

  test('tablet-width viewport (1180, just under the desktop gate) stays native', async ({ page }, testInfo) => {
    // Same viewport-only rationale as the desktop-mount cases below.
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-project viewport test.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto('/', { waitUntil: 'load' });

    await expect.poll(() => hasLenis(page)).toBe(false);
  });

  test('mobile viewport (390) stays native on Home', async ({ page }, testInfo) => {
    // Explicit 390px is desktop-project-only by design — the real mobile device profile
    // is covered separately below, so this isn't skipped there for lack of coverage.
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Explicit 390px check; mobile-chromium covers a real device below.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'load' });

    await expect.poll(() => hasLenis(page)).toBe(false);
  });

  test('a real mobile device profile stays native on Home', async ({ page }, testInfo) => {
    // Inverse of every other case in this file: this one only makes sense on an actual
    // mobile device profile, so it's skipped everywhere except mobile-chromium.
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Real mobile device profile.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'load' });

    await expect.poll(() => hasLenis(page)).toBe(false);
  });

  test('reduced motion disables smooth scroll even on a desktop viewport', async ({ page }, testInfo) => {
    // Same viewport-only rationale as the desktop-mount cases below.
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });

    await expect.poll(() => hasLenis(page)).toBe(false);
  });

  test('crossing the desktop breakpoint mounts and destroys smooth scroll live, without errors', async ({ page }, testInfo) => {
    // Same viewport-only rationale as the desktop-mount cases below.
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    const runtimeErrors = collectRuntimeErrors(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });

    await expect.poll(() => hasLenis(page)).toBe(true);

    await page.setViewportSize({ width: 1000, height: 900 });
    await expect.poll(() => hasLenis(page)).toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => hasLenis(page)).toBe(true);

    expect(runtimeErrors, 'mounting/destroying across breakpoint changes should not error').toEqual([]);
  });

  test('other pages mount smooth scroll on desktop, stay native on mobile (sitewide scope)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Sets both a desktop and a mobile viewport itself, see below.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // .poll(), not a one-shot check: mounting happens in a useEffect, which can run after
    // the page's own 'load' event fires — a plain check here would race it (this is the
    // same class of bug waitForScrollSettled exists to avoid on the timing side).
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/napryamky', { waitUntil: 'load' });
    await expect.poll(() => hasLenis(page), { message: '/napryamky should mount on desktop' }).toBe(true);

    await page.goto('/pro-nas', { waitUntil: 'load' });
    await expect.poll(() => hasLenis(page), { message: '/pro-nas should mount on desktop' }).toBe(true);

    await page.goto('/angary', { waitUntil: 'load' });
    await expect.poll(() => hasLenis(page), { message: '/angary should mount on desktop' }).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/angary', { waitUntil: 'load' });
    expect(await hasLenis(page), '/angary should stay native on mobile').toBe(false);
  });

  test('keyboard scrolling still moves the page on a longer direction page with smooth scroll active', async ({ page }, testInfo) => {
    // A direction page has more sections than Home (hero, overview, editorial, process,
    // cost, FAQ, CTA) — a longer scroll distance is where any smoothing effect would
    // compound most, so it's worth checking End/PageDown still land correctly here too,
    // not just on Home.
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/angary', { waitUntil: 'load' });
    await expect.poll(() => hasLenis(page)).toBe(true);

    await page.locator('body').click({ position: { x: 4, y: 4 } });

    await page.keyboard.press('End');
    await waitForScrollSettled(page);
    const atEnd = await page.evaluate(() => window.scrollY);
    expect(atEnd).toBeGreaterThan(1000);

    await page.keyboard.press('Home');
    await waitForScrollSettled(page);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(50);

    await page.keyboard.press('PageDown');
    await waitForScrollSettled(page);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
  });

  test('the hero CTA still reaches the inquiry section with smooth scroll active', async ({ page }, testInfo) => {
    // Same viewport-only rationale as the desktop-mount cases above.
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await expect.poll(() => hasLenis(page)).toBe(true);

    await page
      .locator('main > section')
      .first()
      .getByRole('link', { name: 'Обговорити проєкт', exact: true })
      .click();

    await expect(page).toHaveURL(/\/#inquiry$/);
    await expect(page.locator('#inquiry')).toBeInViewport({ timeout: 5_000 });
  });
});
