import { expect, test } from '@playwright/test';

const directions = [
  '/angary',
  '/zernoskhovyshcha',
  '/metalokonstruktsii',
  '/betonni-roboty',
  '/pokrivelni-roboty',
] as const;

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`direction static heroes use responsive images at ${viewport.name}`, async ({ page }) => {
    let mediaRequests: string[] = [];

    page.on('request', (request) => {
      if (request.resourceType() === 'media' || /\.(?:mp4|m4v)(?:\?|$)/i.test(request.url())) {
        mediaRequests.push(request.url());
      }
    });

    await page.addInitScript(() => {
      type WindowWithDirectionHeroMetrics = Window & { __directionHeroLayoutShifts?: number[] };
      const metricsWindow = window as WindowWithDirectionHeroMetrics;
      const layoutShifts = metricsWindow.__directionHeroLayoutShifts ?? [];
      metricsWindow.__directionHeroLayoutShifts = layoutShifts;

      new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutShift.hadRecentInput && layoutShift.value) layoutShifts.push(layoutShift.value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const path of directions) {
      mediaRequests = [];
      await page.goto(path, { waitUntil: 'networkidle' });

      const hero = page.locator('.service-subhero');
      const image = hero.locator('img.direction-hero-image');

      await expect(image).toBeVisible();
      await expect(hero.locator('video')).toHaveCount(0);
      await expect(image).toHaveAttribute('loading', 'eager');
      await expect(image).toHaveAttribute('fetchpriority', 'high');
      await expect(image).toHaveAttribute('width', '1536');
      await expect(image).toHaveAttribute('height', '1024');

      const imageState = await image.evaluate((element) => {
        const image = element as HTMLImageElement;
        const hero = image.closest('.service-subhero') as HTMLElement;
        return {
          currentSrc: image.currentSrc,
          naturalWidth: image.naturalWidth,
          imageWidth: image.getBoundingClientRect().width,
          heroWidth: hero.getBoundingClientRect().width,
          heroHeight: hero.getBoundingClientRect().height,
          devicePixelRatio: window.devicePixelRatio,
        };
      });

      const selectedWidth = [480, 768, 1200, 1536].find(
        (width) => width >= Math.ceil(imageState.imageWidth * imageState.devicePixelRatio),
      ) ?? 1536;

      expect(imageState.currentSrc).toContain('/media-responsive/direction-hero-');
      expect(imageState.currentSrc).toContain(`${selectedWidth}w`);
      expect(imageState.naturalWidth).toBeGreaterThan(0);
      expect(imageState.imageWidth).toBe(imageState.heroWidth);
      expect(imageState.heroHeight).toBeGreaterThan(0);
      if (viewport.width === 390) {
        expect(selectedWidth, `${path} must not send its largest desktop variant to a phone`).toBeLessThan(1536);
      }
      expect(mediaRequests, `${path} must not request a legacy hero video`).toEqual([]);

      const layoutShifts = await page.evaluate(() => {
        type WindowWithDirectionHeroMetrics = Window & { __directionHeroLayoutShifts?: number[] };
        return (window as WindowWithDirectionHeroMetrics).__directionHeroLayoutShifts ?? [];
      });
      expect(layoutShifts, `${path} should not shift after its static hero image loads`).toEqual([]);
    }
  });
}
