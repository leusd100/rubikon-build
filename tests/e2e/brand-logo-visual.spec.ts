import { expect, test, type Locator, type Page } from '@playwright/test';

const headerViewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'desktop-edge-1001', width: 1001, height: 800 },
  { name: 'desktop-1181', width: 1181, height: 820 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

async function loadBrandPage(page: Page, path = '/') {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  const response = await page.goto(path, { waitUntil: 'load' });
  expect(response?.status()).toBe(200);
  const essentialCookiesButton = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
  await essentialCookiesButton.click();
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
  });
  await page.evaluate(() => document.fonts.ready);
}

async function waitForImage(image: Locator) {
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => {
    const htmlImage = element as HTMLImageElement;
    return htmlImage.complete && htmlImage.naturalWidth > 0;
  })).toBe(true);
}

async function expectBrandScreenshot(locator: Locator, name: string) {
  await expect(locator).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.02,
    scale: 'css',
    threshold: 0.25,
  });
}

for (const viewport of headerViewports) {
  test(`header logo — ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loadBrandPage(page);

    const brandLink = page.locator('.site-header .brand-link');
    const brandImage = brandLink.locator('img.brand');
    await waitForImage(brandImage);

    const geometry = await brandImage.evaluate((element) => {
      const image = element as HTMLImageElement;
      const rect = image.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        viewportWidth: window.innerWidth,
        pageWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry.naturalWidth).toBe(1270);
    expect(geometry.naturalHeight).toBe(272);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.width).toBeGreaterThanOrEqual(viewport.width <= 390 ? 188 : 225);
    await expectBrandScreenshot(brandLink, `header-logo-${viewport.name}.png`);
  });
}

for (const viewport of [headerViewports[0], headerViewports[3]]) {
  test(`footer logo — ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await loadBrandPage(page);
    await page.addStyleTag({ content: '.site-header,.skip-link{display:none!important}' });

    const brandLink = page.locator('footer .brand-link');
    await brandLink.scrollIntoViewIfNeeded();
    await waitForImage(brandLink.locator('img.brand'));
    await expectBrandScreenshot(brandLink, `footer-logo-${viewport.name}.png`);
  });
}

test('web, light, premium, and compact logo contexts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await loadBrandPage(page, '/logo-variants');

  const previews = page.locator('.logo-preview');
  await expect(previews).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await waitForImage(previews.nth(index).locator('img'));
  }

  await expectBrandScreenshot(previews.nth(0), 'horizontal-logo-dark-context.png');
  await expectBrandScreenshot(previews.nth(1), 'horizontal-logo-light-context.png');
  await expectBrandScreenshot(previews.nth(2), 'horizontal-logo-premium-context.png');
  await expectBrandScreenshot(previews.nth(3), 'compact-r-dark-context.png');
});

test('favicon remains legible at native 16, 32, and 48 pixel sizes', async ({ page, request }) => {
  const sizes = [16, 32, 48] as const;
  const dataUrls = await Promise.all(sizes.map(async (size) => {
    const response = await request.get(`/favicon-${size}x${size}.png`);
    expect(response.ok()).toBe(true);
    return `data:image/png;base64,${(await response.body()).toString('base64')}`;
  }));

  await page.setContent(`
    <style>
      html,body{margin:0;background:#eeede7}
      #favicon-sheet{display:flex;align-items:flex-end;gap:18px;padding:18px;background:#eeede7}
      img{display:block;image-rendering:auto}
    </style>
    <div id="favicon-sheet">
      ${dataUrls.map((url, index) => `<img src="${url}" width="${sizes[index]}" height="${sizes[index]}" alt="">`).join('')}
    </div>
  `);
  const sheet = page.locator('#favicon-sheet');
  await expect(sheet.locator('img')).toHaveCount(3);
  await expectBrandScreenshot(sheet, 'favicon-native-sizes.png');
});
