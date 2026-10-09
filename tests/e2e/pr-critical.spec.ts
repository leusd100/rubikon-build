import { expect, test, type Page } from '@playwright/test';
import { deliveryModel } from '../../app/data/deliveryModel';
import { capabilityLedger, deliveryFaq, participationChoices, processSteps, responsibilityByFormat } from '../../app/lib/deliveryModelPresentation';
import { DEFAULT_JOURNEY, DIRECTION_JOURNEY, JOURNEY_TITLES } from '../../app/data/conversation';
import { company, companyContactLinks } from '../../app/data/company';
import { homeProofCase } from '../../app/data/homeProof';
import { directions, undecidedDirection } from '../../app/data/directions';
import { stubTurnstile } from './turnstile.helpers';
import { GRAIN_HERO_BOUNDARY } from '../../app/data/grainPage';
import { FORMAT_WHEN, RESPONSIBILITY_GROUPS, RESPONSIBILITY_ZONES, kindOf, noteOf, wordOf, workName } from '../../app/lib/responsibilityTable';

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

  // Phones and tablets fold the form behind «Залишити запит» (ConversationFormToggle); a desktop shows it at once.
  const toggle = page.locator('#inquiry .conversation-form-toggle');
  if (await toggle.isVisible()) await toggle.click();
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

test('homepage server HTML carries the H1, the real-object proof, the conversation steps and cooperation options', async ({ page }) => {
  const text = await serverText(page, '/', {
    h1: '.hero h1',
    // The photo's caption is the one line of its «Креслення» title block (audit 08.10), the provenance under the sheet
    proofCaption: '#real-object .hv2-contour .hv2-contour-line',
    proofProvenance: '#real-object .hv2-evidence-lead > p:not(.hv2-kicker)',
    proofScope: '#real-object .hv2-scope-chips li .hv2-scope-name',
    conversationSteps: '#inquiry .conversation-journey h3',
    cooperation: '.inquiry-details select option',
  });

  expect(text.h1).toEqual(['Промислове будівництво — від окремих робіт до комплексної реалізації об’єкта']);
  expect(text.proofCaption.map((caption) => caption.replace(/\s+/g, ' '))).toEqual([
    'Реальний ангар, який вів Сергій Іванович, і схема каркаса такого типу, без розмірів.',
  ]);
  expect(text.proofProvenance.map((line) => line.replace(/\s+/g, ' '))).toEqual([
    'Сергій Іванович працював над цим об’єктом до створення RUBIKON BUILD. Фото з ретушшю переднього плану.',
  ]);
  expect(text.proofScope).toEqual(['Каркас', 'Стінові панелі', 'Покрівля']);
  expect(text.conversationSteps).toEqual(['Уточнюємо задачу', 'Дивимося, що вже є', 'Узгоджуємо склад робіт', 'Готуємо кошторис']);
  expect(text.cooperation).toEqual(['Ще не визначено', ...FORMAT_LABELS]);
});

test('/napryamky server HTML takes its formats and entry points from the model', async ({ page }) => {
  const text = await serverText(page, '/napryamky', {
    formats: '.dfmt-option .dfmt-title',
    entryPoints: '.entry-points-list b',
    startNotes: '.entry-points-list small',
  });

  expect(text.formats).toEqual(FORMAT_LABELS);
  expect(text.entryPoints).toEqual(deliveryModel.entryStates.map((state) => state.label));
  expect(text.startNotes).toEqual([deliveryModel.entryStates[3].startNote]);
});

test('homepage presents the real object and leaves the participation formats to the process page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await expect(page.locator('#engineering #real-object')).toHaveCount(1);
  await expect(page.locator('main .format-grid')).toHaveCount(0);
  await expect(page.locator('header nav a[href="/yak-pratsyuiemo"]').first()).toBeAttached();
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
      .locator('#real-object .hv2-proof-facts, #real-object figcaption, #inquiry .conversation-journey li')
      .evaluateAll((elements) => elements.filter((element) => element.scrollWidth > element.clientWidth + 1).length);
    expect(overflowing).toBe(0);
  });
}

// HOME v2 (owner-approved 2026-09-29) — four zones: image → directions → engineering idea + real proof → conversation.
// These pin the architecture (order, one home per message, no claim wider than the evidence), not the wording.
const HOME_SECTION_ORDER = ['top', 'directions', 'engineering', 'inquiry'];

test('homepage sections come in the v2 order, each message with one home', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  expect(await page.locator('main#main-content > section').evaluateAll((sections) => sections.map((section) => section.id))).toEqual(HOME_SECTION_ORDER);
  // The real object is the engineering block's one sheet: the second («Вузол 1») left HOME after the block's audit (09.10)
  // — node В on the sheet shows the same column base
  await expect(page.locator('#engineering #real-object')).toHaveCount(1);
  await expect(page.locator('#engineering .hv2-cards')).toHaveCount(0);
  // Retired blocks stay retired: the Slice 02 capability, people and first-conversation sections, the old teasers.
  await expect(page.locator('#services, #about, #first-conversation, .promise, .process, .process-teaser, section.estimate-brief, .hero-contact-card')).toHaveCount(0);
});

