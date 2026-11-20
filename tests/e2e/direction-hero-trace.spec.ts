import { expect, test, type Page } from '@playwright/test';

// The hero trace (owner, 20.11, prototype B): a direction page's first view draws its photo in the photo's own lines,
// then the photo develops from under a veil of the hero's colour. These pin what it promised: the drawing lies on the
// photo (same box, same fit and position) at every crop, the intro ends with the photo alone, nothing moves, the photo
// is there from the first frame, it plays once a session per page, and never with reduced motion.

type Shifts = Window & { __traceShifts?: number[] };

async function open(page: Page, path: string) {
  await page.addInitScript(() => {
    try { localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' })); } catch { /* storage unavailable */ }
    const state = window as Shifts;
    state.__traceShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) state.__traceShifts!.push(entry.value);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.goto(path, { waitUntil: 'load' });
}

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

    // the drawing of this crop, laid exactly as the photo is
    await expect.poll(() => trace(page).evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(file);
    const layout = (locator: ReturnType<typeof photo>) => locator.evaluate((element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { box: [box.x, box.y, box.width, box.height].map(Math.round), fit: style.objectFit, position: style.objectPosition, mask: style.maskImage };
    });
    expect(await layout(trace(page))).toEqual(await layout(photo(page)));

    // the photo is painted from the first frame (the veil only lies over it), so it is complete well before the veil lifts
    await expect.poll(() => photo(page).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await photo(page).evaluate((img) => getComputedStyle(img).opacity)).toBe('1');

    // the intro ends with the photo alone
    await expect.poll(() => veil(page).evaluate((el) => getComputedStyle(el).visibility), { timeout: 8_000 }).toBe('hidden');
    await expect.poll(() => trace(page).evaluate((el) => getComputedStyle(el).visibility), { timeout: 8_000 }).toBe('hidden');
    expect(await page.evaluate(() => (window as Shifts).__traceShifts)).toEqual([]);
  });
}

test('the veil and the lines lie under the hero\'s overlay and copy, as the photo does', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/metalokonstruktsii');
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

test('it plays once a session per page: a return shows the photo at once', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/metalokonstruktsii');
  await expect(veil(page)).toHaveCSS('display', 'block');
  await page.goto('/metalokonstruktsii', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.service-subhero-media')).toHaveAttribute('data-hero-seen', '');
  await expect(veil(page)).toHaveCSS('display', 'none');
  await expect(page.locator('.direction-hero-trace-picture')).toHaveCSS('display', 'none');
  // another direction's first view still plays
  await page.goto('/angary', { waitUntil: 'domcontentloaded' });
  await expect(veil(page)).toHaveCSS('display', 'block');
});

test('reduced motion: no veil and no drawing, the photo at once', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/metalokonstruktsii');
  await expect(veil(page)).toHaveCSS('display', 'none');
  await expect(page.locator('.direction-hero-trace-picture')).toHaveCSS('display', 'none');
});

test('the dark theme turns the graphite light and keeps the copper', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/metalokonstruktsii');
  await expect(trace(page)).toHaveCSS('filter', 'invert(1) hue-rotate(180deg)');
  // the veil is the hero's own colour, whatever the theme
  const colours = await page.evaluate(() => ({
    veil: getComputedStyle(document.querySelector('.direction-hero-veil')!).backgroundColor,
    hero: getComputedStyle(document.querySelector('.service-subhero')!).backgroundColor,
  }));
  expect(colours.veil).toBe(colours.hero);
});
