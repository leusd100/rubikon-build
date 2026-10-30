import { expect, test, type Page } from '@playwright/test';
import { chooseSeparateWorks, openControlGroup } from './configurator.helpers';

// Phase 3A — the Technical ↔ 3D mode switch.
//
// The product rule under test throughout: these are two representations of ONE configured object.
// Switching must never touch the configuration, and 3D must never become a dependency.

/**
 * Matches the three.js / R3F LIBRARY payload only — never this project's own modules.
 *
 * A naive /three/i also matches `app/lib/configurator/threeSceneModel.ts` and
 * `app/components/configurator/three/*`, which is misleading: those are small pure modules with no
 * three.js import at all, and they are *meant* to load eagerly (the scene model feeds both views,
 * and the WebGL probe has to run before the toggle can be offered). Requiring a vendor path keeps
 * the assertion on the thing that actually costs ~230KB.
 */
function isThreeLibrary(url: string): boolean {
  return /node_modules|_next\/static\/chunks/.test(url) && /three/i.test(url);
}

async function openConfigurator(page: Page) {
  await page.goto('/configurator-preview');
  // Hydration-readiness signal used across this suite: the consent banner's button is rendered by
  // a client component, so its presence means React has hydrated and controls will respond.
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click({ timeout: 15000 }).catch(() => {});
  await expect(page.locator('.hc-preview-surface')).toBeVisible();
}

/** A work's own checkbox in «Обсяг робіт» — there only once «Окремі роботи» is chosen (07.10) */
const scopeBox = (page: Page, name: 'Стіни' | 'Покрівля') => page.getByRole('checkbox', { name, exact: true });

const technicalButton = (page: Page) => page.getByRole('button', { name: 'Технічний вид', exact: true });
const threeButton = (page: Page) => page.getByRole('button', { name: '3D', exact: true });

async function enterThreeMode(page: Page) {
  await threeButton(page).click();
  await expect(page.locator('.hc-preview-surface canvas')).toBeVisible({ timeout: 20000 });
}

