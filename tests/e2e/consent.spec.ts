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

// The banner is fixed over the page's bottom edge but not modal (sweep 03.10): it comes first in the tab order after the
// skip link, and no stop of the page's own tab order ends up under it (WCAG 2.4.11), the footer's last links included.
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`the open cookie banner is the second tab stop and covers no focused control at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'explicit viewports');
    await page.setViewportSize(viewport);
    // reduced motion: the site scrolls without smoothing, so every focus lands before it is measured
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/angary', { waitUntil: 'load' });
    const banner = page.locator('.cookie-banner');
    await expect(banner).toBeVisible({ timeout: 10_000 });

    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(banner.getByRole('link', { name: 'Докладніше про конфіденційність' })).toBeFocused();

    const covered: string[] = [];
    let stops = 0;
    for (let stop = 0; stop < 200; stop += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        const cookie = document.querySelector('.cookie-banner');
        if (!element || element === document.body || !cookie) return null;
        if (element.classList.contains('skip-link')) return { wrapped: true, name: '', share: 0 };
        if (cookie.contains(element)) return { wrapped: false, name: '', share: 0 };
        const rect = element.getBoundingClientRect();
        let hits = 0;
        let total = 0;
        for (let ix = 0; ix < 4; ix += 1) for (let iy = 0; iy < 3; iy += 1) {
          const x = rect.left + (rect.width * (ix + 0.5)) / 4;
          const y = rect.top + (rect.height * (iy + 0.5)) / 3;
          if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
          total += 1;
          if (cookie.contains(document.elementFromPoint(x, y))) hits += 1;
        }
        const name = (element.getAttribute('aria-label') || element.textContent || element.tagName).trim().slice(0, 40);
        return { wrapped: false, name, share: total ? hits / total : 0 };
      });
      if (!focus) break;
      if (focus.wrapped) break;
      stops += 1;
      if (focus.share > 0) covered.push(`${focus.name} ${Math.round(focus.share * 100)}%`);
    }
    expect(stops).toBeGreaterThan(40);
    expect(covered).toEqual([]);
  });
}

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
