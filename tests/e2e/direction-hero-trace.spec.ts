import { expect, test, type Page } from '@playwright/test';

// The hero trace (owner, 20.11, prototype B): a direction page's first view draws its photo in the photo's own lines,
// then the photo develops from under a veil of the hero's colour. These pin what it promised: the drawing lies on the
// photo (same box, same fit and position) at every crop; the intro starts only once the photo and its drawing are in, and
// on one clock; it ends with the photo alone; nothing moves; a slow link, a seen hero or reduced motion get the photo at
// once; and the lines read on a dark hero as on a light one.

type Probe = Window & { __traceShifts?: number[]; __traceRun?: { at: number; photoComplete: boolean; drawing: string } };

async function open(page: Page, path: string, { waitUntil = 'load' as 'load' | 'domcontentloaded' } = {}) {
  await page.addInitScript(() => {
    try { localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' })); } catch { /* storage unavailable */ }
    const state = window as Probe;
    state.__traceShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) state.__traceShifts!.push(entry.value);
      }
    }).observe({ type: 'layout-shift', buffered: true });
    // what was true the moment the intro's clock started
    new MutationObserver((records) => {
      for (const record of records) {
        const media = record.target as HTMLElement;
        if (record.attributeName !== 'data-hero-run' || !media.hasAttribute('data-hero-run') || state.__traceRun) continue;
        const photo = media.querySelector<HTMLImageElement>('.direction-hero-image');
        const drawing = media.querySelector<HTMLImageElement>('.direction-hero-trace');
        state.__traceRun = { at: performance.now(), photoComplete: Boolean(photo?.complete && photo.naturalWidth), drawing: drawing?.complete ? drawing.currentSrc : '' };
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-hero-run'] });
  });
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.goto(path, { waitUntil });
}

const media = (page: Page) => page.locator('.service-subhero-media');
const veil = (page: Page) => page.locator('.service-subhero-media .direction-hero-veil');
const trace = (page: Page) => page.locator('.service-subhero-media .direction-hero-trace');
const photo = (page: Page) => page.locator('.service-subhero-media .direction-hero-image');

for (const { route, viewport, file } of [
  { route: '/metalokonstruktsii', viewport: { width: 1440, height: 900 }, file: /hero-trace-metalokonstruktsii-1536w\.[0-9a-f]{8}\.svg$/ },
  { route: '/angary', viewport: { width: 768, height: 1024 }, file: /hero-trace-angary-1536w\.[0-9a-f]{8}\.svg$/ },
  { route: '/metalokonstruktsii', viewport: { width: 390, height: 844 }, file: /hero-trace-metalokonstruktsii-portrait-784w\.[0-9a-f]{8}\.svg$/ },
  { route: '/pokrivelni-roboty', viewport: { width: 390, height: 844 }, file: /hero-trace-pokrivelni-roboty-roof-mobile-784w\.[0-9a-f]{8}\.svg$/ },
] as const) {
  test(`${route} at ${viewport.width}: the photo's own lines lie on it, then the photo is left alone, and nothing moves`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'viewports are set explicitly; one project is enough');
    await page.setViewportSize(viewport);
    await open(page, route);

    // the intro starts on one clock, once the photo is in and the drawing of this crop has loaded
    await expect(media(page)).toHaveAttribute('data-hero-run', '');
    const run = await page.evaluate(() => (window as Probe).__traceRun);
    expect(run?.photoComplete, 'the photo was in when the intro started').toBe(true);
    expect(run?.drawing, 'the drawing had loaded when the intro started').toMatch(file);

    // the photo and its drawing settle on one clock (the same zoom at every moment)…
    const settle = (locator: ReturnType<typeof photo>) => locator.evaluate((element) =>
      element.getAnimations().filter((a) => (a as CSSAnimation).animationName === 'hero-settle').map((a) => Math.round(Number(a.startTime))));
    expect(await settle(trace(page))).toEqual(await settle(photo(page)));

    // the intro ends with the photo alone
    await expect.poll(() => veil(page).evaluate((el) => getComputedStyle(el).visibility), { timeout: 8_000 }).toBe('hidden');
    await expect.poll(() => trace(page).evaluate((el) => getComputedStyle(el).visibility), { timeout: 8_000 }).toBe('hidden');

    // …and the drawing lies exactly as the photo does (a hidden element keeps its box)
    const layout = (locator: ReturnType<typeof photo>) => locator.evaluate((element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { box: [box.x, box.y, box.width, box.height].map((v) => Math.round(v) + 0 /* -0, a hair left of 0, is 0 */), fit: style.objectFit, position: style.objectPosition, mask: style.maskImage, transform: style.transform };
    });
    // settled: no zoom left (the animation holds its last frame as the identity matrix)
    await expect.poll(() => photo(page).evaluate((el) => getComputedStyle(el).transform), { timeout: 5_000 }).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    expect(await layout(trace(page))).toEqual(await layout(photo(page)));
    expect(await page.evaluate(() => (window as Probe).__traceShifts)).toEqual([]);
  });
}