test('homepage invites a project conversation while showing real team experience without overclaiming', async ({ page }) => {
  const text = await serverText(page, '/', {
    main: 'main',
    lead: '.hero-lead',
    proof: '#real-object',
  });
  const main = text.main.join(' ');

  expect(text.proof.join(' ')).toMatch(/Реалізований об’єкт до створення RUBIKON BUILD.*Сергій Іванович працював над цим об’єктом до створення RUBIKON BUILD.*Каркас.*Стінові панелі.*Покрівля/);
  expect(text.proof.join(' ')).not.toContain('Виконала наша команда');
  // The P01 limit on «комплексної реалізації» stays in the hero.
  expect(text.lead.join(' ')).toMatch(/Спеціалізовані роботи\s+координуємо з профільними виконавцями/);
  for (const overclaim of [/усе\s+власними\s+силами/i, /повний\s+цикл/i, /усе\s+самостійно/i, /усі\s+спеціальності/i, /власними\s+силами\s+виконуємо\s+все/i]) {
    expect(main, String(overclaim)).not.toMatch(overclaim);
  }
  // Serhii's tenure is owner-relayed, not first-hand confirmed: no number, no «понад 30», no year.
  for (const tenure of [/30\+/, /понад\s+30/i, /1995/, /\d+\s+рок/i]) expect(main, String(tenure)).not.toMatch(tenure);
  // The family thesis is stated once.
  expect(main.match(/родинн/gi) ?? []).toHaveLength(1);
  // No product names for the engineering visuals: they are explanations, not software.
  expect(main).not.toMatch(/digital\s*twin|двійник|explorer|load\s*path|x-?ray|рентген|паспорт/i);
});

test('homepage conversation explains the four steps without promising an estimate before project data', async ({ page }) => {
  const text = await serverText(page, '/', { next: '#inquiry .conversation-journey', conversation: '#inquiry .conversation-intro' });
  const next = text.next.join(' ');
  const budget = deliveryModel.stages.find((stage) => stage.id === 'scope-budget');

  expect(next).toContain('Уточнюємо задачу');
  expect(next).toContain('Дивимося, що вже є');
  expect(next).toContain('Узгоджуємо склад робіт');
  expect(next).toContain('Готуємо кошторис');
  expect(budget?.what).toContain('Вартість і строки залежать від параметрів об’єкта, умов майданчика та організації виконання.');
  expect(next).toMatch(/Коли склад робіт визначено й проєктних даних достатньо — кошторис погодженого обсягу/);
  expect(next).toContain('Якщо даних бракує');
  // P01: RUBIKON does not design — the project comes from the customer or their designer.
  expect(next).toContain('проєкт надаєте ви або ваш проєктувальник');
  for (const promise of [/\d+\s?(хв|хвилин|год|днів|дні|доб)/i, /грн|₴|\$|€/, /безкоштовн/i, /гаранті/i, /протягом/i]) {
    expect(`${next} ${text.conversation.join(' ')}`, String(promise)).not.toMatch(promise);
  }
});

// The intro sticks only where it has its column to itself (/yak-pratsyuiemo): a sticky grid item moves within the whole
// grid, so with the four steps under it the intro slid over them on every other page.
test('the conversation intro never slides over the steps, and sticks only where it has its column to itself', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the sticky intro is a desktop layout');
  await page.setViewportSize({ width: 1440, height: 900 });
  // /angary has no journey under the call (UX review 2026-10), so its intro has the column to itself, as on /yak
  for (const [path, sticks] of [['/', false], ['/angary', true], ['/yak-pratsyuiemo', true]] as const) {
    await page.goto(path, { waitUntil: 'load' });
    const scroll = await page.evaluate(async () => {
      const section = document.querySelector<HTMLElement>('#inquiry')!;
      const intro = section.querySelector<HTMLElement>('.conversation-intro')!;
      const journey = section.querySelector<HTMLElement>('.conversation-journey-wrap');
      const top = section.getBoundingClientRect().top + window.scrollY;
      const offset = () => intro.getBoundingClientRect().top - section.getBoundingClientRect().top;
      const start = offset();
      let moved = 0;
      let overlap = 0;
      for (let y = top - window.innerHeight; y <= top + section.offsetHeight; y += 40) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((resolve) => requestAnimationFrame(resolve));
        moved = Math.max(moved, offset() - start);
        if (journey) {
          const i = intro.getBoundingClientRect();
          const j = journey.getBoundingClientRect();
          overlap = Math.max(overlap, Math.min(i.bottom, j.bottom) - Math.max(i.top, j.top));
        }
      }
      return { position: getComputedStyle(intro).position, moved, overlap };
    });
    expect(scroll.position, path).toBe(sticks ? 'sticky' : 'static');
    expect(scroll.overlap, path).toBeLessThanOrEqual(0);
    if (sticks) expect(scroll.moved, path).toBeGreaterThan(100);
    else expect(scroll.moved, path).toBe(0);
  }
});

