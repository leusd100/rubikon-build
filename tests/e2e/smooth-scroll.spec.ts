import { expect, test, type Page } from '@playwright/test';
import { chooseSeparateWorks, openControlGroup, openThree } from './configurator.helpers';
import { nextFrames } from './frames.helpers';

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

/** Every request for Lenis's own module (its chunk in a build, its pre-bundled dep under `vinext dev`) from now on */
function lenisChunkRequests(page: Page) {
  const requests: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (/\/lenis(?:-[\w-]+)?\.m?js$/.test(pathname)) requests.push(pathname);
  });
  return requests;
}

/**
 * Once the scroll shield is on the page, SmoothScroll's effects have run, in order: the first has asked for Lenis's chunk
 * if this visitor is to have it, and it asks once. A request the page sends after that reaches the test after the chunk's
 * would have, so a chunk asked for has been noted by the time this one is answered.
 */
async function smoothScrollDecided(page: Page) {
  await expect(page.locator('.scroll-shield')).toBeAttached();
  await page.evaluate(() => fetch('/robots.txt', { cache: 'no-store' }));
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
    // Same viewport-only rationale as the desktop-mount cases above — this test sets both
    // a desktop and a mobile viewport itself, so it doesn't need the mobile-chromium project.
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
      .getByRole('link', { name: 'Написати або залишити запит', exact: true })
      .click();

    await expect(page).toHaveURL(/\/#inquiry$/);
    await expect(page.locator('#inquiry')).toBeInViewport({ timeout: 5_000 });
  });
});

// MO-03: the width alone let a touch tablet in landscape through (iPad Pro 11″ 1194 px, 13″ 1366 px): Lenis, its chunk
// and its blocking touch listeners on the window, though the comment over DESKTOP_QUERY keeps tablets native.
test.describe('smooth scroll is for a mouse or a trackpad', () => {
  test('with a mouse at 1440 the Lenis chunk loads (the tablets below would be vacuous otherwise)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    const chunk = lenisChunkRequests(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });

    await expect.poll(() => hasLenis(page)).toBe(true);
    expect(chunk.length, 'Lenis chunk requests').toBeGreaterThan(0);
  });

  for (const tablet of [{ name: 'iPad Pro 13″', width: 1366, height: 1024 }, { name: 'iPad Pro 11″', width: 1194, height: 834 }]) {
    test.describe(`${tablet.name} in landscape (${tablet.width})`, () => {
      test.use({ viewport: { width: tablet.width, height: tablet.height }, isMobile: true, hasTouch: true });

      test('stays native and never loads Lenis', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Sets its own touch device; runs once.');
        const chunk = lenisChunkRequests(page);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.goto('/', { waitUntil: 'load' });
        // Not vacuous: the width alone is the desktop's
        expect(await page.evaluate(() => window.matchMedia('(min-width: 1181px)').matches)).toBe(true);
        await smoothScrollDecided(page);

        expect(await hasLenis(page)).toBe(false);
        expect(chunk, 'Lenis chunk requests').toEqual([]);
      });
    });
  }
});

