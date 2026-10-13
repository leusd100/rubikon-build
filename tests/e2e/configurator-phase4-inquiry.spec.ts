import { expect, test, type Page } from '@playwright/test';
import { openControlGroup } from './configurator.helpers';
import { stubTurnstile } from './turnstile.helpers';

// Phase 4 «Від конфігурації до заявки» (12.10; R-UX-06 §06 п. 2–4, §14 п. 9, 14): «Обговорити цю конфігурацію» opens the
// page's one form under the configurator's stamp instead of 4 900–8 300 px down the page; each size says whether the
// visitor set it or it is the example's; the configuration prints on one A4 sheet.

const NBSP = ' ';
type Lead = { direction: string; sourcePage: string; details: { configuration?: string; dimensions?: string } };

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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 401 + leads.length, isNew: true }) });
  });
  return leads;
}

const discuss = (page: Page) => page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ });
const brief = (page: Page) => page.locator('form.inquiry-form .inquiry-config-brief');

test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`at ${viewport.width} px «Обговорити» opens the page's one form right under the stamp, the configuration in reach`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);
    await setDimension(page, 'width', '30');
    const entries = await page.evaluate(() => window.history.length);
    await discuss(page).click();

    // one form on the page, under the stamp; the closing block points up to it
    await expect(page.locator('form.inquiry-form')).toHaveCount(1);
    await expect(page.locator('#hc-inquiry form.inquiry-form')).toHaveCount(1);
    await expect(page.locator('#inquiry form.inquiry-form')).toHaveCount(0);
    await expect(page.locator('#inquiry .conversation-form-moved')).toContainText('Форма запиту відкрита під вашою конфігурацією.');
    // straight under the stamp, not past the page
    const gap = await page.evaluate(() => document.getElementById('hc-inquiry')!.getBoundingClientRect().top - document.getElementById('hc-stamp')!.getBoundingClientRect().bottom);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(40);

    // the brief takes the focus and lands under the header, as it did at the end of the page
    await expect(brief(page)).toBeFocused();
    await expect(page.locator('#inquiry-brief-status')).toHaveText(`Додано до заявки: 30${NBSP}×${NBSP}60${NBSP}×${NBSP}8${NBSP}м`);
    await expect.poll(() => brief(page).evaluate((element) => Math.round(element.getBoundingClientRect().top)), { timeout: 5_000 }).toBeLessThan(160);
    await expect(page).toHaveURL(/#inquiry$/);
    expect(await page.evaluate(() => window.history.length)).toBe(entries);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
}

test('the line in the closing block, the route node and the cost CTA take the visitor up to the form', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the landing contract runs once');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  await discuss(page).click();
  await expect(brief(page)).toBeFocused();

  for (const link of [
    page.locator('#inquiry .conversation-form-moved a'),
    // its arrow points up now (aria-hidden: the name is the words)
    page.locator('#process li').first().locator('a.angary-route-brief-action', { hasText: 'Надіслати бриф ↑' }),
    page.locator('#vartist a[data-open-inquiry]'),
  ]) {
    await link.scrollIntoViewIfNeeded();
    await page.locator('#inquiry-brief-status').evaluate((status) => { status.textContent = ''; });
    await link.click();
    await expect(brief(page)).toBeFocused();
    await expect.poll(() => brief(page).evaluate((element) => Math.round(element.getBoundingClientRect().top)), { timeout: 5_000 }).toBeLessThan(160);
    await expect(page.locator('#inquiry-brief-status')).toHaveText(/^Додано до заявки: /);
  }
});

