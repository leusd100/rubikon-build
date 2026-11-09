import { expect, test, type Page } from '@playwright/test';

// The footer's embossed RUBIKON (owner 08–09.11): on the eight pages with a live scene of their own, that scene plays on
// the word continuously while the footer is on the screen and pauses off it; the home page plays all eight in turn and the
// 404 page lowers the word's missing O into place; the privacy page and phones have no scene;
// reduced motion gets one still frame; a mouse over the footer lights the letters (the lamp).

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function toFooter(page: Page, path: string) {
  await page.addInitScript(recordStates);
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
  // a cold server builds the page's islands on the first visit: the page settles later than on a warm one
  }, { timeout: 20_000 }).toBe(true);
}

type Change = { state: string; at: number };
/** Every value the stage's data-scene took, with when (recordStates, before the page loads) */
const changes = (page: Page) => page.evaluate(() => (window as unknown as { sceneStates: Change[] }).sceneStates);
const states = async (page: Page) => (await changes(page)).map((change) => change.state);
const recordStates = () => {
  const seen: Change[] = [];
  (window as unknown as { sceneStates: Change[] }).sceneStates = seen;
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const state = (mutation.target as HTMLElement).dataset.scene;
      // every write, repeats included: a play restarted over itself must show
      if (state) seen.push({ state, at: performance.now() });
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-scene'] });
};

/** Whether a scene canvas has anything drawn on it */
const painted = (page: Page, layer: 'back' | 'front') => page.locator(`.footer-scene-${layer}`).evaluate((canvas: HTMLCanvasElement) => {
  const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) return true;
  return false;
});

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'the scenes are for 1181 px and wider');

  // every page with a live scene of its own: the canvas its scene draws on (behind the word for the pour and the frame)
  const pages = [
    ['/pokrivelni-roboty', 'front'], ['/metalokonstruktsii', 'front'], ['/betonni-roboty', 'back'], ['/zernoskhovyshcha', 'front'],
    ['/yak-pratsyuiemo', 'front'], ['/angary', 'back'], ['/pro-nas', 'front'], ['/napryamky', 'front'],
    // home: every direction in turn, starting with the rain; 404: the missing O lowered into place
    ['/', 'front'], ['/takoi-storinky-nemaie', 'front'],
  ] as const;
  for (const [path, layer] of pages) {
    test(`${path}: the scene plays on while the footer is on the screen, and pauses off it`, async ({ page }) => {
      await toFooter(page, path);
      const stage = page.locator('.footer-signature-stage');
      await expect(stage.locator('canvas.footer-scene')).toHaveCount(2);
      await expect(stage).toHaveAttribute('data-scene', 'playing');
      // the first frames come after the scene's module is fetched and the word measured: slower on a loaded machine
      await expect.poll(() => painted(page, layer), { timeout: 15_000 }).toBe(true);
      // still going after the length the one-shot version had (owner 09.11: continuous, as before)
      const frame = () => page.locator(`.footer-scene-${layer}`).evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
      const first = await frame();
      await expect.poll(frame, { timeout: 10_000 }).not.toBe(first);
      expect(await states(page)).not.toContain('rest');
      // off the screen it pauses, and plays again on the way back
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(stage).toHaveAttribute('data-scene', 'paused');
      await page.locator('svg.footer-signature').scrollIntoViewIfNeeded();
      await expect(stage).toHaveAttribute('data-scene', 'playing');
    });
  }

  test('the 404 page leaves the O out of the word and lowers it in; every other page has the whole word', async ({ page }) => {
    await toFooter(page, '/takoi-storinky-nemaie');
    await expect(page.locator('main.not-found-page')).toBeVisible();
    await expect(page.locator('svg.footer-signature path.footer-signature-letters.footer-signature-o')).toBeHidden();
    await expect(page.locator('.footer-signature-stage')).toHaveAttribute('data-scene', 'playing');
    await toFooter(page, '/pokrivelni-roboty');
    await expect(page.locator('svg.footer-signature path.footer-signature-letters.footer-signature-o')).toBeAttached();
    expect(await page.locator('svg.footer-signature path.footer-signature-letters.footer-signature-o').evaluate((path) => getComputedStyle(path).display)).not.toBe('none');
  });

  test('a page without a scene has no canvas, and the lamp follows the mouse there too', async ({ page }) => {
    await toFooter(page, '/polityka-konfidentsiinosti');
    await expect(page.locator('canvas.footer-scene')).toHaveCount(0);
    const word = page.locator('svg.footer-signature');
    await expect(word).not.toHaveAttribute('data-lamp');
    const box = (await word.boundingBox())!;
    // into the footer from a point above it on the screen, then onto the word
    const footer = (await page.locator('footer').boundingBox())!;
    await page.mouse.move(box.x + box.width * .4, Math.max(2, footer.y - 40));
    await page.mouse.move(box.x + box.width * .4, box.y + box.height * .3, { steps: 4 });
    await expect(word).toHaveAttribute('data-lamp', 'on');
    // the lamp's point glides to the pointer (viewBox units: x 521–1323)
    await expect.poll(async () => Number(await page.locator('#footer-signature-lamp').getAttribute('x'))).toBeGreaterThan(521 + 802 * .35);
    expect(Number(await page.locator('#footer-signature-lamp').getAttribute('x'))).toBeLessThan(521 + 802 * .45);
    // out of the footer to a point on the screen above it
    await page.mouse.move(box.x + box.width * .4, Math.max(2, footer.y - 40), { steps: 4 });
    await expect(word).not.toHaveAttribute('data-lamp');
  });

  test('reduced motion: one still frame of the scene, no play and no lamp', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await toFooter(page, '/metalokonstruktsii');
    const stage = page.locator('.footer-signature-stage');
    await expect(stage).toHaveAttribute('data-scene', 'still');
    expect(await states(page)).toEqual(['still']);
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
