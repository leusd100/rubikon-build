import { expect, test, type Page } from '@playwright/test';

// W1-09 · the current section in the navigation (PDO-57; owner 20.10: OD-PX-08 a). Every test denies the optional cookies and answers any Google request with an empty
// 200, so no tag can load.

test.beforeEach(async ({ context }) => {
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

test.describe('PDO-57 · the current section', () => {
  const sections = [
    ['/pro-nas', 'Про компанію', 'page'],
    ['/yak-pratsyuiemo', 'Як працюємо', 'page'],
    ['/napryamky', 'Напрямки', 'page'],
    ['/metalokonstruktsii', 'Напрямки', 'true'],
    ['/angary', 'Напрямки', 'true'],
    ['/zernoskhovyshcha', 'Напрямки', 'true'],
  ] as const;

  test('the header marks exactly one link, with the copper rule kept under it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the desktop header');
    test.setTimeout(60_000);
    const rules = () => page.locator('.desktop-nav a').evaluateAll((links) => links.map((link) => ({
      label: link.textContent?.trim(),
      current: link.getAttribute('aria-current'),
      rule: Math.round(Number.parseFloat(getComputedStyle(link, '::after').width)),
      width: Math.round(link.getBoundingClientRect().width),
    })));
    for (const [path, label, kind] of sections) {
      await open(page, path, 1440);
      await page.mouse.move(700, 600);
      await expect(page.locator('.desktop-nav a[aria-current]'), path).toHaveCount(1);
      await expect(page.locator(`.desktop-nav a[aria-current="${kind}"]`), path).toHaveText(label);
      await expect.poll(async () => (await rules()).map(({ label: name, rule, width }) => (rule === width ? name : rule)), path)
        .toEqual(['Напрямки', 'Як працюємо', 'Про компанію', 'Контакти'].map((name) => (name === label ? name : 0)));
    }
    await open(page, '/', 1440);
    await expect(page.locator('.desktop-nav a[aria-current]')).toHaveCount(0);
  });

  test('the rule is the light copper and stands ≥ 4.5 : 1 against the header it lies on — every page with a current section, Light and Dark, at the top and after scroll', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the desktop header');
    test.setTimeout(120_000);
    // The review's case (#220, 20.10): at 1180 px in Light the decorative #B76432 under «Напрямки» on /betonni-roboty was
    // 2.21 : 1 against the 72 % header over a light frame. The rule is now #CC8455 on the 92 % header. Measured on the
    // rendered pixels of the header just under the rule (the header's own colour there, picture included), never one
    // frame only: /napryamky is read on two slides.
    const contrast = (a: number[], b: number[]) => {
      const lum = (c: number[]) => {
        const [r, g, bl] = c.map((v) => { const x = v / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
        return .2126 * r + .7152 * g + .0722 * bl;
      };
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + .05) / (lo + .05);
    };
    /** The header's pixels on the row 2 px under the current link's rule, across the rule's width */
    const under = async () => {
      const box = await page.locator('.desktop-nav a[aria-current]').boundingBox();
      const png = await page.screenshot({ clip: { x: box!.x, y: box!.y + box!.height + 2, width: box!.width, height: 1 }, animations: 'disabled' });
      return page.evaluate(async (base64) => {
        const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext('2d')!;
        context.drawImage(bitmap, 0, 0);
        const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
        const pixels: number[][] = [];
        for (let index = 0; index < data.length; index += 4) pixels.push([data[index], data[index + 1], data[index + 2]]);
        return pixels;
      }, png.toString('base64'));
    };
    const copper = [204, 132, 85];
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme });
      for (const path of ['/betonni-roboty', '/metalokonstruktsii', '/pokrivelni-roboty', '/angary', '/zernoskhovyshcha', '/napryamky', '/yak-pratsyuiemo', '/pro-nas']) {
        await open(page, path, 1180);
        await page.mouse.move(700, 600);
        await expect(page.locator('.desktop-nav a[aria-current]'), path).toHaveCount(1);
        expect(await page.locator('.desktop-nav a[aria-current]').evaluate((link) => getComputedStyle(link, '::after').backgroundColor), path).toBe('rgb(204, 132, 85)');
        const reads = [await under()];
        if (path === '/napryamky') {
          // the next slide: wait until another image of the sequence is the active one, then read again
          const active = () => page.locator('.directions-hero-sequence-image').evaluateAll((images) => images.findIndex((image) => image.classList.contains('is-active')));
          const first = await active();
          await expect.poll(active, { timeout: 15_000 }).not.toBe(first);
          reads.push(await under());
        }
        await page.evaluate(() => window.scrollTo(0, 600));
        await expect(page.locator('html')).toHaveAttribute('data-hero-header', 'scrolled');
        // the solid header is painted: its own background has no alpha any more
        await expect.poll(() => page.locator('.site-header').evaluate((element) => getComputedStyle(element).backgroundColor)).not.toMatch(/\/\s*0?\.\d+\)$|,\s*0?\.\d+\)$/);
        reads.push(await under());
        const worst = Math.min(...reads.flat().map((pixel) => contrast(copper, pixel)));
        expect(worst, `${path} ${theme}: the rule against the header under it`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test('the menu marks the same link in copper, and never «Контакти»', async ({ page }) => {
    for (const [path, label] of [sections[1], sections[3]]) {
      await open(page, path, 390, 844);
      await page.locator('.site-header .mobile-menu summary').click();
      const marked = page.locator('.mobile-menu nav a[aria-current]');
      await expect(marked, path).toHaveCount(1);
      await expect(marked, path).toContainText(label);
      await expect(marked, path).toHaveCSS('color', 'rgb(204, 132, 85)');
      await expect(page.locator('.mobile-menu nav a[href="#inquiry"]'), path).not.toHaveAttribute('aria-current');
      await expect(page.locator('.mobile-menu nav a[href="#inquiry"]'), path).not.toHaveCSS('color', 'rgb(204, 132, 85)');
    }
  });
});
