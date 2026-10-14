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

      expect(imageState.currentSrc).toContain('/media-responsive/direction-hero-');
      const selectedWidth = Number(imageState.currentSrc.match(/-(480|768|784|1200|1536)w\./)?.[1]);
      expect([480, 768, 784, 1200, 1536]).toContain(selectedWidth);
      expect(imageState.naturalWidth).toBeGreaterThan(0);
      expect(imageState.imageWidth).toBe(imageState.heroWidth);
      expect(imageState.heroHeight).toBeGreaterThan(0);
      if (viewport.width === 390) {
        expect(imageState.currentSrc, `${path} should receive the phone window of the art`).toMatch(/-portrait-784w\.[0-9a-f]{8}\.avif$/);
      } else {
        expect(imageState.currentSrc, `${path} keeps the landscape art from ${viewport.width} px`).not.toContain('-portrait-');
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

// The phone file is the art's 784 × 1024 window at native size. It shows exactly what the landscape file showed only
// while cover still draws the hero by its height, i.e. while the hero box is at most 784 / 1024 as wide as it is tall.
// /angary and /zernoskhovyshcha let their copy set the hero's height on a phone, so this is measured, not assumed.
test('direction static heroes use responsive images: a phone gets the window of the art it shows', async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of directions) {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
      { width: 430, height: 932 },
      { width: 440, height: 956 },
      { width: 441, height: 956 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(path, { waitUntil: 'load' });
      const image = page.locator('.service-subhero img.direction-hero-image');
      await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
      const state = await image.evaluate((node: HTMLImageElement) => {
        const box = node.getBoundingClientRect();
        return { src: node.currentSrc, aspect: box.width / box.height };
      });
      const label = `${path} at ${viewport.width} × ${viewport.height}`;
      if (viewport.width <= 440) {
        expect(state.src, label).toMatch(/-portrait-784w\.[0-9a-f]{8}\.avif$/);
        expect(state.aspect, `${label}: the box must not be wider than the phone window`).toBeLessThanOrEqual(784 / 1024);
      } else {
        expect(state.src, label).not.toContain('-portrait-');
      }
    }
  }
});

// WebKit starts downloading an <img>'s src the moment it is set, even before the img is inside its <picture>; React sets
// a client-made img's attributes first and inserts it after. So a hero img made on the client (any theme other than the
// server's light one) must get its src only once it is in place, or a phone downloads the landscape file next to its own
// (QA 15.10). Chromium does not show the extra download, so the test watches where every src is set.
test('direction static heroes use responsive images: a phone never fetches the landscape art', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
    const sets: { file: string; inPicture: boolean }[] = [];
    (window as Window & { __heroSrcSets?: typeof sets }).__heroSrcSets = sets;
    const note = (image: Element, value: unknown) => {
      if (!/direction-hero-/.test(String(value))) return;
      sets.push({ file: String(value).split('/').pop() ?? '', inPicture: image.isConnected && image.parentElement?.tagName === 'PICTURE' });
    };
    const setAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name: string, value: string) {
      if (name === 'src' && this instanceof HTMLImageElement) note(this, value);
      return setAttribute.call(this, name, value);
    };
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
    Object.defineProperty(HTMLImageElement.prototype, 'src', { ...src, set(value: string) { note(this, value); src.set!.call(this, value); } });
  });
  const requests: string[] = [];
  page.on('request', (request) => {
    const file = request.url().match(/\/media-responsive\/(direction-hero-[^/?#]+)/)?.[1];
    if (file) requests.push(file);
  });
  const heroReady = (theme: 'light' | 'dark') => expect.poll(() => page.locator('.service-subhero img.direction-hero-image').evaluateAll(
    (nodes, wanted) => nodes.length === 1 && (nodes[0] as HTMLImageElement).complete && (nodes[0] as HTMLImageElement).naturalWidth > 0
      && (nodes[0] as HTMLImageElement).dataset.artTheme === wanted, theme)).toBe(true);

  // 1. The server's light hero, then a theme change, which mounts a new img on the client
  await page.goto('/angary', { waitUntil: 'load' });
  await heroReady('light');
  const menu = page.locator('.mobile-menu');
  await menu.locator('summary').click();
  await menu.locator('.theme-options').getByLabel('Темна', { exact: true }).check();
  await heroReady('dark');

  // 2. The next page with the stored dark choice: the server's light hero gives way to a client-made dark one
  await page.goto('/pokrivelni-roboty', { waitUntil: 'load' });
  await heroReady('dark');

  expect(requests.filter((file) => !/-portrait-784w\./.test(file)), 'landscape hero files fetched on a phone').toEqual([]);
  const sets = await page.evaluate(() => (window as Window & { __heroSrcSets?: { file: string; inPicture: boolean }[] }).__heroSrcSets ?? []);
  expect(sets.length, 'the client-made heroes got their src').toBeGreaterThan(0);
  expect(sets.filter((set) => !set.inPicture), 'src set before the img was inside its <picture>').toEqual([]);
});

for (const viewport of [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'phone', width: 390, height: 844 },
] as const) {
  test(`saved dark theme never paints a daylight direction hero at ${viewport.name}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      localStorage.setItem('rubikon-theme', 'dark');
      document.addEventListener('DOMContentLoaded', () => {
        const image = document.querySelector<HTMLImageElement>(
          '.direction-hero-image, .directions-hero-sequence-image',
        );
        (window as Window & { __heroFirstFrame?: { theme?: string; art?: string | null; visibility?: string } }).__heroFirstFrame = {
          theme: document.documentElement.dataset.theme,
          art: image?.dataset.artTheme,
          visibility: image ? getComputedStyle(image).visibility : undefined,
        };
      }, { once: true });
    });

    for (const path of [...directions, '/napryamky']) {
      await page.goto(path, { waitUntil: 'load' });
      const firstFrame = await page.evaluate(() =>
        (window as Window & { __heroFirstFrame?: { theme?: string; art?: string | null; visibility?: string } }).__heroFirstFrame,
      );
      expect(firstFrame?.theme, path).toBe('dark');
      expect(firstFrame?.art, path).toMatch(/^(light|dark)$/);
      if (firstFrame?.art === 'light') expect(firstFrame.visibility, path).toBe('hidden');

      const image = page.locator('.direction-hero-image, .directions-hero-sequence-image').first();
      await expect(image).toHaveAttribute('data-art-theme', 'dark');
      await expect.poll(() => image.evaluate((node: HTMLImageElement) =>
        node.complete && node.naturalWidth > 0)).toBe(true);
      const src = await image.evaluate((node: HTMLImageElement) => node.currentSrc);
      expect(src, path).toContain(path === '/napryamky' ? 'directions-sequence-blue-hour-' : 'direction-hero-blue-hour-');
    }
  });
}