// /pro-nas v2: the two people and what each answers for, what we build and where, principles that point to their
// mechanism on /yak-pratsyuiemo.
test('/pro-nas shows who answers for what, what we build and where, principles with their mechanisms', async ({ page }) => {
  await page.goto('/pro-nas', { waitUntil: 'load' });
  await expect(page.locator('.team-about .person-story')).toHaveCount(2);
  await expect(page.locator('.team-about .person-focus')).toHaveCount(2);
  await expect(page.locator('.team-bond')).toHaveText('Два покоління — одна відповідальність');

  // Owner's decision (30.09): no object photo here until RUBIKON BUILD has objects of its own — the one real photo,
  // from Serhii's work before the company, stays on HOME with its attribution
  expect(homeProofCase).not.toBeNull();
  await expect(page.locator(`main img[src="${homeProofCase!.photo.src}"]`)).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(homeProofCase!.attribution);

  const anchors = ['#koshtorys', '#etapy', '#vidpovidalnist'];
  expect(await page.locator('.about-principle-link').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(anchors.map((anchor) => `/yak-pratsyuiemo${anchor}`));
  // What we do ourselves and what we organise (UX pass 2026-10, in place of the five-direction list that repeated
  // /napryamky): the Delivery Model's three capability layers in its own names (owner, 05.10: names only — no
  // sentences, and no tail that repeats the group's title); a work with its own page links to it, and the directions
  // are one link away. Then the region.
  const ledger = capabilityLedger();
  await expect(page.locator('.about-ledger-col h3')).toHaveText(ledger.map((column, index) => `${String(index + 1).padStart(2, '0')}${column.title}`));
  await expect(page.locator('.about-ledger-col li b')).toHaveText(ledger.flatMap((column) => column.items.map((item) => (item.href ? `${item.short} ↗` : item.short))));
  expect(await page.locator('.about-ledger a').evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
    .toEqual(ledger.flatMap((column) => column.items.flatMap((item) => (item.href ? [item.href] : []))));
  await expect(page.locator('.about-build-all')).toHaveAttribute('href', '/napryamky');
  await expect(page.locator('.about-ledger img')).toHaveCount(0);
  for (const pattern of FORBIDDEN_CLAIMS) expect(await page.locator('.about-ledger').innerText(), String(pattern)).not.toMatch(pattern);
  // The region closes the block on a copper line, the rest of the sentence under it
  const region = page.locator('.about-build-region');
  await expect(region.locator('.region-bond')).toHaveText(`Основний регіон — ${company.serviceAreas[0]}`);
  await expect(region).toContainText(company.geographyBeyond);
  // The oblast's outline with Dnipro marked; its OpenStreetMap-derived data is credited (ODbL)
  await expect(region.getByRole('img', { name: `Мапа: ${company.serviceAreas[0]}, позначено місто Дніпро` })).toBeVisible();
  await expect(region.locator('figcaption')).toContainText('© учасники OpenStreetMap');
  // The family thesis is said once — by the copper line under the people — not in the heading as well
  await expect(page.locator('main').getByText(/Два покоління/)).toHaveCount(1);
  // Owner's decision (30.09): no «Ілюстрація» tags on this page; the conceptual image says so in its alt text
  await expect(page.locator('main')).not.toContainText('Ілюстрація');
  // The practice tour is a technical drawing (UX pass 2026-10: zooming the picture lost its quality); it names itself
  await expect(page.locator('.about-story-section svg.practice-drawing')).toHaveAttribute('aria-label', /^Схема: /);
  await expect(page.locator('.about-story-section img')).toHaveCount(0);
  await expect(page.locator('.ghost-word')).toHaveCount(0);

  // Every principle lands on a zone that exists
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  for (const anchor of anchors) await expect(page.locator(anchor)).toHaveCount(1);
});

// /pro-nas practice: the illustration answers the list one step at a time — the tour plays by itself once in view and
// can be paused; every item is a button that shows its step. Reduced motion: no tour and no control.
test('/pro-nas practice steps play once in view, pause, and answer each item', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const story = page.locator('.about-story-section');
  const caption = story.locator('.ps-caption-text');
  await expect(caption).toHaveText('Від креслення — до перевірки на майданчику');
  await story.locator('.about-planning-visual').scrollIntoViewIfNeeded();
  await expect(caption).toHaveText('Креслення й вихідні дані');
  await story.getByRole('button', { name: 'Пауза показу кроків', exact: true }).click();
  await expect(story.getByRole('button', { name: 'Відтворити показ кроків', exact: true })).toBeVisible();
  const joint = story.getByRole('button', { name: /^Ключові вузли/ });
  await joint.click();
  await expect(caption).toHaveText('Болтовий вузол балки й колони');
  await expect(joint).toHaveAttribute('aria-pressed', 'true');
  await expect(story.locator('.about-before-step[aria-pressed="true"]')).toHaveCount(1);
});

test('/pro-nas practice steps without motion: overview, no tour control, items still switch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const story = page.locator('.about-story-section');
  await story.locator('.about-planning-visual').scrollIntoViewIfNeeded();
  await expect(story.locator('.ps-caption-text')).toHaveText('Від креслення — до перевірки на майданчику');
  await expect(story.locator('.ps-control')).toHaveCount(0);
  await story.getByRole('button', { name: /^Послідовність робіт/ }).click();
  await expect(story.locator('.ps-caption-text')).toHaveText('Порядок монтажу: плита → колона → балка');
});

// Direction heroes on a phone: a shorter lead (built from the intro's own sentences) keeps the hero's call on the first
// screen of a 390 × 844 window — the full intro pushed it to 755–888 px. Wider screens keep the full intro; the grain
// boundary the shorter lead moved out of the way still stands in the hero, right under its actions.
const PHONE_HERO_PAGES = ['/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/angary', '/zernoskhovyshcha'] as const;

test('direction heroes keep the call on a phone\'s first screen and the full lead on wider screens', async ({ page, isMobile }) => {
  if (isMobile) {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of PHONE_HERO_PAGES) {
      await page.goto(path, { waitUntil: 'load' });
      const call = page.locator('.service-subhero a[href^="tel:"]').first();
      const box = await call.boundingBox();
      expect(box, path).not.toBeNull();
      expect(box!.y + box!.height, path).toBeLessThanOrEqual(720);
      await expect(page.locator('.service-subhero-lead .lead-full'), path).toBeHidden();
      await expect(page.locator('.service-subhero-lead .lead-phone'), path).toBeVisible();
    }
    await page.goto('/zernoskhovyshcha', { waitUntil: 'load' });
    // the boundary under a phone's grain hero is the short one since 06.10; the whole statement stands beside the drawing
    await expect(page.locator('.service-subhero-note')).toHaveText(GRAIN_HERO_BOUNDARY);
    await expect(page.locator('.service-subhero-note')).toBeVisible();
  } else {
    for (const path of PHONE_HERO_PAGES) {
      await page.goto(path, { waitUntil: 'load' });
      await expect(page.locator('.service-subhero-lead .lead-full'), path).toBeVisible();
      await expect(page.locator('.service-subhero-lead .lead-phone'), path).toBeHidden();
    }
    await expect(page.locator('.service-subhero-note')).toBeHidden();
  }
});

