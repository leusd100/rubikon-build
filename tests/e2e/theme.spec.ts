import { expect, test, type Page } from '@playwright/test';

// Site-wide Light / Dark (app/lib/theme.ts, app/theme.css). The head script resolves the theme before the first
// paint; these tests drive it through the real control and the emulated OS colour scheme.

const KEY = 'rubikon-theme';
const LIGHT_BG = 'rgb(243, 240, 233)';
const DARK_BG = 'rgb(23, 25, 24)';

async function open(page: Page, path = '/pro-nas') {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
  await page.goto(path, { waitUntil: 'load' });
}

async function state(page: Page) {
  return page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    preference: document.documentElement.dataset.themePreference,
    background: getComputedStyle(document.body).backgroundColor,
    scheme: getComputedStyle(document.documentElement).colorScheme,
  }));
}

async function expectTheme(page: Page, theme: 'light' | 'dark', preference: 'system' | 'light' | 'dark') {
  await expect.poll(() => state(page)).toEqual({
    theme,
    preference,
    background: theme === 'dark' ? DARK_BG : LIGHT_BG,
    scheme: theme,
  });
}

/** Chooses an option through the visible control: the header panel on desktop, the menu on a phone. */
async function choose(page: Page, label: 'Як у системі' | 'Світла' | 'Темна') {
  const trigger = page.locator('.theme-menu-trigger');
  if (await trigger.isVisible()) {
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
    await page.locator('.theme-menu-panel').getByLabel(label, { exact: true }).check();
  } else {
    const menu = page.locator('.mobile-menu');
    if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) await menu.locator('summary').click();
    await menu.locator('.theme-options').getByLabel(label, { exact: true }).check();
  }
}

test.describe('site-wide theme', () => {
  test('1 · default + OS Light → Light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await expectTheme(page, 'light', 'system');
  });

  test('2 · default + OS Dark → Dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    await expectTheme(page, 'dark', 'system');
  });

  test('3 · explicit Light overrides OS Dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    await choose(page, 'Світла');
    await expectTheme(page, 'light', 'light');
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe('light');
  });

  test('4 · explicit Dark overrides OS Light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await choose(page, 'Темна');
    await expectTheme(page, 'dark', 'dark');
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe('dark');
  });

  test('5 · System follows the OS live, without a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await expectTheme(page, 'light', 'system');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expectTheme(page, 'dark', 'system');
    await page.emulateMedia({ colorScheme: 'light' });
    await expectTheme(page, 'light', 'system');
  });

  test('6 · an explicit choice ignores OS changes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await choose(page, 'Темна');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.emulateMedia({ colorScheme: 'light' });
    await expectTheme(page, 'dark', 'dark');
  });

  test('7 · the choice survives a reload, applied before the first paint', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await choose(page, 'Темна');
    // The first frame must already be dark: read the state from an init script that runs before hydration.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        (window as unknown as { __firstFrame: string }).__firstFrame = `${document.documentElement.dataset.theme}|${getComputedStyle(document.body).backgroundColor}`;
      }, { once: true });
    });
    await page.reload({ waitUntil: 'load' });
    expect(await page.evaluate(() => (window as unknown as { __firstFrame: string }).__firstFrame)).toBe(`dark|${DARK_BG}`);
    await expectTheme(page, 'dark', 'dark');
  });

  test('8 · returning to System restores OS behaviour and clears the stored choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    await choose(page, 'Світла');
    await expectTheme(page, 'light', 'light');
    await choose(page, 'Як у системі');
    await expectTheme(page, 'dark', 'system');
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
    await page.emulateMedia({ colorScheme: 'light' });
    await expectTheme(page, 'light', 'system');
  });

  test('9 · no hydration or theme-init errors in either theme', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page, '/');
    await choose(page, 'Світла');
    await page.reload({ waitUntil: 'load' });
    await open(page, '/yak-pratsyuiemo');
    await expect.poll(() => state(page).then((current) => current.theme)).toBe('light');
    expect(errors.filter((text) => /hydrat|theme|mismatch/i.test(text))).toEqual([]);
  });

  test('the choice persists HOME → service page → back', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page, '/');
    await choose(page, 'Темна');
    // the card: since 05.10 the header's scheme sheet links there too, and it is not shown on a phone
    await page.locator('main a.direction-card[href="/metalokonstruktsii"]').click();
    await page.waitForURL('**/metalokonstruktsii');
    await expectTheme(page, 'dark', 'dark');
    await page.goBack({ waitUntil: 'load' });
    await expectTheme(page, 'dark', 'dark');
  });

  test('the control is keyboard operable and labelled', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop header control');
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    const trigger = page.locator('.theme-menu-trigger');
    await expect(trigger).toHaveAttribute('aria-label', 'Тема оформлення: як у системі');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight'); // radio group: System → Light
    await page.keyboard.press('ArrowRight'); // → Dark
    await expectTheme(page, 'dark', 'dark');
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-label', 'Тема оформлення: темна');
  });
});