test('the veil and the lines lie under the hero\'s overlay and copy, as the photo does', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/metalokonstruktsii');
  await expect(media(page)).toHaveAttribute('data-hero-run', '');
  // what paints over what at a point of the hero: the veil and the drawing let the pointer through, so for this read they
  // take it, and elementsFromPoint lists the layers top first
  const order = await page.evaluate(() => {
    const layers = [...document.querySelectorAll<HTMLElement>('.direction-hero-veil, .direction-hero-trace')];
    for (const layer of layers) layer.style.pointerEvents = 'auto';
    const name = (el: Element) => ['service-subhero-overlay', 'direction-hero-trace', 'direction-hero-veil', 'direction-hero-image'].find((c) => el.classList.contains(c));
    const stack = document.elementsFromPoint(innerWidth * 0.8, innerHeight * 0.5).map(name).filter(Boolean);
    for (const layer of layers) layer.style.pointerEvents = '';
    return stack;
  });
  expect(order).toEqual(['service-subhero-overlay', 'direction-hero-trace', 'direction-hero-veil', 'direction-hero-image']);
});

test('a hero that leaves the screen mid-intro ends it and leaves the photo', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/metalokonstruktsii');
  await expect(media(page)).toHaveAttribute('data-hero-run', '');
  // away before the intro's 3 s are up: nothing keeps animating out of sight (Nightly 44891291892 on #323)
  await page.evaluate(() => window.scrollTo(0, 2400));
  await expect(media(page)).not.toHaveAttribute('data-hero-run');
  await expect(media(page)).not.toHaveAttribute('data-hero-play');
  expect(await page.evaluate(() => document.getAnimations().filter((a) => /^hero-/.test((a as CSSAnimation).animationName)).length)).toBe(0);
  // back up: the photo, as it would have been at the end, with nothing over it
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(veil(page)).toHaveCSS('display', 'none');
  await expect(trace(page)).toHaveCSS('display', 'none');
  await expect(photo(page)).toHaveCSS('transform', 'none');
  await expect(photo(page)).toBeVisible();
});

test('it plays once a session per hero: a return shows the photo at once', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/metalokonstruktsii');
  await expect(media(page)).toHaveAttribute('data-hero-run', '');
  await page.goto('/metalokonstruktsii', { waitUntil: 'domcontentloaded' });
  await expect(media(page)).not.toHaveAttribute('data-hero-play');
  await expect(veil(page)).toHaveCSS('display', 'none');
  await expect(trace(page)).toHaveCSS('display', 'none');
  // another direction's first view still plays
  await page.goto('/angary', { waitUntil: 'domcontentloaded' });
  await expect(media(page)).toHaveAttribute('data-hero-play', '');
});

test('a slow link gets the photo as before: no photo within 2.5 s and the intro is dropped', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/media-responsive\/direction-hero-photo-variant-/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    await route.continue();
  });
  await open(page, '/metalokonstruktsii', { waitUntil: 'domcontentloaded' });
  await expect(media(page)).toHaveAttribute('data-hero-play', '');
  await expect(media(page)).not.toHaveAttribute('data-hero-play', { timeout: 5_000 });
  await expect(veil(page)).toHaveCSS('display', 'none');
  await expect(media(page)).not.toHaveAttribute('data-hero-run');
  // the photo shows when it comes, with nothing over it
  await expect.poll(() => photo(page).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 10_000 }).toBe(true);
  await expect(trace(page)).toHaveCSS('display', 'none');
});

test('reduced motion: no veil and no drawing, the photo at once', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/metalokonstruktsii');
  await expect(media(page)).not.toHaveAttribute('data-hero-play');
  await expect(veil(page)).toHaveCSS('display', 'none');
  await expect(trace(page)).toHaveCSS('display', 'none');
  // nothing was fetched for an intro that will not play
  expect(await trace(page).evaluate((img: HTMLImageElement) => img.currentSrc)).toBe('');
});

for (const { name, path, scheme, viewport, filter } of [
  { name: 'a dark hero in the dark theme', path: '/metalokonstruktsii', scheme: 'dark', viewport: { width: 1440, height: 900 }, filter: 'invert(1) hue-rotate(180deg)' },
  { name: 'the dark hero of /planner-preview in the light theme', path: '/planner-preview', scheme: 'light', viewport: { width: 1440, height: 900 }, filter: 'invert(1) hue-rotate(180deg)' },
  { name: 'the light (daylight) hero in the light theme', path: '/metalokonstruktsii', scheme: 'light', viewport: { width: 1440, height: 900 }, filter: 'none' },
] as const) {
  test(`the lines read on ${name}`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'one project is enough');
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize(viewport);
    await open(page, path);
    await expect(media(page)).toHaveAttribute('data-hero-run', '');
    await expect(trace(page)).toHaveCSS('filter', filter);
    // the veil is the hero's own colour, whatever the theme
    const colours = await page.evaluate(() => ({
      veil: getComputedStyle(document.querySelector('.direction-hero-veil')!).backgroundColor,
      hero: getComputedStyle(document.querySelector('.service-subhero')!).backgroundColor,
    }));
    expect(colours.veil).toBe(colours.hero);
  });
}
