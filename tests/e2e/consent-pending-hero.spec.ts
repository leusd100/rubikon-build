import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test, type Page } from '@playwright/test';
import { getFromServer } from './server.helpers';

// PDO-09 (Premium Experience Review 18.10, step W1-08; owner OK 20.10, OD-PX-11 a). On a first visit the cookie banner —
// fixed to the bottom and mounted only after hydration — lay on the phone hero's actions: the second action on 375–430 px,
// the call itself on 320 × 568 (re-measured on main 18efb1f). A flag set in <head> before the first paint
// (data-consent-pending, app/lib/consentStorage.ts) now reserves the banner's room under the hero while no choice is
// stored, and on a short phone puts the actions above the lead, as HOME does — so nothing moves when the banner
// appears. The choice removes the flag and the approved composition returns. The banner's words and logic are unchanged.
// Every test sets its own window (so it runs in desktop-chromium only) and stores no choice beforehand unless it says so.

const INNER_PAGES = ['/napryamky', '/angary', '/zernoskhovyshcha', '/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/pro-nas', '/yak-pratsyuiemo'];
const PENDING = 'data-consent-pending';

// Explicit windows: desktop-chromium only (mobile-chromium is the Pixel 7).
test.skip(({ isMobile }) => isMobile, 'explicit viewports');

// No choice here grants Analytics (only «Лише необхідні» is pressed, the stored choices deny it), so gtag.js is never asked
// for; should that change, every Google request is still answered here and none leaves the test (as consent.spec.ts).
test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
});

/** The phone hero's first-screen parts, rounded to 0.1 px: HOME's hero or an inner page's phone hero */
function heroGeometry(page: Page) {
  return page.evaluate(() => {
    const home = document.querySelector('main[data-home="v2"]');
    const hero = home ? home.querySelector('.hv2-hero') : document.querySelector('main.inner-page > .phone-hero');
    if (!hero) throw new Error('no phone hero');
    const box = (element: Element | null | undefined) => {
      if (!element || element.getClientRects().length === 0) return null;
      const rect = element.getBoundingClientRect();
      return { top: Math.round(rect.top * 10) / 10, bottom: Math.round(rect.bottom * 10) / 10, left: Math.round(rect.left * 10) / 10, width: Math.round(rect.width * 10) / 10 };
    };
    const actions = [...hero.querySelectorAll(home ? '.hero-actions .button' : '.button')].filter((element) => element.getClientRects().length > 0);
    return {
      h1: box(hero.querySelector('h1')),
      lead: box(hero.querySelector(home ? '.hero-lead' : '.service-subhero-lead, .proc-hero-lead, .subhero-side > p')),
      call: box(hero.querySelector('.hero-call-primary')),
      second: box(actions.find((element) => !element.classList.contains('hero-call-primary'))),
      cue: box((home ?? hero).querySelector('.phone-hero-scroll')),
    };
  });
}

async function firstVisitBanner(page: Page) {
  const banner = page.locator('body > .cookie-banner');
  await expect(banner).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return banner;
}

for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }]) {
  for (const path of INNER_PAGES) {
    const second = viewport.width >= 375;
    test(`first visit ${viewport.width}×${viewport.height}, ${path}: the cookie banner leaves the hero’s call${second ? ' and its second action' : ''} clear`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(path, { waitUntil: 'load' });
      const banner = await firstVisitBanner(page);
      const bannerTop = (await banner.boundingBox())!.y;
      const headerBottom = await page.evaluate(() => document.querySelector('.site-header')!.getBoundingClientRect().bottom);
      const hero = await heroGeometry(page);
      expect(hero.call, 'the hero has its call').not.toBeNull();
      expect(hero.call!.top, 'the call is under the header').toBeGreaterThanOrEqual(headerBottom);
      expect(hero.call!.bottom, 'the whole call is above the banner').toBeLessThanOrEqual(bannerTop);
      if (second) {
        expect(hero.second, 'the hero has its second action').not.toBeNull();
        expect(hero.second!.bottom, 'the whole second action is above the banner').toBeLessThanOrEqual(bannerTop);
      }
      // the header's call is never under it either (responsive-a11y-phase1.spec.ts)
      const headerCall = (await page.locator('.site-header .mobile-call').boundingBox())!;
      expect(headerCall.y + headerCall.height).toBeLessThanOrEqual(bannerTop);
    });
  }
}

