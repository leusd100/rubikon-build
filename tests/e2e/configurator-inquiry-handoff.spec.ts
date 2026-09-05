import { expect, test, type Page } from '@playwright/test';

async function openHangarPage(page: Page) {
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  await essentialCookies.click();
}

async function setDimensions(page: Page, width: string, length: string) {
  const widthInput = page.locator('#hc-dimension-width');
  await widthInput.fill(width);
  await widthInput.blur();

  const lengthInput = page.locator('#hc-dimension-length');
  await lengthInput.fill(length);
  await lengthInput.blur();
}

test.describe('configurator to inquiry handoff', () => {
  test('keeps the generic inquiry generic when the visitor skips the configurator', async ({ page }) => {
    await openHangarPage(page);
    await page.locator('.service-subhero').getByRole('link', { name: /Обговорити проєкт/ }).click();

    const form = page.locator('form.inquiry-form');
    await expect(form.locator('.inquiry-config-brief')).toHaveCount(0);
    await form.getByText('Додати параметри об’єкта', { exact: true }).click();
    await expect(form.getByLabel('Орієнтовні розміри', { exact: true })).toHaveValue('');
  });

  test('moves the live hangar brief into the form and lead payload', async ({ page }) => {
    let submittedPayload: Record<string, unknown> | undefined;
    await page.route('**/api/leads', async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 65, isNew: true }),
      });
    });

    await openHangarPage(page);
    await setDimensions(page, '30', '50');

    const summary = page.locator('.hc-summary');
    await expect(summary).toContainText('30 × 50 × 8 м');
    await summary.getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
    await expect(page).toHaveURL(/#inquiry$/);

    const form = page.locator('form.inquiry-form');
    const brief = form.locator('.inquiry-config-brief');
    await expect(brief).toContainText('Ангар · 30 × 50 × 8 м');
    await expect(brief).toContainText('1 500 м²');
    await expect(form.getByLabel(/Напрям робіт/)).toHaveValue('Ангари та склади');

    await form.getByText('Додати параметри об’єкта', { exact: true }).click();
    await expect(form.getByLabel('Орієнтовні розміри', { exact: true })).toHaveValue('30 × 50 × 8 м');

    await form.getByLabel(/Ваше ім’я/).fill('Іван Петренко');
    await form.getByLabel(/Телефон/).fill('+380671234567');
    await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
    await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    await expect(form.locator('.inquiry-status')).toContainText('Дякуємо! Запит надіслано');
    expect(submittedPayload).toMatchObject({
      direction: 'Ангари та склади',
      sourcePage: '/angary',
      details: {
        dimensions: '30 × 50 × 8 м',
      },
    });
    expect((submittedPayload?.details as { configuration?: string }).configuration)
      .toContain('Площа забудови: ≈ 1 500 м²');
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 820, height: 1050 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`${viewport.name} keeps the handoff readable without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openHangarPage(page);
      await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();

      await expect(page.locator('.inquiry-config-brief')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }
});
