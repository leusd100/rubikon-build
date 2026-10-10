import { expect, test, type Page } from '@playwright/test';
import { backToDrawing, chooseSeparateWorks, openControlGroup, openThree } from './configurator.helpers';
import { stubTurnstile } from './turnstile.helpers';

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
  await openControlGroup(page, 'dimensions');
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

// The form fetches a Turnstile token before every submit; serve a controlled stub, never live Cloudflare.
test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
});

test.describe('configurator attachment contract', () => {
  test('untouched default remains absent from the form and lead payload', async ({ page }) => {
    const submitted = await mockLeadSubmission(page);
    await openHangarPage(page);

    // Nothing attached: on a phone the form is still folded behind «Залишити запит» (ConversationFormToggle)
    const toggle = page.locator('#inquiry .conversation-form-toggle');
    if (await toggle.isVisible()) await toggle.click();
    const form = page.locator('form.inquiry-form');
    await expect(form.locator('.inquiry-config-brief')).toHaveCount(0);
    await form.getByText('Додати параметри об’єкта', { exact: true }).click();
    await expect(form.getByLabel('Орієнтовні розміри', { exact: true })).toHaveValue('');

    await submitInquiry(page);
    expect(submitted()?.details).not.toHaveProperty('configuration');
  });

  test('focusing and leaving an unchanged business field is still untouched', async ({ page }) => {
    await openHangarPage(page);
    await openControlGroup(page, 'dimensions');
    await page.locator('#hc-dimension-width').focus();
    await page.locator('#hc-dimension-width').blur();
    await expect(attachmentCard(page)).toHaveCount(0);
  });

  // 3D is a chip on the drawing, «Подивитися в 3D», and «← Креслення» goes back (07.10)
  test('drawing to 3D and back is presentation-only', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'covered once; attachment state is viewport-independent');
    await openHangarPage(page);
    await openThree(page);
    await expect(page.getByRole('button', { name: /Креслення$/ })).toBeVisible();
    await backToDrawing(page);
    await expect(page.getByRole('button', { name: 'Подивитися в 3D', exact: true })).toBeVisible();
    await expect(attachmentCard(page)).toHaveCount(0);
  });

  test('fullscreen is presentation-only', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'covered once; attachment state is viewport-independent');
    await openHangarPage(page);
    await openThree(page);
    await page.getByRole('button', { name: 'Розгорнути', exact: true }).click();
    await page.getByRole('button', { name: /Закрити/ }).click();
    await expect(attachmentCard(page)).toHaveCount(0);
  });

  // /angary's 3D has no colours or scale figure since 07.10 (they stay on /configurator-preview, which has no form):
  // its one presentation control is the dimensions overlay
  test('hiding the 3D dimensions is presentation-only', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'covered once; attachment state is viewport-independent');
    await openHangarPage(page);
    await openThree(page);
    await page.getByRole('button', { name: 'Сховати розміри', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Показати розміри', exact: true })).toBeVisible();
    await expect(attachmentCard(page)).toHaveCount(0);
  });

  const businessEdits: Array<{
    name: string;
    edit: (page: Page) => Promise<void>;
    /** the card's title: the «Об’єкт» answers alone leave the drawn hangar the example (04.10) */
    title?: string;
  }> = [
    { name: 'width', edit: (page) => setDimension(page, 'width', '30') },
    { name: 'length', edit: (page) => setDimension(page, 'length', '50') },
    { name: 'eave height', edit: (page) => setDimension(page, 'height', '9') },
    {
      name: 'envelope/material',
      edit: async (page) => {
        await openControlGroup(page, 'envelope');
        await page.locator('label:has(input[name="hc-envelope"])').filter({ hasText: 'Утеплений' }).click();
      },
    },
    // no 'foundation' case: /angary does not offer the foundation type (the designer decides it, owner 03.10)
    {
      name: 'gate',
      edit: async (page) => {
        await openControlGroup(page, 'openings');
        await page.getByRole('radiogroup', { name: 'Ворота' }).locator('label').filter({ hasText: /^2$/ }).click();
      },
    },
    {
      name: 'personnel door',
      edit: async (page) => {
        await openControlGroup(page, 'openings');
        await page.locator('label:has(input[name="hc-doors"][value="1"])').click();
      },
    },
    // «Обсяг робіт» is «Комплекс робіт» until the visitor picks «Окремі роботи» (07.10): the works are ticked there
    {
      name: 'application scope',
      edit: async (page) => {
        await chooseSeparateWorks(page);
        await page.getByRole('checkbox', { name: 'Покрівля', exact: true }).uncheck();
      },
    },
    {
      name: 'scope mode',
      edit: async (page) => {
        await openControlGroup(page, 'scope');
        // the answer's square covers its input, as for every option card: click the answer, as a visitor does
        await page.locator('.hc-option-card').filter({ hasText: 'Допоможіть визначити' }).click();
        await expect(page.getByRole('radio', { name: 'Допоможіть визначити', exact: true })).toBeChecked();
      },
    },
    // «Об’єкт» (03.10), split over «Задача» and «Каркас» (07.10): business configuration like the sizes
    {
      name: 'purpose',
      edit: async (page) => {
        await openControlGroup(page, 'need');
        await page.locator('label:has(input[name="hc-purpose"][value="storage"])').click();
      },
      title: 'До заявки додано відповіді про об’єкт',
    },
    {
      name: 'region',
      edit: async (page) => {
        await openControlGroup(page, 'need');
        await page.getByLabel('Де будуємо?', { exact: true }).selectOption('Київська область');
      },
      title: 'До заявки додано відповіді про об’єкт',
    },
    {
      name: 'lifting equipment',
      edit: async (page) => {
        await openControlGroup(page, 'space');
        await page.locator('label:has(input[name="hc-lifting"][value="craneOrHoist"])').click();
      },
      title: 'До заявки додано відповіді про об’єкт',
    },
    {
      name: 'project',
      edit: async (page) => {
        await openControlGroup(page, 'project');
        await page.locator('label:has(input[name="hc-project"][value="ready"])').click();
      },
      title: 'До заявки додано відповіді про об’єкт',
    },
  ];

  for (const { name, edit, title = 'До заявки додано вашу конфігурацію' } of businessEdits) {
    test(`${name} business edit attaches automatically`, async ({ page }) => {
      await openHangarPage(page);
      await edit(page);
      await expect(attachmentCard(page)).toContainText(title);
    });
  }

  test('change then revert to the original value remains attached', async ({ page }) => {
    await openHangarPage(page);
    await setDimension(page, 'width', '30');
    await setDimension(page, 'width', '24');

    const brief = attachmentCard(page);
    // back on the example's sizes: still attached, and the sizes are the visitor's answer — the example's own value
    // chosen again is an answer (hangar-configurator@1.4.1); the ridge followed the width there and back
    await expect(brief.locator('.inquiry-config-brief-title')).toHaveText('До заявки додано вашу конфігурацію');
    await expect(brief.locator('strong')).toHaveText('24 × 60 × 8 м');
    await brief.getByText('Переглянути параметри', { exact: true }).click();
    const selected = brief.locator('section').filter({ has: page.getByRole('heading', { name: 'Вибрана конфігурація', exact: true }) });
    await expect(selected.locator('dt')).toHaveText(['Габарити', 'Висота в конику']);
    await expect(selected.locator('dd').first()).toHaveText('24 × 60 × 8 м');
  });

  test('explicit configurator CTA attaches an untouched default', async ({ page }) => {
    await openHangarPage(page);
    await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();

    await expect(page).toHaveURL(/#inquiry$/);
    // nothing answered: the card says it carries the drawing's example, not the visitor's choice (1.4.1)
    const brief = attachmentCard(page);
    await expect(brief.locator('.inquiry-config-brief-title')).toHaveText('До заявки додано приклад з креслення');
    await expect(brief.locator('strong')).toHaveText('Приклад з креслення · 24 × 60 × 8 м');
    await brief.getByText('Переглянути параметри', { exact: true }).click();
    await expect(brief.locator('h4')).toHaveText(['Не уточнено — значення прикладу', 'Попередні дані']);
  });

  // Owner, 03.10: an attached brief opens the form, above «Контакт», and carries the page's direction read-only
  test('the attached brief is the form\'s first block and holds the preset direction until it is detached', async ({ page }) => {
    const submitted = await mockLeadSubmission(page);
    await openHangarPage(page);
    await setDimension(page, 'width', '30');

    const form = page.locator('form.inquiry-form');
    const brief = attachmentCard(page);
    await expect(brief).toBeVisible();
    // the form's sections sit in one block that «Запит надіслано» replaces after a saved request (08.10)
    const order = await form.evaluate((element) => [element.firstElementChild!, ...element.querySelector('.inquiry-form-fields')!.children].map((child) => (
      child.classList.contains('inquiry-form-section-brief') ? 'brief' : child.querySelector('h3')?.textContent ?? child.className
    )));
    expect(order.slice(0, 4)).toEqual(['inquiry-form-heading', 'brief', 'Контакт', 'Завдання']);
    await expect(brief.locator('.inquiry-config-brief-direction')).toHaveText('Напрям робіт Ангари та склади');
    await expect(form.locator('select[name="direction"]')).toHaveCount(0);
    await expect(form.locator('input[type="hidden"][name="direction"]')).toHaveValue('Ангари та склади');
    // the read-only line is not one of the brief's rows: those stay exactly the lead's configuration text
    await brief.getByText('Переглянути параметри', { exact: true }).click();
    await expect(brief.locator('dl > div dt').filter({ hasText: 'Напрям робіт' })).toHaveCount(0);

    await brief.getByRole('button', { name: 'Не додавати', exact: true }).click();
    await expect(form.locator('.inquiry-form-section-brief')).toHaveCount(0);
    await expect(form.locator('.inquiry-form-section-title')).toHaveText(['Контакт', 'Завдання']);
    await expect(form.getByLabel(/Напрям робіт/)).toHaveValue('Ангари та склади');
    await expect(form.locator('input[type="hidden"][name="direction"]')).toHaveCount(0);

    await setDimension(page, 'length', '50');
    await expect(brief).toBeVisible();
    await submitInquiry(page);
    expect(submitted()?.direction).toBe('Ангари та склади');
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
    await expect(attachmentCard(page).locator('.inquiry-config-brief-title')).toHaveText('До заявки додано вашу конфігурацію');
    await expect(attachmentCard(page).locator('strong')).toHaveText('30 × 50 × 8 м');
  });

  test('a business edit reaches the normal form and payload without using the configurator CTA', async ({ page }) => {
    const submitted = await mockLeadSubmission(page);
    await openHangarPage(page);
    await setDimension(page, 'width', '30');
    await setDimension(page, 'length', '50');

    const brief = attachmentCard(page);
    await expect(brief.locator('strong')).toHaveText('30 × 50 × 8 м');
    // the sizes are the visitor's own, so they are the lead's «Габарити» (07.10)
    await expect(page.locator('form.inquiry-form').getByLabel('Орієнтовні розміри', { exact: true })).toHaveCount(0);
    // the sizes hold together with no-break spaces (04.10)
    await expect(page.locator('form.inquiry-form input[type="hidden"][name="dimensions"]')).toHaveValue('30\u00A0×\u00A050\u00A0×\u00A08\u00A0м');
    await submitInquiry(page);

    expect(submitted()).toMatchObject({
      direction: 'Ангари та склади',
      sourcePage: '/angary',
      details: { dimensions: '30\u00A0×\u00A050\u00A0×\u00A08\u00A0м' },
    });
    expect(submitted()?.details?.configuration?.replaceAll('\u00A0', ' ')).toContain('Площа забудови: ≈ 1 500 м²');
  });

  test('visible rows and submitted payload have exact parity and keep derived data separate', async ({ page }) => {
    const submitted = await mockLeadSubmission(page);
    await openHangarPage(page);
    await setDimension(page, 'width', '30');
    await openControlGroup(page, 'openings');
    await page.locator('label:has(input[name="hc-doors"][value="1"])').click();
    // lifting equipment is asked in «Каркас» since 07.10
    await openControlGroup(page, 'space');
    await page.locator('label:has(input[name="hc-lifting"][value="none"])').click();

    const brief = attachmentCard(page);
    await brief.getByText('Переглянути параметри', { exact: true }).click();
    // the answers about the object, the visitor's choices, what is still the example's, then the preliminary data (1.4.1);
    // «Системні» was the code's word, shown to the visitor (04.10)
    await expect(brief.locator('h4')).toHaveText(['Про об’єкт', 'Вибрана конфігурація', 'Не уточнено — значення прикладу', 'Попередні дані']);

    const visibleRows = await brief.locator('dl > div').evaluateAll((rows) => rows.map((row) => {
      const label = row.querySelector('dt')?.textContent?.trim() ?? '';
      const value = row.querySelector('dd')?.textContent?.trim() ?? '';
      return `${label}: ${value}`;
    }));

    await submitInquiry(page);
    const configuration = submitted()?.details?.configuration ?? '';
    const payloadRows = configuration.split('\n').filter((line) => !line.endsWith(':'));
    expect(payloadRows).toEqual(visibleRows);
    expect(configuration).toContain('Про об’єкт:\nПідйомне обладнання: Немає\nВибрана конфігурація:\nГабарити:');
    expect(configuration).toContain('Не уточнено клієнтом (значення прикладу на сайті):\n');
    expect(configuration).toContain('Попередні дані:\nПлоща забудови:');
    expect(configuration).toContain('Попередня конструктивна схема:');
    expect(configuration).not.toMatch(/Світло-сіра|Графіт|Нейтральна/);
    // «Об’єкт» (03.10): the answered question leads the rows, the unanswered ones are absent; the ridge says its slope
    expect(payloadRows[0]).toBe('Підйомне обладнання: Немає');
    expect(configuration).not.toMatch(/Призначення:|Проєкт:|Область:/);
    expect(configuration).toMatch(/Висота в конику: \d+(,\d)?\u00A0м · ухил\u00A0≈\u00A0\d+°/);
  });

  test('walls outside scope omit gates and door from both summary and payload', async ({ page }) => {
    const submitted = await mockLeadSubmission(page);
    await openHangarPage(page);
    await openControlGroup(page, 'openings');
    await page.locator('label:has(input[name="hc-doors"][value="1"])').click();
    await chooseSeparateWorks(page);
    await page.getByRole('checkbox', { name: 'Стіни', exact: true }).uncheck();

    const brief = attachmentCard(page);
    await brief.getByText('Переглянути параметри', { exact: true }).click();
    await expect(brief.getByText('Ворота', { exact: true })).toHaveCount(0);
    await expect(brief.getByText('Двері', { exact: true })).toHaveCount(0);

    await submitInquiry(page);
    expect(submitted()?.details?.configuration).not.toContain('Ворота:');
    expect(submitted()?.details?.configuration).not.toContain('Двері:');
  });
});

test('on a phone «Обговорити цю конфігурацію» lands on one screen with the brief, the name and the phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await openHangarPage(page);
  await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();

  const brief = attachmentCard(page);
  await expect(brief).toBeFocused();
  await expect(page.locator('#inquiry-brief-status')).toHaveText('Додано до заявки: Приклад з креслення · 24 × 60 × 8 м');
  // let the smooth scroll finish before measuring
  await expect.poll(async () => page.evaluate(() => {
    const top = document.getElementById('inquiry-brief')?.getBoundingClientRect().top ?? 0;
    return Math.round(top);
  }), { timeout: 5_000 }).toBeLessThan(160);
  const header = await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().bottom);
  const form = page.locator('form.inquiry-form');
  for (const target of [brief, form.getByLabel(/Ваше ім’я/), form.getByLabel(/Телефон/)]) {
    const box = await target.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(header - 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  }
  await expect(brief).toContainText('Напрям робіт');
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
