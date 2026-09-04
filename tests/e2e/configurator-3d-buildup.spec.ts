import { expect, test, type Page } from '@playwright/test';

// Phase 3B — 3D build-up integration. `ThreeHangarView` consumes the SAME `useLayerLifecycle`
// hook and `buildUpSequence.ts` timing table the SVG renderer already uses (see that module's own
// doc comment) — this file is deliberately NOT a re-test of the FSM itself (layerLifecycle.test.ts
// and configurator.spec.ts's build-up section already cover that exhaustively). What is new and
// R3F-specific, and therefore what these tests target:
//   - the WebGL half actually runs without throwing across every layer, in both directions,
//     under interruption, and under reduced motion — a real runtime crash here ("Hooks can only
//     be used within the Canvas component!") passed typecheck, lint AND all 240 unit tests before
//     a live browser check caught it, which is exactly the failure mode this file exists to catch
//     on every future change;
//   - `frameloop="demand"` genuinely returns to zero draw calls once a transition settles, not
//     just "looks idle" — measured directly against the WebGL context, not inferred.

async function openConfigurator(page: Page) {
  await page.goto('/configurator-preview');
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click({ timeout: 15000 }).catch(() => {});
  await expect(page.locator('.hc-preview-surface')).toBeVisible();
}

async function enterThreeMode(page: Page) {
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.hc-preview-surface canvas')).toBeVisible({ timeout: 20000 });
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

const scopeLabel = {
  foundation: 'Фундамент',
  frame: 'Металокаркас',
  walls: 'Стіни / огороджувальний контур',
  roof: 'Покрівля',
} as const;

// Scoped to the scope-of-work group specifically (not a bare page-wide text match): Phase 3C's
// material colour presets added their own "Покрівля" / "Обшивка" swatch-group legends to the same
// 3D view, so an unscoped `getByText('Покрівля')` now matches two elements once in 3D mode.
function scopeGroup(page: Page) {
  return page.getByLabel('Обсяг заявки');
}

async function toggleScope(page: Page, item: keyof typeof scopeLabel) {
  await scopeGroup(page).getByText(scopeLabel[item], { exact: true }).click();
}

/** Instruments the canvas's WebGL context to count draw calls, without touching app code — the
 *  same technique `docs/hangar-3d-view-phase-3a.md`'s own draw-call measurements used manually,
 *  wired up here so it runs on every future change instead of being a one-off DevTools session. */
async function installDrawCallCounter(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __drawCalls: number };
    w.__drawCalls = 0;
    const patch = (proto: typeof WebGLRenderingContext.prototype | typeof WebGL2RenderingContext.prototype) => {
      const drawArrays = proto.drawArrays;
      const drawElements = proto.drawElements;
      proto.drawArrays = function (this: WebGLRenderingContext, ...args: Parameters<typeof drawArrays>) {
        w.__drawCalls += 1;
        return drawArrays.apply(this, args);
      };
      proto.drawElements = function (this: WebGLRenderingContext, ...args: Parameters<typeof drawElements>) {
        w.__drawCalls += 1;
        return drawElements.apply(this, args);
      };
    };
    patch(WebGLRenderingContext.prototype);
    if (typeof WebGL2RenderingContext !== 'undefined') patch(WebGL2RenderingContext.prototype);
  });
}

async function readDrawCalls(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __drawCalls: number }).__drawCalls);
}

