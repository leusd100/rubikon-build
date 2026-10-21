import { expect, test, type Page } from '@playwright/test';

// W2-15 · the service pages: the privacy policy, 404, the page error (PDO-10; owner 21.10: OD-PX-32 a — 72 px, the
// privacyVersion unchanged). Before: a 106 px title on the policy and the 404 (a direction's is 83.5 px at 1440), the
// policy's second paragraph under its heading in the heading's column, a first paragraph of 1208 characters with up to
// 84 to a line, the 404's address in capitals, and on the page error «Контакти» in the header leading nowhere.
// Every test denies the optional cookies and answers any Google request with an empty 200.

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

const PRIVACY = '/polityka-konfidentsiinosti';
const MISSING = '/nemaie-takoi-storinky';

async function open(page: Page, path: string, width: number, height = 900) {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

const h1Size = (page: Page) => page.locator('main h1').first().evaluate((h1) => parseFloat(getComputedStyle(h1).fontSize));

test.describe('W2-15 · service pages on wide screens', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit wide viewports');

  test('the policy and the 404 title at most 72 px, never larger than a direction page’s title', async ({ page }) => {
    for (const width of [1280, 1440, 1920]) {
      await open(page, '/metalokonstruktsii', width);
      const direction = await h1Size(page);
      for (const path of [PRIVACY, MISSING]) {
        await open(page, path, width);
        const size = await h1Size(page);
        expect(size, `${path} ${width}`).toBeLessThanOrEqual(72);
        expect(size, `${path} ${width}`).toBeLessThanOrEqual(direction);
      }
    }
    // the policy's text begins about 100 px higher than under the 106 px title (712 px at 1440)
    await open(page, PRIVACY, 1440);
    expect(await page.locator('.privacy-content').evaluate((element) => element.getBoundingClientRect().top + scrollY)).toBeLessThan(640);
  });

  test('every policy paragraph stands in the text column, under 68 characters to a line; the first one is three paragraphs', async ({ page }) => {
    for (const width of [768, 1440, 1920]) {
      await open(page, PRIVACY, width);
      const result = await page.locator('.privacy-content').evaluate((content) => {
        const inHeadingColumn: string[] = [];
        let widest = 0;
        for (const article of content.querySelectorAll('article')) {
          const heading = article.querySelector('h2')!.getBoundingClientRect();
          for (const p of article.querySelectorAll<HTMLElement>(':scope > p')) {
            if (p.getBoundingClientRect().left < heading.right) inHeadingColumn.push(p.textContent!.slice(0, 40));
            // characters on each line, by the top of each character's box
            const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
            const lines = new Map<number, number>();
            const range = document.createRange();
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              for (let i = 0; i < (node.textContent ?? '').length; i += 1) {
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                const box = range.getClientRects()[0];
                if (box) lines.set(Math.round(box.top), (lines.get(Math.round(box.top)) ?? 0) + 1);
              }
            }
            widest = Math.max(widest, ...lines.values());
          }
        }
        const first = [...content.querySelectorAll('article')[0].querySelectorAll(':scope > p')].map((p) => p.textContent!);
        return { inHeadingColumn, widest, first };
      });
      expect(result.inHeadingColumn, `${width}`).toEqual([]);
      expect(result.widest, `${width}: characters to a line`).toBeLessThanOrEqual(68);
      // the old first paragraph, split between its sentences: three paragraphs, then the Cloudflare Web Analytics one
      expect(result.first.map((text) => text.slice(0, 18)), `${width}`).toEqual(['Форма запиту може ', 'Ми також фіксуємо ', 'Для захисту форми ', 'Для оцінки швидкос']);
      expect(result.first[0].endsWith('Підтвердження у формі означає, що запит збережено.')).toBe(true);
      expect(result.first[1].endsWith('без такої згоди він не зберігається.')).toBe(true);
      expect(result.first[2].endsWith('ми отримуємо лише результат перевірки.')).toBe(true);
    }
  });

  test('the 404 address in ordinary letters', async ({ page }) => {
    await open(page, MISSING, 1440);
    await expect(page.locator('.not-found-hero a[href^="mailto:"]')).toHaveCSS('text-transform', 'none');
  });
});

test.describe('W2-15 · service pages on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'a phone check; the mobile project runs it');

  test('390: the 404’s phone and address line up with its button; the policy stays one column', async ({ page }) => {
    await open(page, MISSING, 390, 844);
    const lefts = await page.locator('.not-found-hero .hero-action-row').evaluate((row) => [...row.children].map((child) => Math.round(child.getBoundingClientRect().left)));
    expect(new Set(lefts).size, JSON.stringify(lefts)).toBe(1);
    await open(page, PRIVACY, 390, 844);
    expect(await page.locator('.privacy-content article').first().evaluate((article) => getComputedStyle(article).gridTemplateColumns.split(' ').length)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
});
