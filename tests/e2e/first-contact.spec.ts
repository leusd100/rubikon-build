import { expect, test, type Page } from '@playwright/test';
import { company } from '../../app/data/company';

// Sprint 1 · first contact: one-tap call in the phone header, the number in the phone menu, a quiet «Зателефонувати»
// under every inner hero, no «engineer» role in the copy, a compact cookie banner whose two choices stay equal, and
// every phone tap counted exactly once as `contact_click` / `phone`.

const TEL = `tel:${company.phone.international}`;
const KEY_PAGES = ['/', '/napryamky', '/angary', '/zernoskhovyshcha', '/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/pro-nas', '/yak-pratsyuiemo'];
const INNER_PAGES = KEY_PAGES.filter((path) => path !== '/');

async function answerCookies(page: Page, state: 'granted' | 'denied') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: value, advertising: value }));
  }, state);
}

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of KEY_PAGES) {
    test(`${path}: one-tap call in the header`, async ({ page }) => {
      await answerCookies(page, 'denied');
      await page.goto(path, { waitUntil: 'load' });
      const call = page.locator('header.site-header .mobile-call');
      await expect(call).toBeVisible();
      await expect(call).toHaveAttribute('href', TEL);
      await expect(call).toHaveAccessibleName(`Зателефонувати, ${company.phone.display}`);
      const box = await call.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(42);
      expect(box?.height).toBeGreaterThanOrEqual(42);
      await expect(page.locator('body')).not.toContainText(/з інженером|інженер RUBIKON/i);
    });
  }

  // HOME Slice 01 (Stage 1 hypothesis, not a measured preference): on the homepage the call is the
  // primary action, with the number on it; writing or leaving a request is second. HOME v2 dropped the third
  // «Дивитися напрямки» link — the directions start right under the hero.
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }]) {
    test(`/: the call is the primary hero action, on the first screen at ${viewport.width} px`, async ({ page }) => {
      await answerCookies(page, 'denied');
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'load' });
      const actions = page.locator('.hero .hero-actions > a');
      await expect(actions).toHaveCount(2);
      const [call, write] = [actions.nth(0), actions.nth(1)];
      await expect(call).toHaveClass(/\bbutton-primary\b/);
      await expect(call).toHaveAttribute('href', TEL);
      await expect(call).toHaveAccessibleName(`Зателефонувати, ${company.phone.display}`);
      await expect(call).toContainText(company.phone.display);
      await expect(write).toHaveAttribute('href', '#inquiry');
      await expect(write).toContainText('Написати або залишити запит');
      // Nobody is routed through the /angary brief before they can talk to the company.
      await expect(page.locator('.hero a[href^="/angary"]')).toHaveCount(0);

      const callBox = await call.boundingBox();
      expect(callBox!.height).toBeGreaterThanOrEqual(44);
      expect(callBox!.y + callBox!.height, 'the whole call button is on the first screen').toBeLessThanOrEqual(viewport.height);
    });
  }

  // On a first visit the compact cookie banner also sits at the bottom. From 390×844 the call stays
  // above it; at 360×800 the banner (27% of the screen) still covers it until answered — a known
  // limit of this slice, since clearing it would mean shortening the hero copy or the banner.
  test('/: on a first visit at 390 × 844 the call is clear of the cookie banner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const call = page.locator('.hero .hero-actions > a').first();
    const banner = page.locator('.cookie-banner');
    await expect(banner).toBeVisible();
    const [callBox, bannerBox] = await Promise.all([call.boundingBox(), banner.boundingBox()]);
    expect(callBox!.y + callBox!.height).toBeLessThanOrEqual(bannerBox!.y);
  });

  // UX pass 2026-10: on a phone the call leads every inner hero too — the same copper button with the number as HOME.
  // The page's own action (configurator, planner, «Обговорити задачу», «Обрати напрям») follows under it, and the quiet
  // call link that sits beside the primary action on wider screens is not repeated.
  for (const path of INNER_PAGES) {
    test(`${path}: the call leads the hero on a phone`, async ({ page }) => {
      await answerCookies(page, 'denied');
      await page.goto(path, { waitUntil: 'load' });
      const hero = page.locator('main section').first();
      const call = hero.locator('a.hero-call-phone');
      await expect(call).toBeVisible();
      await expect(call).toHaveAttribute('href', TEL);
      await expect(call).toHaveClass(/\bbutton-primary\b/);
      await expect(call).toHaveAccessibleName(`Зателефонувати, ${company.phone.display}`);
      await expect(call).toContainText(company.phone.display);
      await expect(hero.locator('a.hero-call')).toBeHidden();
      const next = hero.locator('a.button:not(.hero-call-phone)').first();
      await expect(next).toBeVisible();
      const [callBox, nextBox] = await Promise.all([call.boundingBox(), next.boundingBox()]);
      expect(nextBox!.y).toBeGreaterThan(callBox!.y);
      expect(callBox!.height).toBeGreaterThanOrEqual(44);
      expect(callBox!.y + callBox!.height, 'the call is on the first screen').toBeLessThanOrEqual(844);
    });
  }

  // UX pass 2026-10: the closing block on a phone is call → channels → «Залишити запит»; the form opens on request, or
  // by itself for a visitor who clearly came to write (HOME «Написати або залишити запит»).
  test('the closing form folds behind «Залишити запит» and opens on request', async ({ page }) => {
    await answerCookies(page, 'denied');
    await page.goto('/metalokonstruktsii', { waitUntil: 'load' });
    const toggle = page.locator('#inquiry .conversation-form-toggle');
    const form = page.locator('#inquiry form.inquiry-form');
    await expect(page.locator('#inquiry .conversation-call')).toBeVisible();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(form).toBeHidden();
    await toggle.click();
    await expect(form).toBeVisible();
    await expect(toggle).toHaveCount(0);
    await expect(form.getByLabel(/Ваше ім’я/)).toBeFocused();
  });

  test('HOME «Написати або залишити запит» opens the folded form', async ({ page }) => {
    await answerCookies(page, 'denied');
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('#inquiry form.inquiry-form')).toBeHidden();
    await page.locator('.hero .hero-actions a[href="#inquiry"]').click();
    await expect(page.locator('#inquiry form.inquiry-form')).toBeVisible();
    await expect(page.locator('#inquiry select[name="direction"]')).toHaveValue('Ще не визначено');
  });

  test('the menu shows the number as a call link', async ({ page }) => {
    await answerCookies(page, 'denied');
    await page.goto('/', { waitUntil: 'load' });
    await page.locator('.mobile-menu summary').click();
    const phone = page.locator('.mobile-menu nav a.mobile-phone');
    await expect(phone).toBeVisible();
    await expect(phone).toHaveAttribute('href', TEL);
    await expect(phone).toContainText(company.phone.display);
  });

  test('the first-visit cookie banner is compact and keeps both choices equal', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const banner = page.locator('.cookie-banner');
    await expect(banner).toBeVisible();
    const bannerBox = await banner.boundingBox();
    expect(bannerBox!.height / 844).toBeLessThanOrEqual(0.26);
    const accept = banner.getByRole('button', { name: 'Прийняти все', exact: true });
    const necessary = banner.getByRole('button', { name: 'Лише необхідні', exact: true });
    const [acceptBox, necessaryBox] = await Promise.all([accept.boundingBox(), necessary.boundingBox()]);
    expect(Math.abs(acceptBox!.width - necessaryBox!.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(acceptBox!.height - necessaryBox!.height)).toBeLessThanOrEqual(1);
    expect(acceptBox!.height).toBeGreaterThanOrEqual(44);
    await expect(banner.getByRole('button', { name: 'Налаштувати', exact: true })).toBeVisible();
    await expect(banner.getByRole('link', { name: 'Докладніше про конфіденційність' })).toBeVisible();
  });

  test('each phone tap is one contact_click with method phone', async ({ page }) => {
    await page.route('**/googletagmanager.com/**', (route) => route.abort());
    await answerCookies(page, 'granted');
    // Keep the test page in place: the tracking listener still sees the click.
    await page.addInitScript(() => {
      document.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('a[href^="tel:"]')) event.preventDefault();
      }, true);
    });
    await page.goto('/metalokonstruktsii', { waitUntil: 'load' });
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.rubikonAnalyticsConfigured ?? '')).not.toBe('');
    const contactClicks = () => page.evaluate(() => (window.dataLayer ?? [])
      .map((entry) => Array.from(entry as ArrayLike<unknown>))
      .filter((entry) => entry[0] === 'event' && entry[1] === 'contact_click')
      .map((entry) => (entry[2] as { contact_method?: string }).contact_method));

    await page.locator('header.site-header .mobile-call').click();
    await expect.poll(contactClicks).toEqual(['phone']);
    await page.locator('main section').first().locator('a.hero-call-phone').click();
    await expect.poll(contactClicks).toEqual(['phone', 'phone']);
  });
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('header keeps the full phone and hides the phone-only call button', async ({ page }) => {
    await answerCookies(page, 'denied');
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('header.site-header .header-phone')).toBeVisible();
    await expect(page.locator('header.site-header .mobile-call')).toBeHidden();
    // UX pass 2026-10: the number is the header's most readable line, not 11 px under a 9 px label
    const size = await page.locator('header.site-header .header-phone strong').evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
    await expect(page.locator('header.site-header .header-phone small')).toHaveCount(0);
  });

  test('the closing form is open on a desktop, with no fold button', async ({ page }) => {
    await answerCookies(page, 'denied');
    await page.goto('/metalokonstruktsii', { waitUntil: 'load' });
    await expect(page.locator('#inquiry form.inquiry-form')).toBeVisible();
    await expect(page.locator('#inquiry .conversation-form-toggle')).toBeHidden();
  });
});
