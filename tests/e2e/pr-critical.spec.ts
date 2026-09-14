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
  '/yak-pratsyuiemo',
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

/**
 * The text of the elements each selector matches in a route's server HTML — or, for
 * «selector::attribute», that attribute. DOMParser builds the document without running its
 * scripts, so what this reads is what arrives before hydration.
 */
async function serverText(page: Page, path: string, selectors: Record<string, string>) {
  const response = await page.request.get(path);
  expect(response.status(), path).toBe(200);
  return page.evaluate(({ markup, queries }) => {
    const doc = new DOMParser().parseFromString(markup, 'text/html');
    return Object.fromEntries(
      Object.entries(queries).map(([key, query]) => {
        const [selector = '', attribute] = query.split('::');
        return [key, [...doc.querySelectorAll(selector)].map((element) => (attribute ? element.getAttribute(attribute) : element.textContent?.trim()) ?? '')];
      }),
    );
  }, { markup: await response.text(), queries: selectors });
}

test('server HTML of every public route speaks the Delivery Model taxonomy', async ({ request }) => {
  for (const path of PUBLIC_PATHS) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();

    expect(html, path).not.toMatch(/генеральн\S*\s+підряд/i);
    for (const phrase of RETIRED_PHRASES) expect(html, `${path}: ${phrase}`).not.toContain(phrase);
  }
});

test('homepage server HTML carries the new H1, three formats, the entry axis and the cooperation options', async ({ page }) => {
  const text = await serverText(page, '/', {
    h1: '.hero h1',
    formats: '#services .format-grid h3',
    entryPoints: '#services .entry-axis li',
    cooperation: '.inquiry-details select option',
  });

  expect(text.h1).toEqual(['Промислове будівництво — від окремих робіт до комплексної реалізації об’єкта']);
  expect(text.formats).toEqual(FORMAT_LABELS);
  expect(text.entryPoints).toEqual(deliveryModel.entryStates.map((state) => state.label));
  expect(text.cooperation).toEqual(['Ще не визначено', ...FORMAT_LABELS]);
});

test('/napryamky server HTML takes its formats and entry points from the model', async ({ page }) => {
  const text = await serverText(page, '/napryamky', {
    formats: '.cooperation-split-three h2',
    entryPoints: '.entry-points-list b',
    startNotes: '.entry-points-list small',
  });

  expect(text.formats).toEqual(FORMAT_LABELS);
  expect(text.entryPoints).toEqual(deliveryModel.entryStates.map((state) => state.label));
  expect(text.startNotes).toEqual([deliveryModel.entryStates[3].startNote]);
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

// /yak-pratsyuiemo — the Delivery Model page, readable before and without JavaScript.
const DELIVERY_PAGE = '/yak-pratsyuiemo';
const FORBIDDEN_CLAIMS = [/генеральн\S*\s+підряд/i, /гаранті/i, /ліценз/i, /сертифікат/i, /штат/i, /\d+\s?(хв|хвилин|год)/i, /грн|₴|\$|€/, /від\s*\d[^.]*м²/i];

test('/yak-pratsyuiemo server HTML explains the whole model before hydration', async ({ page }) => {
  const text = await serverText(page, DELIVERY_PAGE, {
    main: 'main',
    formats: '#formaty .delivery-format h3',
    formatAnchors: '#formaty .delivery-format::id',
    entryPoints: '#shcho-vzhe-ye li b',
    startNotes: '#shcho-vzhe-ye li p',
    stages: 'ol.delivery-stages > li > h3',
    stageDetails: 'ol.delivery-stages details > summary',
    layers: '#khto-vykonuie .delivery-layer h3',
  });
  const main = text.main.join(' ');

  expect(text.formats).toEqual(FORMAT_LABELS);
  expect(text.formatAnchors).toEqual(deliveryModel.formats.map((format) => format.anchor));
  expect(text.entryPoints).toEqual(deliveryModel.entryStates.map((state) => state.label));
  expect(text.startNotes).toEqual([deliveryModel.entryStates[3].startNote]);
  expect(text.stages).toEqual(deliveryModel.stages.map((stage) => `${stage.number} ${stage.title}`));
  expect(text.stageDetails).toHaveLength(8);
  expect(text.layers).toEqual(['Власне ядро', 'Гнучкі пакети', 'Профільні партнери']);
  for (const statement of Object.values(deliveryModel.statements)) expect(main).toContain(statement);
  for (const pattern of FORBIDDEN_CLAIMS) expect(main, String(pattern)).not.toMatch(pattern);
});

test('/yak-pratsyuiemo FAQPage data is the visible FAQ, on a WebPage and never a HowTo', async ({ page }) => {
  const text = await serverText(page, DELIVERY_PAGE, {
    questions: '.faq-list summary h3',
    answers: '.faq-list details > p',
    jsonLd: 'script[type="application/ld+json"]',
  });
  const data = text.jsonLd.map((json) => JSON.parse(json) as { '@type': string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] });
  const faq = data.find((item) => item['@type'] === 'FAQPage');

  expect(text.questions).toHaveLength(6);
  expect(faq?.mainEntity?.map((item) => item.name)).toEqual(text.questions);
  expect(faq?.mainEntity?.map((item) => item.acceptedAnswer.text)).toEqual(text.answers);
  expect(data.map((item) => item['@type'])).toEqual(expect.arrayContaining(['WebPage', 'BreadcrumbList', 'FAQPage']));
  expect(data.map((item) => item['@type'])).not.toContain('HowTo');
});

test('the navigation, footer and homepage teaser lead to /yak-pratsyuiemo', async ({ page }) => {
  const home = await serverText(page, '/', {
    header: `header nav a[href="${DELIVERY_PAGE}"]`,
    footer: `footer a[href="${DELIVERY_PAGE}"]`,
    teaser: `#how-we-work a[href="${DELIVERY_PAGE}"]`,
    oldAnchor: 'a[href="/#how-we-work"]',
  });

  expect(home.header).toHaveLength(2);
  expect(home.footer).toHaveLength(1);
  expect(home.teaser).toHaveLength(1);
  expect(home.oldAnchor).toHaveLength(0);
});

test('/yak-pratsyuiemo stage details open from the keyboard', async ({ page }) => {
  await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
  const details = page.locator('ol.delivery-stages details').first();
  const summary = details.locator('summary');

  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect(details.getByText(deliveryModel.stages[0].why)).toBeVisible();
});

for (const width of [360, 375, 390]) {
  test(`/yak-pratsyuiemo fits a ${width}px phone with every stage open`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    await page.locator('ol.delivery-stages details').evaluateAll((all) => {
      for (const element of all) (element as HTMLDetailsElement).open = true;
    });

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const overflowing = await page
      .locator('.delivery-page > section[id]:not(#inquiry), .delivery-page > nav')
      .evaluateAll((sections) => sections.filter((section) => section.scrollWidth > section.clientWidth + 1).map((section) => section.id || section.className));
    expect(overflowing).toEqual([]);
  });
}
