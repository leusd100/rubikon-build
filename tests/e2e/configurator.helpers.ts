import { expect, type Page } from '@playwright/test';

export type ControlGroup =
  | 'need' | 'dimensions' | 'envelope' | 'cladding' | 'foundation' | 'openings' | 'space' | 'scope' | 'project'
  /** «Об’єкт» before 07.10: what the hangar is for and where now open «Задача» */
  | 'object';

/** The step each group is walked in (controlGroups.ts CONTROL_STEPS, 07.10) */
const STEP_OF: Record<ControlGroup, string> = {
  need: 'task',
  object: 'task',
  dimensions: 'size',
  envelope: 'shell',
  cladding: 'shell',
  foundation: 'shell',
  openings: 'shell',
  space: 'frame',
  scope: 'check',
  project: 'check',
};

/**
 * The configurator walks its groups as steps, one open at a time on every width (07.10): open the step a control lives
 * in before using it. The tabs answer only once the page has hydrated — until then the server markup shows the first
 * step — so this clicks until the tab is the selected one.
 */
export async function openControlGroup(page: Page, group: ControlGroup) {
  const tab = page.locator(`#hc-step-${STEP_OF[group]}-tab`);
  await expect(async () => {
    if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

/**
 * «Обсяг робіт» is the whole list («Комплекс робіт») unless the visitor picks «Окремі роботи» (07.10): only then does
 * each work have its own checkbox, every one still ticked.
 */
export async function chooseSeparateWorks(page: Page) {
  await openControlGroup(page, 'scope');
  const separate = page.getByRole('radio', { name: 'Окремі роботи', exact: true });
  // the answer's square covers its input, as for every option card: click the answer, as a visitor does
  await page.locator('.hc-option-card').filter({ hasText: 'Окремі роботи' }).click();
  await expect(separate).toBeChecked();
}

/**
 * 3D on /angary is a secondary look (07.10): a chip on the drawing, «Подивитися в 3D», opens it and «← Креслення» goes
 * back. The research screen (/configurator-preview) keeps its two-button switch «Технічний вид» / «3D».
 */
export async function openThree(page: Page) {
  const chip = page.getByRole('button', { name: 'Подивитися в 3D', exact: true });
  if (await chip.count()) await chip.click();
  else await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.hc-preview-surface canvas, .hc-preview-sheet canvas').first()).toBeVisible({ timeout: 20_000 });
}

export async function backToDrawing(page: Page) {
  const chip = page.getByRole('button', { name: /Креслення$/ });
  if (await chip.count()) await chip.click();
  else await page.getByRole('button', { name: 'Технічний вид', exact: true }).click();
}

/**
 * On a phone, scrolls on until the mini drawing holds, and `past` px further (09.10, audit F120): the sheet turns mini
 * as its bottom edge reaches the mini drawing's — the controls' top under the header, the mini drawing (`--hc-mini-h`,
 * measured by the page once it has hydrated) and the layout's gap — not as its top reaches the header.
 */
export async function scrollToMiniHold(page: Page, past = 40) {
  const layout = page.locator('#configurator .hc-layout');
  await expect.poll(() => layout.evaluate((element: HTMLElement) => element.style.getPropertyValue('--hc-mini-h'))).not.toBe('');
  await layout.evaluate((element: HTMLElement, extra) => {
    const controls = element.querySelector('.hc-controls')!;
    const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
    const line = header + Number.parseFloat(element.style.getPropertyValue('--hc-mini-h')) + (Number.parseFloat(getComputedStyle(element).rowGap) || 0);
    window.scrollBy({ top: controls.getBoundingClientRect().top - line + extra, behavior: 'instant' });
  }, past);
  await expect(layout).toHaveAttribute('data-configuring', '');
}

/** Instruments the canvas's WebGL context to count draw calls, without touching app code — the
 *  same technique `docs/hangar-3d-view-phase-3a.md`'s own draw-call measurements used manually,
 *  wired up here so it runs on every future change instead of being a one-off DevTools session. */
export async function installDrawCallCounter(page: Page) {
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
 *    `quietFramesNeeded` asks for a longer run of them, for a test that needs the canvas to have idled. The canvas must
 *    have drawn at all: before its first frame it is quiet too. Needs installDrawCallCounter before the page opens.
 */
export async function waitForBuildUpToSettle(page: Page, quietFramesNeeded = 2) {
  await expect(page.locator('.hc-preview-surface [data-build-up]')).toHaveAttribute('data-build-up', 'settled', { timeout: 15_000 });
  const stopped = await page.evaluate((needed) => new Promise<boolean>((resolve) => {
    const w = window as unknown as { __drawCalls: number };
    const deadline = performance.now() + 15_000;
    let last = w.__drawCalls;
    let quietFrames = 0;
    const tick = () => {
      quietFrames = w.__drawCalls === last ? quietFrames + 1 : 0;
      last = w.__drawCalls;
      if (quietFrames >= needed && w.__drawCalls > 0) resolve(true);
      else if (performance.now() > deadline) resolve(false);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), quietFramesNeeded);
  expect(stopped, '15 s after the build-up settled the render loop had not drawn, or was still drawing — frameloop="demand" never returned to idle').toBe(true);
}
