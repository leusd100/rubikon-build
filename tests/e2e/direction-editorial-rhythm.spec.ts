import { expect, test } from '@playwright/test';

const directions = [
  { path: '/angary', layout: 'copy-first' },
  { path: '/zernoskhovyshcha', layout: 'media-first' },
  { path: '/metalokonstruktsii', layout: 'copy-first' },
  { path: '/betonni-roboty', layout: 'media-first' },
  { path: '/pokrivelni-roboty', layout: 'copy-first' },
] as const;

for (const direction of directions) {
  test(`${direction.path} keeps its editorial rhythm across desktop and mobile`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    for (const viewport of [
      { width: 1280, height: 800, mobile: false },
      { width: 390, height: 844, mobile: true },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(direction.path, { waitUntil: 'load' });

      const editorial = page.locator('.direction-editorial-grid');
      const copy = editorial.locator('.direction-editorial-copy');
      const media = editorial.locator('.direction-editorial-media');

      await expect(editorial).toHaveAttribute('data-layout', direction.layout);

      const [copyBox, mediaBox] = await Promise.all([copy.boundingBox(), media.boundingBox()]);
      expect(copyBox).not.toBeNull();
      expect(mediaBox).not.toBeNull();

      if (viewport.mobile) {
        expect(copyBox!.y).toBeLessThan(mediaBox!.y);
      } else if (direction.layout === 'media-first') {
        expect(mediaBox!.x).toBeLessThan(copyBox!.x);
      } else {
        expect(copyBox!.x).toBeLessThan(mediaBox!.x);
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
}
