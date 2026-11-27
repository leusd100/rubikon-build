import { expect, test, type Locator, type Page } from '@playwright/test';

// The hero trace applied further (owner, 20.11: «так само застосуємо»):
// - /napryamky: each slide of the hero sequence draws its photo's own lines, then a copper edge leaves the photo behind —
//   the first slide as the hero's first view, every next one on its turn, in the first round and once a session;
// - /angary «Реальний об’єкт»: the built hangar's lines draw on the sheet's paper, then the plot turns them into the photo.
// These pin what that promised: each drawing is the one of the file the photo shows and lies on it exactly; the intro
// starts with the photo in and the drawing loaded, on one clock; it ends with the photo alone, under the overlay and
// copy; nothing moves; reduced motion, a seen sequence or a late drawing get the page as before.

type Probe = Window & { __shifts?: { value: number; from: string[] }[]; __runs?: { at: number; photo: string; drawing: string; turn: boolean }[] };

async function open(page: Page, path: string, { waitUntil = 'load' as 'load' | 'domcontentloaded' } = {}) {
  await page.addInitScript(() => {
    try { localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' })); } catch { /* storage unavailable */ }
    const state = window as Probe;
    state.__shifts = [];
    state.__runs = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean; sources: { node?: Node }[] })[]) {
        if (!entry.hadRecentInput) state.__shifts!.push({ value: entry.value, from: entry.sources.map((source) => (source.node as Element | undefined)?.className ?? '') });
      }
    }).observe({ type: 'layout-shift', buffered: true });
    // what was true each time a slide's intro clock started
    new MutationObserver((records) => {
      for (const record of records) {
        const hero = record.target as HTMLElement;
        if (!hero.classList.contains('directions-subhero') || !hero.hasAttribute('data-hero-run')) continue;
        const photo = hero.querySelector<HTMLImageElement>('.directions-hero-sequence-image.is-active');
        const drawing = hero.querySelector<HTMLImageElement>('.dhs-trace');
        state.__runs!.push({
          at: performance.now(),
          photo: photo?.complete && photo.naturalWidth ? photo.currentSrc : '',
          drawing: drawing?.complete ? drawing.currentSrc : '',
          turn: hero.hasAttribute('data-hero-turn'),
        });
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-hero-run'] });
  });
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.goto(path, { waitUntil });
}

const hero = (page: Page) => page.locator('.directions-subhero');
const veil = (page: Page) => page.locator('.directions-subhero .dhs-veil');
const trace = (page: Page) => page.locator('.directions-subhero .dhs-trace');
const activeSlide = (page: Page) => page.locator('.directions-subhero .directions-hero-sequence-image.is-active');
// Layout shifts of the drawing's own layers and the slides under them. The hero's words can shift when a font comes in
// late on CI — that is typography.spec's to hold (Main Regression 44896229264: the copy moved 0.035 at 390 while
// Fixel loaded, and typography:26 failed in the same run); this file holds what the drawing moves
const DRAWING = /(^|\s)(dhs-(veil|scan|trace|trace-frame)|directions-hero-sequence-image|sheet-trace|sheet-cover)(\s|$)/;
const drawingShifts = (page: Page) => page.evaluate((source) => (window as Probe).__shifts!.filter((shift) => shift.from.some((from) => new RegExp(source).test(from))), DRAWING.source);
const runs = (page: Page) => page.evaluate(() => (window as Probe).__runs!);
const file = (url: string) => url.split('/').pop() ?? '';

// The photo's file names its theme, direction and crop; its drawing's must name the same
function drawingOf(photo: string) {
  const name = file(photo);
  const [, style, direction] = /(?:directions-sequence|mobile-directions)-(daylight|blue-hour)-([a-z-]+?)(?:-portrait)?-\d+w\./.exec(name) ?? [];
  let crop = name.includes('-portrait-') ? 'portrait' : 'landscape';
  if (name.startsWith('mobile-directions-')) crop = 'mobile';
  return new RegExp(`^seq-trace-${style}-${direction}-${crop}\\.[0-9a-f]{8}\\.svg$`);
}