// MO-02: Lenis's own anchor handler (`anchors: true`) took every anchor of the page on the window — one page code had
// already handled (preventDefault) and one the browser opens in a new tab included. The page's own default now stands.
test.describe('smooth scroll leaves alone an anchor that is not its own', () => {
  async function openHome(page: Page) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await expect.poll(() => hasLenis(page)).toBe(true);
    return page.locator('main > section').first().getByRole('link', { name: 'Написати або залишити запит', exact: true });
  }

  test('a click page code has taken over leaves the page where it is', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    const link = await openHome(page);
    // As a component does that handles the click itself and lets it go on up (ScopeLink, below)
    await link.evaluate((element) => document.addEventListener('click', (event) => {
      if (event.target instanceof Node && element.contains(event.target)) event.preventDefault();
    }, { capture: true }));

    await link.click();
    // The page has not moved at all, and the link's default was taken over. Lenis moves the page in frames, from the first
    // one after the click: 90 of them are 1.5 s at 60 Hz, and its whole glide takes about 0.9 s
    await nextFrames(page, 90);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page).not.toHaveURL(/#inquiry$/);
  });

  test('a Cmd/Ctrl-click opens the anchor elsewhere and leaves this page where it is', async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    const link = await openHome(page);
    // the browser's new tab, not under test
    context.on('page', (opened) => void opened.close());

    await link.click({ modifiers: ['ControlOrMeta'] });
    // A span, not a sync point: what is checked is that nothing happens in it. In frames, as Lenis moves the page: 90 of
    // them are 1.5 s at 60 Hz, and its whole glide takes about 0.9 s
    await nextFrames(page, 90);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  // The live case: «Обсязі робіт» in a step's hint opens «Обсяг робіт» and lands the step tabs under the header
  // (landOnSteps). Lenis then carried the page on to the hidden #hc-step-check: the tabs, the focused one among them,
  // ended 98 px above the window at 1440 × 900 (97 px at 1366 × 768); with `?lenis=off` they stood under the header.
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
    test(`«Обсязі робіт» on /angary lands the step tabs under the header at ${viewport.width} × ${viewport.height}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setViewportSize(viewport);
      await page.goto('/angary', { waitUntil: 'load' });
      await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
      await expect.poll(() => hasLenis(page)).toBe(true);
      // Without the walls the gates have nowhere to go: their hint sends the visitor to «Обсязі робіт»
      await chooseSeparateWorks(page);
      await page.getByRole('checkbox', { name: 'Стіни', exact: true }).uncheck();
      await openControlGroup(page, 'openings');
      const link = page.locator('#hc-step-shell a.hc-note-link', { hasText: 'Обсязі робіт' }).first();
      await link.scrollIntoViewIfNeeded();
      await waitForScrollSettled(page);

      await link.click();
      const tab = page.locator('#hc-step-check-tab');
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(tab).toBeFocused();
      await waitForScrollSettled(page);
      const { tabsTop, headerBottom, half } = await page.evaluate(() => ({
        tabsTop: document.querySelector('.hc-steps')!.getBoundingClientRect().top,
        headerBottom: document.querySelector('.site-header')!.getBoundingClientRect().bottom,
        half: window.innerHeight / 2,
      }));
      // where landOnSteps leaves them: under the header, in the upper half of the window
      expect(tabsTop, 'step tabs vs the header').toBeGreaterThanOrEqual(headerBottom);
      expect(tabsTop, 'step tabs in the upper half of the window').toBeLessThanOrEqual(half);
      await expect(tab).toBeInViewport();
    });
  }
});

// MO-01: Lenis took the wheel on the window and scrolled the page with `scrollTo`, which the modal's `overflow: hidden`
// does not stop: five wheel clicks over the fullscreen 3D moved /angary 500 px behind it, and the visitor came back to
// another place on the page.
test('a wheel over the fullscreen 3D leaves the page behind it where it was', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/angary', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  await expect.poll(() => hasLenis(page)).toBe(true);
  await openThree(page);
  await waitForScrollSettled(page);
  await page.getByRole('button', { name: 'Розгорнути', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const before = await page.evaluate(() => window.scrollY);

  await page.mouse.move(720, 450);
  // Not vacuous: the wheel lands on the modal
  expect(await page.evaluate(() => Boolean(document.elementFromPoint(720, 450)?.closest('[aria-modal="true"]')))).toBe(true);
  for (let tick = 0; tick < 5; tick += 1) {
    await page.mouse.wheel(0, 100);
    // Wheel clicks paced as a hand turns them, 100 ms apart at 60 Hz; the scroll is awaited after the loop
    await nextFrames(page, 6);
  }
  await waitForScrollSettled(page);
  expect(await page.evaluate(() => window.scrollY), 'the page behind the modal').toBe(before);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await waitForScrollSettled(page);
  expect(await page.evaluate(() => window.scrollY), 'where the page is once the modal has closed').toBe(before);

  // Off the modal the wheel is smoothed again
  await page.mouse.wheel(0, 100);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});