// /napryamky: the five directions as a catalogue — every row stays the link to its page, and from 1051 px the preview
// Since 05.10 every row carries its own scheme sheet and kinds of work (no preview panel); the hero slides say which
// direction they show and can be paused.
test('/napryamky rows carry their scheme sheets; hero slides name their direction and pause', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/napryamky', { waitUntil: 'load' });
  const rows = page.locator('#directions-list .route-service');
  await expect(rows).toHaveCount(directions.length);
  expect(await rows.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(directions.map((direction) => direction.href));

  const hero = page.locator('.directions-subhero');
  await expect(hero.locator('.dhs-caption')).toContainText(directions[0].title);
  const pause = hero.getByRole('button', { name: 'Пауза показу напрямів', exact: true });
  await pause.click();
  await expect(hero.getByRole('button', { name: 'Відтворити показ напрямів', exact: true })).toBeVisible();
  const paused = await hero.locator('.dhs-caption').textContent();
  await page.waitForTimeout(3600);
  await expect(hero.locator('.dhs-caption')).toHaveText(paused!);

  // Since 05.10 a wide screen has no preview panel either: every row carries its scheme sheet and its kinds of work
  await expect(page.locator('.dcat-preview')).toHaveCount(0);
  await expect(page.locator('#directions-list .route-service .dcat-thumb svg')).toHaveCount(directions.length);
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(page.locator('#betonni-roboty .dcat-kinds li')).toHaveText(['Фундаменти', 'Основи під обладнання', 'Промислові підлоги', 'Монолітні ділянки']);
  }
});

test('homepage separates labelled illustrations from the one real photo', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const cards = page.locator('#directions .direction-card');
  await expect(cards).toHaveCount(5);
  for (const card of await cards.all()) await expect(card.locator('.direction-provenance')).toHaveText('Ілюстрація');
  await expect(page.locator('#directions .section-header-support')).toContainText('ілюстрації, а не фото виконаних об’єктів');

  // The one real photo proves: said to be a real hangar, its retouch stated, the time before RUBIKON BUILD named.
  const sheet = page.locator('#real-object .hv2-contour');
  await expect(sheet.locator('.hv2-contour-canvas > picture img')).toHaveAttribute('src', '/photos/serhii-prior-hangar-retouched.jpeg');
  await expect(sheet.locator('figcaption')).toContainText('Реальний ангар');
  await expect(page.locator('#real-object')).toContainText('Фото з ретушшю переднього плану');
  await expect(page.locator('#real-object')).toContainText('до створення RUBIKON BUILD');

  // Owner's decisions (04.10, 05.10): right of the seam, the outline and the slope taken from the photos, no scale, and a
  // SCHEME of a frame of this object's type, said to be one — its stamp on the drawing says it has no sizes; never the
  // frame over the photo itself, never the generated X-ray sketch on the default page. Every explanation card carries its
  // label.
  await expect(sheet.locator('figcaption')).toContainText('схема каркаса такого типу, без розмірів');
  await expect(sheet.locator('.hv2-contour-stamp')).toContainText('Схема · без розмірів');
  await expect(page.locator('#real-object img[src*="/concepts/"], #real-object source[srcset*="/concepts/"]')).toHaveCount(0);
  // No second sheet under it (09.10): the explanation is the block's own scheme
  await expect(page.locator('#engineering .hv2-sheet')).toHaveCount(0);
  // Concept images live only inside a labelled illustration, never in the conversation block.
  expect(await page.locator('main img[src*="/concepts/"]').evaluateAll((images) => images.filter((image) => !image.closest('.direction-card, .hv2-hero')).length)).toBe(0);
  await expect(page.locator('#inquiry img[src*="/concepts/"]')).toHaveCount(0);
});

test('homepage places its calls once: in the hero and in the closing conversation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  const bySection = await page.locator('main#main-content > section').evaluateAll((sections) =>
    Object.fromEntries(sections.map((section) => [section.id, section.querySelectorAll('a[href^="tel:"]').length])));
  expect(bySection).toEqual({ top: 1, directions: 0, engineering: 0, inquiry: 1 });
  // The write-a-request path follows the hero call, never replaces it.
  await expect(page.locator('#top a[href="#inquiry"]')).toHaveCount(1);
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
// One closing conversation block everywhere: the same four step titles, each page's own explanations, and on a
// direction page the form already names that direction. /yak-pratsyuiemo shows its steps in the route instead, and
// /napryamky in its start track (see the next test).
const CONVERSATION_PAGES: ReadonlyArray<{ path: string; journey: readonly string[] }> = [
  { path: '/', journey: DEFAULT_JOURNEY },
  { path: '/pro-nas', journey: DEFAULT_JOURNEY },
  ...Object.entries(DIRECTION_JOURNEY).map(([id, journey]) => ({ path: `/${id}`, journey: journey ?? [] })),
];

