import { expect, test, type Page } from '@playwright/test';
import { nextFrames } from './frames.helpers';

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
    const counter = { calls: 0, frame: window.requestAnimationFrame.bind(window) };
    (window as unknown as { __rafCalls: typeof counter }).__rafCalls = counter;
    window.requestAnimationFrame = (callback) => {
      counter.calls += 1;
      return counter.frame(callback);
    };
  }, CONSENT);
});

/**
 * requestAnimationFrame calls the page makes over its next `frames` animation frames. The window is counted in frames,
 * not milliseconds: a loop that goes on asks once a frame, so it shows the same on a busy runner as on a quiet laptop. The
 * probe asks through the untouched requestAnimationFrame kept in the counter, so it does not count itself.
 */
function rafCallsOverFrames(page: Page, frames: number) {
  return page.evaluate((count) => new Promise<number>((resolve) => {
    const counter = (window as unknown as { __rafCalls: { calls: number; frame: typeof requestAnimationFrame } }).__rafCalls;
    const start = counter.calls;
    let left = count;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve(counter.calls - start);
      else counter.frame(tick);
    };
    counter.frame(tick);
  }), frames);
}

/** Everything the page started on load has finished: half a second of frames (at 60 Hz) in which nothing asked for one */
async function pageAtRest(page: Page) {
  await expect.poll(() => rafCallsOverFrames(page, 30), { message: 'the page comes to rest', timeout: 5000 }).toBe(0);
}

/** A 1440x900 desktop page with the smooth-scroll layer running (the same tier smooth-scroll.spec.ts uses) */
async function openDesktop(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(path, { waitUntil: 'load' });
  // Not vacuous: the smooth-scroll layer is the one that is running
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(true);
}

/** Every scrollY the page reports from now on, one per scroll event (the page's frame loop is left alone) */
function recordScrollPositions(page: Page) {
  return page.evaluate(() => {
    const recorder = window as unknown as { __scrollPositions?: number[]; __recordingScroll?: boolean };
    recorder.__scrollPositions = [];
    if (recorder.__recordingScroll) return;
    recorder.__recordingScroll = true;
    window.addEventListener('scroll', () => recorder.__scrollPositions?.push(window.scrollY), { passive: true });
  });
}

function scrollPositions(page: Page) {
  return page.evaluate(() => (window as unknown as { __scrollPositions: number[] }).__scrollPositions);
}

/** A wheel's glide is over: the page has moved, Lenis has dropped `lenis-smooth`, and the last scroll event has reported
 *  where it stopped (that event comes in the frame after Lenis's last step) */
async function wheelGlideEnded(page: Page) {
  await expect
    .poll(
      () => page.evaluate(() => {
        const positions = (window as unknown as { __scrollPositions: number[] }).__scrollPositions;
        return positions.length > 0 && !document.documentElement.classList.contains('lenis-smooth') && positions.at(-1) === window.scrollY;
      }),
      { message: 'the wheel moved the page and its glide ended', timeout: 2000 },
    )
    .toBe(true);
}