test('the lead sent from under the stamp tells the visitor’s width from the example’s length and wall height', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the payload contract runs once');
  const leads = await interceptLeads(page);
  await openHangarPage(page);
  await setDimension(page, 'width', '30');
  await discuss(page).click();

  const form = page.locator('#hc-inquiry form.inquiry-form');
  await form.getByLabel(/Ваше ім’я/).fill('Іван Петренко');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
  await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(form.locator('.inquiry-status')).toContainText('Дякуємо! Запит надіслано');
  // «Запит надіслано» in place, under the stamp
  await expect(form.locator('.inquiry-sent')).toBeVisible();

  expect(leads).toHaveLength(1);
  expect(leads[0]).toMatchObject({ direction: 'Ангари та склади', sourcePage: '/angary' });
  const text = leads[0].details.configuration?.replaceAll(NBSP, ' ') ?? '';
  expect(text).toContain('Вибрана конфігурація:\nШирина: 30 м\n');
  expect(text).toContain('Не уточнено клієнтом (значення прикладу на сайті):\nДовжина: 60 м\nВисота стін: 8 м\n');
  expect(text).toContain('Попередні дані:\nВисота в конику: 11 м · ухил ≈ 11° — підібраний за шириною');
  expect(text).not.toContain('Габарити:');
  // a partial answer is not the lead's «Габарити» field: only all three of the visitor's sizes are
  expect(leads[0].details.dimensions ?? '').toBe('');
});

test('a form already typed into at the end of the page stays there and «Обговорити» takes the visitor to it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract runs once');
  await openHangarPage(page);
  const bottom = page.locator('#inquiry form.inquiry-form');
  await bottom.getByLabel(/Ваше ім’я/).fill('Іван');
  await discuss(page).click();
  await expect(page.locator('#hc-inquiry')).toHaveCount(0);
  await expect(bottom).toHaveCount(1);
  await expect(bottom.getByLabel(/Ваше ім’я/)).toHaveValue('Іван');
  await expect(brief(page)).toBeFocused();
});

test('the stamp names the sizes still the example’s, and stops once all three are the visitor’s', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the stamp contract is viewport-independent');
  await openHangarPage(page);
  const stamp = page.locator('.hc-summary-flagship');
  await setDimension(page, 'width', '30');
  await expect(stamp.locator('.hc-summary-dimensions-status')).toHaveText(/з прикладу: довжина, висота стін/);
  await expect(stamp.locator('.hc-summary-dimensions [data-status="example"]')).toHaveText(['60', '8']);
  await setDimension(page, 'length', '50');
  await setDimension(page, 'height', '7');
  await expect(stamp.locator('.hc-summary-dimensions-status')).toHaveCount(0);
  await expect(stamp.locator('.hc-summary-dimensions [data-status]')).toHaveCount(0);
  await expect(stamp.locator('.hc-summary-dimensions')).toHaveText(`30${NBSP}×${NBSP}50${NBSP}×${NBSP}7${NBSP}м`);
});

test('«Друкувати аркуш A4» prints the configuration alone on one A4 page, and leaves the page as it was', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'printing is viewport-independent');
  await page.addInitScript(() => {
    (window as unknown as { printed: number }).printed = 0;
    window.print = () => { (window as unknown as { printed: number }).printed += 1; };
  });
  await openHangarPage(page);
  await setDimension(page, 'width', '30');
  await page.getByRole('button', { name: 'Друкувати аркуш A4', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);

  await expect(page.locator('html')).toHaveAttribute('data-print', 'hangar-sheet');
  const sheet = page.locator('body > .hc-print-root .hc-print');
  await expect(sheet.locator('h1')).toHaveText('Попередній аркуш конфігурації');
  await expect(sheet.locator('.hc-print-title p')).toHaveText(/^Складено \d{1,2} [а-яії’]+ \d{4} р\. на rubikonbuild\.com\/angary$/);
  // the lead's parts and rows, as the form's card shows them (nothing asked about the object: no «Про об’єкт»)
  await expect(sheet.locator('.hc-print-part h2')).toHaveText(['Вибрана конфігурація', 'Не уточнено — значення прикладу', 'Попередні дані']);
  await expect(sheet.locator('[data-part="selected"] dt')).toHaveText(['Ширина']);
  await expect(sheet.locator('[data-part="defaults"] dt').first()).toHaveText('Довжина');
  await expect(sheet.locator('.gv')).toHaveCount(1);
  await expect(sheet).toContainText('Це попередня схема, а не проєктна документація.');
  // nothing the configurator does not know
  await expect(sheet).not.toContainText(/грн|₴|\$|вартість|тижн|місяц/i);

  // the browser prints it alone, on one A4 page
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).toHaveLength(1);
  // the print over, the sheet goes and the page is the page again
  await expect(page.locator('.hc-print-root')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-print', /.*/);
});
