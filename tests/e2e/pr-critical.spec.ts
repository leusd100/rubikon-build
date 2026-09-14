import { expect, test, type Page } from '@playwright/test';
import { deliveryModel } from '../../app/data/deliveryModel';

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

// Delivery Model taxonomy, checked in the server HTML so it holds before hydration too.
const PUBLIC_PATHS = [
  '/',
  '/napryamky',
  '/angary',
  '/zernoskhovyshcha',
  '/metalokonstruktsii',
  '/betonni-roboty',
  '/pokrivelni-roboty',
  '/pro-nas',
  '/polityka-konfidentsiinosti',
];
const FORMAT_LABELS = deliveryModel.formats.map((format) => format.label);
// Retired from the site in PR 2: the old format names, /napryamky's local taxonomy and the
// «найближчим часом» follow-up promise. «під ключ» itself may stay as the visitor's words.
const RETIRED_PHRASES = [
  'Робота за наявною документацією',
  'Підряд або субпідряд',
  'Об’єкт під ключ',
  'Окремий етап робіт',
  'Комплексні об’єкти',
  'Якщо проєкт уже сформований',
  'найближчим часом',
];

const textOf = (html: string) => html.replace(/<[^>]+>/g, '').trim();

function fragment(html: string, pattern: RegExp): string {
  const match = pattern.exec(html);
  expect(match, String(pattern)).not.toBeNull();
  return match?.[1] ?? '';
}

function texts(html: string, tag: string): string[] {
  return [...html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map((match) => textOf(match[1]));
}

test('server HTML of every public route speaks the Delivery Model taxonomy', async ({ request }) => {
  for (const path of PUBLIC_PATHS) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();

    expect(html, path).not.toMatch(/генеральн\S*\s+підряд/i);
    expect(html, path).not.toContain('/yak-pratsyuiemo');
    for (const phrase of RETIRED_PHRASES) expect(html, `${path}: ${phrase}`).not.toContain(phrase);
  }
});

test('homepage server HTML carries the new H1, three formats, the entry axis and the cooperation options', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const services = fragment(html, /<section[^>]*id="services"[^>]*>([\s\S]*?)<\/section>/);

  expect(textOf(fragment(html, /<h1[^>]*>([\s\S]*?)<\/h1>/))).toBe('Промислове будівництво — від окремих робіт до комплексної реалізації об’єкта');
  expect(texts(services, 'h3')).toEqual(FORMAT_LABELS);
  expect(texts(services, 'li')).toEqual(deliveryModel.entryStates.map((state) => state.label));
  expect(texts(fragment(html, /Формат співпраці<\/span><select[^>]*>([\s\S]*?)<\/select>/), 'option')).toEqual(['Ще не визначено', ...FORMAT_LABELS]);
});

test('/napryamky server HTML takes its formats and entry points from the model', async ({ request }) => {
  const html = await (await request.get('/napryamky')).text();

  for (const label of FORMAT_LABELS) expect(html).toContain(`<h2>${label}</h2>`);
  for (const state of deliveryModel.entryStates) expect(html).toContain(state.label);
  expect(html).toContain(deliveryModel.entryStates[3].startNote);
});

test('homepage shows exactly three format cards', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const cards = page.locator('#services .format-grid article');

  await expect(cards).toHaveCount(3);
  await expect(cards.locator('h3')).toHaveText(FORMAT_LABELS);
});

for (const width of [360, 375, 390]) {
  test(`homepage H1 and format cards fit a ${width}px phone without breaking words`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/', { waitUntil: 'load' });

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Every H1 word must fit the heading's width on its own, or the global overflow-wrap splits it mid-letter.
    const heading = await page.locator('.hero h1').evaluate((element) => {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
      element.appendChild(probe);
      let widest = 0;
      for (const word of (element.textContent ?? '').split(/\s+/)) {
        probe.textContent = word;
        widest = Math.max(widest, probe.getBoundingClientRect().width);
      }
      probe.remove();
      return { widest, available: element.clientWidth };
    });
    expect(heading.widest).toBeLessThanOrEqual(heading.available);
    const overflowing = await page
      .locator('#services .format-grid article, #services .entry-axis')
      .evaluateAll((elements) => elements.filter((element) => element.scrollWidth > element.clientWidth + 1).length);
    expect(overflowing).toBe(0);
  });
}
