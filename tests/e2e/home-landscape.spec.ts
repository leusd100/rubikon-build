import { expect, test, type Page } from '@playwright/test';

// W2-16 · HOME on a low landscape window wider than 760 px (PDO-45; owner 21.10: V2). A phone held sideways or a split
// screen: the hero kept the window's height and pushed its 44 px title under the fixed header (90 px hidden at 844×390,
// 23 at 915×412, 79 at 915×356, 120 at 800×360). Now the hero grows with its content under the header and the title is
// 30 px. Windows from 461 px high — 1024×480, 768×1024, 1440×900 — are as before.
// Every test denies the optional cookies and answers any Google request with an empty 200.

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

test.skip(({ isMobile }) => isMobile, 'explicit landscape viewports');

async function hero(page: Page, width: number, height: number) {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.setViewportSize({ width, height });
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect() ?? null;
    const h1 = box('main .hv2-hero h1')!;
    const actions = [...document.querySelectorAll('main .hv2-hero .hero-actions .button')].map((button) => button.getBoundingClientRect());
    const control = box('main .hv2-hero .hero-video-control');
    const overlaps = control ? actions.some((a) => a.right > control.left && a.left < control.right && a.bottom > control.top && a.top < control.bottom) : false;
    return {
      headerBottom: box('.site-header')!.bottom, h1Top: h1.top, h1Size: parseFloat(getComputedStyle(document.querySelector('main .hv2-hero h1')!).fontSize),
      callBottom: box('main .hv2-hero .hero-call-primary')!.bottom, overlaps, innerHeight,
    };
  });
}

for (const { width, height, callInView } of [{ width: 844, height: 390, callInView: true }, { width: 915, height: 412, callInView: true }, { width: 915, height: 356, callInView: false }, { width: 800, height: 360, callInView: false }]) {
  test(`${width}×${height}: the whole title is under the header${callInView ? ' and the call is in the first screen' : ''}; the pause control lies on no action`, async ({ page }) => {
    const m = await hero(page, width, height);
    expect(m.h1Size).toBe(30);
    expect(m.h1Top, 'the title starts at least 8 px under the header').toBeGreaterThanOrEqual(m.headerBottom + 8);
    if (callInView) expect(m.callBottom, 'the call in the first screen').toBeLessThanOrEqual(m.innerHeight);
    expect(m.overlaps).toBe(false);
  });
}

for (const { width, height } of [{ width: 1024, height: 480 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
  test(`${width}×${height}: as before — the title keeps its size`, async ({ page }) => {
    const m = await hero(page, width, height);
    expect(m.h1Size).toBeGreaterThan(40);
    expect(m.h1Top).toBeGreaterThanOrEqual(m.headerBottom);
  });
}