test('every page closes with the same conversation block, in its own words', async ({ page }) => {
  for (const { path, journey } of CONVERSATION_PAGES) {
    const text = await serverText(page, path, {
      sections: '#inquiry.conversation',
      call: '#inquiry .conversation-call::href',
      channels: '#inquiry .conversation-channels .messenger-link',
      form: '#inquiry .inquiry-form',
      titles: '#inquiry .conversation-journey h3',
      steps: '#inquiry .conversation-journey p',
      legacy: '.contact, .contact-links, .pending-contact',
    });
    expect(text.sections, path).toHaveLength(1);
    expect(text.call, path).toEqual([companyContactLinks.phone]);
    expect(text.channels, path).toHaveLength(4);
    expect(text.form, path).toHaveLength(1);
    expect(text.titles, path).toEqual([...JOURNEY_TITLES]);
    expect(text.steps, path).toEqual([...journey]);
    expect(text.legacy, path).toEqual([]);
  }
  // /angary closes with the same block, without «Що буде після звернення»: the route on the page tells it
  const angary = await serverText(page, '/angary', { sections: '#inquiry.conversation', form: '#inquiry .inquiry-form', titles: '#inquiry .conversation-journey h3' });
  expect(angary.sections).toHaveLength(1);
  expect(angary.form).toHaveLength(1);
  expect(angary.titles).toEqual([]);
});

// /napryamky invites people who have not picked a direction: its form starts on «Ще не визначено» (a real, accepted
// answer), and the four after-contact steps give way to the start track above, which already says where we begin.
test('/napryamky form starts on «Ще не визначено» and the start track replaces the four steps', async ({ page }) => {
  const text = await serverText(page, '/napryamky', {
    journey: '#inquiry .conversation-journey',
    track: '.dstart-track',
  });
  expect(text.journey).toEqual([]);
  expect(text.track).toHaveLength(1);
  await page.goto('/napryamky', { waitUntil: 'load' });
  await expect(page.locator('#inquiry form.inquiry-form').getByLabel(/Напрям робіт/)).toHaveValue(undecidedDirection);
});

test('the form carries no step numbers; a phone folds the step texts behind one button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // /angary tells the route itself and leaves the journey out of its form (UX review 2026-10)
  await page.goto('/metalokonstruktsii', { waitUntil: 'load' });
  const form = page.locator('#inquiry .inquiry-form');
  await expect(form.locator('.inquiry-form-section-title')).toHaveText(['Контакт', 'Завдання']);
  await expect(form.getByText('Підтвердження', { exact: true })).toHaveCount(0);

  const steps = page.locator('#inquiry .conversation-journey');
  const toggle = page.locator('#inquiry .conversation-journey-toggle');
  await expect(steps.locator('h3')).toHaveCount(4);
  await expect(steps.locator('p').first()).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(steps.locator('p').first()).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(toggle).toBeHidden();
  await toggle.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(steps.locator('p')).toHaveCount(4);
  for (const text of await steps.locator('p').all()) await expect(text).toBeVisible();
});

test('a direction page preselects its own direction in the form', async ({ page }) => {
  await page.goto('/metalokonstruktsii', { waitUntil: 'load' });
  await expect(page.locator('#inquiry select').first()).toHaveValue('Металоконструкції');
});

const DELIVERY_PAGE = '/yak-pratsyuiemo';
const FORBIDDEN_CLAIMS = [/генеральн\S*\s+підряд/i, /гаранті/i, /ліценз/i, /сертифікат/i, /штат/i, /\d+\s?(хв|хвилин|год)/i, /грн|₴|\$|€/, /від\s*\d[^.]*м²/i];

// /yak-pratsyuiemo v2: the client's view of the Delivery Model — five questions, seven zones. The full eight-stage model,
// the matrix and the document route stay in the repository (tests/unit/delivery-page-presentation.test.ts); the page is
// a simpler projection of the same truth, held to it here.
test('/yak-pratsyuiemo answers the five client questions in the model’s words, before hydration', async ({ page }) => {
  const text = await serverText(page, DELIVERY_PAGE, {
    main: 'main',
    h1: 'main h1',
    starts: '.proc-start-list h3',
    steps: '.proc-split h3',
    results: '.proc-split .ps-result .sr-only',
    formats: '#obsiah .dfmt-option .dfmt-title',
    formatTexts: '#obsiah .dfmt-option .dfmt-text',
    formatTerms: '#obsiah .dfmt-option .dfmt-sr',
    when: '.rm-when .proc-principle',
    principle: '.rm-when-how',
    areas: '.rm-col > b',
    areaItems: '.rm-row .rm-work',
    terms: '.cs-sheet figcaption strong',
    inquiry: '#inquiry h2',
  });
  const main = text.main.join(' ');

  expect(text.h1).toEqual(['Від задачі — до зрозумілого плану робіт']);
  expect(text.starts).toEqual(['Є ідея об’єкта', 'Є креслення або проєкт', 'Потрібен окремий етап робіт']);
  // «Ви · Ми» (owner 06.10): each step's number and title; its full result is read to screen readers under the caption
  expect(text.steps).toEqual(processSteps().map((step) => `${step.number}${step.title}`));
  expect(text.results).toEqual(processSteps().map((step) => `Результат: ${step.result}`));
  expect(text.formats).toEqual(FORMAT_LABELS);
  const choices = participationChoices();
  for (const format of deliveryModel.formats) expect(text.formatTexts).toEqual(expect.arrayContaining([format.summary]));
  // Since 05.10 the three scope cards are one drawing with three format buttons; every button still names the other
  // party of the contract and who coordinates the object (hidden text: the drawing shows them for one format at a time)
  expect(text.formatTerms).toEqual(choices.map((choice) => `Договір: ${choice.contractWith} і RUBIKON. Координує об’єкт: ${choice.coordinator}.`));
  const resp = responsibilityByFormat();
  // The responsibility table (owner 06.10): each format opens with when it is yours, then the model's interfaces line;
  // a column per party, the client being «Ви»; a row per work — all of them, in three groups, plainer names where set
  expect(text.when).toEqual(resp.formats.map((format) => FORMAT_WHEN[format.id]));
  expect(text.principle).toEqual(resp.formats.map((format) => format.principle));
  expect(text.principle).toEqual(deliveryModel.formats.map((format) => format.interfaces));
  expect(text.areas).toEqual(RESPONSIBILITY_ZONES.map((zone) => zone.title));
  expect(text.areaItems).toEqual(RESPONSIBILITY_GROUPS.flatMap((group) => resp.items.filter((item) => group.rows.includes(item.rows[0]))).map(workName));
  expect(text.areaItems).toHaveLength(resp.items.length);
  // The estimate and the schedule as sheets (owner 07.10); the change policy is the procedure's lead (statements below)
  expect(text.terms).toEqual(['Рахуємо кошторис', 'Плануємо строки']);
  expect(text.inquiry).toEqual(['Є задача — почнемо з неї']);
  for (const statement of [deliveryModel.statements.design, deliveryModel.statements.boundary, deliveryModel.statements.materials, deliveryModel.changePolicy.principle]) {
    expect(main).toContain(statement);
  }
  for (const pattern of FORBIDDEN_CLAIMS) expect(main, String(pattern)).not.toMatch(pattern);
});

