import { expect, test, type Page } from '@playwright/test';

// A visit by a link with a fragment — `rubikonbuild.com/#inquiry` from a card, a profile or a message — lands on its
// target (HashLanding.tsx). On production (10.11) the browser's smooth glide to #inquiry aimed at where the form stood
// before HOME's islands hydrated above it, and ended 781 px above it on a desktop and 965 px on a Pixel 7 in 3–5 visits
// of 5. Here the page's scripts are held back until the browser has glided, so the late growth comes every time.

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

/** Holds the page's own scripts back, so the page hydrates (and the blocks above the form grow) after the glide */
async function hydrateLate(page: Page) {
  await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
}

/** Where the target stands against where it should: its top minus its scroll-margin-top, in px */
const offFromPlace = (page: Page, id: string) => page.evaluate((id) => {
  const target = document.getElementById(id)!;
  return Math.round(target.getBoundingClientRect().top - Number.parseFloat(getComputedStyle(target).scrollMarginTop));
}, id);

/** Waits until the page has hydrated and stood still for a moment */
async function settled(page: Page) {
  await expect(page.locator('#inquiry form.inquiry-form')).toBeAttached();
  await expect.poll(() => page.evaluate(() => new Promise<number>((resolve) => {
    const before = document.documentElement.scrollHeight;
    setTimeout(() => resolve(document.documentElement.scrollHeight - before), 1500);
  })), { timeout: 20_000 }).toBe(0);
}

for (const path of ['/', '/angary']) {
  test(`${path}#inquiry from outside lands on the request block, also when the page grows above it after the glide`, async ({ page }) => {
    await hydrateLate(page);
    await page.goto(`${path}#inquiry`, { waitUntil: 'load' });
    await settled(page);
    expect(Math.abs(await offFromPlace(page, 'inquiry'))).toBeLessThanOrEqual(2);
  });
}

test('the visitor\'s own scroll ends the landing: a later growth above no longer pulls the page back', async ({ page }) => {
  await hydrateLate(page);
  await page.goto('/#inquiry', { waitUntil: 'load' });
  await expect(page.locator('#inquiry form.inquiry-form')).toBeAttached();
  await expect.poll(() => offFromPlace(page, 'inquiry').then(Math.abs), { timeout: 20_000 }).toBeLessThanOrEqual(2);
  await page.keyboard.press('PageUp');
  await expect.poll(() => offFromPlace(page, 'inquiry'), { timeout: 5_000 }).toBeGreaterThan(200);
  const before = await offFromPlace(page, 'inquiry');
  // a block above grows by 400 px, as an island would. Resolved once a ResizeObserver made after HashLanding's has seen
  // the growth (observers run in the order they were made, in the same frame) and two frames more: by then a landing
  // still running would have put the form back
  await page.evaluate(() => new Promise<void>((resolve) => {
    const grown = document.documentElement.getBoundingClientRect().height + 390;
    const seen = new ResizeObserver((entries, observer) => {
      if (entries[0].contentRect.height < grown) return;
      observer.disconnect();
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    const block = document.createElement('div');
    block.style.height = '400px';
    const main = document.querySelector('main')!;
    // insertBefore, not prepend: the Workers types give Element prepend as HTMLRewriter's
    main.insertBefore(block, main.firstChild);
    seen.observe(document.documentElement);
  }));
  expect(await offFromPlace(page, 'inquiry')).toBeGreaterThanOrEqual(before + 390);
});

test('a reload keeps the place the browser restores, not the fragment\'s', async ({ page }) => {
  await page.goto('/#inquiry', { waitUntil: 'load' });
  await settled(page);
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(300);
  await page.reload({ waitUntil: 'load' });
  await settled(page);
  expect(Math.abs(await offFromPlace(page, 'inquiry'))).toBeGreaterThan(200);
});
