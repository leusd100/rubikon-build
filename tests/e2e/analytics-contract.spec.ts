import { expect, test, type Page } from '@playwright/test';
import { GTAG_STUB_VERSION, gtagCommands, stubGoogle } from './google.helpers';
import { PRODUCTION_ORIGIN, localOrigin, serveProductionHostLocally } from './production-host.helpers';
import { stubTurnstile } from './turnstile.helpers';

// The application's analytics contract (Layer A, Wave 01, 16.10), with a versioned gtag stub and deny-all outbound:
// every command the site hands gtag is asserted exactly, and nothing may leave the browser. Nothing here depends on
// Google being reachable, or on what Google's tag samples (analytics-consent.spec.ts keeps the live tag's contract: one
// load in about fifty sends a diagnostic /td or /a image our CSP blocks, which is what failed Nightly 38867707280).

// Nothing in this file may reach the network from the browser itself. Playwright's routes miss what a page sends while it
// unloads: gtag's keepalive /g/collect on pagehide (scroll, user_engagement) went out past them on / → /angary (16.10,
// reproduced against a dead-end sink). So DNS is closed to every host but the app's; the real gtag.js still arrives
// through route.fetch, which Playwright makes outside the browser
test.use({ launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1 , EXCLUDE localhost'] } });

// The production tag runs only where location.hostname is rubikonbuild.com (DEC-06): these pages are the local build
// served under that origin (production-host.helpers.ts). DNS stays closed: Playwright answers that origin itself.
test.use({ baseURL: PRODUCTION_ORIGIN });

const GA_SCRIPT_SELECTOR = 'script[data-rubikon-analytics="G-WYRXJV71WG"]';
const CONSENT_DEFAULT = ['consent', 'default', {
  analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500,
}];
const CONFIG = ['config', 'G-WYRXJV71WG', { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false }];
const ANALYTICS_ONLY = ['consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }];
const ALL_GRANTED = ['consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' }];

async function chooseAnalyticsOnly(page: Page) {
  await page.getByRole('button', { name: 'Налаштувати', exact: true }).click();
  await page.locator('.cookie-toggle-group', { hasText: 'Аналітика' }).getByText('Дозволено', { exact: true }).click();
  await page.getByRole('button', { name: 'Зберегти вибір', exact: true }).click();
}

/** Every CSP violation the page reports, from its first script on */
async function watchCsp(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${event.disposition} ${event.effectiveDirective} ${event.blockedURI}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}

test.beforeEach(async ({ page, context }, testInfo) => {
  await serveProductionHostLocally(context, testInfo);
  // the pages' films are the same origin and stream on: networkidle waits on the tag's traffic, not on them
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
});

for (const [label, choose, update] of [
  ['analytics-only consent', chooseAnalyticsOnly, ANALYTICS_ONLY],
  ['«Прийняти все»', (page: Page) => page.getByRole('button', { name: 'Прийняти все', exact: true }).click(), ALL_GRANTED],
] as const) {
  test(`${label} hands gtag exactly: consent default, the matching update, js, the analytics-only config — and nothing leaves the browser`, async ({ page, context, baseURL }) => {
    const outbound = await stubGoogle(context, new URL(baseURL!).origin);
    const violations = await watchCsp(page);
    await page.goto('/', { waitUntil: 'load' });
    await choose(page);
    await expect(page.locator(GA_SCRIPT_SELECTOR)).toHaveCount(1);
    await expect.poll(() => gtagCommands(page).then((commands) => commands?.length ?? 0)).toBeGreaterThanOrEqual(4);
    await page.waitForLoadState('networkidle');

    const commands = (await gtagCommands(page))!;
    expect(commands.every((command) => command.isArguments), 'every command uses the Arguments protocol').toBe(true);
    expect(commands.map((command) => command.args)).toEqual([CONSENT_DEFAULT, update, ['js', '<Date>'], CONFIG]);
    expect(await page.evaluate(() => (window as unknown as { __gtagStub: { version: string } }).__gtagStub.version)).toBe(GTAG_STUB_VERSION);
    expect(outbound.requests).toEqual([]);
    expect(await violations()).toEqual([]);

    // A full navigation with the stored choice: the same four commands again, config exactly once
    await page.goto('/angary', { waitUntil: 'networkidle' });
    await expect.poll(() => gtagCommands(page).then((next) => next?.map((command) => command.args))).toEqual([CONSENT_DEFAULT, update, ['js', '<Date>'], CONFIG]);
    expect(outbound.requests).toEqual([]);
    expect(await violations()).toEqual([]);
    // the tag loaded once a document
    expect(outbound.gtagLoads()).toBe(2);
  });
}

for (const [label, choose] of [
  ['before any choice', async () => {}],
  ['«Лише необхідні»', (page: Page) => page.getByRole('button', { name: 'Лише необхідні', exact: true }).click()],
] as const) {
  test(`${label}: no gtag.js at all, no command handed to it, and nothing leaves the browser`, async ({ page, context, baseURL }) => {
    const outbound = await stubGoogle(context, new URL(baseURL!).origin);
    const violations = await watchCsp(page);
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.getByRole('button', { name: 'Лише необхідні', exact: true })).toBeVisible();
    await choose(page);
    await page.goto('/angary', { waitUntil: 'networkidle' });
    await expect(page.locator(GA_SCRIPT_SELECTOR)).toHaveCount(0);
    expect(outbound.gtagLoads()).toBe(0);
    expect(await gtagCommands(page)).toBeNull();
    expect(outbound.requests).toEqual([]);
    expect(await violations()).toEqual([]);
  });
}

// No route-change page_view case: the site has no next/link or router navigation, so every link is a full document load
// and the route-change branch of AnalyticsConsent.tsx never fires; the second half above pins one config per document

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('an accepted lead reaches gtag\'s queue once, as generate_lead with its method, direction and the key D1 stores', async ({ page, context, baseURL }) => {
  const outbound = await stubGoogle(context, new URL(baseURL!).origin);
  await stubTurnstile(page);
  // mocked: no real lead is ever created; the key the request carries is what /api/leads stores as leads.submission_id
  const submissionIds: string[] = [];
  await page.route('**/api/leads', (route) => {
    submissionIds.push((route.request().postDataJSON() as { submissionId: string }).submissionId);
    return route.fulfill({ json: { ok: true, id: 42, isNew: false } });
  });
  await page.goto('/', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Прийняти все', exact: true }).click();
  await expect.poll(() => gtagCommands(page).then((commands) => commands?.length ?? 0)).toBe(4);
  const toggle = page.locator('#inquiry .conversation-form-toggle');
  if (await toggle.isVisible()) await toggle.click();
  const form = page.locator('form.inquiry-form');
  await form.getByLabel(/Ваше ім’я/).fill('Тест черги');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Напрям робіт/).selectOption({ index: 1 });
  await form.getByLabel(/Погоджуюся на обробку/).check();
  await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(page.locator('.inquiry-status')).toContainText('Дякуємо');
  await expect.poll(() => gtagCommands(page).then((commands) => commands!
    .filter((command) => command.args[0] === 'event' && command.args[1] === 'generate_lead'))).toHaveLength(1);
  const [lead] = (await gtagCommands(page))!.filter((command) => command.args[1] === 'generate_lead');
  expect(lead.isArguments).toBe(true);
  expect(submissionIds).toHaveLength(1);
  expect(submissionIds[0]).toMatch(UUID_V4);
  expect(lead.args[2]).toEqual({
    contact_method: expect.stringMatching(/.+/),
    project_direction: expect.stringMatching(/.+/),
    lead_submission_id: submissionIds[0],
  });
  expect(outbound.requests).toEqual([]);
});

// Off the canonical host nothing reaches the production property, whatever the visitor granted (DEC-06: 581 of 595 GA4
// sessions came from local and preview hosts). The same pages, the same choices, the same lead — on the local origin.
test('off the production host, «Прийняти все» loads no tag and hands gtag no config and no event — page, contact or lead', async ({ page, context }, testInfo) => {
  const local = localOrigin(testInfo);
  const outbound = await stubGoogle(context, local);
  await stubTurnstile(page);
  await page.route('**/api/leads', (route) => route.fulfill({ json: { ok: true, id: 43, isNew: true } }));
  await page.goto(`${local}/`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Прийняти все', exact: true }).click();
  // the choice itself is kept and applied: Consent Mode hears it, the tag does not load
  await expect.poll(() => page.evaluate(() => window.dataLayer.map((entry) => Array.from(entry as ArrayLike<unknown>).slice(0, 2))))
    .toContainEqual(['consent', 'update']);

  const toggle = page.locator('#inquiry .conversation-form-toggle');
  if (await toggle.isVisible()) await toggle.click();
  const form = page.locator('form.inquiry-form');
  await form.getByLabel(/Ваше ім’я/).fill('Тест хоста');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Напрям робіт/).selectOption({ index: 1 });
  await form.getByLabel(/Погоджуюся на обробку/).check();
  await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(page.locator('.inquiry-status')).toContainText('Дякуємо');
  // a contact control: the click is not counted either (the link itself is not followed)
  await page.locator('a[href^="tel:"]').first().evaluate((link) => link.addEventListener('click', (event) => event.preventDefault()));
  await page.locator('a[href^="tel:"]').first().dispatchEvent('click');
  const notConsent = () => page.evaluate(() => window.dataLayer
    .map((entry) => Array.from(entry as ArrayLike<unknown>).slice(0, 2))
    .filter(([command]) => command !== 'consent'));
  expect(await notConsent(), 'HOME: only consent commands — no js, config, inquiry_contact_attempt, generate_lead, contact_click').toEqual([]);

  // the stored choice on the next document: still no tag and nothing but consent
  await page.goto(`${local}/angary`, { waitUntil: 'networkidle' });
  await expect(page.locator(GA_SCRIPT_SELECTOR)).toHaveCount(0);
  expect(await notConsent(), '/angary: only consent commands').toEqual([]);
  expect(outbound.gtagLoads()).toBe(0);
  expect(outbound.requests).toEqual([]);
});