test.describe('smooth scroll at rest (desktop)', () => {
  test('at rest the page requests no frames', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    await openDesktop(page, '/polityka-konfidentsiinosti');

    await pageAtRest(page);

    // main: about 60 in those 60 frames, one for each display refresh
    expect(await rafCallsOverFrames(page, 60), 'requestAnimationFrame calls in 60 frames at rest').toBeLessThanOrEqual(2);
  });

  test('the first wheel after a long rest does not jump', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    await openDesktop(page, '/metalokonstruktsii');
    await page.mouse.move(720, 450);

    // Two rounds: a rest, then a wheel of 120 px. Lenis remembers when its last frame ran, so only the second round meets
    // a stale clock (in the first it has not run a frame yet): without the loop's one-frame first step Lenis would
    // measure the whole 3 s rest as one frame and the page would jump to the end of the scroll.
    for (const landing of [120, 240]) {
      await page.waitForTimeout(3000);
      const from = await page.evaluate(() => window.scrollY);
      await recordScrollPositions(page);
      await page.mouse.wheel(0, 120);
      await wheelGlideEnded(page);
      const positions = await scrollPositions(page);

      expect(positions.length, `the wheel to ${landing} moved the page`).toBeGreaterThan(0);
      expect(Math.abs(positions[0] - from), `the first step of the wheel to ${landing}`).toBeLessThanOrEqual(40);
      expect(Math.abs(positions[positions.length - 1] - landing), `where the wheel to ${landing} lands`).toBeLessThanOrEqual(1);
    }
  });

  test('a trackpad burst lands where it should, then the loop rests', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    await openDesktop(page, '/metalokonstruktsii');
    await page.mouse.move(720, 450);
    await pageAtRest(page);

    // 20 small wheel events, one a frame as a trackpad's come, 120 px in all
    for (let index = 0; index < 20; index += 1) {
      await page.mouse.wheel(0, 6);
      await nextFrames(page, 1);
    }
    // The smoothing has ended once Lenis drops its `lenis-smooth` class. Counting from the first frame that is within a
    // pixel of 120 would still include the last frames of the glide (up to four) and the two calls Lenis itself makes
    // when a smooth scroll completes: they are the end of the motion, not a loop that goes on at rest.
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('lenis-smooth')), {
        message: 'the burst has stopped smoothing',
        timeout: 2000,
      })
      .toBe(false);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - 120), 'where the burst lands').toBeLessThanOrEqual(1);

    // main: about 60 in those 60 frames; here the loop has gone back to rest
    expect(await rafCallsOverFrames(page, 60), 'requestAnimationFrame calls in the 60 frames after the burst').toBeLessThanOrEqual(2);
  });

  test('an anchor click still glides to its section', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop viewport test.');
    await openDesktop(page, '/metalokonstruktsii');
    await pageAtRest(page);

    const anchor = page.locator('main > section').first().locator('a[href^="#"]').first();
    const target = page.locator((await anchor.getAttribute('href')) ?? '');
    // Where the section rests under the fixed header: its scroll-margin-top
    const restingTop = await target.evaluate((element) => Number.parseFloat(getComputedStyle(element).scrollMarginTop));
    expect(restingTop, 'the section keeps room for the header').toBeGreaterThan(0);

    // `html { scroll-behavior: smooth }` (globals.css) and Lenis lets the click through, so the browser scrolls to the
    // fragment by itself, smoothly, and would put the section in its place without a single frame from Lenis. This
    // listener cancels that navigation: only Lenis can move the page now. It must run after the smooth-scroll layer's
    // anchor listener, which leaves a cancelled click alone (MO-02) — and it does: both are on the window in the bubble
    // phase, and the layer's went on with the `lenis` class openDesktop waited for, before this one.
    await page.evaluate(() => window.addEventListener('click', (event) => event.preventDefault()));

    await recordScrollPositions(page);
    await anchor.click();
    await expect
      .poll(() => target.evaluate((element, expected) => Math.abs(element.getBoundingClientRect().top - expected), restingTop), {
        message: 'distance of the section from its place under the header',
        // Lenis takes about 0.9 s without load; a stuck loop never gets there
        timeout: 2500,
      })
      .toBeLessThanOrEqual(2);

    // It glided: Lenis stepped the page over several frames, a jump would be one
    expect((await scrollPositions(page)).length, 'scroll steps on the way').toBeGreaterThan(5);

    // And the loop went back to rest (see the trackpad test for why the count starts after the smoothing ends)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('lenis-smooth')), {
        message: 'the anchor scroll has stopped smoothing',
        timeout: 2000,
      })
      .toBe(false);
    expect(await rafCallsOverFrames(page, 60), 'requestAnimationFrame calls in the 60 frames after the anchor scroll').toBeLessThanOrEqual(2);
  });
});
