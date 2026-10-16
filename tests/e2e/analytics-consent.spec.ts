import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { stubTurnstile } from './turnstile.helpers';

// GA4 is "analytics only": gtag.js loads after Analytics consent and must measure through the core
// *.google-analytics.com endpoint in every consent state — never Google signals / advertising endpoints.
//
// No test here creates real analytics data: every Google request except the gtag.js script itself is answered
// locally with 204 before it leaves the browser. The endpoint tests do load the real gtag.js (its endpoint choice
// is exactly what is under test) and skip, rather than fail, when it cannot be fetched.

const GA_SCRIPT_SELECTOR = 'script[data-rubikon-analytics="G-WYRXJV71WG"]';
const CORE_GA_HOST = /(^|\.)google-analytics\.com$/;
const ADVERTISING = /doubleclick\.net|ga-audiences|googlesyndication|googleadservices|\/pagead\//;

// Nothing in this file may reach the network from the browser itself. Playwright's routes miss what a page sends while it
// unloads: gtag's keepalive /g/collect on pagehide (scroll, user_engagement) went out past them on / → /angary (16.10,
// reproduced against a dead-end sink). So DNS is closed to every host but the app's; the real gtag.js still arrives
// through route.fetch, which Playwright makes outside the browser
test.use({ launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1 , EXCLUDE localhost'] } });

type GoogleRequest = { host: string; path: string; type: string; events: string[] };

async function recordGoogle(context: BrowserContext) {
  const requests: GoogleRequest[] = [];
  // The real gtag.js from Google: not asked for, on its way, loaded, or failed — and why
  let gtag: { state: 'none' | 'fetching' | 'loaded' | 'failed'; why?: string } = { state: 'none' };
  await context.route(/google|doubleclick|googlesyndication|googleadservices/, async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.googletagmanager.com' && url.pathname.startsWith('/gtag/js')) {
      gtag = { state: 'fetching' };
      try {
        const response = await route.fetch();
        gtag = response.ok() ? { state: 'loaded' } : { state: 'failed', why: `HTTP ${response.status()}` };
        return route.fulfill({ response });
      } catch (error) {
        gtag = { state: 'failed', why: String(error).split('\n')[0] };
        return route.abort();
      }
    }
    requests.push({ host: url.hostname, path: url.pathname, type: route.request().resourceType(),
      events: [url.searchParams.get('en'), ...(route.request().postData() ?? '').split(/\r?\n/)
        .map(line => new URLSearchParams(line).get('en'))].filter((event): event is string => event !== null) });
    return route.fulfill({ status: 204, body: '' });
  });
  return { requests, gtag: () => gtag };
}

/** Until the real gtag.js has come from Google or failed to: networkidle can come before a choice asks for the script,
 *  and a skip read then said «could not be fetched» while the fetch was still on its way (16.10: the skips on Main
 *  Regression and its branch runs were this race). Then, if it failed, the skip says why */
async function skipUnlessGtagLoaded(google: Awaited<ReturnType<typeof recordGoogle>>) {
  await expect.poll(() => google.gtag().state, { timeout: 15_000 }).toMatch(/^(loaded|failed)$/);
  test.skip(google.gtag().state !== 'loaded', `gtag.js could not be fetched from Google in this environment: ${google.gtag().why}`);
}

