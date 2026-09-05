import { expect, test, type Page } from '@playwright/test';

// Visual regression for the 3D mode. Deliberately a SMALL set (Phase 3A brief §15): WebGL
// snapshots are the most expensive kind to maintain, so this covers the states whose geometry or
// framing could silently regress and nothing else.
//
// These are viable at all because WebGL output here was verified deterministic — the same scene
// captured from two separate browser launches came back byte-identical (0 differing pixels of
// 529,126). That holds for a pinned machine/driver, which is the same assumption this project's
// existing `*-darwin.png` baselines already make.
//
// Same file-naming rule as configurator-visual.spec.ts: matches the `visual-chromium` project's
// /visual\.spec\.ts/ pattern, so it runs via `pnpm test:visual`, not the CI-blocking e2e script.
//
// PHASE 3F.1 — RELIABILITY ROOT CAUSE (this harness silently missed Phase 3F's own lighting and
// material changes; investigated at length before finding the real cause, recorded here so it is
// never re-investigated from scratch):
//
// It was NOT a stale WebGL framebuffer, and NOT a browser-compositor timing issue — both were
// directly ruled out via `gl.readPixels()` inside the test page, which always read the correct,
// freshly-rendered pixels, and via `page.locator(...).screenshot()` called directly, which also
// always returned the correct image. The actual capture pipeline works.
//
// The real cause was a comparison-sensitivity default, in TWO places:
//   1. `--update-snapshots` (bare flag) defaults to `preset: "changed"` — it re-runs the normal
//      pixel comparison against the existing baseline and only WRITES a new file if that
//      comparison already reports a difference. `--update-snapshots=all` is required to force an
//      unconditional rewrite; the bare flag silently leaves a stale baseline in place if the
//      comparison doesn't trip.
//   2. `toHaveScreenshot()`'s own default pixelmatch `threshold` (0.2, a per-pixel YIQ perceptual
//      distance) is tuned to absorb anti-aliasing/GPU noise around sharp edges — and a broad,
//      LOW-magnitude, whole-image lighting/tone shift (exactly what Phase 3F's lighting study and
//      material response changes are) can sit almost entirely under that same threshold, pixel by
//      pixel, even though the change is obvious to a human eye across the full frame. That is
//      why the REGRESSION TEST ITSELF (not just `--update-snapshots`) kept passing against a
//      stale baseline — the comparison, not the capture, was the blind spot.
//
// The fix here is therefore the explicit, TIGHTER `threshold` passed to every `toHaveScreenshot()`
// call below (see `SCREENSHOT_OPTIONS`), proven (Phase 3F.1's own §A3) to actually fail against a
// deliberately mutated render and pass again once reverted — see the Phase 3F.1 final report for
// the exact pixel-diff evidence. `waitForSettledFrame` below (a deterministic, test-only
// invalidate-and-wait-for-a-real-frame helper, replacing a blind `waitForTimeout`) is kept anyway:
// it is still better practice for a `frameloop="demand"` canvas than an arbitrary timeout, even
// though it was not, in the end, the thing masking Phase 3F's changes.
//
// Threshold chosen empirically, not guessed: 0.2 (default) proved too loose to catch the Phase 3F
// lighting change at all. At 0.1 (this value), both directions were proven directly (Phase 3F.1
// §A3): a deliberate, obvious mutation (STUDIO_BACKGROUND swapped to pure red) against the correct
// baseline failed with 300,069 pixels (68% of the frame) reported different — definitive proof
// this harness now detects a real WebGL change — and, reverted, the full 5-test suite passed
// cleanly, repeated 3x (15/15), with no observed GPU/AA flakiness on this machine. Revisit
// together if a future change needs it loosened.
const SCREENSHOT_OPTIONS = { threshold: 0.1 } as const;

async function openConfigurator(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.goto('/configurator-preview', { waitUntil: 'load' });
  const essentialCookiesButton = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
  await essentialCookiesButton.click();
  await page.addStyleTag({
    content: `
      *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
      .site-header, .skip-link { display: none !important; }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Phase 3F.1 — a deterministic replacement for a blind `waitForTimeout`, built and kept even
 * though the module-level comment above traces this harness's actual reliability bug to
 * comparison sensitivity, not frame timing (both were checked directly — see that comment).
 * `window.__HANGAR_3D_TEST_API__` (ThreeHangarView.tsx's `TestRenderSyncAPI`, test/dev-only) waits
 * for an ACTUAL new WebGL render (via `useFrame`, which frameloop="demand" only fires during a
 * real triggered render — never a busy-poll) and then two further animation frames for the browser
 * compositor to catch up, before resolving. Still strictly better than an arbitrary timeout for a
 * `frameloop="demand"` canvas: deterministic rather than hoping a fixed delay was long enough.
 * Falls back to the previous timeout if the test API is ever unavailable (e.g. a production-mode
 * build under test), so this helper degrades gracefully rather than hanging.
 */
async function waitForSettledFrame(page: Page) {
  const synced = await page.evaluate(async () => {
    const api = (window as unknown as { __HANGAR_3D_TEST_API__?: { invalidateAndWaitForFrame: () => Promise<void> } }).__HANGAR_3D_TEST_API__;
    if (!api) return false;
    await api.invalidateAndWaitForFrame();
    // A second round trip: the build-up FSM's own React effects (layer phase transitions) can
    // still be settling on the frame the first call caught — a fresh scene descriptor from THAT
    // settled state needs its own invalidate+render+composite cycle to be certain the very latest
    // visual state is what a screenshot will see.
    await api.invalidateAndWaitForFrame();
    return true;
  });
  if (!synced) await page.waitForTimeout(900);
}

async function enterThreeMode(page: Page) {
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.hc-preview-surface canvas')).toBeVisible({ timeout: 20_000 });
  await waitForSettledFrame(page);
}

test.describe('configurator 3D visual states', () => {
  test('1 — default complete shell, desktop', async ({ page }) => {
    await openConfigurator(page);
    await enterThreeMode(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-3d-default.png', SCREENSHOT_OPTIONS);
  });

  test('2 — frame only, desktop (the readability case)', async ({ page }) => {
    await openConfigurator(page);
    // Scoped to the scope-of-work group: Phase 3D's own "Огороджувальні конструкції" section
    // added its own "Покрівля" (roof cladding system) heading to the same page, so an unscoped
    // text match on that one label now resolves to two elements.
    const scopeGroup = page.getByLabel('Обсяг заявки');
    for (const label of ['Фундамент', 'Стіни / огороджувальний контур', 'Покрівля']) {
      await scopeGroup.getByText(label, { exact: true }).click();
    }
    await enterThreeMode(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-3d-frame-only.png', SCREENSHOT_OPTIONS);
  });

  test('3 — changed dimensions (wide and short)', async ({ page }) => {
    await openConfigurator(page);
    await page.locator('#hc-dimension-width').fill('48');
    await page.locator('#hc-dimension-length').fill('30');
    await page.locator('#hc-dimension-height').fill('6');
    await page.locator('#hc-dimension-height').blur();
    await enterThreeMode(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-3d-changed-dimensions.png', SCREENSHOT_OPTIONS);
  });

  test('4 — complete shell, tablet 820', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await openConfigurator(page);
    await enterThreeMode(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-3d-tablet-820.png', SCREENSHOT_OPTIONS);
  });

  test('5 — complete shell, mobile 390 (opt-in, no shadows)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openConfigurator(page);
    await enterThreeMode(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-3d-mobile-390.png', SCREENSHOT_OPTIONS);
  });
});
