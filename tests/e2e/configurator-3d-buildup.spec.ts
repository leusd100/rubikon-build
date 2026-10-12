import { expect, test, type Page } from '@playwright/test';
import { chooseSeparateWorks, openControlGroup } from './configurator.helpers';

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
  frame: 'Каркас',
  walls: 'Стіни',
  roof: 'Покрівля',
} as const;

// By its checkbox, not a page-wide text match: Phase 3C's material colour presets and «Стіни й покрівля» name their own
// «Покрівля» groups on the same page. Each work has a checkbox only once «Окремі роботи» is chosen (07.10) — the default
// «Комплекс робіт» draws all four — so every test that toggles a layer chooses it first.
/** The summary's «Обсяг»: the works as a list, «Фундамент, каркас, стіни, покрівля», since 10.10 (audit F35) — the roof's
 *  word is in «Стіни й покрівля» too, so the scope is read on its own row */
function scopeFact(page: Page) {
  return page.locator('.hc-summary-facts > div').filter({ has: page.locator('dt', { hasText: /^Обсяг$/ }) }).locator('dd');
}

function scopeBox(page: Page, item: keyof typeof scopeLabel) {
  return page.getByRole('checkbox', { name: scopeLabel[item], exact: true });
}

async function toggleScope(page: Page, item: keyof typeof scopeLabel) {
  await scopeBox(page, item).click();
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

/**
 * Lets a test hold every animation frame back, the way CI does on its own. The runners have no GPU, so WebGL runs in
 * software (SwiftShader) and the browser hands out animation frames far apart: about 1.1 s apart in the trace of run
 * 38244513163, where the idle test below failed by exactly one frame. Installed before load but idle until
 * `slowAnimationFrames` switches it on, so the page and the 3D view open at full speed and only the transition under
 * test is paced. Timers are left alone: the build-up's own clock (useLayerLifecycle's timeout) keeps real time, as it
 * does on CI — only the frames that draw its result come late.
 *
 * `holdFramesAfterNextClick` holds only the frames asked for in the first moments after the next click: the first frame
 * of the transition that click starts comes late, and the rest at the browser's own pace.
 */
async function installFramePacer(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __frameDelayMs: number; __holdAfterClickMs: number };
    w.__frameDelayMs = 0;
    w.__holdAfterClickMs = 0;
    let holdUntil = 0;
    // On the document and in the capture phase: before React handles the click and the canvas asks for its first frame
    document.addEventListener('click', () => {
      if (w.__holdAfterClickMs > 0) holdUntil = performance.now() + w.__holdAfterClickMs;
      w.__holdAfterClickMs = 0;
    }, true);
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const held = new Map<number, number>(); // a frame still being held back → its timer
    const live = new Map<number, number>(); // a frame passed on to the browser → the browser's own id
    let nextId = 1;
    window.requestAnimationFrame = (callback) => {
      const id = nextId;
      nextId += 1;
      const pass = () => {
        held.delete(id);
        live.set(id, request((time) => {
          live.delete(id);
          callback(time);
        }));
      };
      const delayMs = Math.max(w.__frameDelayMs, holdUntil - performance.now());
      if (delayMs > 0) held.set(id, window.setTimeout(pass, delayMs));
      else pass();
      return id;
    };
    // R3F's demand loop stops by cancelling the frame it has just asked for: a held frame must be cancellable too
    window.cancelAnimationFrame = (id) => {
      const timer = held.get(id);
      if (timer !== undefined) window.clearTimeout(timer);
      held.delete(id);
      const frame = live.get(id);
      if (frame !== undefined) cancel(frame);
      live.delete(id);
    };
  });
}