async function watchCsp(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      if (event.disposition !== 'enforce') return;
      (window as unknown as { __cspViolations: string[] }).__cspViolations.push(`${event.effectiveDirective} ${event.blockedURI}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations);
}

async function chooseAnalyticsOnly(page: Page) {
  await page.getByRole('button', { name: 'Налаштувати', exact: true }).click();
  await page.locator('.cookie-toggle-group', { hasText: 'Аналітика' }).getByText('Дозволено', { exact: true }).click();
  await page.getByRole('button', { name: 'Зберегти вибір', exact: true }).click();
}

const configCall = (page: Page) => page.evaluate(() => {
  const entry = (window.dataLayer ?? []).map((item) => Array.from(item as ArrayLike<unknown>)).find((item) => item[0] === 'config');
  return entry ? (entry[2] as Record<string, unknown>) : null;
});

test.describe('GA4 consent gating', () => {
  test('before any choice, Google Analytics is not loaded and nothing is sent to Google', async ({ page, context }) => {
    const google = await recordGoogle(context);
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.getByRole('button', { name: 'Лише необхідні', exact: true })).toBeVisible();
    // Quiet network (no request for 500 ms) — anything consent could have triggered has had its chance.
    await page.waitForLoadState('networkidle');

    await expect(page.locator(GA_SCRIPT_SELECTOR)).toHaveCount(0);
    expect(google.requests).toEqual([]);
    expect(google.gtag().state, 'gtag.js never asked for').toBe('none');
  });

  test('«Лише необхідні» loads no Google script and sends no Google request', async ({ page, context }) => {
    const google = await recordGoogle(context);
    await page.goto('/', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
    await page.goto('/angary', { waitUntil: 'networkidle' });

    await expect(page.locator(GA_SCRIPT_SELECTOR)).toHaveCount(0);
    expect(google.requests).toEqual([]);
    expect(google.gtag().state, 'gtag.js never asked for').toBe('none');
  });

  test('the GA4 config turns off Google signals and ad-personalization signals', async ({ page, context }) => {
    await recordGoogle(context);
    await page.goto('/', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Прийняти все', exact: true }).click();

    await expect.poll(() => configCall(page)).toMatchObject({
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  });
});

test.describe('GA4 endpoints (real gtag.js, collection answered locally)', () => {
  for (const [label, choose] of [
    ['analytics-only consent', chooseAnalyticsOnly],
    ['«Прийняти все»', (page: Page) => page.getByRole('button', { name: 'Прийняти все', exact: true }).click()],
  ] as const) {
    test(`${label} measures through the core GA endpoint only — no signals or advertising requests, no CSP violations`, async ({ page, context }) => {
      const google = await recordGoogle(context);
      const violations = await watchCsp(page);
      await page.goto('/', { waitUntil: 'load' });
      await choose(page);
      await expect(page.locator(GA_SCRIPT_SELECTOR)).toHaveCount(1);
      await page.waitForLoadState('networkidle');
      await skipUnlessGtagLoaded(google);

      await expect.poll(() => google.requests.filter((request) => request.path === '/g/collect').length, { timeout: 10_000 }).toBeGreaterThan(0);
      await page.goto('/angary', { waitUntil: 'networkidle' });

      const collect = google.requests.filter((request) => request.path === '/g/collect');
      expect(collect.every((request) => CORE_GA_HOST.test(request.host)), JSON.stringify(collect)).toBe(true);
      expect(google.requests.filter((request) => ADVERTISING.test(`${request.host}${request.path}`)), 'advertising / signals requests').toEqual([]);
      expect(google.requests.filter((request) => !CORE_GA_HOST.test(request.host)), 'Google requests outside *.google-analytics.com').toEqual([]);
      expect((await violations()).filter((violation) => /google|doubleclick/.test(violation))).toEqual([]);
    });
  }
});


test('an accepted lead queue command reaches real gtag, with collection intercepted', async ({ page, context }) => {
  const google = await recordGoogle(context);
  await stubTurnstile(page);
  await page.route('**/api/leads', route => route.fulfill({ json: { ok: true, id: 42, isNew: false } }));
  await page.goto('/', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Прийняти все', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await skipUnlessGtagLoaded(google);
  // Phones fold the closing form behind «Залишити запит» (ConversationFormToggle)
  const toggle = page.locator('#inquiry .conversation-form-toggle');
  if (await toggle.isVisible()) await toggle.click();
  const form = page.locator('form.inquiry-form');
  await form.getByLabel(/Ваше ім’я/).fill('Тест черги');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Напрям робіт/).selectOption({ index: 1 });
  await form.getByLabel(/Погоджуюся на обробку/).check();
  await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(page.locator('.inquiry-status')).toContainText('Дякуємо');
  await expect.poll(() => google.requests.flatMap(request => request.events).filter(event => event === 'generate_lead').length,
    { timeout: 10_000 }).toBe(1);
});