const layout = (locator: Locator) => locator.evaluate((element: HTMLElement) => {
  const box = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return { box: [box.x, box.y, box.width, box.height].map((v) => Math.round(v) + 0), fit: style.objectFit, position: style.objectPosition, mask: style.maskImage };
});
const settleStarts = (locator: Locator) => locator.evaluate((element) =>
  element.getAnimations().filter((a) => (a as CSSAnimation).animationName === 'hero-settle').map((a) => Math.round(Number(a.startTime))));
const hidden = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).visibility);

for (const { viewport, scheme, crop } of [
  { viewport: { width: 1440, height: 900 }, scheme: 'light', crop: /^seq-trace-daylight-angary-landscape\./ },
  { viewport: { width: 768, height: 1024 }, scheme: 'dark', crop: /^seq-trace-blue-hour-angary-portrait\./ },
  { viewport: { width: 390, height: 844 }, scheme: 'light', crop: /^seq-trace-daylight-angary-mobile\./ },
] as const) {
  test(`/napryamky at ${viewport.width} (${scheme}): the first slide draws on its own photo, then the photo is left alone`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'viewports are set explicitly; one project is enough');
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize(viewport);
    await open(page, '/napryamky');

    await expect(hero(page)).toHaveAttribute('data-hero-run', '');
    const [first] = await runs(page);
    expect(first.photo, 'the photo was in when the intro started').not.toBe('');
    expect(file(first.drawing), 'the drawing had loaded when the intro started').toMatch(drawingOf(first.photo));
    expect(file(first.drawing)).toMatch(crop);
    expect(first.turn).toBe(false);
    // the first view's drawing is asked for at high priority, not behind the page's low module preloads (Experiment 92626876)
    expect(await trace(page).evaluate((el: HTMLImageElement) => el.fetchPriority)).toBe('high');
    // the photo and its drawing settle on one clock
    expect(await settleStarts(trace(page))).toEqual(await settleStarts(activeSlide(page)));

    await expect.poll(() => hidden(veil(page)), { timeout: 8_000 }).toBe('hidden');
    await expect.poll(() => hidden(trace(page)), { timeout: 8_000 }).toBe('hidden');
    await expect.poll(() => activeSlide(page).evaluate((el) => getComputedStyle(el).transform), { timeout: 5_000 }).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    // the drawing lies exactly as the slide does (a hidden element keeps its box)
    expect(await layout(trace(page))).toEqual(await layout(activeSlide(page)));
    expect(await drawingShifts(page)).toEqual([]);
  });
}

test('/napryamky: the next slide draws on its turn, under the paper, with the drawing of its own photo', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/napryamky');
  await expect(hero(page)).toHaveAttribute('data-hero-run', '');
  // the turn (6 s a slide): the paper comes over the slide going out, the slides swap under it, quickly
  await expect(hero(page)).toHaveAttribute('data-hero-turn', '', { timeout: 10_000 });
  expect(await page.locator('.directions-hero-sequence-image').evaluateAll((slides) =>
    slides.map((slide) => getComputedStyle(slide).transitionDuration.split(', ')[0]))).toEqual(Array(5).fill('0.3s'));
  await expect.poll(async () => (await runs(page)).length).toBe(2);
  const [, turn] = await runs(page);
  expect(turn.turn).toBe(true);
  expect(file(turn.photo)).toMatch(/^directions-sequence-daylight-zernoskhovyshcha-/);
  // the drawing was loaded ahead: the turn starts it at once
  expect(file(turn.drawing)).toMatch(drawingOf(turn.photo));
  expect(await settleStarts(trace(page))).toEqual(await settleStarts(activeSlide(page)));
  await expect.poll(() => hidden(trace(page)), { timeout: 8_000 }).toBe('hidden');
  expect(await layout(trace(page))).toEqual(await layout(activeSlide(page)));
  // nothing of the drawing's moves anything (the caption's own words narrowing at a turn, «02 / 05 · Зерносховища»,
  // shift it by a hair with or without the drawing — the sequence's, measured 20.11)
  expect(await drawingShifts(page)).toEqual([]);
});

