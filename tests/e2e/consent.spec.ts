import { expect, test, type Page } from '@playwright/test';

const CONSENT_KEY = 'rubikon-consent-state';
const LEGACY_KEY = 'rubikon-analytics-consent';
const GA_SCRIPT_SELECTOR = 'script[data-rubikon-analytics="G-WYRXJV71WG"]';

function readStoredConsent(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { analytics: string; advertising: string }) : null;
  }, CONSENT_KEY);
}

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
});

test.describe('cookie consent banner', () => {
  test('"Лише необхідні" denies both categories and never loads GA4', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();

    await expect(page.locator('.cookie-banner')).toHaveCount(0);
    expect(await readStoredConsent(page)).toEqual({ analytics: 'denied', advertising: 'denied' });
    await expect(page.locator(GA_SCRIPT_SELECTOR)).toHaveCount(0);
  });

  test('"Прийняти все" grants both categories and loads the GA4 script', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    await page.getByRole('button', { name: 'Прийняти все', exact: true }).click();

    expect(await readStoredConsent(page)).toEqual({ analytics: 'granted', advertising: 'granted' });
    await expect(page.locator(GA_SCRIPT_SELECTOR)).toHaveCount(1);
  });

  test('"Налаштувати" allows granting Advertising alone without granting Analytics', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    await page.getByRole('button', { name: 'Налаштувати', exact: true }).click();
    await page.locator('.cookie-toggle-group', { hasText: 'Реклама' }).getByText('Дозволено', { exact: true }).click();
    await page.getByRole('button', { name: 'Зберегти вибір', exact: true }).click();

    expect(await readStoredConsent(page)).toEqual({ analytics: 'denied', advertising: 'granted' });
    // Advanced Consent Mode is deferred — granting Advertising alone must not load gtag.js,
    // since only the Analytics category ever triggers loadAnalytics().
    await expect(page.locator(GA_SCRIPT_SELECTOR)).toHaveCount(0);
  });

  test('the choice persists across a reload and the banner does not reappear', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Прийняти все', exact: true }).click();

    await page.reload({ waitUntil: 'load' });

    // `.cookie-banner` is absent both before hydration runs and after it correctly decides to
    // stay hidden — so waiting on the banner alone can pass vacuously before the mount effect
    // has even read localStorage. Poll for the settled state first; only once that's confirmed
    // does "banner still absent" actually mean what the test name says.
    await expect.poll(() => readStoredConsent(page)).toEqual({ analytics: 'granted', advertising: 'granted' });
    await expect(page.locator('.cookie-banner')).toHaveCount(0);
  });

  test('a legacy single-flag choice migrates to analytics-only, never advertising', async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [LEGACY_KEY, 'granted'],
    );

    await page.goto('/', { waitUntil: 'load' });

    // Same reasoning as above: confirm migration actually ran before trusting "banner absent".
    await expect.poll(() => readStoredConsent(page)).toEqual({ analytics: 'granted', advertising: 'denied' });
    await expect(page.locator('.cookie-banner')).toHaveCount(0);
  });

  test('reopening via "Налаштування cookie" goes straight to the two toggles, pre-filled', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Прийняти все', exact: true }).click();

    await page.getByRole('button', { name: 'Налаштування cookie', exact: true }).click();

    await expect(page.locator('.cookie-toggle-group', { hasText: 'Аналітика' })).toBeVisible();
    await expect(
      page.locator('.cookie-toggle-group', { hasText: 'Аналітика' }).getByRole('radio', { name: 'Дозволено' }),
    ).toBeChecked();
    await expect(
      page.locator('.cookie-toggle-group', { hasText: 'Реклама' }).getByRole('radio', { name: 'Дозволено' }),
    ).toBeChecked();
  });
});

test('advertising identifiers require consent and revocation reaches an already-open tab', async ({ page, context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await page.goto('/?gclid=consent-regression-only');
  const storedIds = (target: Page) => target.evaluate(() => {
    const raw = sessionStorage.getItem('rubikon-attribution');
    return raw ? JSON.parse(raw).clickIds.gclid : null;
  });
  await expect.poll(() => storedIds(page)).toBe('');
  await page.getByRole('button', { name: 'Прийняти все', exact: true }).click();
  await expect.poll(() => storedIds(page)).toBe('consent-regression-only');
  const other = await context.newPage();
  await other.goto('/?gclid=second-tab-regression-only');
  await expect.poll(() => storedIds(other)).toBe('second-tab-regression-only');
  await page.getByRole('button', { name: 'Налаштування cookie', exact: true }).click();
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  await expect.poll(() => storedIds(other)).toBe('');
  await expect.poll(() => other.evaluate(() => window.dataLayer
    .filter((entry) => entry[0] === 'consent' && entry[1] === 'update').at(-1)?.[2],
  )).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied' });
  const contacts = () => other.evaluate(() => window.dataLayer.filter(
    (entry) => entry[0] === 'event' && entry[1] === 'contact_click',
  ).length);
  const before = await contacts();
  await other.locator('a[href^="tel:"]').first().evaluate((element) => {
    element.addEventListener('click', (event) => event.preventDefault(), { once: true });
    (element as HTMLElement).click();
  });
  expect(await contacts()).toBe(before);
  await other.close();
});
