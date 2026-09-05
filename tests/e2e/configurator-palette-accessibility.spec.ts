import { expect, test, type Page } from '@playwright/test';

async function openThree(page: Page) {
  await page.goto('/configurator-preview');
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.hc-preview-surface canvas')).toBeVisible({ timeout: 20_000 });
}

test('colour groups support arrows, wraparound and one tab stop per surface', async ({ page }) => {
  await openThree(page);
  const summary = await page.locator('.hc-summary-facts').innerText();
  const walls = page.getByRole('radiogroup', { name: 'Обшивка', exact: true });
  const roof = page.getByRole('radiogroup', { name: 'Покрівля', exact: true });
  await walls.getByRole('radio', { name: 'Нейтральна', exact: true }).focus();

  for (const [key, label] of [
    ['ArrowRight', 'Світло-сіра'], ['ArrowDown', 'Графіт'], ['ArrowRight', 'Нейтральна'],
    ['ArrowLeft', 'Графіт'], ['ArrowUp', 'Світло-сіра'], ['Home', 'Нейтральна'], ['End', 'Графіт'],
  ]) {
    await page.keyboard.press(key);
    const selected = walls.getByRole('radio', { name: label, exact: true });
    await expect(selected).toHaveAttribute('aria-checked', 'true');
    await expect(selected).toBeFocused();
  }

  await page.keyboard.press('Tab');
  await expect(roof.getByRole('radio', { name: 'Графіт', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(roof.getByRole('radio', { name: 'Світло-сіра', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Shift+Tab');
  await expect(walls.getByRole('radio', { name: 'Графіт', exact: true })).toBeFocused();
  expect(await page.locator('.hc-summary-facts').innerText()).toBe(summary);
  await expect(page.locator('#hc-dimension-width')).toHaveValue('24');
});

test('colour choices survive expanded viewing and a Technical round trip', async ({ page }) => {
  await openThree(page);
  const walls = page.getByRole('radiogroup', { name: 'Обшивка', exact: true });
  const roof = page.getByRole('radiogroup', { name: 'Покрівля', exact: true });
  await walls.getByRole('radio', { name: 'Графіт', exact: true }).click();
  await roof.getByRole('radio', { name: 'Світло-сіра', exact: true }).click();
  await page.getByRole('button', { name: 'Розгорнути', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Технічний вид', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(walls.getByRole('radio', { name: 'Графіт', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(roof.getByRole('radio', { name: 'Світло-сіра', exact: true })).toHaveAttribute('aria-checked', 'true');
});
