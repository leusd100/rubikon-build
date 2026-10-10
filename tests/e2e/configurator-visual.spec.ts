import { expect, test, type Page } from '@playwright/test';
import { chooseSeparateWorks, openControlGroup } from './configurator.helpers';

// Runs via pnpm test:visual locally and the selected PR gate, full main regression and nightly
// visual suites. Keep reviewed baselines for both Linux CI and macOS local checks.
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

// The configurator walks its groups as steps (07.10): each control is used from its own step. The works leave the
// request from «Окремі роботи», where each has its own box; the gates are chosen in their own group.
async function dropWorks(page: Page, labels: readonly string[]) {
  await chooseSeparateWorks(page);
  for (const label of labels) await page.locator('.hc-scope-list .hc-checkbox-row').filter({ hasText: label }).click();
}

async function setSizes(page: Page, width: string, length: string, height: string) {
  await openControlGroup(page, 'dimensions');
  await page.locator('#hc-dimension-width').fill(width);
  await page.locator('#hc-dimension-length').fill(length);
  await page.locator('#hc-dimension-height').fill(height);
  await page.locator('#hc-dimension-height').blur();
}

async function setGates(page: Page, count: number) {
  await openControlGroup(page, 'openings');
  await page.locator('[aria-labelledby="hc-gate-count-label"] .hc-option-card').filter({ hasText: new RegExp(`^${count}$`) }).click();
}

test.describe('hangar configurator visual states', () => {
  test('default configuration (24×60×8, insulated, full scope, 1 gate)', async ({ page }) => {
    await openConfigurator(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-default.png');
  });

  test('changed dimensions (narrow + short + tall)', async ({ page }) => {
    await openConfigurator(page);
    await setSizes(page, '14', '20', '14');
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-changed-dimensions.png');
  });

  test('(C) full structural frame — no foundation, walls or roof', async ({ page }) => {
    await openConfigurator(page);
    await dropWorks(page, ['Фундамент', 'Стіни', 'Покрівля']);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-frame-only.png');
  });

  test('full envelope, undecided insulation, two gates', async ({ page }) => {
    await openConfigurator(page);
    await openControlGroup(page, 'envelope');
    await page.locator('[aria-labelledby="hc-envelope-heading"] .hc-option-card', { hasText: 'Ще не знаю' }).click();
    await setGates(page, 2);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-undecided-two-gates.png');
  });
});

// A–F: named build-state scenarios from the Phase 2 brief, each isolating one point on the
// foundation→columns→trusses→purlins→walls→roof→gates sequence's *end state* (reduced motion
// forces every scenario to its settled visual immediately — these are never mid-transition).
test.describe('hangar configurator visual states — named build states (A–F)', () => {
  test('(A) foundation only', async ({ page }) => {
    await openConfigurator(page);
    await dropWorks(page, ['Каркас', 'Стіни', 'Покрівля']);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-a-foundation-only.png');
  });

  test('(B) foundation + frame', async ({ page }) => {
    await openConfigurator(page);
    await dropWorks(page, ['Стіни', 'Покрівля']);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-b-foundation-frame.png');
  });

  // (C) full structural frame alone is already covered above — kept under its original name/file
  // so its existing baseline isn't churned by a pure rename.

  test('(D) frame + walls, no roof yet', async ({ page }) => {
    await openConfigurator(page);
    await dropWorks(page, ['Покрівля']);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-d-frame-walls.png');
  });

  test('(E) complete shell — foundation, frame, walls and roof, no gates', async ({ page }) => {
    await openConfigurator(page);
    await setGates(page, 0);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-e-complete-shell.png');
  });

  test('(F) gates/openings — two gates, default envelope', async ({ page }) => {
    await openConfigurator(page);
    await setGates(page, 2);
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
    await dropWorks(page, ['Покрівля']);
    await setGates(page, 2);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-j-reduced-motion-interaction.png');
  });

  test('(K) large hangar — max width/length/height', async ({ page }) => {
    await openConfigurator(page);
    // DIMENSION_BOUNDS: width max 50 (Phase 3E.1), length max 120, height max 15 (app/lib/configurator/types.ts).
    await setSizes(page, '50', '120', '15');
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-k-large-hangar.png');
  });

  test('(L) minimal hangar — min width/length/height', async ({ page }) => {
    await openConfigurator(page);
    // DIMENSION_BOUNDS: width min 10, length min 10, height min 4.
    await setSizes(page, '10', '10', '4');
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-l-minimal-hangar.png');
  });
});
