import { expect, test, type Page } from '@playwright/test';

// PDO-05 (Premium Experience Review 18.10, TYP-01): on a phone and on a 768 px tablet no section title (H2) is larger
// than the page's own title (H1). Before this guard 204 of 220 visible phone H2s were larger than their H1 (H1 : H2
// 0.72–0.85; 46 px against 44–44.54 at 768). Plus PDO-44 п. 1: from 761 px the HOME H1 keeps «від окремих» and
// «до комплексної» together, and its phone line breaks stay those of Mobile Hero v2.

const ROUTES = [
  '/',
  '/napryamky',
  '/angary',
  '/zernoskhovyshcha',
  '/metalokonstruktsii',
  '/betonni-roboty',
  '/pokrivelni-roboty',
  '/yak-pratsyuiemo',
  '/pro-nas',
];

// The four phone sizes of the review (320×568 and 375×667 are short windows: HOME's H1 is 29 px there) and a tablet
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
];

const consent = (page: Page) => page.addInitScript(() => {
  try { localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' })); } catch { /* storage unavailable */ }
});

async function open(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'load' });
  // Down the page and back, so anything drawn on approach is in place, then the faces in use
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
    scrollTo(0, 0);
    await document.fonts.ready;
  });
}

test.describe('section titles are never larger than the page title (phones and 768 px)', () => {
  // A phone check: the mobile project emulates a touch phone; the sizes are set explicitly
  test.skip(({ isMobile }) => !isMobile, 'a phone and tablet check; the mobile project runs it');

  for (const route of ROUTES) {
    test(`${route}: every visible main H2 ≤ the main H1 at 320–430 and 768 px`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.route(/\.mp4(?:\?|$)/, (r) => r.abort());
      await consent(page);
      const problems: string[] = [];
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await open(page, route);
        problems.push(...await page.evaluate((label) => {
          // Seen by a reader: not hidden, not clipped away as screen-reader-only text, not aria-hidden
          const visible = (el: Element) => {
            if (el.closest('[aria-hidden="true"], [hidden], .sr-only, .visually-hidden')) return false;
            for (let a: Element | null = el; a; a = a.parentElement) {
              const cs = getComputedStyle(a);
              if (cs.display === 'none' || cs.visibility === 'hidden' || cs.clipPath.startsWith('inset(50%')) return false;
            }
            const box = el.getBoundingClientRect();
            return box.width >= 3 && box.height >= 3;
          };
          const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
          const h1 = [...document.querySelectorAll('main h1')].find(visible);
          if (!h1) return [`${label} no visible main H1`];
          const out: string[] = [];
          for (const h2 of [...document.querySelectorAll('main h2')].filter(visible)) {
            if (size(h2) > size(h1) + 0.01) out.push(`${label} H2 «${(h2.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)}» ${size(h2).toFixed(2)} px > H1 ${size(h1).toFixed(2)} px`);
          }
          return out;
        }, `${viewport.width}×${viewport.height}`));
      }
      expect(problems).toEqual([]);
    });
  }
});

// The HOME H1's lines: each word's first box, grouped by its top
const h1Lines = (page: Page) => page.evaluate(() => {
  const h1 = document.querySelector('main .hv2-hero h1')!;
  const range = document.createRange();
  const words: Array<{ word: string; top: number }> = [];
  const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const re = /\S+/g;
    for (let m = re.exec(node.textContent ?? ''); m; m = re.exec(node.textContent ?? '')) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const rect = [...range.getClientRects()].find((r) => r.width > 0.5);
      if (rect) words.push({ word: m[0], top: rect.top });
    }
  }
  const lines: string[][] = [];
  let last = -1e9;
  for (const { word, top } of words) {
    if (top - last > 6) { lines.push([]); last = top; }
    lines[lines.length - 1].push(word);
  }
  return { lines: lines.map((line) => line.join(' ')), height: Math.round(h1.getBoundingClientRect().height) };
});

// A reader's text-spacing override (WCAG 1.4.12), as in typography.spec.ts
const TEXT_SPACING = '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}';

test.describe('HOME H1: «від окремих» and «до комплексної» stay together from 761 px', () => {
  test.skip(({ isMobile }) => isMobile, 'viewports are set explicitly; one project is enough');

  test('768 and 1440 px: no line ends on «від» or «до», and the pairs never run past the H1', async ({ page }) => {
    test.setTimeout(60_000);
    await page.route(/\.mp4(?:\?|$)/, (r) => r.abort());
    await consent(page);
    const problems: string[] = [];
    for (const viewport of [{ width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const pairs = await page.locator('main .hv2-hero h1 .hv2-keep').count();
      if (pairs !== 2) problems.push(`${viewport.width}px ${pairs} pair spans in the H1, not 2`);
      const { lines } = await h1Lines(page);
      for (const pair of ['від окремих', 'до комплексної']) {
        if (!lines.some((line) => line.includes(pair))) problems.push(`${viewport.width}px «${pair}» is split: ${lines.join(' / ')}`);
      }
      for (const line of lines) if (/(?:^|\s)(?:від|до)$/.test(line)) problems.push(`${viewport.width}px a line ends on a preposition: «${line}»`);

      // Under a reader's text spacing a pair wraps inside the H1 rather than running past it or the page
      await page.addStyleTag({ content: TEXT_SPACING });
      await page.evaluate(() => document.fonts.ready);
      problems.push(...await page.evaluate((label) => {
        const out: string[] = [];
        const h1 = document.querySelector('main .hv2-hero h1')!.getBoundingClientRect();
        for (const keep of document.querySelectorAll('main .hv2-hero h1 .hv2-keep')) {
          const r = keep.getBoundingClientRect();
          if (r.right > h1.right + 1) out.push(`${label} «${keep.textContent}» ends ${Math.round(r.right - h1.right)}px past its H1`);
        }
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth) out.push(`${label} page scrolls sideways`);
        return out;
      }, `${viewport.width}px + text spacing`));
    }
    expect(problems).toEqual([]);
  });
});

test.describe('HOME H1 on a phone: the pairs change none of its line breaks', () => {
  test.skip(({ isMobile }) => !isMobile, 'a phone check; the mobile project runs it');

  test('320 and 390 px: the lines are those of the H1 without the pair spans', async ({ page }) => {
    test.setTimeout(60_000);
    await page.route(/\.mp4(?:\?|$)/, (r) => r.abort());
    await consent(page);
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const keep = page.locator('main .hv2-hero h1 .hv2-keep');
      await expect(keep).toHaveCount(2);
      // The pairs carry no phone style (OD-PX-15: from 761 px only)
      for (const display of await keep.evaluateAll((spans) => spans.map((span) => `${getComputedStyle(span).display} ${getComputedStyle(span).whiteSpace}`))) {
        expect(display).toBe('inline normal');
      }
      const withPairs = await h1Lines(page);
      // The same H1 as before the pairs (main): each span replaced by its own contents
      await page.evaluate(() => {
        for (const span of document.querySelectorAll('main .hv2-hero h1 .hv2-keep')) span.replaceWith(...span.childNodes);
      });
      expect(await page.locator('main .hv2-hero h1 .hv2-keep').count()).toBe(0);
      expect(withPairs, `${viewport.width}×${viewport.height}`).toEqual(await h1Lines(page));
    }
  });
});
