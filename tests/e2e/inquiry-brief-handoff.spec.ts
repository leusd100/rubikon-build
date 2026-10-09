import { expect, test, type Page } from '@playwright/test';
import { openControlGroup } from './configurator.helpers';
import { stubTurnstile } from './turnstile.helpers';

// /angary's brief in the inquiry form (sweep 03.10, decisions 04.10): what the visitor typed in the form outlives a brief,
// a brief sent with a saved lead says so and is not sent again until it changes, every way to the form lands on the
// brief, and the brief's status line and headings stay true.

type Lead = { submissionId: string; phone?: string; direction?: string; details: { configuration?: string; dimensions?: string } };

const NBSP = ' ';

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

async function interceptLeads(page: Page) {
  const leads: Lead[] = [];
  await page.route('**/api/leads', async (route) => {
    leads.push(route.request().postDataJSON() as Lead);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: leads.length, isNew: true }) });
  });
  return leads;
}

const inquiryForm = (page: Page) => page.locator('form.inquiry-form');
const brief = (page: Page) => page.locator('form.inquiry-form .inquiry-config-brief');
const routeBrief = (page: Page) => page.locator('#process li').first();

async function fillContact(page: Page) {
  const form = inquiryForm(page);
  await form.getByLabel(/Ваше ім’я/).fill('Іван Петренко');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
}

test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
});

test('the visitor\'s own direction and sizes outlive an attached brief and come back with «Не додавати»', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the form contract is viewport-independent');
  const leads = await interceptLeads(page);
  await openHangarPage(page);
  const form = inquiryForm(page);
  await form.getByLabel(/Напрям робіт/).selectOption('Металоконструкції');
  await form.getByText('Додати параметри об’єкта', { exact: true }).click();
  await form.getByLabel('Орієнтовні розміри', { exact: true }).fill('18 × 36 × 6 м');

  // a size of the visitor's own in the configurator: the brief takes the direction (owner, 03.10), not the typed sizes
  await setDimension(page, 'width', '30');
  await expect(brief(page)).toContainText(`30${NBSP}×${NBSP}60${NBSP}×${NBSP}8${NBSP}м`);
  await expect(form.locator('select[name="direction"]')).toHaveCount(0);
  await expect(form.getByText('Додати деталі до заявки', { exact: true })).toBeVisible();
  const sizes = form.getByLabel('Орієнтовні розміри', { exact: true });
  await expect(sizes).toHaveValue('18 × 36 × 6 м');
  await expect(form.locator('#inquiry-dimensions-hint')).toHaveText(`У конфігурації, доданій до заявки: 30${NBSP}×${NBSP}60${NBSP}×${NBSP}8${NBSP}м.`);
  await expect(form.locator('input[type="hidden"][name="dimensions"]')).toHaveCount(0);

  await brief(page).getByRole('button', { name: 'Не додавати', exact: true }).click();
  await expect(brief(page)).toHaveCount(0);
  await expect(form.getByLabel(/Напрям робіт/)).toHaveValue('Металоконструкції');
  await expect(sizes).toHaveValue('18 × 36 × 6 м');
  await expect(form.locator('#inquiry-dimensions-hint')).toHaveCount(0);

  // attached again, the lead carries both: the visitor's sizes as «Габарити», the brief's in its own rows
  await setDimension(page, 'length', '72');
  await fillContact(page);
  await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(form.locator('.inquiry-status')).toContainText('Дякуємо! Запит надіслано');
  expect(leads[0].direction).toBe('Ангари та склади');
  expect(leads[0].details.dimensions).toBe('18 × 36 × 6 м');
  expect(leads[0].details.configuration?.replaceAll(NBSP, ' ')).toContain('Габарити: 30 × 72 × 8 м');
});

test('a brief sent with a saved lead says so, stops asking to be sent, and goes again only once it changes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract runs once');
  const leads = await interceptLeads(page);
  await openHangarPage(page);
  await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
  await expect(routeBrief(page).getByRole('link', { name: /Надіслати бриф/ })).toBeVisible();
  await fillContact(page);
  const form = inquiryForm(page);
  const submit = form.getByRole('button', { name: 'Надіслати запит', exact: true });
  await submit.click();
  await expect(form.locator('.inquiry-status')).toContainText('Дякуємо! Запит надіслано');
  // nothing answered: the lead carries the drawing's example as the example, never as the visitor's choice (1.4.1)
  expect(leads[0].details.configuration).toContain('Не уточнено клієнтом (значення прикладу на сайті):');
  expect(leads[0].details.configuration).not.toContain('Вибрана конфігурація');

  await expect(brief(page).locator('.inquiry-config-brief-title')).toHaveText('Надіслано з вашим запитом');
  await expect(brief(page)).toContainText('Повторно не надсилатимемо, доки ви нічого не зміните.');
  await expect(brief(page).getByRole('button', { name: 'Не додавати', exact: true })).toHaveCount(0);
  await expect(routeBrief(page)).toContainText(`Надіслано з вашим запитом: Приклад з креслення · 24${NBSP}×${NBSP}60${NBSP}×${NBSP}8${NBSP}м`);
  await expect(routeBrief(page).getByRole('link')).toHaveCount(0);

  // «Запит надіслано» stands in place of the fields (08.10); its button brings them back for another request
  await expect(form.locator('.inquiry-sent')).toContainText(`КонфігураціяПриклад з креслення · 24${NBSP}×${NBSP}60${NBSP}×${NBSP}8${NBSP}м`);
  await form.getByRole('button', { name: 'Виправити номер або надіслати ще один запит', exact: true }).click();
  await expect(form.getByLabel(/Телефон/)).toBeFocused();
  // the corrected request carries the brief again (owner, 09.10): the card and route node 01 ask for it to be sent
  await expect(brief(page).locator('.inquiry-config-brief-title')).not.toHaveText('Надіслано з вашим запитом');
  await expect(routeBrief(page).getByRole('link', { name: /Надіслати бриф/ })).toBeVisible();

  // the next submit is a new lead (form.spec.ts), with the corrected number and the brief again
  await form.getByLabel(/Телефон/).fill('+380671112233');
  await submit.click();
  await expect.poll(() => leads.length).toBe(2);
  expect(leads[1].phone).toBe('+380671112233');
  expect(leads[1].details.configuration).toBe(leads[0].details.configuration);
  expect(leads[1].submissionId).not.toBe(leads[0].submissionId);

  // a change makes a new brief: «Запит надіслано» gives the fields back, and the brief is attached, asked for and sent
  // again (08.10)
  await expect(form.locator('.inquiry-sent')).toBeVisible();
  await setDimension(page, 'width', '30');
  await expect(form.locator('.inquiry-sent')).toHaveCount(0);
  await expect(form.locator('.inquiry-status')).toHaveText('Попередній варіант надіслано. Змінене ще не надіслано — натисніть «Надіслати запит».');
  await expect(brief(page).locator('.inquiry-config-brief-title')).toHaveText('До заявки додано вашу конфігурацію');
  await expect(brief(page).getByRole('button', { name: 'Не додавати', exact: true })).toBeVisible();
  await expect(routeBrief(page).getByRole('link')).toHaveText('Надіслати бриф ↓');
  await submit.click();
  await expect.poll(() => leads.length).toBe(3);
  expect(leads[2].details.configuration?.replaceAll(NBSP, ' ')).toContain('Габарити: 30 × 60 × 8 м');
});

