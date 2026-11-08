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

  for (const [path, layer] of [['/pokrivelni-roboty', 'front'], ['/metalokonstruktsii', 'front'], ['/betonni-roboty', 'back']] as const) {
    test(`${path}: the scene plays once and stops at its trace`, async ({ page }) => {
      await toFooter(page, path);
      const stage = page.locator('.footer-signature-stage');
      await expect(stage.locator('canvas.footer-scene')).toHaveCount(2);
      await page.locator('svg.footer-signature').scrollIntoViewIfNeeded();
      // about five seconds of play, then the still. The states are recorded as they change (states(), below), so a busy
      // machine that is slow to look still sees the play happen and end — never a «rest» drawn at once
      await expect.poll(() => states(page), { timeout: 30_000 }).toEqual(['playing', 'rest']);
      // a real play, not one cut short: the rest comes seconds after the start (review 08.11: a resize observer cut it to
      // 150 ms, and a ratio-blind observer restarted it)
      const [start, end] = await changes(page);
      expect(end.at - start.at).toBeGreaterThan(3500);
      expect(await painted(page, layer)).toBe(true);
      // a small scroll with the word still on the screen neither replays it nor wipes the trace: each scroll is waited
      // for by the page's own position, then two frames, in which a replay would have set «playing» (Sonar S2925)
      for (const delta of [-120, 120]) {
        const before = await page.evaluate(() => window.scrollY);
        await page.mouse.wheel(0, delta);
        await expect.poll(() => page.evaluate(() => window.scrollY)).not.toBe(before);
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      }
      expect(await states(page)).toEqual(['playing', 'rest']);
      expect(await painted(page, layer)).toBe(true);
    });
  }

  test('a page without a scene has no canvas, and the lamp follows the mouse there too', async ({ page }) => {
    await toFooter(page, '/');
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

  test('reduced motion: the trace at once, no play and no lamp', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await toFooter(page, '/metalokonstruktsii');
    const stage = page.locator('.footer-signature-stage');
    await expect(stage).toHaveAttribute('data-scene', 'rest');
    expect(await states(page)).toEqual(['rest']);
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
