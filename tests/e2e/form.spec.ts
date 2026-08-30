import { expect, test, type Page } from '@playwright/test';

async function fillValidInquiry(page: Page) {
  const form = page.locator('form.inquiry-form');

  // The consent banner is client-only, so seeing it proves hydration is complete.
  const essentialCookiesButton = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
  await essentialCookiesButton.click();

  await form.getByText('Telegram', { exact: true }).click();
  await expect(form.getByRole('button', { name: 'Написати в Telegram', exact: true })).toBeVisible();
  await form.getByText('Дзвінок', { exact: true }).click();
  await expect(form.getByRole('button', { name: 'Зателефонувати', exact: true })).toBeVisible();

  await form.getByLabel(/Ваше ім’я/).fill('Іван Петренко');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Напрям робіт/).selectOption({ index: 1 });
  await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
}

test.describe('project inquiry form', () => {
  test('shows the saved state after a successful API response', async ({ page }) => {
    let submittedPayload: Record<string, unknown> | undefined;

    await page.route('**/api/leads', async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 42, isNew: true }),
      });
    });
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);

    await page.getByRole('button', { name: 'Зателефонувати', exact: true }).click();

    await expect(page.locator('.inquiry-status')).toContainText('Заявку збережено');
    await expect(page.locator('.inquiry-status a[href="tel:+380682614264"]')).toBeVisible();
    expect(submittedPayload).toMatchObject({
      name: 'Іван Петренко',
      phone: '+380671234567',
      contactMethod: 'Дзвінок',
      sourcePage: '/',
    });
  });

  test('shows the recoverable error state after a failed API response', async ({ page }) => {
    await page.route('**/api/leads', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'server' }),
      });
    });
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);

    await page.getByRole('button', { name: 'Зателефонувати', exact: true }).click();

    const status = page.locator('.inquiry-status');
    await expect(status).toContainText('Не вдалося зберегти запит');
    await expect(status).toHaveClass(/is-error/);
    await expect(status.locator('a[href="tel:+380682614264"]')).toBeVisible();
  });
});