test('/yak-pratsyuiemo speaks to the client, not in the internal model’s vocabulary or layout', async ({ page }) => {
  const text = await serverText(page, DELIVERY_PAGE, {
    main: 'main',
    tables: 'main table',
    details: 'main > section:not(#inquiry) details',
    faqDetails: '.faq-list details',
    contents: 'nav[aria-label="Зміст сторінки"]',
    ghosts: 'main .ghost-word',
    journey: '#inquiry .conversation-journey',
  });
  const main = text.main.join(' ');

  expect(text.tables).toEqual([]);
  expect(text.details).toHaveLength(text.faqDetails.length);
  expect(text.contents).toEqual([]);
  expect(text.ghosts).toEqual([]);
  // The steps are shown once, in the route; the closing block does not repeat them.
  expect(text.journey).toEqual([]);
  for (const stage of deliveryModel.stages) expect(main).not.toContain(`${stage.number} ${stage.title}`);
  expect(main).not.toMatch(/вх(ід|оду) пакета|вих(ід|оду) пакета|нитк[аиу]|гнучкі пакети|виключення та припущення|стик(и|ів)|модел[іь] відповідальності/i);
});

test('/yak-pratsyuiemo FAQPage data is the visible FAQ, on a WebPage and never a HowTo', async ({ page }) => {
  const text = await serverText(page, DELIVERY_PAGE, {
    questions: '.faq-list summary h3',
    answers: '.faq-list details > p',
    jsonLd: 'script[type="application/ld+json"]',
  });
  const data = text.jsonLd.map((json) => JSON.parse(json) as { '@type': string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] });
  const faq = data.find((item) => item['@type'] === 'FAQPage');

  expect(text.questions).toEqual(deliveryFaq().map(([question]) => question));
  expect(text.questions.length).toBeLessThanOrEqual(4);
  expect(faq?.mainEntity?.map((item) => item.name)).toEqual(text.questions);
  expect(faq?.mainEntity?.map((item) => item.acceptedAnswer.text)).toEqual(text.answers);
  expect(data.map((item) => item['@type'])).toEqual(expect.arrayContaining(['WebPage', 'BreadcrumbList', 'FAQPage']));
  expect(data.map((item) => item['@type'])).not.toContain('HowTo');
});

test('navigation and footer lead to /yak-pratsyuiemo while the homepage hero leads to contact', async ({ page }) => {
  const home = await serverText(page, '/', {
    header: `header nav a[href="${DELIVERY_PAGE}"]`,
    footer: `footer a[href="${DELIVERY_PAGE}"]`,
    heroContact: '#top a[href="#inquiry"]',
    oldAnchor: 'a[href="/#how-we-work"]',
  });

  expect(home.header).toHaveLength(2);
  expect(home.footer).toHaveLength(1);
  expect(home.heroContact).toHaveLength(1);
  expect(home.oldAnchor).toHaveLength(0);
});

test.describe('/yak-pratsyuiemo without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('is complete: route, scope, responsibility map and terms read without scripts; the FAQ opens natively', async ({ page }) => {
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    await expect(page.locator('.proc-split li')).toHaveCount(4);
    await expect(page.locator('.proc-split .ps-result').last()).toBeVisible();
    await expect(page.locator('.rm-row')).toHaveCount(responsibilityByFormat().items.length);
    await expect(page.locator('.rm-row').last()).toBeVisible();
    await expect(page.locator('.cs-sheet')).toHaveCount(2);
    await expect(page.locator('.cs-steps li')).toHaveCount(4);
    // the change procedure's whole story is drawn on the sheets without scripts
    await expect(page.locator('.cs')).toHaveAttribute('data-reached', '1 2 3 4');
    await expect(page.locator('.proc-contract-band')).toBeVisible();
    const first = page.locator('.faq-list details').first();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await expect(first.locator('p')).toBeVisible();
  });
});