for (const path of ['/', '/metalokonstruktsii']) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
    test(`first visit ${viewport.width}×${viewport.height}, ${path}: the flag is on <html> before the body is parsed, and nothing moves when the banner appears`, async ({ page }) => {
      await page.addInitScript(() => {
        const record = window as unknown as { __shifts: string[]; __pendingAtBody: boolean | null };
        record.__shifts = [];
        record.__pendingAtBody = null;
        // Every shift counts, hadRecentInput or not: nothing is touched before the measurement, and Chromium marks the
        // shift HOME's hero made when the banner mounted as «recent input» (review 18.10, GLB-01), hiding it from CLS.
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { value: number; sources?: { node: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] };
            if (!shift.value) continue;
            const moved = (shift.sources ?? []).map((source) => {
              const element = source.node instanceof Element ? source.node : source.node?.parentElement;
              return `${element ? element.tagName.toLowerCase() + [...element.classList].map((token) => `.${token}`).join('') : '?'} ${Math.round(source.previousRect.y)} → ${Math.round(source.currentRect.y)}`;
            });
            record.__shifts.push(`${shift.value.toFixed(4)} at ${Math.round(shift.startTime)} ms: ${moved.join('; ')}`);
          }
        }).observe({ type: 'layout-shift', buffered: true });
        new MutationObserver((_, observer) => {
          if (!document.body) return;
          record.__pendingAtBody = document.documentElement.hasAttribute('data-consent-pending');
          observer.disconnect();
        }).observe(document, { childList: true, subtree: true });
      });
      await page.setViewportSize(viewport);
      await page.goto(path, { waitUntil: 'load' });
      await firstVisitBanner(page);
      // the banner's height becomes --cookie-banner-clearance in an effect after it mounts: wait for exactly that, then
      // two frames for its layout and one task for the layout-shift observer to deliver (no fixed wait)
      await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--cookie-banner-clearance')), { timeout: 5_000 }).not.toBe('');
      await page.evaluate(() => new Promise<void>((resolve) => { requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0))); }));
      const { shifts, pendingAtBody } = await page.evaluate(() => {
        const record = window as unknown as { __shifts: string[]; __pendingAtBody: boolean | null };
        return { shifts: record.__shifts, pendingAtBody: record.__pendingAtBody };
      });
      expect.soft(pendingAtBody, 'data-consent-pending is set in <head>, before the body').toBe(true);
      expect(shifts, 'layout shifts on a first visit').toEqual([]);
    });
  }
}

// The first-visit test above failed once on main (Main Regression 42626918764, 09.11, 390 × 844, /): «0.0761 at 335 ms:
// h1 336 → 212; div.hero-copy 530 → 406». The trace's first frame was a half-parsed HOME hero — the call's icon without its
// words, no second action — painted while the HTML stream stalled on a busy runner; the copy sits low in the full-height
// hero, so it jumped up as the rest arrived. The same mechanism as the direction heroes (#198, direction-static-hero.spec.ts).
// HOME's hero now holds the first paint until it is parsed whole (HomeV2Hero.tsx). Here a local server streams HOME's own
// HTML cut inside the hero and sends the rest only once the first part's stylesheets and fonts are in (+300 ms), so a
// browser that paints half a page has everything it needs to do so; the page's other requests go to the app's server.
test('first visit, HOME: a hero whose HTML arrives in two parts is painted whole — nothing moves', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  let cut: { first: string; rest: string; headers: Record<string, string>; needs: string[] } | undefined;
  const delivered = new Set<string>();
  let onDelivered = () => {};
  const server = createServer((_request, response) => {
    const html = cut;
    if (!html) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, html.headers);
    response.write(html.first);
    const sendRest = () => {
      clearTimeout(fallback);
      onDelivered = () => {};
      setTimeout(() => response.end(html.rest), 300);
    };
    const fallback = setTimeout(sendRest, 5_000);
    onDelivered = () => {
      if (html.needs.every((path) => delivered.has(path))) sendRest();
    };
    onDelivered();
  });
  await new Promise<void>((listening) => server.listen(0, '127.0.0.1', listening));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await page.route(`${origin}/**`, async (route) => {
      const request = route.request();
      if (request.isNavigationRequest()) return route.continue();
      const { pathname, search } = new URL(request.url());
      try {
        // `connection: close`, as getFromServer: never a pooled socket the app's server is closing
        const response = await route.fetch({ url: new URL(pathname + search, baseURL).href, headers: { ...request.headers(), connection: 'close' } });
        await route.fulfill({ response });
        delivered.add(pathname);
        onDelivered();
      } catch {
        // the page moved on while this was in flight; never leave a request hanging
        await route.abort().catch(() => {});
      }
    });
    await page.addInitScript(() => {
      const record = window as unknown as { __homeShifts: string[] };
      record.__homeShifts = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; sources?: { node: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] };
          if (!shift.value) continue;
          // What a half-parsed hero does is move: a part painted in one place and then in another. A part that stays put
          // and only changes its width as a web font swaps in (0.0001–0.0003, «small 366 → 366») is the font micro-shift
          // left open in #198 §8.1; the strict first-visit test above still counts it
          const sources = (shift.sources ?? []).filter((source) => Math.abs(source.previousRect.x - source.currentRect.x) >= 0.5 || Math.abs(source.previousRect.y - source.currentRect.y) >= 0.5);
          if (!sources.length) continue;
          const moved = sources.map((source) => {
            const element = source.node instanceof Element ? source.node : source.node?.parentElement;
            return `${element ? element.tagName.toLowerCase() + [...element.classList].map((token) => `.${token}`).join('') : '?'} ${Math.round(source.previousRect.y)} → ${Math.round(source.currentRect.y)}`;
          });
          record.__homeShifts.push(`${shift.value.toFixed(4)}: ${moved.join('; ')}`);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const served = await getFromServer(page.request, '/');
    const html = await served.text();
    const csp = served.headers()['content-security-policy'];
    const found: string[] = [];
    for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
      await page.setViewportSize(viewport);
      for (const { before, where } of [
        { before: '<p class="hero-lead">', where: 'before the lead' },
        // as in run 42626918764: the call's icon in, its words not yet
        { before: '<span><small>Зателефонувати', where: 'inside the call' },
        { before: '<span class="hv2-inquiry-phone">', where: 'inside the second action' },
        { before: 'Ілюстрація</span>', where: 'inside the stamp' },
      ]) {
        const at = html.indexOf(before);
        // a renamed class would let the whole page through at once and test nothing
        expect(at, `HOME's HTML has ${before}`).toBeGreaterThan(0);
        const first = html.slice(0, at);
        const needs = [...first.matchAll(/<link rel="(stylesheet|preload)" href="([^"]+)"([^>]*)>/g)]
          .filter(([, rel, , rest]) => rel === 'stylesheet' || rest.includes('as="font"'))
          .map(([, , href]) => new URL(href, origin).pathname);
        cut = { first, rest: html.slice(at), needs, headers: { 'content-type': 'text/html; charset=utf-8', ...(csp ? { 'content-security-policy': csp } : {}) } };
        delivered.clear();
        await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
        await firstVisitBanner(page);
        await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--cookie-banner-clearance')), { timeout: 5_000 }).not.toBe('');
        await page.evaluate(() => new Promise<void>((resolve) => { requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0))); }));
        const shifts = await page.evaluate(() => (window as unknown as { __homeShifts: string[] }).__homeShifts);
        found.push(...shifts.map((shift) => `${viewport.width}×${viewport.height}, stalled ${where}: ${shift}`));
      }
    }
    expect(found, 'layout shifts on a first visit whose HTML stalled inside the hero').toEqual([]);
  } finally {
    await new Promise((closed) => server.close(closed));
  }
});