test.describe('configurator 3D mode (Phase 3A)', () => {
  test('starts in the technical view, with 3D offered but not loaded', async ({ page }) => {
    const threeRequests: string[] = [];
    page.on('request', (r) => { if (isThreeLibrary(r.url())) threeRequests.push(r.url()); });

    await openConfigurator(page);

    await expect(page.locator('.hc-preview-svg')).toBeVisible();
    await expect(page.locator('.hc-preview-surface canvas')).toHaveCount(0);
    await expect(technicalButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(threeButton(page)).toHaveAttribute('aria-pressed', 'false');

    // The whole point of lazy loading: the renderer must not be on the critical path.
    expect(threeRequests, `3D chunk requested before it was asked for: ${threeRequests.join(', ')}`).toHaveLength(0);
  });

  test('loads the 3D renderer only once the visitor asks for it', async ({ page }) => {
    const threeRequests: string[] = [];
    page.on('request', (r) => { if (isThreeLibrary(r.url())) threeRequests.push(r.url()); });

    await openConfigurator(page);
    expect(threeRequests).toHaveLength(0);

    await enterThreeMode(page);

    expect(threeRequests.length).toBeGreaterThan(0);
    await expect(page.locator('.hc-preview-svg')).toHaveCount(0);
    await expect(threeButton(page)).toHaveAttribute('aria-pressed', 'true');
  });

  test('switching Technical → 3D → Technical changes no configuration', async ({ page }) => {
    await openConfigurator(page);

    await openControlGroup(page, 'dimensions');
    await page.locator('#hc-dimension-width').fill('36');
    await page.locator('#hc-dimension-width').blur();
    // By its checkbox, which exists once «Окремі роботи» is chosen (07.10): «Стіни й покрівля» names its own «Покрівля»
    // radiogroup on the same page.
    await chooseSeparateWorks(page);
    await scopeBox(page, 'Покрівля').click(); // roof off
    await openControlGroup(page, 'openings');
    await page.locator('label.hc-option-card', { has: page.locator('input[name="hc-gates"]'), hasText: /^2$/ }).click(); // two gates
    await expect(page.locator('.hc-summary-facts')).toContainText('Двоє стандартних');
    await expect(page.locator('.hc-summary-facts')).not.toContainText('Покрівля');

    const summaryBefore = await page.locator('.hc-summary-facts').innerText();
    const dimsBefore = await page.locator('#hc-dimension-width').inputValue();

    await enterThreeMode(page);
    await technicalButton(page).click();
    await expect(page.locator('.hc-preview-svg')).toBeVisible();

    // the step the visitor was on stays open (the view switch is the preview's, not the controls')
    await expect(page.locator('#hc-step-shell-tab')).toHaveAttribute('aria-selected', 'true');
    expect(await page.locator('#hc-dimension-width').inputValue()).toBe(dimsBefore);
    expect(await page.locator('.hc-summary-facts').innerText()).toBe(summaryBefore);
  });

  test('the summary is identical in both modes — the canvas is never the information source', async ({ page }) => {
    await openConfigurator(page);
    const technicalSummary = await page.locator('.hc-summary-facts').innerText();

    await enterThreeMode(page);

    expect(await page.locator('.hc-summary-facts').innerText()).toBe(technicalSummary);
    // Controls stay operable while 3D is on screen.
    await expect(page.locator('#hc-dimension-width')).toBeEnabled();
  });

  test('a dimension change applies while 3D is on screen, and the technical view agrees afterwards', async ({ page }) => {
    await openConfigurator(page);
    await enterThreeMode(page);

    await openControlGroup(page, 'dimensions');
    await page.locator('#hc-dimension-length').fill('90');
    await page.locator('#hc-dimension-length').blur();
    // .hc-summary-area is the FOOTPRINT in m², not the length — assert the dimensions label.
    await expect(page.locator('.hc-summary-dimensions')).toContainText('90');

    await technicalButton(page).click();
    await expect(page.locator('.hc-preview-svg')).toBeVisible();
    await expect(page.locator('.hc-preview-svg .hc-dimension text').filter({ hasText: '90 м' })).toHaveCount(1);
  });

  test('a scope change applies in 3D and stays consistent on the way back', async ({ page }) => {
    await openConfigurator(page);
    await enterThreeMode(page);

    await chooseSeparateWorks(page);
    await scopeBox(page, 'Стіни').click(); // walls off
    await expect(page.locator('.hc-summary-facts')).not.toContainText('Стіни');

    await technicalButton(page).click();
    // Not `.first()`: the first no-walls polygon in DOM order is the REAR gable, which is
    // deliberately display:none (occluded from this fixed viewpoint). Assert on a side wall bay.
    await expect(page.locator('.hc-side-left polygon.no-walls').first()).toBeVisible();
  });

  test('the mode switch is keyboard operable and exposes its state', async ({ page }) => {
    await openConfigurator(page);

    await threeButton(page).focus();
    await expect(threeButton(page)).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.locator('.hc-preview-surface canvas')).toBeVisible({ timeout: 20000 });
    await expect(threeButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(technicalButton(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('falls back to the technical view when the 3D chunk fails to load', async ({ page }) => {
    await openConfigurator(page);
    // Simulate the realistic failure: the lazily-imported renderer never arrives.
    await page.route((url) => isThreeLibrary(url.href), (route) => route.abort());

    await threeButton(page).click();

    // No broken canvas, no lost configurator — the drawing comes back and the controls still work.
    await expect(page.locator('.hc-preview-svg')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.hc-summary-facts')).toBeVisible();
    await expect(page.locator('#hc-dimension-width')).toBeEnabled();
  });

  test('offers no 3D toggle at all when WebGL is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: any[]) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (original as any).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });

    await openConfigurator(page);

    await expect(threeButton(page)).toBeDisabled();
    await expect(page.locator('.hc-preview-svg')).toBeVisible();
  });
});

test.describe('configurator 3D — responsive', () => {
  for (const [label, width, height] of [
    ['mobile 390', 390, 844],
    ['600', 600, 900],
    ['768', 768, 1024],
    ['tablet 820', 820, 1180],
    ['1024', 1024, 768],
    ['desktop 1440', 1440, 900],
  ] as const) {
    test(`no horizontal overflow at ${label}, in either mode`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openConfigurator(page);

      const overflowTechnical = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflowTechnical, `technical view overflows at ${label}`).toBeLessThanOrEqual(1);

      await enterThreeMode(page);
      const overflowThree = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflowThree, `3D view overflows at ${label}`).toBeLessThanOrEqual(1);
    });
  }

  test('mobile defaults to the technical view and does not preload the renderer', async ({ page }) => {
    const threeRequests: string[] = [];
    page.on('request', (r) => { if (isThreeLibrary(r.url())) threeRequests.push(r.url()); });

    await page.setViewportSize({ width: 390, height: 844 });
    await openConfigurator(page);

    await expect(technicalButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.hc-preview-svg')).toBeVisible();
    expect(threeRequests).toHaveLength(0);
  });

  test('switching modes does not change the preview surface size', async ({ page }) => {
    await openConfigurator(page);
    const before = await page.locator('.hc-preview-surface').boundingBox();

    await enterThreeMode(page);
    const after = await page.locator('.hc-preview-surface').boundingBox();

    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
  });
});

// 27.10 (Engineering Excellence, GL-02 / GL-03 / GL-04): the ways a WebGL context fails, or outlives its view, on
// /angary's sheet, where 3D is a chip on the drawing. 3D must still never become a dependency: every failure ends on the
// drawing, with no uncaught error, and a closed view must not keep its renderer.
test.describe('configurator 3D — WebGL failures and teardown', () => {
  test.skip(({ isMobile }) => isMobile, 'the renderer\'s failure paths and teardown are viewport-independent');

  async function openSheet(page: Page) {
    await page.goto('/angary', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click({ timeout: 15000 }).catch(() => {});
    // The sheet in full view, at once, as configurator-sheet.spec.ts does: left to the click's own scrolling, under load
    // the chip moved between the aim and the click, and 3D never opened
    await page.evaluate(() => {
      const layout = document.querySelector('#configurator .hc-layout');
      const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
      if (layout) window.scrollTo({ top: window.scrollY + layout.getBoundingClientRect().top - header - 12, behavior: 'instant' });
    });
  }
  const pictureOf = (page: Page) => page.locator('#configurator .hc-preview-image');
  const threeChipOf = (page: Page) => pictureOf(page).getByRole('button', { name: 'Подивитися в 3D', exact: true });
  const drawingChipOf = (page: Page) => pictureOf(page).getByRole('button', { name: /Креслення$/ });
  const generalViewOf = (page: Page) => pictureOf(page).locator('svg.gv');
  // three's canvas once its renderer has the context (three marks it `data-engine` as it asks): asked for any earlier,
  // `getContext('webgl2')` here would make the context itself, with the browser's defaults — no preserveDrawingBuffer —
  // and three would draw into that one, a buffer read back empty
  const canvasOf = (page: Page) => page.locator('#configurator .hc-preview-canvas canvas[data-engine]');
  const settledOf = (page: Page) => page.locator('#configurator .hc-preview-canvas [data-build-up="settled"]');
  const pageErrors = (page: Page) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    return errors;
  };
  /** Pixels the model left in the drawing buffer (the canvas keeps it: preserveDrawingBuffer), read through WebGL */
  const drawnPixels = (page: Page) => canvasOf(page).evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl2');
    if (!gl || gl.isContextLost()) return 0;
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let drawn = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) drawn += 1;
    return drawn;
  });

  test('a browser with WebGL1 only is not offered 3D: three needs WebGL2', async ({ page }) => {
    const errors = pageErrors(page);
    const threeRequests: string[] = [];
    page.on('request', (r) => { if (isThreeLibrary(r.url())) threeRequests.push(r.url()); });
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      const asked: string[] = [];
      (window as unknown as { __webglAsked: string[] }).__webglAsked = asked;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: any[]) {
        if (type.includes('webgl')) asked.push(type);
        if (type === 'webgl2') return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (original as any).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });

    await openSheet(page);
    // the probe has answered (it asks once the page has hydrated), and the render it asks for is on screen
    await expect.poll(() => page.evaluate(() => (window as unknown as { __webglAsked: string[] }).__webglAsked.slice())).toContain('webgl2');
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    await expect(threeChipOf(page)).toHaveCount(0);
    await expect(generalViewOf(page)).toBeVisible();
    expect(threeRequests, 'the renderer was downloaded for a browser it cannot draw in').toHaveLength(0);
    expect(errors).toEqual([]);
  });

  test('a renderer that cannot get its context falls back to the drawing, with no uncaught error', async ({ page }) => {
    const errors = pageErrors(page);
    await page.addInitScript(() => {
      // The probe's canvas (never in the page) gets its context, the 3D view's does not: the probe passed, the renderer
      // fails — a driver refusing a second context, or the page out of context slots
      const original = HTMLCanvasElement.prototype.getContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: any[]) {
        if (type === 'webgl2' && this.isConnected) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (original as any).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });

    await openSheet(page);
    await threeChipOf(page).click();

    // the drawing again, and 3D no longer offered: it failed once and would again
    await expect(generalViewOf(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#configurator canvas')).toHaveCount(0);
    await expect(pictureOf(page).locator('.hc-sheet-tools')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('a lost context that comes back draws the model again, without waiting for a change', async ({ page }) => {
    const errors = pageErrors(page);
    await openSheet(page);
    await threeChipOf(page).click();
    await expect(settledOf(page)).toBeAttached({ timeout: 20_000 });
    await expect.poll(() => drawnPixels(page)).toBeGreaterThan(0);

    await canvasOf(page).evaluate((canvas: HTMLCanvasElement) => new Promise<void>((resolve) => {
      const extension = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!;
      // given back once three has taken the loss (its handler keeps the context restorable), well inside the grace
      canvas.addEventListener('webglcontextlost', () => setTimeout(() => {
        extension.restoreContext();
        resolve();
      }, 500), { once: true });
      extension.loseContext();
    }));

    await expect.poll(() => drawnPixels(page), { timeout: 20_000 }).toBeGreaterThan(0);
    await expect(drawingChipOf(page)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a context lost for good gives way to the drawing', async ({ page }) => {
    const errors = pageErrors(page);
    await openSheet(page);
    await threeChipOf(page).click();
    await expect(settledOf(page)).toBeAttached({ timeout: 20_000 });
    // on screen first: the view listens for the loss from its first render
    await expect.poll(() => drawnPixels(page)).toBeGreaterThan(0);

    await canvasOf(page).evaluate((canvas: HTMLCanvasElement) => {
      canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext();
    });

    // an empty field for the grace period (ThreeHangarView, 3 s), then the drawing
    await expect(generalViewOf(page)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#configurator canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('closing 3D lets its renderer go: at most one WebGL context left after four opens', async ({ page }) => {
    // four builds of the scene: on CI's software GL each new context blocks 1.3–1.7 s linking its shaders
    test.setTimeout(90_000);
    await openSheet(page);
    for (let open = 0; open < 4; open += 1) {
      await threeChipOf(page).click();
      await expect(settledOf(page)).toBeAttached({ timeout: 20_000 });
      // drawn, not only settled: the sheet's 3D opens settled, before its renderer is even made, and a renderer that
      // never drew holds none of the shared objects — closed that early, main's leak did not show either
      await expect.poll(() => drawnPixels(page), { timeout: 20_000 }).toBeGreaterThan(0);
      await drawingChipOf(page).click();
      await expect(page.locator('#configurator canvas')).toHaveCount(0);
    }

    // Counted by the debugger after a full GC, holding nothing of the page: an ElementHandle would keep its canvas, and
    // the canvas its context, alive. At most one: R3F keeps the last closed renderer until the next open.
    const cdp = await page.context().newCDPSession(page);
    const liveContexts = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      await cdp.send('HeapProfiler.collectGarbage');
      const objectGroup = 'webgl-contexts';
      const { result: prototype } = await cdp.send('Runtime.evaluate', { expression: 'WebGL2RenderingContext.prototype', objectGroup });
      const { objects } = await cdp.send('Runtime.queryObjects', { prototypeObjectId: prototype.objectId!, objectGroup });
      const { result } = await cdp.send('Runtime.callFunctionOn', {
        objectId: objects.objectId!,
        functionDeclaration: 'function () { return this.length; }',
        returnByValue: true,
        objectGroup,
      });
      await cdp.send('Runtime.releaseObjectGroup', { objectGroup });
      return result.value as number;
    };
    // polled: R3F lets the last context go 500 ms after its Canvas
    await expect.poll(liveContexts, { timeout: 10_000 }).toBeLessThanOrEqual(1);
  });
});
