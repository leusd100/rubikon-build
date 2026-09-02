import { expect, test, type Page } from '@playwright/test';

// Not run by `pnpm test:e2e` (the CI-blocking script) — same as visual.spec.ts, this only runs
// via `pnpm test:visual`/`test:visual:update`, both local/manual. See playwright.config.ts's
// `visual-chromium` project (testMatch: /visual\.spec\.ts/) — this file matches that pattern too.

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

  test('frame-only (no foundation, walls or roof)', async ({ page }) => {
    await openConfigurator(page);
    await page.getByText('Фундамент', { exact: true }).click();
    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click();
    await page.getByText('Покрівля', { exact: true }).click();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-frame-only.png');
  });

  test('full envelope, undecided insulation, two gates', async ({ page }) => {
    await openConfigurator(page);
    await page.locator('.hc-option-card', { hasText: 'Ще не визначився' }).click();
    await page.locator('.hc-option-card', { hasText: '2' }).click();
    await expect(page.locator('.hc-preview-surface')).toHaveScreenshot('configurator-undecided-two-gates.png');
  });
});
