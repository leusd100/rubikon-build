import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// Typography v1.1 (14.10): Fixel Display is the display face. These guard what the change promised: the face draws every
// display character itself, a late font swap moves nothing, the accent phrase kept on one line never overflows, and the
// sizing holds for English copy too (laboratory fixture — the app itself stays Ukrainian).

const ROUTES = ['/', '/angary', '/metalokonstruktsii'];
const FIXEL = /^"?Fixel Display/;
const consent = async (page: Page) => page.addInitScript(() => {
  try { localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' })); } catch { /* storage unavailable */ }
});

async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
    scrollTo(0, 0);
    await document.fonts.ready;
  });
}

test.describe('display face', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const route of ROUTES) {
      test(`${route} (${colorScheme}): Fixel Display draws every display character, Jost is not loaded`, async ({ page, context }) => {
        await page.emulateMedia({ colorScheme });
        await page.route(/\.mp4(?:\?|$)/, (r) => r.abort());
        const fonts: string[] = [];
        page.on('request', (request) => { if (/\.woff2(\?|$)/.test(request.url())) fonts.push(request.url()); });
        await consent(page);
        await page.goto(route, { waitUntil: 'load' });
        await settle(page);

        const marked = await page.evaluate((pattern) => {
          const re = new RegExp(pattern);
          let count = 0;
          for (const el of document.querySelectorAll('body *')) {
            if (![...el.childNodes].some((node) => node.nodeType === 3 && node.textContent?.trim())) continue;
            if (re.test(getComputedStyle(el).fontFamily)) { el.setAttribute('data-display-audit', ''); count += 1; }
          }
          return count;
        }, FIXEL.source);
        expect(marked).toBeGreaterThan(5);

        // CDP reports, per element, the platform fonts that actually drew its glyphs.
        const cdp = await context.newCDPSession(page);
        await cdp.send('DOM.enable');
        await cdp.send('CSS.enable');
        const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
        const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-display-audit]' });
        const drawnBy = new Map<string, number>();
        for (const nodeId of nodeIds) {
          const { fonts: used } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
          for (const font of used) drawnBy.set(font.familyName, (drawnBy.get(font.familyName) ?? 0) + font.glyphCount);
        }
        expect([...drawnBy.keys()].filter((family) => !/^Fixel Display/.test(family))).toEqual([]);
        expect(fonts.some((url) => /FixelDisplay-Regular-Cyrillic/.test(url))).toBe(true);
        expect(fonts.some((url) => /jost/i.test(url))).toBe(false);
      });
    }
  }
});

test.describe('late fonts', () => {
  // DebugBear's mobile profile fetches the fonts after the first paint. Held back 3 s here, the swap to Fixel Display,
  // Manrope and Plex must not move the page: each face's metric fallback stands in at the brand face's size. 0.01 is
  // Typography v1.1's acceptance limit (main measured 0.006–0.15 here on Linux before the fallbacks).
  for (const route of ROUTES) {
    test(`${route}: the swap from the metric fallbacks keeps CLS under 0.01`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.route(/\.mp4(?:\?|$)/, (r) => r.abort());
      await page.route(/\.woff2(\?|$)/, async (r) => { await new Promise((res) => setTimeout(res, 3000)); await r.continue(); });
      // A first visit: the cookie banner is on screen too, so its Manrope text is part of what must not move.
      await page.addInitScript(() => {
        (window as unknown as { __shifts: number[] }).__shifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
            if (!entry.hadRecentInput) (window as unknown as { __shifts: number[] }).__shifts.push(entry.value);
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(route, { waitUntil: 'load', timeout: 45_000 });
      await page.waitForTimeout(1500);
      const cls = await page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts.reduce((sum, v) => sum + v, 0));
      expect(cls).toBeLessThan(0.01);
    });
  }
});

// A reader's text-spacing override (WCAG 1.4.12): the accent phrase and the headings must still fit.
const TEXT_SPACING = '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}';

test.describe('accent phrase kept on one line (≥ 761 px)', () => {
  test.skip(({ isMobile }) => isMobile, 'viewports are set explicitly; one project is enough');
  // 761 is the first width the rule applies; 720 / 960 / 1152 are 1440 px at 200 / 150 / 125 % browser zoom; 1920 is
  // past the container, where the H1's own measure is the limit.
  const WIDTHS = [720, 761, 768, 960, 1024, 1152, 1440, 1920];
  for (const route of ['/', '/angary', '/metalokonstruktsii', '/zernoskhovyshcha', '/betonni-roboty', '/pokrivelni-roboty', '/yak-pratsyuiemo']) {
    test(`${route}: no headline accent runs past its H1 or the page`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.route(/\.mp4(?:\?|$)/, (r) => r.abort());
      await consent(page);
      const problems: string[] = [];
      for (const spacing of [false, true]) for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route, { waitUntil: 'load' });
        if (spacing) await page.addStyleTag({ content: TEXT_SPACING });
        await page.evaluate(() => document.fonts.ready);
        problems.push(...await page.evaluate((label) => {
          const out: string[] = [];
          for (const em of document.querySelectorAll('main h1 em')) {
            const box = em.closest('h1')!.getBoundingClientRect();
            const r = em.getBoundingClientRect();
            if (r.right > box.right + 1) out.push(`${label} «${em.textContent}» ends ${Math.round(r.right - box.right)}px past its H1`);
          }
          if (document.documentElement.scrollWidth > document.documentElement.clientWidth) out.push(`${label} page scrolls sideways`);
          return out;
        }, `${width}px${spacing ? ' + text spacing' : ''}`));
      }
      expect(problems).toEqual([]);
    });
  }
});