test('/napryamky: the paper and the lines lie under the hero\'s overlay and copy, over the slides', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/napryamky');
  await expect(hero(page)).toHaveAttribute('data-hero-run', '');
  const order = await page.evaluate(() => {
    const layers = [...document.querySelectorAll<HTMLElement>('.dhs-veil, .dhs-trace')];
    for (const layer of layers) layer.style.pointerEvents = 'auto';
    const name = (el: Element) => ['subhero-overlay', 'dhs-trace', 'dhs-veil', 'directions-hero-sequence-image'].find((c) => el.classList.contains(c));
    const stack = document.elementsFromPoint(innerWidth * 0.8, innerHeight * 0.5).map(name).filter(Boolean);
    for (const layer of layers) layer.style.pointerEvents = '';
    return [...new Set(stack)];
  });
  expect(order).toEqual(['subhero-overlay', 'dhs-trace', 'dhs-veil', 'directions-hero-sequence-image']);
});

test('/napryamky: a hero that leaves the screen mid-drawing ends it and leaves the slide', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/napryamky');
  await expect(hero(page)).toHaveAttribute('data-hero-run', '');
  await page.evaluate(() => window.scrollTo(0, 2400));
  await expect(hero(page)).not.toHaveAttribute('data-hero-run');
  await expect(hero(page)).not.toHaveAttribute('data-hero-play');
  expect(await page.evaluate(() => document.getAnimations().filter((a) => /^hero-/.test((a as CSSAnimation).animationName)).length)).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(veil(page)).toHaveCSS('display', 'none');
  await expect(trace(page)).toHaveCSS('display', 'none');
  await expect(activeSlide(page)).toHaveCSS('transform', 'none');
});

test('/napryamky plays once a session: a return gets the slides as before, its turns too', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/napryamky');
  await expect(hero(page)).toHaveAttribute('data-hero-run', '');
  await page.goto('/napryamky', { waitUntil: 'domcontentloaded' });
  await expect(hero(page)).not.toHaveAttribute('data-hero-play');
  await expect(veil(page)).toHaveCSS('display', 'none');
  // the turn comes, undrawn
  await expect(page.locator('.dhs-caption b')).toHaveText('02', { timeout: 10_000 });
  await expect(hero(page)).not.toHaveAttribute('data-hero-turn');
  expect(await runs(page)).toEqual([]);
  expect(await trace(page).evaluate((img: HTMLImageElement) => img.currentSrc)).toBe('');
});

test('/napryamky with reduced motion: no paper and no drawing, nothing fetched for them', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  const drawings: string[] = [];
  page.on('request', (request) => { if (/\/(seq|sheet)-trace-/.test(request.url())) drawings.push(request.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/napryamky');
  await expect(hero(page)).not.toHaveAttribute('data-hero-play');
  await expect(veil(page)).toHaveCSS('display', 'none');
  await expect(trace(page)).toHaveCSS('display', 'none');
  expect(drawings).toEqual([]);
});

for (const { name, scheme, filter } of [
  { name: 'dark', scheme: 'dark', filter: 'invert(1) hue-rotate(180deg)' },
  { name: 'light (daylight)', scheme: 'light', filter: 'none' },
] as const) {
  test(`/napryamky: the lines read on the ${name} hero, and the paper is the hero's own colour`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'one project is enough');
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, '/napryamky');
    await expect(hero(page)).toHaveAttribute('data-hero-run', '');
    await expect(trace(page)).toHaveCSS('filter', filter);
    const colours = await page.evaluate(() => ({
      veil: getComputedStyle(document.querySelector('.dhs-veil')!).backgroundColor,
      hero: getComputedStyle(document.querySelector('.directions-subhero')!).backgroundColor,
    }));
    expect(colours.veil).toBe(colours.hero);
  });
}

