import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// GA4 is "analytics only": gtag.js loads after Analytics consent and must measure through the core
// *.google-analytics.com endpoint in every consent state — never Google signals / advertising endpoints.
//
// No test here creates real analytics data: every Google request except the gtag.js script itself is answered
// locally with 204 before it leaves the browser. The endpoint tests do load the real gtag.js (its endpoint choice
// is exactly what is under test) and skip, rather than fail, when it cannot be fetched.

const GA_SCRIPT_SELECTOR = 'script[data-rubikon-analytics="G-WYRXJV71WG"]';
const CORE_GA_HOST = /(^|\.)google-analytics\.com$/;
const ADVERTISING = /doubleclick\.net|ga-audiences|googlesyndication|googleadservices|\/pagead\//;

type GoogleRequest = { host: string; path: string; type: string };

async function recordGoogle(context: BrowserContext) {
  const requests: GoogleRequest[] = [];
  let gtagLoaded = false;
  await context.route(/google|doubleclick|googlesyndication|googleadservices/, async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.googletagmanager.com' && url.pathname.startsWith('/gtag/js')) {
      try {
        const response = await route.fetch();
        gtagLoaded = response.ok();
        return route.fulfill({ response });
      } catch {
        return route.abort();
      }
    }
    requests.push({ host: url.hostname, path: url.pathname, type: route.request().resourceType() });
    return route.fulfill({ status: 204, body: '' });
  });
  return { requests, gtagLoaded: () => gtagLoaded };
}

async function watchCsp(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
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
    expect(google.gtagLoaded()).toBe(false);
  });

  test('«Лише необхідні» loads no Google script and sends no Google request', async ({ page, context }) => {
    const google = await recordGoogle(context);
    await page.goto('/', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
    await page.goto('/angary', { waitUntil: 'networkidle' });

    await expect(page.locator(GA_SCRIPT_SELECTOR)).toHaveCount(0);
    expect(google.requests).toEqual([]);
    expect(google.gtagLoaded()).toBe(false);
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
      test.skip(!google.gtagLoaded(), 'gtag.js could not be fetched from Google in this environment');

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