test.describe('text spacing on phones (WCAG 1.4.12)', () => {
  // The phone project: overlay scrollbars, as on a phone (a desktop window's 15 px scrollbar is not a 320 px phone).
  test.skip(({ isMobile }) => !isMobile, 'a phone check; the mobile project runs it');
  // Fixel sets wider than Jost: with a reader's spacing override a long heading word («Герметичність» at 320 px) must
  // wrap in its column, never run past the phone's width. Only the display face is checked here: on Linux the header,
  // footer and skip link (Manrope) already widen a 320 px page under this override on main.
  for (const route of ['/', '/angary', '/metalokonstruktsii', '/zernoskhovyshcha', '/betonni-roboty', '/pokrivelni-roboty', '/yak-pratsyuiemo']) {
    test(`${route}: display headings stay inside 320 and 390 px`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.route(/\.mp4(?:\?|$)/, (r) => r.abort());
      await consent(page);
      const problems: string[] = [];
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route, { waitUntil: 'load' });
        await page.addStyleTag({ content: TEXT_SPACING });
        await page.evaluate(() => document.fonts.ready);
        problems.push(...await page.evaluate((width) => {
          const out: string[] = [];
          // Cards in a horizontal rail stand past the screen by design.
          const inRail = (el: Element) => { for (let a = el.parentElement; a; a = a.parentElement) if (/auto|scroll/.test(getComputedStyle(a).overflowX)) return true; return false; };
          for (const el of document.querySelectorAll('main *')) {
            if (!/^"?Fixel Display/.test(getComputedStyle(el).fontFamily) || inRail(el)) continue;
            for (const node of el.childNodes) {
              if (node.nodeType !== 3 || !node.textContent?.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              const right = Math.max(...[...range.getClientRects()].map((r) => r.right));
              if (right > width + 1) out.push(`${width}px «${node.textContent.trim().slice(0, 30)}» ends ${Math.round(right - width)}px past the screen`);
            }
          }
          return out;
        }, width));
      }
      expect(problems).toEqual([]);
    });
  }
});

test.describe('English test copy (laboratory)', () => {
  test.skip(({ isMobile }) => isMobile, 'viewports are set explicitly; one project is enough');
  const { headings } = JSON.parse(readFileSync(path.join(process.cwd(), 'tests/fixtures/typography-en-lab-headings.json'), 'utf8')) as { headings: Record<string, string> };
  // Phones, the accent rule's first width, tablets, and 1440 px at 200 / 150 / 125 % zoom (720 / 960 / 1152).
  const WIDTHS = [320, 360, 390, 412, 430, 720, 761, 768, 960, 1024, 1152, 1440];
  for (const route of ROUTES) {
    test(`${route}: English display text stays whole and inside the page at 320–1440 px`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.route(/\.mp4(?:\?|$)/, (r) => r.abort());
      await consent(page);
      const problems: string[] = [];
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const replaced = await page.evaluate((map) => {
          document.documentElement.lang = 'en';
          let n = 0;
          const walker = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const key = (node.textContent ?? '').replace(/[\s ]+/g, ' ').trim();
            if (map[key]) { node.textContent = (node.textContent ?? '').replace((node.textContent ?? '').trim(), map[key]); n += 1; }
          }
          return n;
        }, headings);
        expect(replaced).toBeGreaterThan(3);
        problems.push(...await page.evaluate((width) => {
          const out: string[] = [];
          for (const el of document.querySelectorAll('main *')) {
            if (!/^"?Fixel Display/.test(getComputedStyle(el).fontFamily)) continue;
            for (const node of el.childNodes) {
              if (node.nodeType !== 3) continue;
              const re = /[\p{L}\p{N}'’-]{5,}/gu;
              for (let m = re.exec(node.textContent ?? ''); m; m = re.exec(node.textContent ?? '')) {
                const range = document.createRange();
                range.setStart(node, m.index);
                range.setEnd(node, m.index + m[0].length);
                const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0.5).map((r) => Math.round(r.top / 3)));
                if (tops.size > 1) out.push(`${width}px «${m[0]}» split`);
              }
            }
          }
          if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
            const wide = [...document.querySelectorAll('main h1, main h2, main h3, main strong')].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1);
            if (wide.length) out.push(`${width}px a heading runs past the page: ${wide[0].textContent?.slice(0, 40)}`);
          }
          // The accent phrase kept on one line (≥ 761 px) must fit its H1 in English too.
          for (const em of document.querySelectorAll('main h1 em')) {
            const box = em.closest('h1')!.getBoundingClientRect();
            const r = em.getBoundingClientRect();
            if (r.right > box.right + 1) out.push(`${width}px «${em.textContent}» ends ${Math.round(r.right - box.right)}px past its H1`);
          }
          return out;
        }, width));
      }
      expect(problems).toEqual([]);
    });
  }
});
