import { expect, test, type Page } from '@playwright/test';

function collectFatalBrowserErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

  return errors;
}

async function acceptEssentialCookies(page: Page) {
  const button = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(button).toBeVisible({ timeout: 10_000 });
  await button.click();
}

for (const path of ['/', '/angary', '/zernoskhovyshcha']) {
  test(`${path} critical desktop route is healthy`, async ({ page }) => {
    const errors = collectFatalBrowserErrors(page);
    const response = await page.goto(path, { waitUntil: 'load' });

    expect(response?.status()).toBe(200);
    await expect(page.locator('header.site-header')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('main#main-content h1').first()).toBeVisible();
    await expect(page.locator('#inquiry')).toBeAttached();
    await expect(page.locator('footer')).toBeVisible();
    await acceptEssentialCookies(page);
    expect(errors).toEqual([]);
  });
}

test('homepage critical mobile smoke has no overflow or fatal errors', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = collectFatalBrowserErrors(page);
  const response = await page.goto('/', { waitUntil: 'load' });

  expect(response?.status()).toBe(200);
  await expect(page.locator('header.site-header')).toBeVisible();
  await expect(page.locator('main#main-content h1').first()).toBeVisible();
  await expect(page.locator('#inquiry')).toBeAttached();
  await acceptEssentialCookies(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('shared inquiry submits one mocked lead successfully', async ({ page }) => {
  let submittedPayload: Record<string, unknown> | undefined;
  const errors = collectFatalBrowserErrors(page);

  await page.route('**/api/leads', async (route) => {
    submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, id: 1, isNew: true }),
    });
  });

  await page.goto('/', { waitUntil: 'load' });
  await acceptEssentialCookies(page);

  const form = page.locator('form.inquiry-form');
  await form.getByLabel(/Ваше ім’я/).fill('CI Test');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Напрям робіт/).selectOption({ index: 1 });
  await form.getByLabel('Коротко про завдання', { exact: true }).fill('Critical PR smoke');
  await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
  await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

  await expect(page.locator('.inquiry-status')).toContainText('Дякуємо! Запит надіслано');
  expect(submittedPayload).toMatchObject({
    name: 'CI Test',
    phone: '+380671234567',
    sourcePage: '/',
  });
  expect(errors).toEqual([]);
});
