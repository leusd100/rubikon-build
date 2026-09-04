import { expect, test, type Page } from '@playwright/test';

// Not run by `pnpm test:e2e` (the CI-blocking script) — same as visual.spec.ts, this only runs
// via `pnpm test:visual`/`test:visual:update`, both local/manual. See playwright.config.ts's
// `visual-chromium` project (testMatch: /visual\.spec\.ts/) — this file matches that pattern too.
//
// Scenario letters (A–L) below match the Phase 2 brief's own named visual-regression list
// verbatim, so a reviewer can cross-reference this file against that list directly rather than
// guessing which test covers which named scenario.

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

test.describe('hangar configurator visual states', () => {
  test('default configuration (24×60×8, insulated, full scope, 1 gate)', async ({ page }) => {
    await openConfigurator(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-default.png');
  });

  test('changed dimensions (narrow + short + tall)', async ({ page }) => {
    await openConfigurator(page);
    await page.locator('#hc-dimension-width').fill('14');
    await page.locator('#hc-dimension-length').fill('20');
    await page.locator('#hc-dimension-height').fill('14');
    await page.locator('#hc-dimension-height').blur();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-changed-dimensions.png');
  });

  test('(C) full structural frame — no foundation, walls or roof', async ({ page }) => {
    await openConfigurator(page);
    await page.getByText('Фундамент', { exact: true }).click();
    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click();
    // Scoped to the scope-of-work group: Phase 3D's own "Огороджувальні конструкції" section
    // added its own "Покрівля" (roof cladding system) heading to the same page, so an unscoped
    // text match now resolves to two elements.
    await page.getByLabel('Обсяг заявки').getByText('Покрівля', { exact: true }).click();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-frame-only.png');
  });

  test('full envelope, undecided insulation, two gates', async ({ page }) => {
    await openConfigurator(page);
    await page.locator('.hc-option-card', { hasText: 'Ще не визначився' }).click();
    await page.locator('.hc-option-card', { hasText: '2' }).click();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-undecided-two-gates.png');
  });
});

// A–F: named build-state scenarios from the Phase 2 brief, each isolating one point on the
// foundation→columns→trusses→purlins→walls→roof→gates sequence's *end state* (reduced motion
// forces every scenario to its settled visual immediately — these are never mid-transition).
test.describe('hangar configurator visual states — named build states (A–F)', () => {
  test('(A) foundation only', async ({ page }) => {
    await openConfigurator(page);
    await page.getByText('Металокаркас', { exact: true }).click();
    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click();
    // Scoped to the scope-of-work group: Phase 3D's own "Огороджувальні конструкції" section
    // added its own "Покрівля" (roof cladding system) heading to the same page, so an unscoped
    // text match now resolves to two elements.
    await page.getByLabel('Обсяг заявки').getByText('Покрівля', { exact: true }).click();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-a-foundation-only.png');
  });

  test('(B) foundation + frame', async ({ page }) => {
    await openConfigurator(page);
    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click();
    // Scoped to the scope-of-work group: Phase 3D's own "Огороджувальні конструкції" section
    // added its own "Покрівля" (roof cladding system) heading to the same page, so an unscoped
    // text match now resolves to two elements.
    await page.getByLabel('Обсяг заявки').getByText('Покрівля', { exact: true }).click();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-b-foundation-frame.png');
  });

  // (C) full structural frame alone is already covered above — kept under its original name/file
  // so its existing baseline isn't churned by a pure rename.

  test('(D) frame + walls, no roof yet', async ({ page }) => {
    await openConfigurator(page);
    // Scoped to the scope-of-work group: Phase 3D's own "Огороджувальні конструкції" section
    // added its own "Покрівля" (roof cladding system) heading to the same page, so an unscoped
    // text match now resolves to two elements.
    await page.getByLabel('Обсяг заявки').getByText('Покрівля', { exact: true }).click();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-d-frame-walls.png');
  });

  test('(E) complete shell — foundation, frame, walls and roof, no gates', async ({ page }) => {
    await openConfigurator(page);
    await page.locator('.hc-option-card', { hasText: '0' }).click();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-e-complete-shell.png');
  });

  test('(F) gates/openings — two gates, default envelope', async ({ page }) => {
    await openConfigurator(page);
    await page.locator('.hc-option-card', { hasText: '2' }).click();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-f-gates.png');
  });
});

// G–I: the brief's three responsive checkpoints (390/820/1440) — distinct from this project's own
// sitewide 375/768/1440 convention (see docs/ui-system-v1.md's breakpoint table) on purpose; these
// are the exact numbers the Phase 2 brief specified for the configurator, not sitewide breakpoints.
test.describe('hangar configurator visual states — responsive checkpoints (G–I)', () => {
  test('(G) mobile 390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openConfigurator(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-g-mobile-390.png');
  });

  test('(H) tablet 820', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await openConfigurator(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-h-tablet-820.png');
  });

  test('(I) desktop 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openConfigurator(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-i-desktop-1440.png');
  });
});

// J–L: reduced-motion-after-interaction, and the two dimension extremes.
test.describe('hangar configurator visual states — edge scenarios (J–L)', () => {
  test('(J) reduced-motion final state after a live interaction, not just an already-reduced-motion page load', async ({ page }) => {
    await openConfigurator(page);
    // Two real toggles after load, both under reduced motion — the point is confirming the FSM
    // still converges to the correct final visual through an actual interaction, not only when
    // reduced motion was already active before anything ever mounted.
    // Scoped to the scope-of-work group: Phase 3D's own "Огороджувальні конструкції" section
    // added its own "Покрівля" (roof cladding system) heading to the same page, so an unscoped
    // text match now resolves to two elements.
    await page.getByLabel('Обсяг заявки').getByText('Покрівля', { exact: true }).click();
    await page.locator('.hc-option-card', { hasText: '2' }).click();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-j-reduced-motion-interaction.png');
  });

  test('(K) large hangar — max width/length/height', async ({ page }) => {
    await openConfigurator(page);
    // DIMENSION_BOUNDS: width max 60, length max 120, height max 15 (app/lib/configurator/types.ts).
    await page.locator('#hc-dimension-width').fill('60');
    await page.locator('#hc-dimension-length').fill('120');
    await page.locator('#hc-dimension-height').fill('15');
    await page.locator('#hc-dimension-height').blur();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-k-large-hangar.png');
  });

  test('(L) minimal hangar — min width/length/height', async ({ page }) => {
    await openConfigurator(page);
    // DIMENSION_BOUNDS: width min 10, length min 10, height min 4.
    await page.locator('#hc-dimension-width').fill('10');
    await page.locator('#hc-dimension-length').fill('10');
    await page.locator('#hc-dimension-height').fill('4');
    await page.locator('#hc-dimension-height').blur();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-l-minimal-hangar.png');
  });
});
