import { expect, test } from '@playwright/test';
import { allowPlainHttpInWebKit } from './webkit-local.helpers';

// A stored theme's hero, one download in Safari's engine too (28.11.2026). WebKit's preload scanner reads a System
// <picture>'s sources before the inline script points them at the stored theme, so a theme that differs from the OS
// fetched both heroes there (production: 5 direction pages and /napryamky, +52…328 KB). The stored theme is now also a
// cookie, which the head script writes on the first page and the Worker turns into the hero sources' media
// (worker/hero-theme-sources.ts). Chromium's own check is MD-01 in direction-static-hero.spec.ts. Runs in the `webkit`
// project (Cross-browser workflow); the other projects skip it.
const pages = ['/angary', '/zernoskhovyshcha', '/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/napryamky'];

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const) {
  for (const mode of [
    { name: 'stored Dark under a light OS', scheme: 'light', stored: 'dark' },
    { name: 'stored Light under a dark OS', scheme: 'dark', stored: 'light' },
  ] as const) {
    test(`${mode.name}: one hero download in WebKit, at ${viewport.name}`, async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'the preload scanner this guards is WebKit\'s');
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: mode.scheme });
      // A choice made before the cookie existed: only the storage has it, and the head script writes the cookie
      await page.addInitScript((value) => localStorage.setItem('rubikon-theme', value), mode.stored);
      // The route hands each page over whole, as a server would: the preload scanner still reads it ahead of the parser
      await allowPlainHttpInWebKit(page);
      await page.goto('/polityka-konfidentsiinosti', { waitUntil: 'load' });
      expect((await page.context().cookies()).find((cookie) => cookie.name === 'rubikon-theme')?.value).toBe(mode.stored);

      for (const path of pages) {
        const requests: string[] = [];
        const record = (request: { url(): string }) => {
          const file = request.url().match(/\/media-responsive\/((?:direction-hero|directions-sequence|mobile-directions)-[^/?#]+)/)?.[1];
          // /napryamky also loads its second slide ahead: count the first slide's files only
          if (file && (path !== '/napryamky' || /-angary-/.test(file))) requests.push(file);
        };
        page.on('request', record);
        await page.goto(path, { waitUntil: 'load' });
        const image = page.locator('.direction-hero-image, .directions-hero-sequence-image').first();
        await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
        await page.waitForLoadState('networkidle');
        page.off('request', record);
        const shown = await image.evaluate((node: HTMLImageElement) => node.currentSrc.split('/').pop() ?? '');
        expect(requests, `${path}: hero files fetched`).toHaveLength(1);
        expect(shown, `${path}: the art shown is the one fetched`).toBe(requests[0]);
        expect(shown, `${path}: ${mode.stored} art`).toMatch(mode.stored === 'dark' ? /blue-hour|-dark-/ : /photo-variant|daylight|-light-/);
      }
    });
  }
}