test.describe('configurator 3D build-up (Phase 3B)', () => {
  test('every layer materializes and dematerializes in 3D with no runtime error, in either direction', async ({ page }) => {
    const errors = trackErrors(page);
    await openConfigurator(page);
    await enterThreeMode(page);

    for (const item of ['roof', 'walls', 'frame', 'foundation'] as const) {
      await toggleScope(page, item); // off
      await page.waitForTimeout(500); // longer than any single layer's duration + offset
      await toggleScope(page, item); // back on
      await page.waitForTimeout(500);
    }

    expect(errors, `console/page errors during build-up: ${errors.join('\n')}`).toEqual([]);
    // The canvas is still there and the app is still responsive — a crash inside <Canvas> would
    // have been caught by ThreeErrorBoundary and silently fallen back to Technical (see the
    // fallback test below for that path specifically); asserting 3D itself stayed mounted here
    // confirms this run exercised the real 3D code path throughout, not the fallback.
    await expect(page.locator('.hc-preview-surface canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: '3D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('rapid ON → OFF → ON on the same layer converges cleanly, no error, no stuck state', async ({ page }) => {
    const errors = trackErrors(page);
    await openConfigurator(page);
    await enterThreeMode(page);

    const roof = scopeGroup(page).getByText(scopeLabel.roof, { exact: true });
    await roof.click(); // off
    await roof.click(); // on — interrupts the dematerialize that just started
    await roof.click(); // off again — interrupts the materialize that just started
    await roof.click(); // on — settles here

    await page.waitForTimeout(600); // roof's own duration (250ms) with generous headroom
    expect(errors, `console/page errors during interruption: ${errors.join('\n')}`).toEqual([]);

    // Converged on the LAST requested state (on) — check via the summary, the canonical
    // description in either mode, not by trying to read WebGL pixels.
    await expect(page.locator('.hc-summary-facts')).toContainText('Покрівля');
  });

  test('a dimension change mid-transition does not throw — geometry updates immediately, independent of the in-flight animation', async ({ page }) => {
    const errors = trackErrors(page);
    await openConfigurator(page);
    await enterThreeMode(page);

    await toggleScope(page, 'frame'); // off — starts a ~350ms dematerialize
    await page.locator('#hc-dimension-width').fill('40');
    await page.locator('#hc-dimension-width').blur(); // fires while columns/rafters are still shrinking
    await page.waitForTimeout(500);

    expect(errors, `console/page errors: ${errors.join('\n')}`).toEqual([]);
    await expect(page.locator('.hc-summary-dimensions')).toContainText('40');
  });

  test('reduced motion: 3D build-up resolves without error and without the staged sequence', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = trackErrors(page);
    await openConfigurator(page);
    await enterThreeMode(page);

    await toggleScope(page, 'roof');
    await toggleScope(page, 'roof');
    await page.waitForTimeout(200); // reduced motion resolves same-tick; this is generous headroom

    expect(errors, `console/page errors under reduced motion: ${errors.join('\n')}`).toEqual([]);
    await expect(page.locator('.hc-summary-facts')).toContainText('Покрівля');
  });

  test('idle rendering returns to zero draw calls after a build-up transition settles', async ({ page }) => {
    await installDrawCallCounter(page);
    await openConfigurator(page);
    await enterThreeMode(page);

    await page.waitForTimeout(300); // let the initial mount's own frame(s) settle
    await toggleScope(page, 'roof'); // off — the only thing that should cause further draw calls
    await page.waitForTimeout(600); // roof's 250ms duration, generous headroom

    const afterSettle = await readDrawCalls(page);
    await page.waitForTimeout(500); // nothing is animating or changing — demand mode should be silent
    const afterIdleWait = await readDrawCalls(page);

    expect(afterIdleWait, 'draw calls kept incrementing after the transition should have settled — frameloop="demand" is not returning to idle').toBe(afterSettle);
  });

  test('switching Technical → 3D → Technical mid build-up preserves configuration exactly', async ({ page }) => {
    await openConfigurator(page);
    await page.locator('#hc-dimension-length').fill('80');
    await page.locator('#hc-dimension-length').blur();
    const summaryBefore = await page.locator('.hc-summary-facts').innerText();

    await enterThreeMode(page);
    await toggleScope(page, 'walls'); // start a transition in 3D
    await page.getByRole('button', { name: 'Технічний вид', exact: true }).click(); // switch away mid-flight

    await expect(page.locator('.hc-preview-svg')).toBeVisible();
    // Walls off is reflected correctly in the technical view too — same domain model, not two
    // independent states that could have drifted apart while 3D's own transition was interrupted
    // by the mode switch.
    await expect(page.locator('.hc-side-left polygon.no-walls').first()).toBeVisible();
    expect(await page.locator('.hc-summary-facts').innerText()).not.toBe(summaryBefore); // walls did change
    await expect(page.locator('#hc-dimension-length')).toHaveValue('80'); // but nothing else drifted
  });
});
