import { expect, test, type Page } from '@playwright/test';
import { deliveryModel } from '../../app/data/deliveryModel';
import { stubTurnstile } from './turnstile.helpers';

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

// The form fetches a Turnstile token before every submit; serve a controlled stub, never live Cloudflare.
test.beforeEach(async ({ page }) => {
  await stubTurnstile(page);
});

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

test('homepage server HTML carries the H1, work overview, first conversation and cooperation options', async ({ page }) => {
  const text = await serverText(page, '/', {
    h1: '.hero h1',
    overview: '#services .capability-overview h3',
    conversationSteps: '#first-conversation .next-list dt',
    cooperation: '.inquiry-details select option',
  });

  expect(text.h1).toEqual(['Промислове будівництво — від окремих робіт до комплексної реалізації об’єкта']);
  expect(text.overview).toEqual(['Від фундаменту до покрівлі', 'Розкажіть про свій об’єкт']);
  expect(text.conversationSteps).toEqual(['Уточнюємо задачу', 'Дивимося, що вже є', 'Узгоджуємо склад робіт', 'Готуємо кошторис']);
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

test('homepage presents experience and an invitation, with detailed formats on the process page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await expect(page.locator('#services .capability-overview > div')).toHaveCount(2);
  await expect(page.locator('#services .format-grid')).toHaveCount(0);
  await expect(page.locator('#services a[href="/yak-pratsyuiemo#khto-vykonuie"]')).toHaveCount(1);
});

for (const width of [360, 375, 390]) {
  test(`homepage H1 and work overview fit a ${width}px phone without breaking words`, async ({ page }) => {
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
      .locator('#services .capability-overview > div, #first-conversation .prep-list li, #first-conversation .next-list > div')
      .evaluateAll((elements) => elements.filter((element) => element.scrollWidth > element.clientWidth + 1).length);
    expect(overflowing).toBe(0);
  });
}

// HOME Slice 02 — one argument: task → capability in honest limits → people → first conversation → contact.
// These pin the architecture (order, one home per message, no claim wider than the evidence), not the wording.
const HOME_SECTION_ORDER = ['top', 'directions', 'services', 'about', 'first-conversation', 'inquiry'];

test('homepage sections come in the Slice 02 order, each message with one home', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  expect(await page.locator('main#main-content > section').evaluateAll((sections) => sections.map((section) => section.id))).toEqual(HOME_SECTION_ORDER);
  // The old anchors of the merged blocks still resolve, inside the new one.
  await expect(page.locator('#first-conversation #estimate-brief')).toHaveCount(1);
  await expect(page.locator('#first-conversation #how-we-work')).toHaveCount(1);
  // Merged away: the reputation block, the process teaser and the stand-alone brief.
  await expect(page.locator('.promise, .process, .process-teaser, section.estimate-brief')).toHaveCount(0);
});

test('homepage invites a project conversation while showing real team experience without overclaiming', async ({ page }) => {
  const text = await serverText(page, '/', {
    main: 'main',
    lead: '.hero-lead',
    columns: '#services .capability-overview h3',
    overview: '#services .capability-overview',
  });
  const main = text.main.join(' ');

  expect(text.columns).toEqual(['Від фундаменту до покрівлі', 'Розкажіть про свій об’єкт']);
  expect(text.overview.join(' ')).toMatch(/типові фундаменти.*монтуємо металоконструкції.*покрівлі/);
  expect(text.overview.join(' ')).toContain('який обсяг можемо взяти на себе');
  expect(text.lead.join(' ')).toMatch(/Спеціалізовані роботи координуємо з профільними виконавцями в погодженому обсязі/);
  for (const overclaim of [/усе\s+власними\s+силами/i, /повний\s+цикл/i, /усе\s+самостійно/i, /усі\s+спеціальності/i, /власними\s+силами\s+виконуємо\s+все/i]) {
    expect(main, String(overclaim)).not.toMatch(overclaim);
  }
  // Serhii's tenure is owner-relayed, not first-hand confirmed: no number, no «понад 30», no year.
  for (const tenure of [/30\+/, /понад\s+30/i, /1995/, /\d+\s+рок/i]) expect(main, String(tenure)).not.toMatch(tenure);
  // The family thesis is stated once (it used to be split across two blocks and a hero label).
  expect(main.match(/родинн/gi) ?? []).toHaveLength(1);
});

