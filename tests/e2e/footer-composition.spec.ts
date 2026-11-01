import { expect, test, type Page } from '@playwright/test';
import { company } from '../../app/data/company';

// W2-13 · the footer (PDO-46, PDO-38; owner 21.10: OD-PX-30 a, tablets as they were). Desktop: the logo over the company's
// approved description, the legal level on a line of its own under the rest. Tablets (761–1180 px): the composition they
// had — the logo alone — with the legal line moved under the rest. Phones: the description too, link groups that wrap
// instead of widening the page, 40 px links. Every test denies the optional cookies and answers Google with an empty 200.
// Owner 01.11: on a desktop the columns share the width (they used to stand against the right edge), and the word RUBIKON
// pressed into the band stands between them and the legal line at every width.

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, width: number, height = 900, path = '/angary') {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

/** The footer's parts: their boxes, the description's lines and where the legal controls are */
const footer = (page: Page) => page.locator('footer').evaluate((root) => {
  const box = (selector: string) => {
    const element = root.querySelector(selector);
    if (!element || !element.getClientRects().length) return null;
    const r = element.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
  };
  const about = root.querySelector<HTMLElement>('.footer-about');
  const lines = about && about.getClientRects().length ? Math.round(about.getBoundingClientRect().height / parseFloat(getComputedStyle(about).lineHeight)) : 0;
  return {
    logo: box('.footer-brand .brand-link'), about: box('.footer-about'), aboutText: about?.textContent ?? null, aboutLines: lines,
    nav: box('.footer-nav'), directions: box('.footer-directions'), contacts: box('.footer-contact-stack'), bottom: box('.footer-bottom'),
    signature: box('.footer-signature'), signatureHidden: root.querySelector('.footer-signature')?.getAttribute('aria-hidden') ?? null,
    bottomText: [...root.querySelectorAll('.footer-bottom > span, .footer-bottom a, .footer-bottom button')].map((part) => part.textContent?.trim()).join(' '),
    legalInContacts: root.querySelectorAll('.footer-contact-stack .footer-legal, .footer-contact-stack a[href="/polityka-konfidentsiinosti"]').length,
  };
});

test.describe('W2-13 · desktop and tablet footer', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit wide viewports');

  test('desktop: the logo over the company description, the legal level on its own line under the rest', async ({ page }) => {
    for (const width of [1440, 1920, 1280]) {
      await open(page, width);
      const parts = await footer(page);
      expect(parts.aboutText, `${width}: the approved description, word for word`).toBe(company.description);
      expect(parts.about!.top, `${width}: under the logo`).toBeGreaterThan(parts.logo!.bottom);
      expect(parts.aboutLines, `${width}: at most four lines`).toBeLessThanOrEqual(4);
      expect(parts.about!.right, `${width}: clear of the link groups`).toBeLessThanOrEqual(parts.nav!.left);
      // the legal line: © and both legal controls, under every column, the whole width of the footer
      expect(parts.legalInContacts, `${width}`).toBe(0);
      expect(parts.bottomText, `${width}`).toBe(`© ${new Date().getFullYear()} ${company.name} Політика конфіденційності Налаштування cookie`);
      for (const column of [parts.logo, parts.about, parts.nav, parts.directions, parts.contacts]) expect(parts.signature!.top, `${width}`).toBeGreaterThanOrEqual(column!.bottom);
      expect(parts.bottom!.top, `${width}: the word above the legal line`).toBeGreaterThanOrEqual(parts.signature!.bottom);
      expect(Math.round(parts.bottom!.left), `${width}`).toBe(Math.round(parts.logo!.left));
      // the signature runs the width of the footer's content, and it is decoration
      expect(Math.round(parts.signature!.left), `${width}`).toBe(Math.round(parts.bottom!.left));
      expect(Math.round(parts.signature!.right), `${width}`).toBe(Math.round(parts.bottom!.right));
      expect(parts.signatureHidden, `${width}`).toBe('true');
      // the columns stand on 4 + 2 + 3 + 3 of the twelve, gaps of 32 px, so none of the free width collects on one side
      const unit = (parts.bottom!.right - parts.bottom!.left - 3 * 32) / 12;
      expect(Math.abs(parts.nav!.left - (parts.logo!.left + 4 * unit + 32)), `${width}: navigation`).toBeLessThanOrEqual(1);
      expect(Math.abs(parts.directions!.left - (parts.logo!.left + 6 * unit + 2 * 32)), `${width}: directions`).toBeLessThanOrEqual(1);
      expect(Math.abs(parts.contacts!.left - (parts.logo!.left + 9 * unit + 3 * 32)), `${width}: contacts`).toBeLessThanOrEqual(1);
      expect(Math.abs(parts.bottom!.right - parts.contacts!.right) <= 1 || parts.bottom!.right >= parts.contacts!.right, `${width}`).toBe(true);
    }
  });

  test('«Налаштування cookie» on the legal line opens the cookie settings', async ({ page }) => {
    await open(page, 1440);
    await page.locator('footer .footer-bottom').getByRole('button', { name: 'Налаштування cookie' }).click();
    const banner = page.locator('body > .cookie-banner');
    await expect(banner).toBeVisible();
    // the review of a stored choice: the two toggles, not the first-visit quick answers
    await expect(banner.getByRole('group', { name: 'Аналітика' })).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Прийняти все' })).toHaveCount(0);
  });

  test('tablets keep the logo alone and the link groups where they were; only the legal line moves under the rest', async ({ page }) => {
    for (const width of [1180, 1024, 961, 960, 768, 761]) {
      await open(page, width, 1024);
      const parts = await footer(page);
      expect(parts.about, `${width}: no description on a tablet`).toBeNull();
      expect(parts.legalInContacts, `${width}`).toBe(0);
      for (const column of [parts.logo, parts.nav, parts.directions, parts.contacts]) expect(parts.signature!.top, `${width}`).toBeGreaterThanOrEqual(column!.bottom);
      expect(parts.bottom!.top, `${width}: the word above the legal line`).toBeGreaterThanOrEqual(parts.signature!.bottom);
      if (width >= 961) {
        // one row: logo, the two link groups and the contacts start on one line, as before
        for (const column of [parts.nav, parts.directions, parts.contacts]) expect(Math.abs(column!.top - parts.logo!.top), `${width}: one row`).toBeLessThanOrEqual(12);
      } else {
        // the logo above the two link groups, the contacts beside them from the logo's row
        expect(parts.nav!.top, `${width}`).toBeGreaterThan(parts.logo!.bottom);
        expect(parts.contacts!.top, `${width}`).toBeLessThan(parts.nav!.top);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}`).toBe(0);
    }
  });
});

test.describe('W2-13 · phone footer', () => {
  test.skip(({ isMobile }) => !isMobile, 'a phone check; the mobile project runs it');

  test('390: the description under the logo, the legal line last, every footer link at least 40 px tall', async ({ page }) => {
    await open(page, 390, 844);
    const parts = await footer(page);
    expect(parts.aboutText).toBe(company.description);
    expect(parts.about!.top).toBeGreaterThan(parts.logo!.bottom);
    expect(parts.legalInContacts).toBe(0);
    expect(parts.signature!.top).toBeGreaterThanOrEqual(parts.contacts!.bottom);
    expect(parts.bottom!.top).toBeGreaterThanOrEqual(parts.signature!.bottom);
    const targets = await page.locator('footer').locator('.footer-nav a, .footer-directions a, .footer-legal a, .footer-legal button').evaluateAll((elements) => elements.map((element) => ({
      label: element.textContent?.trim(), height: element.getBoundingClientRect().height,
    })));
    expect(targets).toHaveLength(11);
    for (const target of targets) expect(target.height, target.label).toBeGreaterThanOrEqual(40);
  });

  // Android's font size reaches the page as text-size-adjust (scaled px), which HTML font-size does not model
  for (const { width, scale } of [{ width: 260, scale: 100 }, { width: 280, scale: 100 }, { width: 312, scale: 100 }, { width: 320, scale: 100 }, { width: 360, scale: 130 }, { width: 390, scale: 150 }]) {
    test(`${width} px${scale !== 100 ? `, system text ${scale} %` : ''}: the footer never makes the page wider than the screen`, async ({ page }) => {
      await open(page, width, 800);
      if (scale !== 100) await page.addStyleTag({ content: `html { -webkit-text-size-adjust: ${scale}% !important; text-size-adjust: ${scale}% !important; }` });
      await page.evaluate(() => document.fonts.ready);
      const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(widths.scroll, JSON.stringify(widths)).toBeLessThanOrEqual(widths.client);
      // the number and the messengers never cover one another
      const overlap = await page.locator('footer .footer-contact-stack').evaluate((stack) => {
        const phone = stack.querySelector('.footer-phone')!.getBoundingClientRect();
        const messengers = stack.querySelector('.footer-messengers')!.getBoundingClientRect();
        return phone.right > messengers.left + 0.5 && phone.left < messengers.right - 0.5 && phone.bottom > messengers.top + 0.5 && phone.top < messengers.bottom - 0.5;
      });
      expect(overlap).toBe(false);
    });
  }
});