for (const path of ['/', '/metalokonstruktsii', '/napryamky', '/pro-nas']) {
  test(`375×667, ${path}: «Лише необхідні» removes the flag and the hero returns to the composition a stored choice has`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(path, { waitUntil: 'load' });
    const banner = await firstVisitBanner(page);
    const html = page.locator('html');
    await expect(html).toHaveAttribute(PENDING, '');
    const pending = await heroGeometry(page);
    // a short phone: the actions come before the lead while the banner asks (as on HOME)
    expect(pending.call!.top, 'the call above the lead while the banner asks').toBeLessThan(pending.lead!.top);

    await banner.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
    await expect(banner).toHaveCount(0);
    await expect(html).not.toHaveAttribute(PENDING);
    const afterChoice = await heroGeometry(page);
    expect(afterChoice.lead!.top, 'the lead above the call again').toBeLessThan(afterChoice.call!.top);

    // a repeat visit with the choice stored: no flag from the first frame, no banner, the same hero
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await expect(html).not.toHaveAttribute(PENDING);
    await expect(page.locator('main h1').first()).toBeVisible();
    expect(await heroGeometry(page)).toEqual(afterChoice);
    await expect(banner).toHaveCount(0);
  });
}

test.describe('the flag reads the same storage as the banner (app/lib/consent.ts)', () => {
  const stored: { name: string; key: string; value: string; pending: boolean }[] = [
    { name: 'a choice under the current key', key: 'rubikon-consent-state', value: JSON.stringify({ analytics: 'denied', advertising: 'denied' }), pending: false },
    { name: 'a choice under the legacy key', key: 'rubikon-analytics-consent', value: 'denied', pending: false },
    { name: 'an unreadable value', key: 'rubikon-consent-state', value: JSON.stringify({ analytics: 'yes' }), pending: true },
  ];
  for (const { name, key, value, pending } of stored) {
    test(`375×667, /angary — ${name}: ${pending ? 'flag and banner' : 'no flag, no banner'}`, async ({ page }) => {
      await page.addInitScript(([storageKey, storageValue]) => window.localStorage.setItem(storageKey, storageValue), [key, value]);
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/angary', { waitUntil: 'load' });
      const html = page.locator('html');
      if (pending) {
        await expect(page.locator('body > .cookie-banner')).toBeVisible();
        await expect(html).toHaveAttribute(PENDING, '');
      } else {
        // The banner is absent before hydration too: wait until the banner's mount effect has run (it records the
        // attribution in sessionStorage, then decides in the next frame), then check it stayed away
        await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem('rubikon-attribution') !== null)).toBe(true);
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        await expect(page.locator('body > .cookie-banner')).toHaveCount(0);
        await expect(html).not.toHaveAttribute(PENDING);
      }
    });
  }
});