test('homepage «Перша розмова» explains the four steps without promising an estimate before project data', async ({ page }) => {
  const text = await serverText(page, '/', { next: '#how-we-work', prepare: '#estimate-brief', services: '#services' });
  const next = text.next.join(' ');
  const budget = deliveryModel.stages.find((stage) => stage.id === 'scope-budget');

  expect(next).toContain('Уточнюємо задачу');
  expect(next).toContain('Дивимося, що вже є');
  expect(next).toContain('Узгоджуємо склад робіт');
  expect(next).toContain('Готуємо кошторис');
  expect(budget?.what).toContain('Вартість і строки залежать від параметрів об’єкта, умов майданчика та організації виконання.');
  expect(next).toMatch(/Коли склад робіт визначено й проєктних даних достатньо, готуємо кошторис погодженого обсягу/);
  expect(next).toContain('Якщо даних поки недостатньо');
  expect(text.services.join(' ')).toContain('після розмови й перегляду матеріалів');
  for (const promise of [/\d+\s?(хв|хвилин|год|днів|дні|доб)/i, /грн|₴|\$|€/, /безкоштовн/i, /гаранті/i, /протягом/i]) {
    expect(`${next} ${text.prepare.join(' ')}`, String(promise)).not.toMatch(promise);
  }
});

test('homepage keeps illustrations labelled and out of the trust and proof zones; the proof slot is empty', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const cards = page.locator('#directions .direction-card');
  await expect(cards).toHaveCount(5);
  for (const card of await cards.all()) await expect(card.locator('.direction-provenance')).toHaveText('Ілюстрація');
  await expect(page.locator('#directions .section-header-support')).toContainText('ілюстрації, а не фото виконаних об’єктів');

  // Concept images belong to the direction cards alone: none in the capability, people or contact blocks.
  expect(await page.locator('main img[src*="/concepts/"]').evaluateAll((images) => images.filter((image) => !image.closest('.direction-card')).length)).toBe(0);
  await expect(page.locator('#services img, #first-conversation img')).toHaveCount(0);
  // Nothing is approved as proof yet, so the slot draws nothing — no empty frame, no placeholder.
  await expect(page.locator('.home-proof')).toHaveCount(0);
});

test('homepage places its calls where intent rises: hero, after capability, before the form, in the form', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const bySection = await page.locator('main#main-content > section').evaluateAll((sections) =>
    Object.fromEntries(sections.map((section) => [section.id, section.querySelectorAll('a[href^="tel:"]').length])));
  expect(bySection).toEqual({ top: 1, directions: 0, services: 1, about: 0, 'first-conversation': 1, inquiry: 1 });
  // The write-a-request path follows each call, never replaces it.
  await expect(page.locator('#services .contact-bridge a[href="#inquiry"]')).toHaveCount(1);
});

