import { expect, test, type Locator, type Page } from '@playwright/test';

const viewports = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

async function preparePage(page: Page, path: string) {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });

  const response = await page.goto(path, { waitUntil: 'load' });
  expect(response?.status()).toBe(200);

  // These client-only state changes prove the interactive tree has hydrated.
  const essentialCookiesButton = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
  await essentialCookiesButton.click();

  const form = page.locator('form.inquiry-form');
  await form.getByText('Telegram', { exact: true }).click();
  await expect(form.getByRole('button', { name: 'Написати в Telegram', exact: true })).toBeVisible();
  await form.getByText('Дзвінок', { exact: true }).click();
  await expect(form.getByRole('button', { name: 'Зателефонувати', exact: true })).toBeVisible();

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        caret-color: transparent !important;
        transition: none !important;
      }
      html { scroll-behavior: auto !important; }
      .direction-hero-video { display: none !important; }
      .direction-hero-poster { opacity: 1 !important; }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
}

async function expectStableScreenshot(
  locator: Locator,
  name: string,
  { includeSiteChrome = false }: { includeSiteChrome?: boolean } = {},
) {
  if (!includeSiteChrome) {
    await locator.page().addStyleTag({
      content: '.site-header, .skip-link { display: none !important; }',
    });
  }
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  const images = locator.locator('img');
  for (let index = 0; index < await images.count(); index += 1) {
    const image = images.nth(index);
    if (!await image.isVisible()) continue;
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(async (element) => {
      const htmlImage = element as HTMLImageElement;
      if (!htmlImage.complete) {
        await new Promise<void>((resolve) => {
          htmlImage.addEventListener('load', () => resolve(), { once: true });
          htmlImage.addEventListener('error', () => resolve(), { once: true });
        });
      }
      await htmlImage.decode().catch(() => undefined);
    });
  }

  await expect(locator).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.02,
    scale: 'css',
    threshold: 0.25,
  });
}

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('homepage hero', async ({ page }) => {
      await preparePage(page, '/');
      await expectStableScreenshot(
        page.locator('.hero'),
        `homepage-hero-${viewport.name}.png`,
        { includeSiteChrome: true },
      );
    });

    test('homepage directions grid', async ({ page }) => {
      await preparePage(page, '/');
      await expectStableScreenshot(
        page.locator('.directions > .shell'),
        `homepage-directions-${viewport.name}.png`,
      );
    });

    test('homepage team', async ({ page }) => {
      await preparePage(page, '/');
      await expectStableScreenshot(page.locator('.team > .shell'), `homepage-team-${viewport.name}.png`);
    });

    test('homepage inquiry form', async ({ page }) => {
      await preparePage(page, '/');
      await expectStableScreenshot(
        page.locator('#inquiry .contact-grid'),
        `homepage-inquiry-${viewport.name}.png`,
      );
    });

    test('directions hub list', async ({ page }) => {
      await preparePage(page, '/napryamky');
      await expectStableScreenshot(
        page.locator('main > section.page-section > .shell').first(),
        `directions-hub-${viewport.name}.png`,
      );
    });

    test('representative direction cost', async ({ page }) => {
      await preparePage(page, '/angary');
      await expectStableScreenshot(
        page.locator('.cost-section > .shell'),
        `direction-cost-${viewport.name}.png`,
      );
    });

    test('representative direction FAQ', async ({ page }) => {
      await preparePage(page, '/angary');
      await expectStableScreenshot(
        page.locator('.faq-section > .shell'),
        `direction-faq-${viewport.name}.png`,
      );
    });
  });
}
