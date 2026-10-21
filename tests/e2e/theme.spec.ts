import { expect, test, type Page } from '@playwright/test';

// Site-wide Light / Dark (app/lib/theme.ts, app/theme.css). The head script resolves the theme before the first
// paint; these tests drive it through the real control and the emulated OS colour scheme.

const KEY = 'rubikon-theme';
const LIGHT_BG = 'rgb(243, 240, 233)';
const DARK_BG = 'rgb(23, 25, 24)';
/** HOME → /metalokonstruktsii by the way shown at this width: the mosaic's card from 761 px; on a phone the index row picks
 *  the direction and its sheet links there (B «Один аркуш + індекс», owner 21.10) — the pick is repeated until hydration */
async function openMetalDirection(page: Page) {
  // A theme picked in the phone menu leaves the menu open; the page under it is dimmed and a tap there only closes the
  // menu (W2-14), so close it first, as a visitor would
  if (await page.locator('.site-header .mobile-menu[open]').count()) {
    await page.keyboard.press('Escape');
    await expect(page.locator('.site-header .mobile-menu')).not.toHaveAttribute('open');
  }
  const pick = page.locator('#directions .dxi-row', { hasText: 'Металоконструкції' });
  if (await pick.isVisible()) {
    const sheet = page.locator('#directions a.dxi-sheet');
    await expect(async () => {
      await pick.click();
      await expect(sheet).toHaveAttribute('href', '/metalokonstruktsii', { timeout: 1_000 });
    }).toPass();
    await sheet.click();
  } else {
    await page.locator('#directions a.direction-card[href="/metalokonstruktsii"]').click();
  }
}

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

/**
 * Chooses an option through the visible control. Desktop (owner 06.10): the header's own light|dark switch — one click
 * flips the shown theme; System is the default until then and is chosen in the phone menu only. Phone: the menu's three.
 */
async function choose(page: Page, label: 'Як у системі' | 'Світла' | 'Темна') {
  const toggle = page.locator('.theme-switch');
  if (await toggle.isVisible()) {
    if (label === 'Як у системі') throw new Error('the desktop switch has no System option: System is the default');
    // The head script already resolved the OS theme; the switch's SSR light snapshot catches up after hydration.
    const dark = (await state(page)).theme === 'dark';
    await expect(toggle).toHaveAttribute('aria-checked', String(dark));
    if (dark !== (label === 'Темна')) await toggle.click();
  } else {
    const menu = page.locator('.mobile-menu');
    if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) await menu.locator('summary').click();
    await menu.locator('.theme-options').getByLabel(label, { exact: true }).check();
  }
}

/**
 * Goes back and waits for that page's own document to load. goBack() alone settles on the first navigation event, and a
 * same-document history write counts as one: vinext writes its router state in place (history.replaceState) on the
 * first hydrated commit, which on a slow runner lands after `load` — so goBack() returned on the page being left while
 * the way back was still in flight (Main Regression, 12.10).
 */
async function goBackTo(page: Page, pathname: string) {
  await page.goBack();
  await page.waitForURL((url) => url.pathname === pathname, { waitUntil: 'load' });
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

  test('8 · returning to System restores OS behaviour and clears the stored choice', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'System is chosen in the phone menu; the desktop switch has only light and dark');
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
    // the direction's one shown way: the card from 761 px (since 05.10 the header's scheme sheet links there too, out of
    // the tab order), the index and its sheet on a phone (the cards are not shown there)
    await openMetalDirection(page);
    await page.waitForURL('**/metalokonstruktsii');
    await expectTheme(page, 'dark', 'dark');
    await goBackTo(page, '/');
    await expectTheme(page, 'dark', 'dark');
  });

  test('going back waits for HOME itself, not for a history write on the page it leaves', async ({ page }) => {
    await open(page, '/');
    await openMetalDirection(page);
    await page.waitForURL('**/metalokonstruktsii');
    // The CI order of 12.10, made certain: the service page writes its history entry in place once the way back has
    // begun — as vinext's first hydrated commit does (history.replaceState) when it lands after `load` on a slow runner
    await page.evaluate(() => addEventListener('beforeunload', () => history.replaceState(history.state, ''), { once: true }));
    await goBackTo(page, '/');
    expect(new URL(page.url()).pathname).toBe('/');
    expect(await page.evaluate(() => location.pathname)).toBe('/');
  });

  test('the control is keyboard operable and labelled', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop header control');
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    // A switch of its own beside the contacts (owner 06.10): «Темна тема», on or off
    const toggle = page.getByRole('switch', { name: 'Темна тема' });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('.header-contacts .theme-switch')).toHaveCount(0);
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expectTheme(page, 'dark', 'dark');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Space');
    await expectTheme(page, 'light', 'light');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
});
