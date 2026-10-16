import { expect, test, type Page } from '@playwright/test';
import { GTAG_STUB_VERSION, gtagCommands, stubGoogle } from './google.helpers';
import { stubTurnstile } from './turnstile.helpers';

// The application's analytics contract (Layer A, Wave 01, 16.10), with a versioned gtag stub and deny-all outbound:
// every command the site hands gtag is asserted exactly, and nothing may leave the browser. Nothing here depends on
// Google being reachable, or on what Google's tag samples (analytics-consent.spec.ts keeps the live tag's contract: one
// load in about fifty sends a diagnostic /td or /a image our CSP blocks, which is what failed Nightly 38867707280).

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

test.beforeEach(async ({ page }) => {
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
  });
}

// No route-change page_view case: the site has no next/link or router navigation, so every link is a full document load
// and the route-change branch of AnalyticsConsent.tsx never fires; the second half above pins one config per document

test('an accepted lead reaches gtag\'s queue once, as generate_lead with its method and direction', async ({ page, context, baseURL }) => {
  const outbound = await stubGoogle(context, new URL(baseURL!).origin);
  await stubTurnstile(page);
  // mocked: no real lead is ever created
  await page.route('**/api/leads', (route) => route.fulfill({ json: { ok: true, id: 42, isNew: false } }));
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
  expect(lead.args[2]).toEqual({ contact_method: expect.any(String), project_direction: expect.any(String) });
  expect(outbound.requests).toEqual([]);
});