/**
 * Where an idle check can start: the build-up has caught up with the configuration, and the frames that change asked
 * for have been drawn. Waits on both events, not on a guessed duration. On CI a 600 ms wait for a 250 ms roof transition was not
 * always enough: the transition ends on its lifecycle timer, and the frame that end asks for came whenever the browser
 * next gave one out. Under software WebGL that was up to 1.8 s after the click locally, and over 2 s after it in the
 * CI run that failed. That frame then fell inside the idle window.
 *
 * 1. `data-build-up="settled"` on the canvas's wrapper (ThreeHangarView): every layer is at rest on the side its scope
 *    asks for. It reads 'running' from the render where the scope changes, so it cannot be a stale 'settled' from
 *    before the click.
 * 2. Two animation frames in a row with no draw call. While R3F's demand loop runs it draws in every frame, so a whole
 *    frame without one means the loop has stopped. Two, not one: in the first frame the probe can run before a loop that
 *    was asked for a frame just after it. A loop that never stops fails here, by the deadline, not at the test's timeout.
 *    `quietFramesNeeded` asks for a longer run of them, for a test that needs the canvas to have idled.
 */
async function waitForBuildUpToSettle(page: Page, quietFramesNeeded = 2) {
  await expect(page.locator('.hc-preview-surface [data-build-up]')).toHaveAttribute('data-build-up', 'settled', { timeout: 15_000 });
  const stopped = await page.evaluate((needed) => new Promise<boolean>((resolve) => {
    const w = window as unknown as { __drawCalls: number };
    const deadline = performance.now() + 15_000;
    let last = w.__drawCalls;
    let quietFrames = 0;
    const tick = () => {
      quietFrames = w.__drawCalls === last ? quietFrames + 1 : 0;
      last = w.__drawCalls;
      if (quietFrames >= needed) resolve(true);
      else if (performance.now() > deadline) resolve(false);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), quietFramesNeeded);
  expect(stopped, 'the render loop was still drawing 15 s after the build-up settled — frameloop="demand" never returned to idle').toBe(true);
}

/**
 * Draw calls made over the next `frames` animation frames. The idle window is counted in frames, not milliseconds:
 * frames are when R3F's demand loop would draw, so the window gives it the same number of chances on a slow CI runner as
 * on a fast laptop. 30 frames is the half second the window used to be, at 60 Hz.
 */
async function drawCallsOverFrames(page: Page, frames: number): Promise<number> {
  return page.evaluate((count) => new Promise<number>((resolve) => {
    const w = window as unknown as { __drawCalls: number };
    const start = w.__drawCalls;
    let left = count;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve(w.__drawCalls - start);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), frames);
}

/**
 * Counts the animation frames that draw (at least one draw call: R3F's demand loop rendered), and notes that count each
 * time `data-build-up` turns 'settled'. Frames, not milliseconds: a GPU hands out a frame every 16 ms and CI's software
 * WebGL one every second or so, and "how many more frames once the build-up has settled" means the same on both.
 * Needs installDrawCallCounter.
 */
async function installSettleFrameCounter(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __drawCalls: number; __drawnFrames: number; __drawnFramesAtSettle: number | null };
    w.__drawnFrames = 0;
    w.__drawnFramesAtSettle = null;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request((time) => {
      const before = w.__drawCalls;
      try {
        callback(time);
      } finally {
        if (w.__drawCalls > before) w.__drawnFrames += 1;
      }
    });
    new MutationObserver((records) => {
      for (const record of records) {
        if ((record.target as HTMLElement).getAttribute('data-build-up') === 'settled') w.__drawnFramesAtSettle = w.__drawnFrames;
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-build-up'] });
  });
}

async function slowAnimationFrames(page: Page, delayMs: number) {
  await page.evaluate((ms) => {
    (window as unknown as { __frameDelayMs: number }).__frameDelayMs = ms;
  }, delayMs);
}

async function holdFramesAfterNextClick(page: Page, holdMs: number) {
  await page.evaluate((ms) => {
    (window as unknown as { __holdAfterClickMs: number }).__holdAfterClickMs = ms;
  }, holdMs);
}

type FadeFrames = { drawn: number; still: number };

/**
 * Notes how many draw calls each animation frame made, by the frame's timestamp. Every callback in one frame gets the
 * same timestamp, so R3F's loop and a test's own probe count towards the same frame, whichever of them runs first.
 * Needs installDrawCallCounter, and goes after installFramePacer: it counts the frames the pacer passes on.
 */
async function installFrameDrawLog(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __drawCalls: number; __drawsByFrame: Map<number, number> };
    w.__drawsByFrame = new Map();
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request((time) => {
      const before = w.__drawCalls;
      try {
        callback(time);
      } finally {
        w.__drawsByFrame.set(time, (w.__drawsByFrame.get(time) ?? 0) + w.__drawCalls - before);
      }
    });
  });
}

