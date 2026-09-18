import { expect, test } from '@playwright/test';

test.describe('custom 404', () => {
  test('an unknown URL answers 404 with the site chrome, a Ukrainian page and a way back', async ({ page }) => {
    const response = await page.goto('/tse-ne-isnuie', { waitUntil: 'load' });

    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle('Сторінку не знайдено | RUBIKON BUILD');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Сторінку\s*не знайдено/);
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('footer')).toBeAttached();

    const main = page.locator('main#main-content');
    await expect(main.getByRole('link', { name: 'На головну' })).toHaveAttribute('href', '/');
    await expect(main.getByRole('link', { name: 'Напрямки робіт' })).toHaveAttribute('href', '/napryamky');
  });

  test('stays out of the index and does not canonicalise to the home page', async ({ page }) => {
    await page.goto('/tse-ne-isnuie', { waitUntil: 'load' });

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });
});
