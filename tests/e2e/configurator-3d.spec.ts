import { expect, test, type Page } from '@playwright/test';

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

    await page.locator('#hc-dimension-width').fill('36');
    await page.locator('#hc-dimension-width').blur();
    // Scoped to the scope-of-work group specifically: Phase 3D's own new "Огороджувальні
    // конструкції" section added its own "Покрівля" (roof cladding system) heading to the same
    // page, so an unscoped text match now resolves to two elements.
    await page.getByLabel('Обсяг заявки').getByText('Покрівля', { exact: true }).click(); // roof off
    await page.locator('.hc-option-card', { hasText: '2' }).click(); // two gates

    const summaryBefore = await page.locator('.hc-summary-facts').innerText();
    const dimsBefore = await page.locator('#hc-dimension-width').inputValue();

    await enterThreeMode(page);
    await technicalButton(page).click();
    await expect(page.locator('.hc-preview-svg')).toBeVisible();

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

    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click(); // walls off
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
