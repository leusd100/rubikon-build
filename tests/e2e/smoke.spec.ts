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

        const heroPosterSource = await hero.locator('img.direction-hero-poster').evaluate(
          (element) => (element as HTMLImageElement).currentSrc,
        );

        if ((page.viewportSize()?.width ?? 0) <= 760) {
          if (route.path === '/') {
            expect(heroPosterSource, 'Home should use its dedicated phone poster').toContain(
              '/media/about/home-phone-poster.webp',
            );
          } else {
            expect(heroPosterSource, `${route.path} should use its mobile hero poster`).toContain(
              '-768w.webp',
            );
          }
        } else {
          expect(heroPosterSource, `${route.path} should retain its desktop hero poster`).not.toContain(
            '-768w.webp',
          );
        }
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

  test('homepage hero preserves poster-only media preferences', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    const hero = page.locator('.hero');
    const videos = hero.locator('video.direction-hero-video');
    const expectedVideoCount = (page.viewportSize()?.width ?? 0) <= 600 ? 1 : 5;

    await expect(videos).toHaveCount(expectedVideoCount);
    expect(await videos.evaluateAll((elements) => elements.map((video) => video.getAttribute('src'))))
      .toEqual(Array.from({ length: expectedVideoCount }, () => null));
    await expect(hero.locator('img.direction-hero-poster')).not.toHaveClass(/is-hidden/);
  });

  test('homepage hero remains poster-only when Save-Data is enabled', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'connection', {
        configurable: true,
        value: { saveData: true },
      });
    });
    await page.goto('/', { waitUntil: 'load' });

    const hero = page.locator('.hero');
    const videos = hero.locator('video.direction-hero-video');
    const expectedVideoCount = (page.viewportSize()?.width ?? 0) <= 600 ? 1 : 5;

    await expect(videos).toHaveCount(expectedVideoCount);
    expect(await videos.evaluateAll((elements) => elements.map((video) => video.getAttribute('src'))))
      .toEqual(Array.from({ length: expectedVideoCount }, () => null));
    await expect(hero.locator('img.direction-hero-poster')).not.toHaveClass(/is-hidden/);
  });

  test('homepage hero advances the five-clip montage before a clip can end', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) <= 760, 'Phone and portrait tablet use baked montages.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'load' });

    const videos = page.locator('.hero video.direction-hero-video');
    const expectedSources = [
      '/media/about/straight-line-14377591.mp4',
      '/media/about/blueprint.m4v',
      '/media/about/drilling-29913842.m4v',
      '/media/about/welding.m4v',
      '/media/about/structure.m4v',
    ];

    await expect.poll(
      () => videos.evaluateAll((elements) => elements.map((video) => video.getAttribute('src'))),
      { timeout: 10_000 },
    ).toEqual(expectedSources);
    expect(
      await videos.evaluateAll((elements) => elements.map((video) => getComputedStyle(video).position)),
    ).toEqual(['absolute', 'absolute', 'absolute', 'absolute', 'absolute']);
    expect(
      await videos.evaluateAll((elements) => elements.map((video) => getComputedStyle(video).transitionDuration)),
    ).toEqual(['0.8s', '0.8s', '0.8s', '0.8s', '0.8s']);
    expect(
      await page.locator('.hero').evaluate((hero) => ({
        grid: getComputedStyle(hero.querySelector('.hero-grid') as Element).zIndex,
        layout: getComputedStyle(hero.querySelector('.hero-layout') as Element).zIndex,
        media: getComputedStyle(hero.querySelector('.hero-media') as Element).zIndex,
        shade: getComputedStyle(hero.querySelector('.hero-shade') as Element).zIndex,
      })),
    ).toEqual({ grid: '1', layout: '2', media: '0', shade: '1' });
    await expect.poll(
      () => videos.nth(1).evaluate((video) => video.classList.contains('is-active')),
      { timeout: 10_000 },
    ).toBe(true);

    const firstClip = await videos.first().evaluate((element) => {
      const video = element as HTMLVideoElement;
      return { currentTime: video.currentTime, duration: video.duration, ended: video.ended };
    });

    expect(firstClip.ended).toBe(false);
    expect(firstClip.currentTime).toBeLessThan(firstClip.duration);
    expect(await videos.evaluateAll((elements) => elements.map((video) => video.loop))).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  test('homepage hero uses its dedicated phone montage', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 600, 'Dedicated phone montage test.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'load' });

    const video = page.locator('.hero video.direction-hero-video');

    await expect(video).toHaveCount(1);
    await expect.poll(() => video.getAttribute('src'), { timeout: 10_000 })
      .toBe('/media/about/home-phone-montage.mp4');
    await expect.poll(
      () => video.evaluate((element) => ({
        height: (element as HTMLVideoElement).videoHeight,
        width: (element as HTMLVideoElement).videoWidth,
      })),
      { timeout: 10_000 },
    ).toEqual({ height: 1280, width: 720 });
    expect(await video.evaluate((element) => (element as HTMLVideoElement).loop)).toBe(true);
  });

  test('homepage hero switches between portrait tablet and landscape media', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop browser viewport test.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/', { waitUntil: 'load' });

    const videos = page.locator('.hero video.direction-hero-video');

    await expect(videos).toHaveCount(1);
    await expect.poll(() => videos.first().getAttribute('src'), { timeout: 10_000 })
      .toBe('/media/about/home-tablet-montage.mp4');
    await expect.poll(
      () => videos.first().evaluate((element) => ({
        height: (element as HTMLVideoElement).videoHeight,
        width: (element as HTMLVideoElement).videoWidth,
      })),
      { timeout: 10_000 },
    ).toEqual({ height: 960, width: 720 });
    expect(await videos.first().evaluate((element) => (element as HTMLVideoElement).loop)).toBe(true);

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(videos).toHaveCount(5);
    await expect.poll(
      () => videos.evaluateAll((elements) => elements.map((video) => video.getAttribute('src'))),
      { timeout: 10_000 },
    ).toEqual([
      '/media/about/straight-line-14377591.mp4',
      '/media/about/blueprint.m4v',
      '/media/about/drilling-29913842.m4v',
      '/media/about/welding.m4v',
      '/media/about/structure.m4v',
    ]);
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
