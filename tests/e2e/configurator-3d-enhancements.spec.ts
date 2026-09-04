import { expect, test, type Page } from '@playwright/test';

// Phase 3C — the three KEEP product enhancements (material colour presets, fullscreen, optional
// scale figure). Each is opt-in, presentation-only state owned by `HangarPreviewModes` (see that
// file's own module doc) — these tests are deliberately less about geometry (already covered by
// configurator-3d-buildup.spec.ts) and more about the actual product surface: does the control do
// what it says, does it leave the canonical configuration untouched, and does exiting cleanly undo
// everything it touched (focus, body scroll, DOM node identity).

async function openConfigurator(page: Page) {
  await page.goto('/configurator-preview');
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click({ timeout: 15000 }).catch(() => {});
  await expect(page.locator('.hc-preview-surface')).toBeVisible();
}

async function enterThreeMode(page: Page) {
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.hc-preview-surface canvas')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(300); // let the initial mount settle before any pixel comparisons
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function canvasPixels(page: Page): Promise<Buffer> {
  return page.locator('.hc-preview-surface canvas').screenshot();
}

test.describe('configurator 3D enhancements (Phase 3C)', () => {
  test.describe('material colour presets', () => {
    test('defaults match the base palette, and are the only ones pre-selected', async ({ page }) => {
      await openConfigurator(page);
      await enterThreeMode(page);

      await expect(page.getByRole('radio', { name: 'Нейтральна' })).toHaveAttribute('aria-checked', 'true');
      await expect(page.getByRole('radiogroup', { name: 'Покрівля' }).getByRole('radio', { name: 'Графіт' })).toHaveAttribute('aria-checked', 'true');
    });

    test('choosing a wall preset updates selection state and the rendered colour, without error', async ({ page }) => {
      const errors = trackErrors(page);
      await openConfigurator(page);
      await enterThreeMode(page);

      const before = await canvasPixels(page);
      await page.getByRole('radio', { name: 'Графіт' }).first().click();
      await page.waitForTimeout(200);
      const after = await canvasPixels(page);

      expect(errors, `console/page errors while switching wall preset: ${errors.join('\n')}`).toEqual([]);
      await expect(page.getByRole('radio', { name: 'Графіт' }).first()).toHaveAttribute('aria-checked', 'true');
      await expect(page.getByRole('radio', { name: 'Нейтральна' })).toHaveAttribute('aria-checked', 'false');
      expect(before.equals(after), 'canvas pixels did not change after switching the wall preset').toBe(false);
    });

    test('choosing a roof preset updates selection state and the rendered colour, without error', async ({ page }) => {
      const errors = trackErrors(page);
      await openConfigurator(page);
      await enterThreeMode(page);

      const roofGroup = page.getByRole('radiogroup', { name: 'Покрівля' });
      const before = await canvasPixels(page);
      await roofGroup.getByRole('radio', { name: 'Світло-сіра' }).click();
      await page.waitForTimeout(200);
      const after = await canvasPixels(page);

      expect(errors, `console/page errors while switching roof preset: ${errors.join('\n')}`).toEqual([]);
      await expect(roofGroup.getByRole('radio', { name: 'Світло-сіра' })).toHaveAttribute('aria-checked', 'true');
      expect(before.equals(after), 'canvas pixels did not change after switching the roof preset').toBe(false);
    });

    test('switching presets never touches the configured dimensions or summary', async ({ page }) => {
      await openConfigurator(page);
      await enterThreeMode(page);
      const summaryBefore = await page.locator('.hc-summary-facts').innerText();

      await page.getByRole('radio', { name: 'Графіт' }).first().click();
      await page.getByRole('radiogroup', { name: 'Покрівля' }).getByRole('radio', { name: 'Світло-сіра' }).click();

      expect(await page.locator('.hc-summary-facts').innerText()).toBe(summaryBefore);
    });
  });

  test.describe('optional scale figure', () => {
    test('off by default; enabling and disabling changes the rendered scene without error', async ({ page }) => {
      const errors = trackErrors(page);
      await openConfigurator(page);
      await enterThreeMode(page);

      const toggle = page.getByRole('checkbox', { name: 'Показати людину для масштабу' });
      await expect(toggle).not.toBeChecked();

      const before = await canvasPixels(page);
      await toggle.check();
      await page.waitForTimeout(200);
      const withFigure = await canvasPixels(page);
      expect(before.equals(withFigure), 'canvas pixels did not change after enabling the scale figure').toBe(false);

      await toggle.uncheck();
      await page.waitForTimeout(200);
      const afterDisable = await canvasPixels(page);
      expect(withFigure.equals(afterDisable), 'canvas pixels did not change after disabling the scale figure').toBe(false);

      expect(errors, `console/page errors toggling the scale figure: ${errors.join('\n')}`).toEqual([]);
    });
  });

  test.describe('fullscreen', () => {
    test('expanding reuses the same canvas element — no second WebGL context is created', async ({ page }) => {
      await openConfigurator(page);
      await enterThreeMode(page);
      const canvasBefore = await page.locator('canvas').elementHandle();

      await page.getByRole('button', { name: 'Розгорнути', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      expect(await page.locator('canvas').count()).toBe(1);
      const canvasAfter = await page.locator('canvas').elementHandle();
      expect(await page.evaluate(([a, b]) => a === b, [canvasBefore, canvasAfter])).toBe(true);
    });

    test('locks page scroll while open, and restores it on exit', async ({ page }) => {
      await openConfigurator(page);
      await enterThreeMode(page);

      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
      await page.getByRole('button', { name: 'Розгорнути', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

      await page.getByRole('button', { name: 'Закрити ✕' }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    });

    test('Escape closes it and returns focus to the trigger', async ({ page }) => {
      await openConfigurator(page);
      await enterThreeMode(page);

      const trigger = page.getByRole('button', { name: 'Розгорнути', exact: true });
      await trigger.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Закрити ✕' })).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(trigger).toBeFocused();
    });

    test('hides the secondary preset/scale panel while active, and restores it on exit', async ({ page }) => {
      await openConfigurator(page);
      await enterThreeMode(page);
      await expect(page.locator('.hc-preview-secondary-panel')).toBeVisible();

      await page.getByRole('button', { name: 'Розгорнути', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.hc-preview-secondary-panel')).toHaveCount(0);

      await page.keyboard.press('Escape');
      await expect(page.locator('.hc-preview-secondary-panel')).toBeVisible();
    });

    test('leaves the configured dimensions and mode untouched after entering and exiting', async ({ page }) => {
      await openConfigurator(page);
      await enterThreeMode(page);
      const summaryBefore = await page.locator('.hc-summary-facts').innerText();

      await page.getByRole('button', { name: 'Розгорнути', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();

      expect(await page.locator('.hc-summary-facts').innerText()).toBe(summaryBefore);
      await expect(page.getByRole('button', { name: '3D', exact: true })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('control hierarchy (brief §10 — mode switch stays primary)', () => {
    test('the expand action and the preset/scale panel exist only in 3D mode, never in Technical', async ({ page }) => {
      await openConfigurator(page);

      await expect(page.locator('.hc-preview-secondary-actions')).toHaveCount(0);
      await expect(page.locator('.hc-preview-secondary-panel')).toHaveCount(0);

      await enterThreeMode(page);
      await expect(page.locator('.hc-preview-secondary-actions')).toBeVisible();
      await expect(page.locator('.hc-preview-secondary-panel')).toBeVisible();

      await page.getByRole('button', { name: 'Технічний вид', exact: true }).click();
      await expect(page.locator('.hc-preview-secondary-actions')).toHaveCount(0);
      await expect(page.locator('.hc-preview-secondary-panel')).toHaveCount(0);
    });
  });
});