test('on a phone the sent brief hides «До заявки», and every CTA to the form lands on the brief', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await interceptLeads(page);
  await openHangarPage(page);
  await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
  await expect(brief(page)).toBeFocused();

  // the cost CTA, the title block's CTA and the FAQ link: data-open-inquiry, now the same landing as the configurator's
  for (const link of [
    page.locator('#vartist a[data-open-inquiry]'),
    page.locator('#responsibility a[data-open-inquiry]'),
    page.locator('a.faq-ask-write'),
  ]) {
    await page.locator('#inquiry-brief-status').evaluate((status) => { status.textContent = ''; });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(brief(page)).toBeFocused();
    await expect(page).toHaveURL(/#inquiry$/);
    await expect(page.locator('#inquiry-brief-status')).toHaveText(`Додано до заявки: Приклад з креслення · 24${NBSP}×${NBSP}60${NBSP}×${NBSP}8${NBSP}м`);
    await expect.poll(() => brief(page).evaluate((element) => Math.round(element.getBoundingClientRect().top)), { timeout: 5_000 }).toBeLessThan(160);
  }

  const sticky = page.locator('.angary-mobile-inquiry-cta');
  await page.locator('#vartist').evaluate((section) => section.scrollIntoView({ block: 'start' }));
  await expect(sticky).toBeVisible();
  await fillContact(page);
  await inquiryForm(page).getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(inquiryForm(page).locator('.inquiry-status')).toContainText('Дякуємо! Запит надіслано');
  await page.locator('#vartist').evaluate((section) => section.scrollIntoView({ block: 'start' }));
  await expect(sticky).toHaveCount(0);
});

test('the brief\'s status line empties once the brief changes under it, and its headings follow the form\'s', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract runs once');
  await openHangarPage(page);
  await setDimension(page, 'width', '30');
  await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
  const status = page.locator('#inquiry-brief-status');
  await expect(status).toHaveText(`Додано до заявки: 30${NBSP}×${NBSP}60${NBSP}×${NBSP}8${NBSP}м`);
  await setDimension(page, 'length', '72');
  await expect(brief(page).locator('strong')).toHaveText(`30${NBSP}×${NBSP}72${NBSP}×${NBSP}8${NBSP}м`);
  await expect(status).toHaveText('');

  // h2 → h3 (the brief) → h4 (its sections: the visitor's sizes, what is still the example's, the preliminary data)
  // → h3 «Контакт», «Завдання»: no level skipped
  await brief(page).getByText('Переглянути параметри', { exact: true }).click();
  const outline = await page.locator('#inquiry').evaluate((section) => [...section.querySelectorAll('h2, h3, h4')]
    .filter((heading) => heading.getClientRects().length > 0)
    .map((heading) => heading.tagName));
  expect(outline).toEqual(['H2', 'H3', 'H4', 'H4', 'H4', 'H3', 'H3']);
  await expect(page.locator('#inquiry h3').first()).toHaveText('До заявки додано вашу конфігурацію');
});

for (const theme of ['light', 'dark'] as const) {
  test(`the consent checkbox shows the site's focus ring on its own square, ${theme}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the focus style is viewport-independent');
    await page.emulateMedia({ colorScheme: theme });
    await openHangarPage(page);
    const form = inquiryForm(page);
    await form.locator('.inquiry-details summary').focus();
    await page.keyboard.press('Tab');
    const checkbox = form.locator('.inquiry-consent input');
    await expect(checkbox).toBeFocused();
    const style = await checkbox.evaluate((input) => {
      const computed = getComputedStyle(input);
      const box = input.getBoundingClientRect();
      return { outline: `${computed.outlineStyle} ${computed.outlineWidth}`, shadow: computed.boxShadow, width: box.width, height: box.height };
    });
    expect(style).toEqual({ outline: 'solid 3px', shadow: 'none', width: 18, height: 18 });
  });
}
