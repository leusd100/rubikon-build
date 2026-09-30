import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubTurnstile } from './turnstile.helpers';

const viewports = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

async function preparePage(page: Page, path: string) {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  // Screenshots must not depend on live Cloudflare; the stub renders nothing until a challenge.
  await stubTurnstile(page);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });

  const response = await page.goto(path, { waitUntil: 'load' });
  expect(response?.status()).toBe(200);

  // These client-only state changes prove the interactive tree has hydrated.
  const essentialCookiesButton = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
  await essentialCookiesButton.click();

  const form = page.locator('form.inquiry-form');
  await form.getByText('Telegram', { exact: true }).click();
  await expect(form.getByRole('radio', { name: 'Telegram', exact: true })).toBeChecked();
  await form.getByText('Дзвінок', { exact: true }).click();
  await expect(form.getByRole('radio', { name: 'Дзвінок', exact: true })).toBeChecked();
  await expect(form.getByRole('button', { name: 'Надіслати запит', exact: true })).toBeVisible();

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
  {
    includeSiteChrome = false,
    legacyPointer = false,
  }: {
    includeSiteChrome?: boolean;
    /** Baseline recorded before the parking rule, with the pointer resting on a card; drop at its next visual freeze. */
    legacyPointer?: boolean;
  } = {},
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

  // A screenshot records the default state. preparePage's last click leaves the pointer mid-page, where cards and links
  // react to hover, so park it at the page's edge (outside every shell); a hover or focus shot requests that state itself.
  if (!legacyPointer) await locator.page().mouse.move(0, 0);
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
        { legacyPointer: true },
      );
    });

    // HOME v2: the real object (photo + labelled X-ray illustration), its facts and the two roles.
    test('homepage real object', async ({ page }) => {
      await preparePage(page, '/');
      await expectStableScreenshot(page.locator('#real-object'), `homepage-real-object-${viewport.name}.png`);
    });

    // HOME v2: the two explanation cards (node detail, load-path scheme) and the design boundary note.
    test('homepage engineering cards', async ({ page }) => {
      await preparePage(page, '/');
      await expectStableScreenshot(page.locator('#engineering .hv2-cards'), `homepage-engineering-cards-${viewport.name}.png`);
    });

    test('homepage inquiry form', async ({ page }) => {
      await preparePage(page, '/');
      await expectStableScreenshot(
        page.locator('#inquiry .conversation-grid'),
        `homepage-inquiry-${viewport.name}.png`,
      );
    });

    test('directions hub list', async ({ page }) => {
      await preparePage(page, '/napryamky');
      await expectStableScreenshot(
        page.locator('main > section.page-section > .shell').first(),
        `directions-hub-${viewport.name}.png`,
        { legacyPointer: true },
      );
    });

    test('representative direction cost', async ({ page }) => {
      // /angary now has its own editorial architecture; keep cost coverage on a
      // representative direction page that still renders the shared cost section.
      await preparePage(page, '/betonni-roboty');
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

    // /yak-pratsyuiemo v2: the four zones that carry the page's meaning.
    for (const [name, selector] of [
      ['process-route', '#etapy > .shell'],
      ['process-scope', '#obsiah > .shell'],
      ['process-responsibility', '#vidpovidalnist > .shell'],
      ['process-terms', '#koshtorys > .shell'],
    ] as const) {
      test(`process page — ${name}`, async ({ page }) => {
        await preparePage(page, '/yak-pratsyuiemo');
        await expectStableScreenshot(page.locator(selector), `${name}-${viewport.name}.png`);
      });
    }
  });
}
