import { expect, test, type Page } from '@playwright/test';

// The consent banner is client-only, so seeing either button proves hydration is complete.
async function acceptOnlyEssentialCookies(page: Page) {
  const essentialCookiesButton = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
  await essentialCookiesButton.click();
}

async function acceptAllCookies(page: Page) {
  const acceptAllButton = page.getByRole('button', { name: 'Прийняти все', exact: true });
  await expect(acceptAllButton).toBeVisible({ timeout: 10_000 });
  await acceptAllButton.click();
}

async function fillInquiryFields(page: Page) {
  const form = page.locator('form.inquiry-form');

  await form.getByText('Telegram', { exact: true }).click();
  await expect(form.getByRole('radio', { name: 'Telegram', exact: true })).toBeChecked();
  await form.getByText('Дзвінок', { exact: true }).click();
  await expect(form.getByRole('radio', { name: 'Дзвінок', exact: true })).toBeChecked();
  await expect(form.getByRole('button', { name: 'Надіслати запит', exact: true })).toBeVisible();

  await form.getByLabel(/Ваше ім’я/).fill('Іван Петренко');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Напрям робіт/).selectOption({ index: 1 });
  await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
}

async function fillValidInquiry(page: Page) {
  await acceptOnlyEssentialCookies(page);
  await fillInquiryFields(page);
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

    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо! Запит надіслано');
    await expect(page.locator('.inquiry-status')).toContainText('зв’яжеться з вами способом, який ви обрали');
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

    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    const status = page.locator('.inquiry-status');
    await expect(status).toContainText('Не вдалося зберегти запит');
    await expect(status).toHaveClass(/is-error/);
    await expect(status.locator('a[href="tel:+380682614264"]')).toBeVisible();
  });
});

test.describe('advertising-gated attribution on submit', () => {
  test('gclid is stripped from the lead payload when Advertising consent is denied', async ({ page }) => {
    let submittedPayload: Record<string, unknown> | undefined;
    await page.route('**/api/leads', async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 1, isNew: true }),
      });
    });

    await page.goto('/?gclid=test-click-id&utm_source=google&utm_medium=cpc', { waitUntil: 'load' });
    await acceptOnlyEssentialCookies(page);
    await fillInquiryFields(page);
    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');
    expect(submittedPayload?.clickIds).toEqual({ gclid: '', gbraid: '', wbraid: '' });
    // Lead-context fields are never gated on cookie consent, only the click IDs are.
    expect((submittedPayload?.utm as { source?: string } | undefined)?.source).toBe('google');
  });

  test('gclid reaches the lead payload once Advertising consent is granted', async ({ page }) => {
    let submittedPayload: Record<string, unknown> | undefined;
    await page.route('**/api/leads', async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 2, isNew: true }),
      });
    });

    await page.goto('/?gclid=test-click-id', { waitUntil: 'load' });
    await acceptAllCookies(page);
    await fillInquiryFields(page);
    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');
    expect((submittedPayload?.clickIds as { gclid?: string } | undefined)?.gclid).toBe('test-click-id');
  });
});
