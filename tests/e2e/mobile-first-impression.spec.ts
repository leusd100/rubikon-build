import { expect, test, type Page } from '@playwright/test';

async function denyOptionalCookies(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
}

const pages = [
  { path: '/', hero: '.hv2-hero', image: '.hv2-hero-still', family: 'hero-h1-', old: 'hero-mobile-band-' },
  { path: '/pro-nas', hero: '.about-subhero', image: '.about-hero-still', family: 'about-p5-', old: 'about-phone-still-' },
] as const;

for (const deviceScaleFactor of [1, 2]) {
  test.describe(`phone hero at DPR ${deviceScaleFactor}`, () => {
    test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor });

    for (const target of pages) {
      test(`${target.path}: phone poster stays the same across hydration`, async ({ page }) => {
        await denyOptionalCookies(page);
        const posters: string[] = [];
        const videos: string[] = [];
        page.on('request', request => {
          const path = new URL(request.url()).pathname;
          if (path.includes(target.family) || path.includes(target.old)) posters.push(path);
          if (/\.(mp4|m4v)$/.test(path)) videos.push(path);
        });
        await page.goto(target.path, { waitUntil: 'load' });
        const image = page.locator(target.image);
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).currentSrc)).toContain(target.family);
        await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        const selected = await image.evaluate(element => new URL((element as HTMLImageElement).currentSrc).pathname);
        expect(selected).toMatch(/-(480|768|1024)w\.webp$/);
        expect(posters, 'SSR preload and hydrated img select the same resource, with no old poster').toEqual([selected]);
        expect(videos, 'a phone must not request any hero montage').toEqual([]);
        await expect(image).toHaveAttribute('loading', 'eager');
        await expect(image).toHaveAttribute('fetchpriority', 'high');
      });
    }
  });
}

for (const target of [
  { path: '/', width: 761, family: 'hero-h1-' },
  { path: '/pro-nas', width: 601, family: 'about-p5-' },
]) {
  test(`${target.path}: the phone poster is not fetched above its ${target.width - 1}px boundary`, async ({ page }) => {
    await denyOptionalCookies(page);
    await page.setViewportSize({ width: target.width, height: 932 });
    const phonePosters: string[] = [];
    page.on('request', request => {
      if (request.url().includes(target.family)) phonePosters.push(request.url());
    });
    await page.goto(target.path, { waitUntil: 'networkidle' });
    expect(phonePosters).toEqual([]);
  });
}