/**
 * Watches the next build-up, from `data-build-up` turning 'running' to 'settled': of the animation frames from its first
 * drawn one on, how many the canvas drew in, and how many it stood still in. The probe asks for a frame every frame, so
 * the frames in which R3F's demand loop drew nothing are counted too. Read the result with `fadeFrames`.
 */
async function watchNextBuildUp(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __drawsByFrame: Map<number, number>; __fade: Promise<FadeFrames | null> };
    const wrapper = document.querySelector('.hc-preview-surface [data-build-up]');
    const running: number[] = []; // the timestamps of the frames in which the build-up was running
    w.__drawsByFrame.clear();
    w.__fade = new Promise((resolve) => {
      const deadline = performance.now() + 15_000;
      const tick = (time: number) => {
        const state = wrapper?.getAttribute('data-build-up');
        if (state === 'running') running.push(time);
        if (state === 'settled' && running.length > 0) {
          // every frame noted above is over by now, R3F's callback in it included
          const drew = running.map((frame) => (w.__drawsByFrame.get(frame) ?? 0) > 0);
          const fade = drew.slice(Math.max(0, drew.indexOf(true)));
          resolve({ drawn: fade.filter(Boolean).length, still: fade.filter((d) => !d).length });
        } else if (performance.now() > deadline) resolve(null);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
}

async function fadeFrames(page: Page): Promise<FadeFrames | null> {
  return page.evaluate(() => (window as unknown as { __fade: Promise<FadeFrames | null> }).__fade);
}

test.describe('configurator 3D build-up (Phase 3B)', () => {
  /**
   * One budget for the whole file, because the pressure is on the FILE and not on any one test.
   *
   * Every test here pays the same fixed toll before it asserts anything: reach a visible WebGL
   * canvas (a 20s budget on its own), then drive layer transitions with real settle waits. On CI
   * that runs against software-rendered WebGL at workers:2, and the same suite takes 12.2 min
   * there against ~5 min locally — a factor of about 2.4. Measured locally and scaled by it:
   *
   *   every layer materializes/dematerializes   36.3s -> ~89s   (had 60s: flaky, passed on retry)
   *   rapid ON -> OFF -> ON                     21.7s -> ~53s   (had 30s: FAILED, both retries)
   *   reduced motion                            14.3s -> ~35s   (had 30s)
   *   mode switch mid build-up                  13.4s -> ~33s   (had 30s)
   *   dimension change mid-transition           13.3s -> ~33s   (had 30s)
   *   idle draw calls                            9.7s -> ~24s   (had 30s)
   *
   * Five of the six were over budget; only one had ever been given more, which is why this looked
   * like one flaky test instead of a file-wide shortfall. 150s is ~1.7x the worst estimate, so the
   * headroom survives a slower runner without hiding a real hang — a genuinely stuck transition
   * still fails, just 150s later, and none of the coverage is trimmed to fit.
   */
  test.describe.configure({ timeout: 150_000 });
  test('every layer materializes and dematerializes in 3D with no runtime error, in either direction', async ({ page }) => {
    // Still the heaviest test in the file — 4 layers toggled off and back on with explicit settle
    // waits — but its budget now comes from the describe above, which covers every test here for
    // the same reason rather than singling this one out.
    const errors = trackErrors(page);
    await openConfigurator(page);
    await enterThreeMode(page);
    await chooseSeparateWorks(page);

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
    await chooseSeparateWorks(page);

    const roof = scopeBox(page, 'roof');
    await roof.click(); // off
    await roof.click(); // on — interrupts the dematerialize that just started
    await roof.click(); // off again — interrupts the materialize that just started
    await roof.click(); // on — settles here

    await page.waitForTimeout(600); // roof's own duration (250ms) with generous headroom
    expect(errors, `console/page errors during interruption: ${errors.join('\n')}`).toEqual([]);

    // Converged on the LAST requested state (on) — check via the summary, the canonical
    // description in either mode, not by trying to read WebGL pixels.
    await expect(scopeFact(page)).toContainText('покрівля');
  });

  test('a dimension change mid-transition does not throw — geometry updates immediately, independent of the in-flight animation', async ({ page }) => {
    const errors = trackErrors(page);
    await openConfigurator(page);
    await enterThreeMode(page);
    await chooseSeparateWorks(page);

    await toggleScope(page, 'frame'); // off — starts a ~350ms dematerialize
    // the sizes are another step (07.10): one click away, well inside the frame's ~350ms
    await openControlGroup(page, 'dimensions');
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
    await chooseSeparateWorks(page);

    await toggleScope(page, 'roof');
    await toggleScope(page, 'roof');
    await page.waitForTimeout(200); // reduced motion resolves same-tick; this is generous headroom

    expect(errors, `console/page errors under reduced motion: ${errors.join('\n')}`).toEqual([]);
    await expect(scopeFact(page)).toContainText('покрівля');
  });

  test('idle rendering returns to zero draw calls after a build-up transition settles', async ({ page }) => {
    await installDrawCallCounter(page);
    await openConfigurator(page);
    await enterThreeMode(page);
    await chooseSeparateWorks(page);

    await waitForBuildUpToSettle(page); // the initial mount's own frame(s) have been drawn and the loop has stopped
    await toggleScope(page, 'roof'); // off — the only thing that should cause further draw calls
    await waitForBuildUpToSettle(page); // the roof has left and its last frame is drawn, however late that frame came

    // nothing is animating or changing — demand mode should be silent
    expect(await drawCallsOverFrames(page, 30), 'draw calls kept incrementing after the transition should have settled — frameloop="demand" is not returning to idle').toBe(0);
  });

  test('idle rendering returns to zero draw calls even when animation frames come late, as on CI', async ({ page }) => {
    // The same check as above, with every frame held back 800 ms from the moment the roof is switched off — less than the
    // ~1.1 s CI's software WebGL took on its own. What failed there once in a while then fails here every time if the
    // check guesses the transition's length: with the 600 ms wait it used before 12.10, 10 runs out of 10.
    await installDrawCallCounter(page);
    await installFramePacer(page);
    await openConfigurator(page);
    await enterThreeMode(page);
    await chooseSeparateWorks(page);

    await waitForBuildUpToSettle(page); // the initial mount's own frame(s) have been drawn and the loop has stopped
    await slowAnimationFrames(page, 800);
    await toggleScope(page, 'roof'); // off
    await waitForBuildUpToSettle(page);
    // The idle window at the browser's own pace, as above: thirty held frames would take 24 s
    await slowAnimationFrames(page, 0);

    expect(await drawCallsOverFrames(page, 30), 'draw calls kept incrementing after the transition should have settled — frameloop="demand" is not returning to idle').toBe(0);
  });

  test('the render loop stops within two frames of the build-up settling, for every toggle', async ({ page }) => {
    // When the lifecycle timer puts the last layer at rest, at most two frames follow: one already asked for, which can
    // still draw the old phase (the 3D scene is its own React root and commits the new phase a moment after the page
    // marks it), and the one that draws the resting state. Before 12.10 each layer replayed the bit of progress its last
    // frame was short of, over its whole delay + duration again: 15 frames after the roof settled on a GPU, 78 after the
    // frame did (its girts wait 1150 ms before they move).
    await installDrawCallCounter(page);
    await installSettleFrameCounter(page);
    await openConfigurator(page);
    await enterThreeMode(page);
    await chooseSeparateWorks(page);
    await waitForBuildUpToSettle(page);

    const framesAfterSettle: Record<string, number> = {};
    for (const [toggle, item] of [['roof off', 'roof'], ['roof on', 'roof'], ['frame off', 'frame'], ['frame on', 'frame']] as const) {
      await page.evaluate(() => {
        (window as unknown as { __drawnFramesAtSettle: number | null }).__drawnFramesAtSettle = null;
      });
      await toggleScope(page, item);
      await waitForBuildUpToSettle(page); // settled, then the loop has stopped
      framesAfterSettle[toggle] = await page.evaluate(() => {
        const w = window as unknown as { __drawnFrames: number; __drawnFramesAtSettle: number | null };
        return w.__drawnFramesAtSettle === null ? Number.NaN : w.__drawnFrames - w.__drawnFramesAtSettle;
      });
    }

    for (const [toggle, frames] of Object.entries(framesAfterSettle)) {
      expect(frames, `${toggle}: frames drawn after data-build-up="settled" (all toggles: ${JSON.stringify(framesAfterSettle)})`).toBeLessThanOrEqual(2);
    }
  });

  test('a layer switched after the canvas has idled fades over its whole transition, even when its first frame comes late', async ({ page }) => {
    // Once a layer's fade has drawn its first frame, the canvas draws every frame until the build-up settles. Before
    // 12.10 the fade timed itself on R3F's clock, which under frameloop="demand" only moves when a frame is drawn. When
    // the layer's phase changed before the first frame after an idle spell, the fade started at the last frame drawn,
    // a second or more back, and that first frame counted the whole idle spell as time gone by. The roof was gone in one
    // frame, and the canvas stood still until the lifecycle's timer ended the transition: about 1 roof toggle in 20 on
    // a GPU. Holding the frames of the first 100 ms after the click puts the phase change first every time: before the
    // fix, 1 frame drawn and 8–9 still, for the roof switched off and on alike.
    await installDrawCallCounter(page);
    await installFramePacer(page);
    await installFrameDrawLog(page);
    await openConfigurator(page);
    await enterThreeMode(page);
    await chooseSeparateWorks(page);

    const fades: Record<string, FadeFrames | null> = {};
    for (const toggle of ['roof off', 'roof on'] as const) {
      await waitForBuildUpToSettle(page, 90); // and then idle: 90 frames in a row without a draw, 1.5 s at 60 Hz
      await holdFramesAfterNextClick(page, 100);
      await watchNextBuildUp(page);
      await toggleScope(page, 'roof');
      fades[toggle] = await fadeFrames(page);
    }

    for (const [toggle, fade] of Object.entries(fades)) {
      expect(fade, `${toggle}: the build-up did not run and settle within 15 s`).not.toBeNull();
      expect(fade?.still, `${toggle}: frames in which the canvas stood still mid-fade (all toggles: ${JSON.stringify(fades)})`).toBeLessThanOrEqual(1);
    }
  });

  test('switching Technical → 3D → Technical mid build-up preserves configuration exactly', async ({ page }) => {
    await openConfigurator(page);
    await openControlGroup(page, 'dimensions');
    await page.locator('#hc-dimension-length').fill('80');
    await page.locator('#hc-dimension-length').blur();
    const summaryBefore = await page.locator('.hc-summary-facts').innerText();

    await enterThreeMode(page);
    await chooseSeparateWorks(page);
    await toggleScope(page, 'walls'); // start a transition in 3D
    await page.getByRole('button', { name: 'Технічний вид', exact: true }).click(); // switch away mid-flight

    await expect(page.locator('.hc-preview-svg')).toBeVisible();
    // Walls off is reflected correctly in the technical view too — same domain model, not two
    // independent states that could have drifted apart while 3D's own transition was interrupted
    // by the mode switch.
    await expect(page.locator('.hc-side-left polygon.no-walls').first()).toBeVisible();
    expect(await page.locator('.hc-summary-facts').innerText()).not.toBe(summaryBefore); // walls did change
    await openControlGroup(page, 'dimensions');
    await expect(page.locator('#hc-dimension-length')).toHaveValue('80'); // but nothing else drifted
  });
});