test.describe('/yak-pratsyuiemo motion', () => {
  test('reduced motion shows every final state at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    await expect(page.locator('.process-page')).not.toHaveAttribute('data-motion-ready', /.*/);
    await expect(page.locator('.rm-row').first()).toHaveCSS('opacity', '1');
    await expect(page.locator('#obsiah .dfmt-figure')).toHaveCSS('opacity', '1');
    await expect(page.locator('.proc-start-merge')).toHaveCSS('opacity', '1');
    await expect(page.locator('.proc-contract-band')).toHaveCSS('opacity', '1');
    await expect(page.locator('.cs')).toHaveAttribute('data-reached', '1 2 3 4');
    await expect(page.locator('.cs-order')).toHaveCSS('opacity', '1');
  });

  test('a block taller than the screen still plays: the responsibility table on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    const figure = page.locator('.resp-matrix-wrap');
    await figure.scrollIntoViewIfNeeded();
    await expect(figure).toHaveAttribute('data-motion-state', 'on');
    await expect(page.locator('.proc-contract-band')).toHaveCSS('opacity', '1', { timeout: 5000 });
  });

  test('each block plays once when it enters the viewport and never replays', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    const route = page.locator('.proc-split');
    await expect(route).not.toHaveAttribute('data-motion-state', 'on');
    await route.scrollIntoViewIfNeeded();
    await expect(route).toHaveAttribute('data-motion-state', 'on');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await route.scrollIntoViewIfNeeded();
    await expect(route).toHaveAttribute('data-motion-state', 'on');
    // The steps are readable once played: every step's text back at full strength.
    await expect(route.locator('li').last().locator('h3')).toHaveCSS('opacity', '1', { timeout: 5000 });
  });

  test('pressing a format from the keyboard selects it: the drawing shows that format’s scope', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    const option = page.locator('#obsiah .dfmt-option').nth(1);
    // Focus alone chooses nothing here: this block and the map below hold one choice, and tabbing past must not rewrite it
    await option.focus();
    await expect(option).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.proc-resp-switch input[value="comprehensive"]')).toBeChecked();
    await page.keyboard.press('Enter');
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#obsiah svg.fs')).toHaveAttribute('data-format', 'work-package');
    // one package is RUBIKON's, the rest are the other participants'
    await expect(page.locator('#obsiah svg.fs .fs-layer[data-scope]')).toHaveCount(1);
  });

});

