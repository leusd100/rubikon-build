import { expect, test, type Page } from '@playwright/test';

type PublicRoute = {
  path: string;
  hasProjectCta: boolean;
  hasHeroMedia: boolean;
  hasResponsiveImages: boolean;
};

const publicRoutes: PublicRoute[] = [
  { path: '/', hasProjectCta: true, hasHeroMedia: true, hasResponsiveImages: true },
  { path: '/napryamky', hasProjectCta: true, hasHeroMedia: true, hasResponsiveImages: false },
  { path: '/angary', hasProjectCta: true, hasHeroMedia: true, hasResponsiveImages: true },
  { path: '/zernoskhovyshcha', hasProjectCta: true, hasHeroMedia: true, hasResponsiveImages: true },
  { path: '/metalokonstruktsii', hasProjectCta: true, hasHeroMedia: true, hasResponsiveImages: true },
  { path: '/betonni-roboty', hasProjectCta: true, hasHeroMedia: true, hasResponsiveImages: true },
  { path: '/pokrivelni-roboty', hasProjectCta: true, hasHeroMedia: true, hasResponsiveImages: true },
  { path: '/pro-nas', hasProjectCta: true, hasHeroMedia: true, hasResponsiveImages: true },
  {
    path: '/polityka-konfidentsiinosti',
    hasProjectCta: false,
    hasHeroMedia: false,
    hasResponsiveImages: false,
  },
];

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

  return errors;
}

function collectImageFailures(page: Page) {
  const failures: string[] = [];

  page.on('response', (response) => {
    if (response.request().resourceType() === 'image' && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (request.resourceType() === 'image') {
      failures.push(`${request.failure()?.errorText ?? 'request failed'} ${request.url()}`);
    }
  });

  return failures;
}

async function loadAndInspectImages(page: Page) {
  const images = page.locator('img');
  const currentSources: string[] = [];

  for (let index = 0; index < await images.count(); index += 1) {
    const image = images.nth(index);

    const result = await image.evaluate(async (element) => {
      const htmlImage = element as HTMLImageElement;

      htmlImage.loading = 'eager';
      htmlImage.scrollIntoView({ block: 'center' });

      try {
        await htmlImage.decode();
      } catch {
        // Report a concise assertion below using the browser's final image state.
      }

      return {
        alt: htmlImage.alt,
        complete: htmlImage.complete,
        currentSrc: htmlImage.currentSrc,
        naturalWidth: htmlImage.naturalWidth,
      };
    });

    expect(
      result.complete && result.naturalWidth > 0,
      `image should load: ${result.alt || result.currentSrc}`,
    ).toBe(true);
    currentSources.push(result.currentSrc);
  }

  return currentSources;
}

test.describe('public route smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  for (const route of publicRoutes) {
    test(`${route.path} renders its critical shell`, async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);
      const imageFailures = collectImageFailures(page);
      const response = await page.goto(route.path, { waitUntil: 'load' });

      expect(response?.status(), `${route.path} should return HTTP 200`).toBe(200);

      const header = page.locator('header.site-header');
      const main = page.locator('main#main-content');
      const hero = main.locator(':scope > section').first();
      const footer = page.locator('footer');

      await expect(header).toBeVisible();
      await expect(main).toBeVisible();
      await expect(hero).toBeVisible();
      await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(footer).toBeVisible();
      await expect(footer.locator('a[href="tel:+380682614264"]')).toHaveAttribute(
        'href',
        'tel:+380682614264',
      );

      if (route.hasProjectCta) {
        const projectCta = hero.getByRole('link', { name: 'Обговорити проєкт', exact: true });

        await expect(projectCta).toBeVisible();
        await expect(projectCta).toHaveAttribute('href', '#inquiry');
        await expect(page.locator('#inquiry')).toBeAttached();
      }

      if (route.hasHeroMedia) {
        expect(
          await hero.locator('img, video').count(),
          `${route.path} should retain its hero media`,
        ).toBeGreaterThan(0);
      }

      const essentialCookiesButton = page.getByRole('button', {
        name: 'Лише необхідні',
        exact: true,
      });
      await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
      await essentialCookiesButton.click();

      const currentImageSources = await loadAndInspectImages(page);

      if (route.hasResponsiveImages) {
        expect(
          currentImageSources.some((source) => source.includes('/media-responsive/')),
          `${route.path} should deliver at least one generated responsive image variant`,
        ).toBe(true);
      }

      expect(runtimeErrors, `${route.path} should not emit browser runtime errors`).toEqual([]);
      expect(imageFailures, `${route.path} should not request broken images`).toEqual([]);
    });
  }

  test('homepage project CTA reaches the inquiry form', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    await page
      .locator('main > section')
      .first()
      .getByRole('link', { name: 'Обговорити проєкт', exact: true })
      .click();

    await expect(page).toHaveURL(/\/#inquiry$/);
    await expect(page.locator('#inquiry')).toBeVisible();
  });

  test('directions page links to every direction route', async ({ page }) => {
    const directionPaths = [
      '/angary',
      '/zernoskhovyshcha',
      '/metalokonstruktsii',
      '/betonni-roboty',
      '/pokrivelni-roboty',
    ];

    await page.goto('/napryamky', { waitUntil: 'load' });

    for (const path of directionPaths) {
      await expect(page.locator(`main a[href="${path}"]`).first()).toBeVisible();
    }
  });
});
