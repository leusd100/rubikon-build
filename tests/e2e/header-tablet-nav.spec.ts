import { expect, test, type Page } from '@playwright/test';

// The tablet header (owner 22.10): from 960 to 1179 px the four sections stand in one row between the logo and the call /
// «Меню»; below 960 px the compact header stays as it was. Every test denies the optional cookies and answers any Google
// request with an empty 200, so no tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, path: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

const row = (page: Page) => page.locator('.site-header .nav-wrap').evaluate((wrap) => {
  const box = (selector: string) => wrap.querySelector(selector)!.getBoundingClientRect();
  const links = [...wrap.querySelectorAll('.desktop-nav a')].map((link) => {
    const rect = link.getBoundingClientRect();
    return { label: link.textContent?.trim(), top: Math.round(rect.top), height: rect.height, left: rect.left, right: rect.right };
  });
  return {
    links,
    fontSize: getComputedStyle(wrap.querySelector('.desktop-nav')!).fontSize,
    brandRight: box('.brand-link').right,
    callLeft: box('.mobile-call').left,
    headerHeight: wrap.closest('.site-header')!.getBoundingClientRect().height,
    pageWidth: document.documentElement.scrollWidth,
  };
});

test.describe('the tablet header row', () => {
  test('960–1179 px: the four sections in one row, clear of the logo and the call, the header as tall as before', async ({ page }) => {
    test.setTimeout(90_000);
    for (const path of ['/', '/metalokonstruktsii', '/pro-nas']) {
      for (const width of [960, 1024, 1100, 1179]) {
        await open(page, path, width);
        const label = `${path} ${width}px`;
        await expect(page.locator('.site-header .desktop-nav'), label).toBeVisible();
        await expect(page.locator('.site-header .mobile-call'), label).toBeVisible();
        await expect(page.locator('.site-header .mobile-menu summary'), label).toBeVisible();
        await expect(page.locator('.site-header .header-actions'), label).toBeHidden();
        const { links, fontSize, brandRight, callLeft, headerHeight, pageWidth } = await row(page);
        expect(links.map((link) => link.label), label).toEqual(['Напрямки', 'Як працюємо', 'Про компанію', 'Контакти']);
        expect(new Set(links.map((link) => link.top)).size, `${label}: one row`).toBe(1);
        for (const link of links) expect(link.height, `${label}: ${link.label}`).toBeGreaterThanOrEqual(44);
        expect(fontSize, label).toBe('15px');
        // 42 px at 960 on macOS (twice the 20 px step); at 900 it would have been about 12 px, hence the 960 threshold
        expect(links[0].left - brandRight, `${label}: from the logo`).toBeGreaterThanOrEqual(32);
        expect(callLeft - links[3].right, `${label}: to the call`).toBeGreaterThanOrEqual(16);
        expect(headerHeight, label).toBeLessThanOrEqual(101);
        expect(pageWidth, label).toBeLessThanOrEqual(width);
      }
    }
  });

  test('below 960 px the compact header stays: no row, the call and «Меню»', async ({ page }) => {
    for (const width of [768, 820, 900, 959]) {
      await open(page, '/metalokonstruktsii', width);
      await expect(page.locator('.site-header .desktop-nav'), `${width}px`).toBeHidden();
      await expect(page.locator('.site-header .mobile-call'), `${width}px`).toBeVisible();
      await expect(page.locator('.site-header .mobile-menu summary'), `${width}px`).toBeVisible();
    }
  });

  test('the current section keeps its copper rule in the tablet row', async ({ page }) => {
    for (const [path, current] of [['/metalokonstruktsii', 'Напрямки'], ['/pro-nas', 'Про компанію'], ['/yak-pratsyuiemo', 'Як працюємо']] as const) {
      await open(page, path, 1024);
      await page.mouse.move(500, 600);
      await expect(page.locator('.desktop-nav a[aria-current]'), path).toHaveText(current);
      await expect.poll(() => page.locator('.desktop-nav a').evaluateAll((links) => links.map((link) => (
        Math.round(Number.parseFloat(getComputedStyle(link, '::after').width)) === Math.round(link.getBoundingClientRect().width) ? link.textContent?.trim() : 0
      ))), path).toEqual(['Напрямки', 'Як працюємо', 'Про компанію', 'Контакти'].map((name) => (name === current ? name : 0)));
    }
  });

  test('1024 px: «Контакти» in the row leads to the conversation block, and the menu still opens', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 1024);
    await page.locator('.desktop-nav a[href="#inquiry"]').click();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#inquiry');
    await page.locator('.mobile-menu summary').click();
    await expect(page.locator('.mobile-menu nav')).toBeVisible();
    await expect(page.locator('.mobile-menu nav a[href="#inquiry"]')).toBeVisible();
  });
});
