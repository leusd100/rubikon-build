import { expect, test, type Page } from '@playwright/test';

// The footer's embossed RUBIKON (owner 08.11, «Один раз і застигає»): on /pokrivelni-roboty, /metalokonstruktsii and
// /betonni-roboty the page's scene plays once as the footer comes up and stops at its trace; the other pages and phones
// have no scene; reduced motion gets the trace at once; a mouse over the footer lights the letters (the lamp).

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function toFooter(page: Page, path: string) {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.goto(path, { waitUntil: 'load' });
  // the page may still grow after the first scroll (late images, islands), carrying the footer off the screen before the
  // scene is fetched: scroll until the word stands in view and stays there
  const word = page.locator('svg.footer-signature');
  await expect.poll(async () => {
    await word.scrollIntoViewIfNeeded();
    return word.evaluate((svg) => {
      const box = svg.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= window.innerHeight;
    });
  }).toBe(true);
}

/** Whether a scene canvas has anything drawn on it */
const painted = (page: Page, layer: 'back' | 'front') => page.locator(`.footer-scene-${layer}`).evaluate((canvas: HTMLCanvasElement) => {
  const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) return true;
  return false;
});

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'the scenes are for 1181 px and wider');

  for (const [path, layer] of [['/pokrivelni-roboty', 'front'], ['/metalokonstruktsii', 'front'], ['/betonni-roboty', 'back']] as const) {
    test(`${path}: the scene plays once and stops at its trace`, async ({ page }) => {
      await toFooter(page, path);
      const stage = page.locator('.footer-signature-stage');
      await expect(stage.locator('canvas.footer-scene')).toHaveCount(2);
      await page.locator('svg.footer-signature').scrollIntoViewIfNeeded();
      await expect(stage).toHaveAttribute('data-scene', 'playing');
      // about five seconds of play, then the still: rest, and the trace stays drawn
      await expect(stage).toHaveAttribute('data-scene', 'rest', { timeout: 12_000 });
      expect(await painted(page, layer)).toBe(true);
    });
  }

  test('a page without a scene has no canvas, and the lamp follows the mouse there too', async ({ page }) => {
    await toFooter(page, '/');
    await expect(page.locator('canvas.footer-scene')).toHaveCount(0);
    const word = page.locator('svg.footer-signature');
    await expect(word).not.toHaveAttribute('data-lamp');
    const box = (await word.boundingBox())!;
    await page.mouse.move(box.x + box.width * .4, box.y + box.height * .3, { steps: 4 });
    await expect(word).toHaveAttribute('data-lamp', 'on');
    // the lamp's point moved to the pointer (viewBox units: x 521–1323)
    const x = Number(await page.locator('#footer-signature-lamp').getAttribute('x'));
    expect(x).toBeGreaterThan(521 + 802 * .3);
    expect(x).toBeLessThan(521 + 802 * .5);
    await page.mouse.move(box.x + box.width * .4, box.y - 2000);
    await expect(word).not.toHaveAttribute('data-lamp');
  });

  test('reduced motion: the trace at once, no play and no lamp', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await toFooter(page, '/metalokonstruktsii');
    const stage = page.locator('.footer-signature-stage');
    await expect(stage).toHaveAttribute('data-scene', 'rest');
    expect(await painted(page, 'front')).toBe(true);
    const box = (await page.locator('svg.footer-signature').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
    await expect(page.locator('svg.footer-signature')).not.toHaveAttribute('data-lamp');
  });
});

test('a phone has no footer scene', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the phone project');
  await toFooter(page, '/pokrivelni-roboty');
  await expect(page.locator('svg.footer-signature')).toBeVisible();
  await expect(page.locator('canvas.footer-scene')).toHaveCount(0);
});