test.describe('/yak-pratsyuiemo interactions', () => {
  /** What the table shows for the chosen format: per row, per party column, the cell's word (+ note) and the columns
   *  its visible word-marks stand in. Hidden cells are display: none (CSS :has on the switcher's radios). */
  const tableState = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.rm-row')].map((row) => ({
    work: row.querySelector('.rm-work')?.textContent?.trim() ?? '',
    cells: [...row.querySelectorAll<HTMLElement>('.rm-cell')].map((cell) => [...cell.querySelectorAll<HTMLElement>('.rm-say')]
      .filter((say) => getComputedStyle(say).display !== 'none')
      .map((say) => say.querySelector('.sr-only')?.textContent?.trim() ?? '')),
    marks: [...row.querySelectorAll<HTMLElement>('.rm-mark')]
      .filter((mark) => getComputedStyle(mark).opacity === '1')
      .map((mark) => Number(getComputedStyle(mark).getPropertyValue('--c').trim()))
      .sort(),
    words: [...row.querySelectorAll<HTMLElement>('.rm-mark')]
      .filter((mark) => getComputedStyle(mark).opacity === '1')
      .map((mark) => getComputedStyle(mark, '::before').content.replace(/^"|"$/g, ''))
      .sort(),
  })));

  test('the format switcher puts each work with the parties the model names for that format, in words', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    const resp = responsibilityByFormat();
    const rows = RESPONSIBILITY_GROUPS.flatMap((group) => resp.items.filter((item) => group.rows.includes(item.rows[0])));
    for (const format of resp.formats) {
      await page.locator('.proc-resp-switch').getByRole('radio', { name: format.label, exact: true }).check();
      await expect(page.locator('.rm-col-client .rm-who:visible')).toHaveText(format.clientTitle.toLowerCase());
      await expect(page.locator('.rm-when-how:visible')).toHaveText(format.principle);
      await expect(page.locator('.rm-when .proc-principle:visible')).toHaveText(FORMAT_WHEN[format.id]);
      // «Координує(те) об’єкт» stands under one party only — the format's coordinator
      await expect(page.locator('.rm-coordinator:visible')).toHaveCount(1);
      await expect(page.locator(`.rm-col-${format.coordinator.zone} .rm-coordinator:visible`)).toHaveCount(1);
      const state = await tableState(page);
      expect(state.map((row) => row.work)).toEqual(rows.map(workName));
      rows.forEach((item, index) => {
        const zones = RESPONSIBILITY_ZONES.map((zone) => zone.id);
        const held = zones.filter((zone) => item.zones[zone].includes(format.id));
        // each party cell says its word and the model's note (in the second person) — or nothing
        expect(state[index].cells, `${item.text} · ${format.id}`).toEqual(zones.map((zone) => (held.includes(zone)
          ? [`${wordOf(item, zone, format.id)}${noteOf(item, zone, format.id) ? `: ${noteOf(item, zone, format.id)}` : ''}`]
          : [])));
        // and its word-marks stand in exactly those columns, saying the same words
        expect(state[index].marks, `${item.text} · ${format.id} marks`).toEqual(held.map((zone) => zones.indexOf(zone)).sort());
        expect(state[index].words, `${item.text} · ${format.id} words`).toEqual(held.map((zone) => wordOf(item, zone, format.id)).sort());
      });
    }
  });

  test('the table needs no key: the marks are words, the client is «Ви»', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    await expect(page.locator('.rm-key')).toHaveCount(0);
    await expect(page.locator('.rm-col-client > b')).toHaveText('Ви');
    const state = await tableState(page);
    const row = (work: string) => state.find((item) => item.work === work)!;
    expect(row('Кошторис').words).toEqual(['Робимо']);
    expect(row('Проєкт об’єкта').words).toEqual(['На вас']);
    expect(row('Виготовлення металоконструкцій').words).toEqual(['Організовуємо']);
  });

  test('on a phone the switcher and the table head stay under the header while the rows scroll by', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    await page.evaluate(() => {
      const row = document.querySelectorAll('.rm-row')[8]!;
      window.scrollTo({ top: row.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2, behavior: 'instant' });
    });
    const header = await page.locator('.site-header').evaluate((element) => Math.round(element.getBoundingClientRect().height));
    const switcher = page.locator('.proc-resp-switch');
    expect(await switcher.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(header);
    const switcherBottom = await switcher.evaluate((element) => Math.round(element.getBoundingClientRect().bottom));
    expect(await page.locator('.rm-head').evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(switcherBottom);
    await switcher.getByRole('radio', { name: 'Окремий підряд', exact: true }).check();
    await expect(page.locator('.rm-col-client .rm-coordinator:visible')).toBeVisible();
  });

  test('on a wide screen the switcher floats under the header and the table head sticks under it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop layout');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    // The table's top 400 px above the viewport: well inside it
    await page.evaluate(() => {
      const table = document.querySelector('.resp-matrix')!;
      window.scrollTo({ top: table.getBoundingClientRect().top + window.scrollY + 400, behavior: 'instant' });
    });
    const header = await page.locator('.site-header').evaluate((element) => Math.round(element.getBoundingClientRect().height));
    const control = page.locator('.proc-resp-switch > div');
    expect(await control.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(header + 12);
    // Only the control takes the pointer: the strip beside it does not cover the table
    await expect(page.locator('.proc-resp-switch')).toHaveCSS('pointer-events', 'none');
    await expect(control).toHaveCSS('pointer-events', 'auto');
    const controlBottom = await control.evaluate((element) => element.getBoundingClientRect().bottom);
    const headTop = await page.locator('.rm-head').evaluate((element) => element.getBoundingClientRect().top);
    expect(headTop).toBeGreaterThanOrEqual(controlBottom);
    expect(headTop - controlBottom).toBeLessThan(4);
  });

  test('the scope drawing and the responsibility table hold one choice of format', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    const drawing = page.locator('#obsiah svg.fs');
    const options = page.locator('#obsiah .dfmt-option');
    await expect(drawing).toHaveAttribute('data-format', 'comprehensive');
    await options.filter({ hasText: 'Субпідряд' }).click();
    await expect(drawing).toHaveAttribute('data-format', 'subcontract');
    await expect(page.locator('.proc-resp-switch input[value="subcontract"]')).toBeChecked();
    await expect(page.locator('.rm-col-client .rm-who:visible')).toHaveText('генпідрядник');
    // and back from the table
    await page.locator('.proc-resp-switch').getByRole('radio', { name: 'Окремий підряд', exact: true }).check();
    await expect(options.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(drawing).toHaveAttribute('data-format', 'work-package');
  });

  test('the scope block is one drawing with three format buttons, and no second switcher', async ({ page }) => {
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    // Until 05.10 three cards stood here, each with its own drawing (owner: overloaded, the focus was lost)
    await expect(page.locator('.proc-scope-switch, .proc-scope-grid')).toHaveCount(0);
    await expect(page.locator('#obsiah .dfmt-option')).toHaveCount(3);
    await expect(page.locator('#obsiah svg.fs')).toHaveCount(1);
    await expect(page.locator('#obsiah .proc-scope-legend li')).toHaveCount(3);
  });

  test('after a switch the rows whose parties changed are lit for a moment', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    const resp = responsibilityByFormat();
    const place = (item: (typeof resp.items)[number], format: 'comprehensive' | 'subcontract') => RESPONSIBILITY_ZONES
      .filter((zone) => item.zones[zone.id].includes(format)).map((zone) => `${zone.id}:${kindOf(item, zone.id, format)}`).join(' ');
    const moved = RESPONSIBILITY_GROUPS.flatMap((group) => resp.items.filter((item) => group.rows.includes(item.rows[0])))
      .filter((item) => place(item, 'comprehensive') !== place(item, 'subcontract'))
      .map(workName);
    expect(moved.length).toBeGreaterThan(0);
    await page.locator('.proc-resp-switch').getByRole('radio', { name: 'Субпідряд', exact: true }).check();
    await expect(page.locator('.rm-row[data-fresh] .rm-work')).toHaveText(moved);
    await expect(page.locator('.rm-row[data-fresh]')).toHaveCount(0, { timeout: 5000 });
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('the format switcher still works (CSS only)', async ({ page }) => {
      await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
      await page.locator('.proc-resp-switch').getByRole('radio', { name: 'Субпідряд', exact: true }).check();
      await expect(page.locator('.rm-col-client .rm-who:visible')).toHaveText('генпідрядник');
      const subcontract = responsibilityByFormat().formats.find((format) => format.id === 'subcontract')!;
      await expect(page.locator('.rm-out:visible')).toHaveCount(subcontract.outOfScope.length);
    });
  });

  test('«Обговорити цей формат» takes the visitor to the form with that format chosen', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    // The link carries the format the drawing shows: choose the third first
    await page.locator('#obsiah .dfmt-option').nth(2).click();
    await page.locator('#obsiah .proc-scope-cta').click();
    await expect(page).toHaveURL(/#inquiry$/);
    await expect(page.locator('#inquiry select[name="cooperation"]')).toHaveValue('Субпідряд');
    await expect(page.locator('#inquiry details.inquiry-details')).toHaveAttribute('open', '');
    await expect(page.locator('#format-prefill-status')).toHaveText('У формі вибрано обсяг робіт: Субпідряд.');
  });
});

for (const width of [360, 375, 390, 768]) {
  test(`/yak-pratsyuiemo fits a ${width}px screen with every question open`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(DELIVERY_PAGE, { waitUntil: 'load' });
    await page.locator('.process-page details').evaluateAll((all) => {
      for (const element of all) (element as HTMLDetailsElement).open = true;
    });

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const overflowing = await page
      .locator('.process-page > section > .shell')
      .evaluateAll((sections) => sections.filter((section) => section.scrollWidth > section.clientWidth + 1).map((section) => section.parentElement?.className));
    expect(overflowing).toEqual([]);
  });
}
