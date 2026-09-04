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

async function enterThreeMode(page: Page) {
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.hc-preview-surface canvas')).toBeVisible({ timeout: 20_000 });
  // The canvas renders on demand; wait for a settled frame before capturing.
  await page.waitForTimeout(900);
}

test.describe('configurator 3D visual states', () => {
  test('1 — default complete shell, desktop', async ({ page }) => {
    await openConfigurator(page);
    await enterThreeMode(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-3d-default.png');
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
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-3d-frame-only.png');
  });

  test('3 — changed dimensions (wide and short)', async ({ page }) => {
    await openConfigurator(page);
    await page.locator('#hc-dimension-width').fill('48');
    await page.locator('#hc-dimension-length').fill('30');
    await page.locator('#hc-dimension-height').fill('6');
    await page.locator('#hc-dimension-height').blur();
    await enterThreeMode(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-3d-changed-dimensions.png');
  });

  test('4 — complete shell, tablet 820', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await openConfigurator(page);
    await enterThreeMode(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-3d-tablet-820.png');
  });

  test('5 — complete shell, mobile 390 (opt-in, no shadows)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openConfigurator(page);
    await enterThreeMode(page);
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-3d-mobile-390.png');
  });
});