// /angary «Реальний об’єкт»
const sheet = (page: Page) => page.locator('.angary-real-sheet');
const sheetTrace = (page: Page) => page.locator('.angary-real-sheet .sheet-trace');
const sheetPhoto = (page: Page) => page.locator('.angary-real-sheet .sheet-image img');

async function bringSheetIn(page: Page) {
  // the photo first (it is lazy), short of the sheet's 35 % line; then the sheet
  await page.evaluate(() => scrollTo(0, document.querySelector('.angary-real-sheet')!.getBoundingClientRect().top + scrollY - innerHeight - 100));
  await expect.poll(() => sheetPhoto(page).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(sheet(page)).toHaveAttribute('data-sheet-state', 'armed');
  await sheet(page).evaluate((el) => el.scrollIntoView({ block: 'center' }));
}

for (const { viewport, scheme, filter } of [
  { viewport: { width: 1440, height: 900 }, scheme: 'light', filter: 'none' },
  { viewport: { width: 390, height: 844 }, scheme: 'dark', filter: 'invert(1) hue-rotate(180deg)' },
] as const) {
  test(`/angary at ${viewport.width} (${scheme}): the built hangar's lines draw on the sheet, then the plot turns them into the photo`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'viewports are set explicitly; one project is enough');
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize(viewport);
    await open(page, '/angary');
    await bringSheetIn(page);
    await expect(sheet(page)).toHaveAttribute('data-sheet-trace', '');
    await expect(sheet(page)).toHaveAttribute('data-sheet-state', 'on');
    expect(file(await sheetTrace(page).evaluate((img: HTMLImageElement) => img.currentSrc))).toMatch(/^sheet-trace-hangar-1536w\.[0-9a-f]{8}\.svg$/);
    await expect(sheetTrace(page)).toHaveCSS('filter', filter);
    // the plot waits for the lines
    await expect(sheet(page).locator('.sheet-cover')).toHaveCSS('transition-delay', '1.1s');
    // the drawing lies as the photo does (read in one go: the page may still be gliding), and goes once the plot has passed
    const [drawn, photo] = await sheet(page).evaluate((el) => ['.sheet-trace', '.sheet-image img'].map((selector) => {
      const element = el.querySelector(selector)!;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { box: [rect.x, rect.y, rect.width, rect.height].map((v) => Math.round(v) + 0), fit: style.objectFit, position: style.objectPosition };
    }));
    expect(drawn).toEqual(photo);
    await expect.poll(() => hidden(sheetTrace(page)), { timeout: 6_000 }).toBe('hidden');
    await expect.poll(() => sheet(page).locator('.sheet-cover').evaluate((el) => getComputedStyle(el).transform), { timeout: 4_000 }).toBe('matrix(1, 0, 0, 0, 0, 0)');
  });
}

test('/angary: a drawing not in within .7 s is not waited for — the sheet plots as before', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\/sheet-trace-hangar-/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.continue();
  });
  await open(page, '/angary');
  await bringSheetIn(page);
  await expect(sheet(page)).toHaveAttribute('data-sheet-state', 'on', { timeout: 1_500 });
  await expect(sheet(page)).not.toHaveAttribute('data-sheet-trace');
  // and when it does come, it stays out of sight
  await expect.poll(() => sheetTrace(page).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 5_000 }).toBe(true);
  await expect(sheet(page)).not.toHaveAttribute('data-sheet-trace');
  await expect(sheetTrace(page)).toHaveCSS('display', 'none');
});

test('/angary with reduced motion: the sheet stands complete and its drawing is never fetched', async ({ page, isMobile }) => {
  test.skip(isMobile, 'one project is enough');
  const drawings: string[] = [];
  page.on('request', (request) => { if (/\/sheet-trace-/.test(request.url())) drawings.push(request.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/angary');
  await sheet(page).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  // the sheet in view with its photo in: where motion is allowed it would have plotted by now
  await expect.poll(() => sheetPhoto(page).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(sheet(page)).not.toHaveAttribute('data-sheet-state');
  await expect(sheetTrace(page)).toHaveCSS('display', 'none');
  expect(drawings).toEqual([]);
});