// The five direction cards on the homepage keep every title word whole. The title shares the card's inset with the
// arrow; in the narrow right-hand cards «Зерносховища» and «Металоконструкції» used to split mid-word around 768 px
// (and the latter below ~375 px). Measured like the H1: each word on its own must fit the title's own width.
for (const viewport of [{ width: 360, height: 800 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 820, height: 1180 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`homepage direction-card titles keep their words whole at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const cards = await page.locator('#directions .direction-card').evaluateAll((elements) => elements.map((card) => {
      const title = card.querySelector<HTMLElement>('.direction-copy strong')!;
      const arrow = card.querySelector<HTMLElement>('.direction-arrow')!;
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
      title.appendChild(probe);
      let widest = 0;
      for (const word of (title.textContent ?? '').split(/\s+/).filter(Boolean)) {
        probe.textContent = word;
        widest = Math.max(widest, probe.getBoundingClientRect().width);
      }
      probe.remove();
      const t = title.getBoundingClientRect();
      const a = arrow.getBoundingClientRect();
      const overlapsArrow = t.right > a.left && t.left < a.right && t.bottom > a.top && t.top < a.bottom;
      return { title: (title.textContent ?? '').trim(), widest, available: title.clientWidth, overlapsArrow };
    }));

    expect(cards).toHaveLength(5);
    // The title may use the space reserved for the arrow only where the arrow is not: it must never sit on it.
    for (const card of cards) {
      expect(card.widest, `${card.title}: widest word ${Math.round(card.widest)}px in ${card.available}px`).toBeLessThanOrEqual(card.available);
      expect(card.overlapsArrow, `${card.title} runs into the arrow`).toBe(false);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
  for (const statement of [deliveryModel.statements.design, deliveryModel.statements.responsibility, deliveryModel.statements.boundary]) expect(main).toContain(statement);
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

test('navigation and footer lead to /yak-pratsyuiemo while the first conversation leads to contact', async ({ page }) => {
  const home = await serverText(page, '/', {
    header: `header nav a[href="${DELIVERY_PAGE}"]`,
    footer: `footer a[href="${DELIVERY_PAGE}"]`,
    conversationContact: '#how-we-work a[href="#inquiry"]',
    oldAnchor: 'a[href="/#how-we-work"]',
  });

  expect(home.header).toHaveLength(2);
  expect(home.footer).toHaveLength(1);
  expect(home.conversationContact).toHaveLength(1);
  expect(home.oldAnchor).toHaveLength(0);
});

test('/yak-pratsyuiemo keeps every model fact in the server HTML, however the page folds it', async ({ page }) => {
  const text = await serverText(page, DELIVERY_PAGE, {
    stages: 'ol.delivery-stages > li > h3',
    shared: '#vidpovidalnist .delivery-shared .delivery-activity',
    compared: '#vidpovidalnist .delivery-matrix tbody th .delivery-activity',
    panels: '#vidpovidalnist .delivery-compare-mobile details::id',
    panelActivities: '#vidpovidalnist .delivery-compare-mobile details .delivery-activity',
    notes: '#vidpovidalnist .delivery-notes li',
    documents: '#dokumenty .delivery-docs-desktop .delivery-doc-label',
    phoneDocuments: '#dokumenty .delivery-docs-mobile .delivery-doc-label',
    factors: '#biudzhet .delivery-chips li',
    budget: '#biudzhet',
    contactIntro: '#inquiry .contact-copy > p:last-of-type',
    contents: '.delivery-contents a',
    legend: '.delivery-token-legend a',
  });
  const activities = deliveryModel.responsibility.map((row) => row.activity);
  const documents = deliveryModel.stages.flatMap((stage) => stage.documents.map((document) => document.label));
  const notes = deliveryModel.responsibility.flatMap((row) => ('note' in row ? [row.note] : []));

  expect(text.stages).toEqual(deliveryModel.stages.map((stage) => `${stage.number} ${stage.title}`));
  expect([...text.shared, ...text.compared].sort()).toEqual([...activities].sort());
  expect(text.compared).toHaveLength(12);
  expect(text.panels).toEqual(deliveryModel.formats.map((format) => `vidpovidalnist-${format.anchor}`));
  expect(text.panelActivities).toEqual([...text.compared, ...text.compared, ...text.compared]);
  expect(text.notes).toHaveLength(notes.length);
  notes.forEach((note, index) => expect(text.notes[index]).toContain(note));
  expect(text.documents).toEqual(documents);
  expect(text.phoneDocuments).toEqual(documents);
  expect(new Set(documents).size).toBe(19);
  expect([...text.factors].sort()).toEqual(deliveryModel.budgetFactors.map((factor) => factor.label).sort());
  expect(text.factors).toHaveLength(13);
  expect(text.contactIntro.join(' ')).toContain('Для початку достатньо коротко описати об’єкт або потрібні роботи');
  expect(text.budget.join(' ')).not.toContain('Що потрібно на старті');
  expect(text.contents.filter((label) => /\d/.test(label))).toEqual([]);
  expect(text.legend).toEqual(FORMAT_LABELS.map((label, index) => `0${index + 1} ${label}`));
});

test('/yak-pratsyuiemo visual language is decoration beside the words, never instead of them', async ({ page }) => {
  const text = await serverText(page, DELIVERY_PAGE, {
    icons: '.delivery-page svg.role-icon::aria-hidden',
    labels: '.delivery-page :has(> svg.role-icon)',
    ghosts: '.delivery-page .ghost-word',
    ghostsHidden: '.delivery-page .ghost-word::aria-hidden',
    route: '.delivery-thread-route::aria-hidden',
    routePoints: '.delivery-thread-route li',
    marked: '.delivery-thread-route li[class]',
    threadLinks: '.delivery-thread-steps a',
    changeStep: '.delivery-thread-steps > li:last-child > b',
  });

  // Six per stage (result, three roles, documents, why) and one beside each of two section eyebrows.
  expect(text.icons).toHaveLength(deliveryModel.stages.length * 6 + 2);
  expect(new Set(text.icons)).toEqual(new Set(['true']));
  expect(text.labels).toHaveLength(text.icons.length);
  expect(text.labels.filter((label) => label.length === 0)).toEqual([]);
  expect(text.ghosts).toEqual(['PROCESS', 'RESPONSIBILITY', 'EXPERIENCE']);
  expect(text.ghostsHidden).toEqual(['true', 'true', 'true']);
  expect(text.route).toEqual(['true']);
  expect(text.routePoints).toEqual(deliveryModel.stages.map((stage) => stage.number));
  // Only the model's design-thread stages are marked; the change step is not placed on the route.
  expect(text.marked).toEqual(['03', '06']);
  expect(text.threadLinks).toEqual(['03 Узгодження з проєктом', '06 Підготовка реалізації']);
  expect(text.changeStep).toEqual(['Під час реалізації']);
});

test('/yak-pratsyuiemo stage details open from the keyboard, in reading order', async ({ page }) => {
  await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
  const details = page.locator('ol.delivery-stages details').first();
  const summary = details.locator('summary');

  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect(details.getByText(deliveryModel.stages[0].why)).toBeVisible();
  await expect(details.locator('h4')).toHaveText(['Що відбувається', 'Перехід далі, коли…', 'RUBIKON', 'Замовник', 'Учасники', 'Документи', 'Чому це важливо']);
});

test.describe('/yak-pratsyuiemo without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('reads and unfolds every layer natively', async ({ page }) => {
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    const stage = page.locator('#etap-04 details');
    const notes = page.locator('#vidpovidalnist .delivery-notes');

    await stage.locator('summary').click();
    await expect(stage).toHaveAttribute('open', '');
    await expect(stage.getByText(deliveryModel.stages[3].why)).toBeVisible();
    await expect(page.locator('#vidpovidalnist .delivery-matrix tbody tr')).toHaveCount(12);
    await notes.locator('summary').click();
    await expect(notes.locator('li')).toHaveCount(deliveryModel.responsibility.filter((row) => 'note' in row).length);
    await expect(notes.locator('li').first()).toBeVisible();
    await expect(page.locator('#dokumenty .delivery-docs-desktop .delivery-doc-label')).toHaveCount(19);
    await expect(page.locator('#inquiry .contact-copy')).toContainText('Для початку достатньо коротко описати об’єкт або потрібні роботи');
  });

  test('folds responsibility and documents into one-at-a-time panels on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    const panel = page.locator('#vidpovidalnist-okremyi-pidriad');
    const phase = page.locator('#dokumenty .delivery-docs-mobile details').first();

    await expect(page.locator('#vidpovidalnist .delivery-matrix')).toBeHidden();
    await panel.locator('summary').click();
    await expect(panel.locator('.delivery-activity').first()).toBeVisible();
    await expect(page.locator('#dokumenty .delivery-docs-desktop')).toBeHidden();
    await phase.locator('summary').click();
    await expect(phase.locator('.delivery-doc-label')).toHaveCount(10);
    await expect(phase.locator('.delivery-doc-label').first()).toBeVisible();
  });
});

for (const width of [360, 375, 390, 768]) {
  test(`/yak-pratsyuiemo fits a ${width}px screen with every layer open`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    await page.locator('.delivery-page details').evaluateAll((all) => {
      for (const element of all) (element as HTMLDetailsElement).open = true;
    });

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Each section's content, not the section itself: a ghost word is decoration that deliberately
    // runs past the edge and is clipped there, and the document-width check above already proves
    // nothing makes the page scroll sideways.
    const overflowing = await page
      .locator('.delivery-page > section[id]:not(#inquiry) > .shell, .delivery-page > nav')
      .evaluateAll((sections) => sections.filter((section) => section.scrollWidth > section.clientWidth + 1).map((section) => section.id || section.className));
    expect(overflowing).toEqual([]);
  });
}
