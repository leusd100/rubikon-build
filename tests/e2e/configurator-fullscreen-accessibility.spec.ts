import { expect, test, type Page } from '@playwright/test';

async function openThree(page: Page) {
  await page.goto('/configurator-preview');
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.hc-preview-surface canvas')).toBeVisible({ timeout: 20_000 });
}

test('expanded view contains keyboard focus and releases the page on Escape', async ({ page }) => {
  await openThree(page);
  const expand = page.getByRole('button', { name: 'Розгорнути', exact: true });
  await expand.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  const close = dialog.getByRole('button', { name: 'Закрити ✕', exact: true });
  const dimensions = dialog.getByRole('button', { name: 'Сховати розміри', exact: true });

  const lastControl = page.viewportSize()!.width <= 480 ? close : dimensions;
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(lastControl).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(lastControl).toBeFocused();

  // Background controls must be unavailable even to programmatic focus while the modal is open.
  const width = page.locator('#hc-dimension-width');
  await width.evaluate((element) => element.focus());
  await expect(lastControl).toBeFocused();
  await expect(width).toHaveJSProperty('value', '24');

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(expand).toBeFocused();
  await width.focus();
  await expect(width).toBeFocused();
});

test('expanded view preserves its description and Canvas across repeated visits', async ({ page }) => {
  await openThree(page);
  const expand = page.getByRole('button', { name: 'Розгорнути', exact: true });
  const canvas = await page.locator('canvas').elementHandle();

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await expand.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAccessibleDescription(/24 на 60 метрів, висота стін 8 м/);
    if (page.viewportSize()!.width > 480) {
      if (cycle === 0) await dialog.getByRole('button', { name: 'Сховати розміри', exact: true }).click();
      await expect(dialog.getByRole('button', { name: 'Показати розміри', exact: true })).toBeVisible();
    }
    await expect(dialog).toHaveAccessibleDescription(/24 на 60 метрів/);
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(await page.locator('canvas').evaluate((element, original) => element === original, canvas)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(expand).toBeFocused();
    expect(await page.locator('canvas').evaluate((element, original) => element === original, canvas)).toBe(true);
  }
});

