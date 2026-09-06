import { expect, test, type Page } from '@playwright/test';

type LeadPayload = {
  details?: {
    configuration?: string;
    dimensions?: string;
  };
  direction?: string;
  sourcePage?: string;
};

async function openHangarPage(page: Page) {
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  await essentialCookies.click();
}

async function setDimension(page: Page, dimension: 'width' | 'length' | 'height', value: string) {
  const input = page.locator(`#hc-dimension-${dimension}`);
  await input.fill(value);
  await input.blur();
}

function attachmentCard(page: Page) {
  return page.locator('form.inquiry-form .inquiry-config-brief');
}

async function mockLeadSubmission(page: Page) {
  let submittedPayload: LeadPayload | undefined;
  await page.route('**/api/leads', async (route) => {
    submittedPayload = route.request().postDataJSON() as LeadPayload;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, id: 65, isNew: true }),
    });
  });
  return () => submittedPayload;
}

async function submitInquiry(page: Page) {
  const form = page.locator('form.inquiry-form');
  await form.getByLabel(/Ваше ім’я/).fill('Іван Петренко');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
  await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(form.locator('.inquiry-status')).toContainText('Дякуємо! Запит надіслано');
}

test.describe('configurator attachment contract', () => {
  test('untouched default remains absent from the form and lead payload', async ({ page }) => {
    const submitted = await mockLeadSubmission(page);
    await openHangarPage(page);

    const form = page.locator('form.inquiry-form');
    await expect(form.locator('.inquiry-config-brief')).toHaveCount(0);
    await form.getByText('Додати параметри об’єкта', { exact: true }).click();
    await expect(form.getByLabel('Орієнтовні розміри', { exact: true })).toHaveValue('');

    await submitInquiry(page);
    expect(submitted()?.details).not.toHaveProperty('configuration');
  });

  test('focusing and leaving an unchanged business field is still untouched', async ({ page }) => {
    await openHangarPage(page);
    await page.locator('#hc-dimension-width').focus();
    await page.locator('#hc-dimension-width').blur();
    await expect(attachmentCard(page)).toHaveCount(0);
  });

  test('Technical to 3D and back is presentation-only', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'covered once; attachment state is viewport-independent');
    await openHangarPage(page);
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Технічний вид', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Технічний вид', exact: true }).click();
    await expect(attachmentCard(page)).toHaveCount(0);
  });

  test('fullscreen is presentation-only', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'covered once; attachment state is viewport-independent');
    await openHangarPage(page);
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await page.getByRole('button', { name: 'Розгорнути', exact: true }).click();
    await page.getByRole('button', { name: /Закрити/ }).click();
    await expect(attachmentCard(page)).toHaveCount(0);
  });

  test('scale figure and render colours are presentation-only', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'covered once; attachment state is viewport-independent');
    await openHangarPage(page);
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await page.getByRole('radio', { name: 'Світло-сіра', exact: true }).first().click();
    await page.getByRole('checkbox', { name: 'Показати людину для масштабу' }).check();
    await expect(attachmentCard(page)).toHaveCount(0);
  });

  const businessEdits: Array<{
    name: string;
    edit: (page: Page) => Promise<void>;
  }> = [
    { name: 'width', edit: (page) => setDimension(page, 'width', '30') },
    { name: 'length', edit: (page) => setDimension(page, 'length', '50') },
    { name: 'eave height', edit: (page) => setDimension(page, 'height', '9') },
    {
      name: 'envelope/material',
      edit: async (page) => page.getByRole('radio', { name: 'Утеплений', exact: true }).check({ force: true }),
    },
    {
      name: 'foundation',
      edit: async (page) => page.getByRole('radio', { name: 'Монолітна плита', exact: true }).check({ force: true }),
    },
    {
      name: 'gate',
      edit: async (page) => page.getByRole('radiogroup', { name: 'Ворота' }).getByRole('radio', { name: '2' }).check({ force: true }),
    },
    {
      name: 'personnel door',
      edit: async (page) => page.getByRole('radiogroup', { name: 'Двері' }).getByRole('radio', { name: '1' }).check({ force: true }),
    },
    {
      name: 'application scope',
      edit: async (page) => page.getByRole('checkbox', { name: 'Покрівля', exact: true }).uncheck(),
    },
  ];

  for (const { name, edit } of businessEdits) {
    test(`${name} business edit attaches automatically`, async ({ page }) => {
      await openHangarPage(page);
      await edit(page);
      await expect(attachmentCard(page)).toContainText('До заявки додано вашу конфігурацію');
    });
  }

  test('change then revert to the original value remains attached', async ({ page }) => {
    await openHangarPage(page);
    await setDimension(page, 'width', '30');
    await setDimension(page, 'width', '24');

    const brief = attachmentCard(page);
    await expect(brief).toContainText('До заявки додано вашу конфігурацію');
    await expect(brief).toContainText('Ангар · 24 × 60 × 8 м');
  });

  test('explicit configurator CTA attaches an untouched default', async ({ page }) => {
    await openHangarPage(page);
    await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();

    await expect(page).toHaveURL(/#inquiry$/);
    await expect(attachmentCard(page)).toContainText('Ангар · 24 × 60 × 8 м');
  });

  test('explicit detach removes the current configuration from the lead', async ({ page }) => {
    const submitted = await mockLeadSubmission(page);
    await openHangarPage(page);
    await setDimension(page, 'width', '30');

    const brief = attachmentCard(page);
    await brief.getByRole('button', { name: 'Не додавати', exact: true }).click();
    await expect(brief).toHaveCount(0);

    await submitInquiry(page);
    expect(submitted()?.details).not.toHaveProperty('configuration');
  });

  test('reattaches predictably by CTA or by a later meaningful business edit', async ({ page }) => {
    await openHangarPage(page);
    await setDimension(page, 'width', '30');
    await attachmentCard(page).getByRole('button', { name: 'Не додавати', exact: true }).click();

    await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
    await expect(attachmentCard(page)).toBeVisible();
    await attachmentCard(page).getByRole('button', { name: 'Не додавати', exact: true }).click();

    await setDimension(page, 'length', '50');
    await expect(attachmentCard(page)).toContainText('Ангар · 30 × 50 × 8 м');
  });

  test('a business edit reaches the normal form and payload without using the configurator CTA', async ({ page }) => {
    const submitted = await mockLeadSubmission(page);
    await openHangarPage(page);
    await setDimension(page, 'width', '30');
    await setDimension(page, 'length', '50');

    const brief = attachmentCard(page);
    await expect(brief).toContainText('Ангар · 30 × 50 × 8 м');
    await submitInquiry(page);

    expect(submitted()).toMatchObject({
      direction: 'Ангари та склади',
      sourcePage: '/angary',
      details: { dimensions: '30 × 50 × 8 м' },
    });
    expect(submitted()?.details?.configuration).toContain('Площа забудови: ≈ 1 500 м²');
  });

  test('visible rows and submitted payload have exact parity and keep derived data separate', async ({ page }) => {
    const submitted = await mockLeadSubmission(page);
    await openHangarPage(page);
    await setDimension(page, 'width', '30');
    await page.getByRole('radiogroup', { name: 'Двері' }).getByRole('radio', { name: '1' }).check({ force: true });

    const brief = attachmentCard(page);
    await brief.getByText('Переглянути параметри', { exact: true }).click();
    await expect(brief.getByRole('heading', { name: 'Вибрана конфігурація' })).toBeVisible();
    await expect(brief.getByRole('heading', { name: 'Системні попередні дані' })).toBeVisible();

    const visibleRows = await brief.locator('dl > div').evaluateAll((rows) => rows.map((row) => {
      const label = row.querySelector('dt')?.textContent?.trim() ?? '';
      const value = row.querySelector('dd')?.textContent?.trim() ?? '';
      return `${label}: ${value}`;
    }));

    await submitInquiry(page);
    const configuration = submitted()?.details?.configuration ?? '';
    const payloadRows = configuration.split('\n').filter((line) => !line.endsWith(':'));
    expect(payloadRows).toEqual(visibleRows);
    expect(configuration).toContain('Системні попередні дані:\nПлоща забудови:');
    expect(configuration).toContain('Попередня конструктивна схема:');
    expect(configuration).not.toMatch(/Світло-сіра|Графіт|Нейтральна/);
  });

  test('walls outside scope omit gates and door from both summary and payload', async ({ page }) => {
    const submitted = await mockLeadSubmission(page);
    await openHangarPage(page);
    await page.getByRole('radiogroup', { name: 'Двері' }).getByRole('radio', { name: '1' }).check({ force: true });
    await page.getByRole('checkbox', { name: 'Стіни / огороджувальний контур' }).uncheck();

    const brief = attachmentCard(page);
    await brief.getByText('Переглянути параметри', { exact: true }).click();
    await expect(brief.getByText('Ворота', { exact: true })).toHaveCount(0);
    await expect(brief.getByText('Двері', { exact: true })).toHaveCount(0);

    await submitInquiry(page);
    expect(submitted()?.details?.configuration).not.toContain('Ворота:');
    expect(submitted()?.details?.configuration).not.toContain('Двері:');
  });
});

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 820, height: 1050 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name} keeps the compact attachment confirmation readable without overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openHangarPage(page);
    await setDimension(page, 'width', '30');

    const brief = attachmentCard(page);
    await expect(brief).toBeVisible();
    await expect(brief.getByText('Переглянути параметри', { exact: true })).toBeVisible();
    await expect(brief.getByRole('button', { name: 'Не додавати', exact: true })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
}
