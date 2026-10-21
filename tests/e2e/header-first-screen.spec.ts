import { expect, test, type Page } from '@playwright/test';

// W1-09 · one header model on the first screen (PDO-18; owner 20.10: OD-PX-09 a; «Збалансована» 21.10: 92 % over the hero). Every test denies the optional cookies and answers any Google request with an empty
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

test.describe('PDO-18 · one header model on the first screen', () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, 'wide screens'));

  const alpha = (page: Page) => page.locator('.site-header').evaluate((element) => {
    const color = getComputedStyle(element).backgroundColor;
    return Number(color.match(/\/\s*([\d.]+)\)$/)?.[1] ?? color.match(/rgba\([^)]*,\s*([\d.]+)\)$/)?.[1] ?? 1);
  });

  test('the inner heroes lie under a 92 % header without blur, and the header turns solid after 32 px', async ({ page }) => {
    test.setTimeout(90_000);
    for (const path of ['/napryamky', '/angary', '/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/yak-pratsyuiemo']) {
      await open(page, path, 1440);
      const header = page.locator('.site-header');
      const media = page.locator('main .service-subhero-media, main .directions-hero-sequence-image, main .proc-hero-media').first();
      const shade = page.locator('main :is(.service-subhero-overlay, .directions-subhero .subhero-overlay, .proc-hero-shade)').first();
      for (const width of [1100, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.locator('html'), `${path} ${width}`).toHaveAttribute('data-hero-header', 'top');
        await expect.poll(() => alpha(page), `${path} ${width}`).toBeCloseTo(.92, 2);
        await expect(header, `${path} ${width}`).toHaveCSS('backdrop-filter', 'none');
        expect((await media.boundingBox())!.y, `${path} ${width}: the picture starts behind the header`).toBe(0);
        await expect(shade, `${path} ${width}: the shade clears behind the header`).not.toHaveCSS('mask-image', 'none');
      }
      for (const width of [1100, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => window.scrollTo(0, 400));
        await expect(page.locator('html'), `${path} ${width}`).toHaveAttribute('data-hero-header', 'scrolled');
        await expect.poll(() => alpha(page), `${path} ${width} after scroll`).toBe(1);
        await expect(header, `${path} ${width} after scroll`).toHaveCSS('backdrop-filter', 'none');
        await expect(header.locator('.header-messengers')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect.poll(() => alpha(page), `${path} ${width} back at the top`).toBeCloseTo(.92, 2);
      }
    }
  });

  test('HOME and /pro-nas turn solid on scroll too; a page without a hero is 94 % without blur', async ({ page }) => {
    test.setTimeout(60_000);
    for (const path of ['/', '/pro-nas']) {
      await open(page, path, 1440);
      await expect.poll(() => alpha(page), path).toBeCloseTo(.92, 2);
      await page.evaluate(() => window.scrollTo(0, 600));
      await expect.poll(() => alpha(page), `${path} after scroll`).toBe(1);
      await expect(page.locator('.site-header')).toHaveCSS('backdrop-filter', 'none');
    }
    for (const path of ['/polityka-konfidentsiinosti', '/nemaie-takoi-storinky']) {
      await open(page, path, 1440);
      await expect.poll(() => alpha(page), path).toBeCloseTo(.94, 2);
      await expect(page.locator('.site-header'), path).toHaveCSS('backdrop-filter', 'none');
    }
  });

  test('the grain hero — /zernoskhovyshcha and /planner-preview alike — keeps only its framing: the same header, its picture under it (W2-12)', async ({ page }) => {
    for (const path of ['/zernoskhovyshcha', '/planner-preview']) {
      await open(page, path, 1440);
      await expect(page.locator('html'), path).toHaveAttribute('data-hero-header', 'top');
      await expect.poll(() => alpha(page), path).toBeCloseTo(.92, 2);
      await expect(page.locator('.site-header'), path).toHaveCSS('backdrop-filter', 'none');
      expect((await page.locator('main .service-subhero-media').boundingBox())!.y, `${path}: the picture starts under the header`).toBe(101);
      await page.evaluate(() => window.scrollTo(0, 400));
      await expect(page.locator('html'), path).toHaveAttribute('data-hero-header', 'scrolled');
      await expect.poll(() => alpha(page), `${path} after scroll`).toBe(1);
    }
  });
});
