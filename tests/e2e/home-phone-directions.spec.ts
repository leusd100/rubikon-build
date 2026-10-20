import { expect, test, type Page } from '@playwright/test';
import { directions } from '../../app/data/directions';

// PDO-42 (a) — HOME «П’ять напрямів» on a phone (≤ 760 px). Owner, 20.10: «мініаркуші-креслення на ≤760 px, речення про
// ілюстрації сховати на телефоні, десктопне бенто без змін». Before: a sideways rail of 4 : 5 image cards, one of five in
// view (390×844: the first card and a strip of the second; the fifth four swipes away), with «01 / 05», dots and
// «Гортайте →». Now: a list of five link rows — each the direction's own scheme sheet, its name and «Аркуш NN · Схема» —
// every name in reach without a sideways gesture, in the tab order, each row a full-width target. The intro's second
// sentence speaks of the card images, so it is not shown where there are none; its words are unchanged.
// From 761 px nothing changes: the mosaic, its labelled illustrations and the wide-screen sheets.

const SUPPORT_FIRST = 'Оберіть напрям, найближчий до вашої задачі.';
const SUPPORT_FULL = `${SUPPORT_FIRST} Зображення на картках — ілюстрації, а не фото виконаних об’єктів.`;
// The fixed site header on a phone
const HEADER = 67;

const consent = (page: Page) => page.addInitScript(() => {
  try { localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' })); } catch { /* storage unavailable */ }
});

async function open(page: Page) {
  await page.route(/\.mp4(?:\?|$)/, (r) => r.abort());
  await consent(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

/** The section's top just under the fixed header, as a jump to #directions leaves it */
const jumpToDirections = (page: Page) => page.evaluate((header) => {
  const section = document.querySelector('#directions')!;
  scrollTo({ top: section.getBoundingClientRect().top + scrollY - header, behavior: 'instant' });
}, HEADER);

/** Every rendered direction name in #directions, with its box in the viewport */
const names = (page: Page) => page.locator('#directions').evaluate((section) => {
  const out: Array<{ text: string; top: number; bottom: number; left: number; right: number }> = [];
  for (const el of section.querySelectorAll<HTMLElement>('a')) {
    if (!el.getClientRects().length || el.closest('[aria-hidden="true"]')) continue;
    // A link's direction name: the card's title, or the row's one text that is not decoration
    const title = el.querySelector<HTMLElement>('.direction-copy strong')
      ?? [...el.querySelectorAll<HTMLElement>('*')].find((c) => !c.closest('[aria-hidden="true"]') && c.textContent?.trim() && !c.children.length);
    if (!title) continue;
    const range = document.createRange();
    range.selectNodeContents(title);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    if (!rects.length) continue;
    out.push({
      text: title.textContent?.trim() ?? '',
      top: Math.min(...rects.map((r) => r.top)),
      bottom: Math.max(...rects.map((r) => r.bottom)),
      left: Math.min(...rects.map((r) => r.left)),
      right: Math.max(...rects.map((r) => r.right)),
    });
  }
  return out;
});

const inView = (page: Page) => names(page).then(async (list) => {
  const { width, height } = page.viewportSize()!;
  return list.filter((n) => n.top >= HEADER - 0.5 && n.bottom <= height + 0.5 && n.left >= -0.5 && n.right <= width + 0.5).map((n) => n.text);
});

test.describe('HOME directions on a phone: a list of five scheme sheets (PDO-42 a)', () => {
  test.skip(({ isMobile }) => !isMobile, 'a phone check; the mobile project runs it');

  // 390×844 and 430×932: all five names in view right after the jump. 320×568 and 375×667 are short windows: the
  // section's title and intro fill the first screen there, so the five names come in together with one vertical
  // scroll of under half a screen — never a sideways gesture.
  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    test(`${viewport.width}×${viewport.height}: five link rows, every name in reach without a sideways gesture`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      const section = page.locator('#directions');

      // One list of five rows, each a link to its direction named by the direction alone
      const list = section.getByRole('list');
      await expect(list).toHaveCount(1);
      await expect(list).toBeVisible();
      await expect(list.getByRole('listitem')).toHaveCount(directions.length);
      for (const { cardTitle, href } of directions) {
        const link = section.getByRole('link', { name: cardTitle, exact: true });
        await expect(link, cardTitle).toHaveCount(1);
        await expect(link, cardTitle).toBeVisible();
        await expect(link, cardTitle).toHaveAttribute('href', href);
      }
      expect(await list.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(directions.map(({ href }) => href));

      // No rail: no image card, position counter or dot shows, and nothing in the section scrolls sideways
      await expect(section.locator('.direction-card:visible')).toHaveCount(0);
      expect(await section.evaluate((root) => [...root.querySelectorAll<HTMLElement>('*')]
        .filter((el) => el.getClientRects().length && /auto|scroll/.test(getComputedStyle(el).overflowX) && el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.className))).toEqual([]);
      for (const name of ['button', 'img']) expect(await section.locator(`${name}:visible`).count(), `no ${name} in the band`).toBe(0);

      // Every row is a full-width target, at least 44 px tall
      const targets = await list.getByRole('link').evaluateAll((links) => links.map((link) => {
        const r = link.getBoundingClientRect();
        return { width: r.width, height: r.height };
      }));
      for (const target of targets) {
        expect(target.height).toBeGreaterThanOrEqual(44);
        expect(target.width).toBeGreaterThanOrEqual(viewport.width * 0.8);
      }

      await jumpToDirections(page);
      const all = directions.map(({ cardTitle }) => cardTitle);
      const first = await names(page);
      expect(first.map((n) => n.text)).toEqual(all);
      if (viewport.height >= 800) {
        expect(await inView(page)).toEqual(all);
      } else {
        // The five names fit one screen under the header; one vertical scroll of under half a screen brings them in
        const span = Math.max(...first.map((n) => n.bottom)) - Math.min(...first.map((n) => n.top));
        expect(span).toBeLessThanOrEqual(viewport.height - HEADER);
        const scroll = Math.max(...first.map((n) => n.bottom)) - viewport.height;
        expect(scroll).toBeLessThanOrEqual(viewport.height / 2);
        await page.evaluate((y) => scrollBy({ top: y, behavior: 'instant' }), Math.ceil(scroll) + 1);
        expect(await inView(page)).toEqual(all);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    });
  }

  test('390: Tab walks the five rows in order, each with a visible focus ring, then leaves the band', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    // Start from the intro (not focusable itself), so the next Tab is the band's first stop
    await page.locator('#directions .section-header-support').evaluate((el) => { el.setAttribute('tabindex', '-1'); (el as HTMLElement).focus(); });
    const stops: string[] = [];
    for (let i = 0; i < directions.length; i += 1) {
      await page.keyboard.press('Tab');
      stops.push(await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const r = el.getBoundingClientRect();
        const inList = Boolean(el.closest('#directions ul'));
        const ring = getComputedStyle(el).outlineStyle !== 'none' && parseFloat(getComputedStyle(el).outlineWidth) >= 2;
        return `${el.getAttribute('href')} ${inList && r.height > 0 ? 'row' : 'other'} ${ring ? 'ring' : 'no-ring'}`;
      }));
    }
    expect(stops).toEqual(directions.map(({ href }) => `${href} row ring`));
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('#directions .direction-grid')))).toBe(false);
  });

  test('320: every name stays whole, «Металоконструкції» one word on one line, clear of the sheet and the arrow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await open(page);
    const rows = await page.locator('#directions').getByRole('list').getByRole('link').evaluateAll((links) => links.map((link) => {
      const parts = [...link.querySelectorAll<HTMLElement>('*')].filter((el) => el.getClientRects().length);
      const name = parts.find((el) => el.textContent?.trim() && !el.closest('[aria-hidden="true"]') && !el.querySelector('*'))!;
      const words: Array<{ word: string; lines: number; right: number }> = [];
      const node = name.firstChild!;
      const text = node.textContent ?? '';
      for (const m of text.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, m.index!);
        range.setEnd(node, m.index! + m[0].length);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0.5);
        words.push({ word: m[0], lines: new Set(rects.map((r) => Math.round(r.top))).size, right: Math.max(...rects.map((r) => r.right)) });
      }
      const box = name.getBoundingClientRect();
      const decorations = parts.filter((el) => el.getAttribute('aria-hidden') === 'true' && el.parentElement === link).map((el) => el.getBoundingClientRect());
      const overlaps = decorations.filter((d) => d.left < box.right - 0.5 && d.right > box.left + 0.5 && d.top < box.bottom - 0.5 && d.bottom > box.top + 0.5).length;
      return { name: name.textContent?.trim(), words, nameRight: box.right, overlaps };
    }));
    expect(rows.map((row) => row.name)).toEqual(directions.map(({ cardTitle }) => cardTitle));
    for (const row of rows) {
      for (const word of row.words) {
        expect(word.lines, `${row.name}: «${word.word}» on one line`).toBe(1);
        expect(word.right, `${row.name}: «${word.word}» inside its box`).toBeLessThanOrEqual(row.nameRight + 0.5);
      }
      expect(row.overlaps, `${row.name} clear of the sheet and the arrow`).toBe(0);
    }
    expect(rows.find((row) => row.name === 'Металоконструкції')!.words).toHaveLength(1);
  });

  for (const width of [320, 390, 760]) {
    test(`${width}: the intro keeps its first sentence; the one about the card images is not shown`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await open(page);
      const support = page.locator('#directions .section-header-support');
      await expect(support).toHaveText(SUPPORT_FULL);
      expect((await support.innerText()).trim()).toBe(SUPPORT_FIRST);
    });
  }
});

test.describe('HOME directions from 761 px: the mosaic as it was (PDO-42 a)', () => {
  test.skip(({ isMobile }) => isMobile, 'a desktop and tablet check; the desktop project runs it');

  for (const viewport of [{ width: 761, height: 1024 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    test(`${viewport.width}: five labelled illustration cards in the mosaic, the intro whole, no phone list`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      const section = page.locator('#directions');
      await expect(section.getByRole('list')).toHaveCount(0);
      const support = section.locator('.section-header-support');
      await expect(support).toHaveText(SUPPORT_FULL);
      expect((await support.innerText()).replace(/\s+/g, ' ').trim()).toBe(SUPPORT_FULL);

      const cards = section.locator('a.direction-card');
      await expect(cards).toHaveCount(directions.length);
      for (const [index, { href, cardTitle, number }] of directions.entries()) {
        const card = cards.nth(index);
        await expect(card).toBeVisible();
        await expect(card).toHaveAttribute('href', href);
        await expect(card.locator('.direction-provenance')).toBeVisible();
        await expect(card.locator('.direction-provenance')).toHaveText('Ілюстрація');
        await expect(card.locator('.direction-number')).toHaveText(number);
        await expect(card.locator('.direction-copy strong')).toHaveText(cardTitle);
        await expect(card.locator('img')).toBeVisible();
      }
      // The mosaic: 1.15fr / .85fr columns, rows 360 / 360 / 330 px, 18 px gaps; the first card spans two rows
      const geometry = await section.locator('.direction-grid').evaluate((grid) => {
        const g = grid.getBoundingClientRect();
        return [...grid.children].map((card) => {
          const r = card.getBoundingClientRect();
          return [r.left - g.left, r.top - g.top, r.width, r.height];
        }).concat([[g.width, g.height, 0, 0]]);
      });
      const gridWidth = geometry.pop()![0];
      const wide = (gridWidth - 18) * 0.575;
      const narrow = gridWidth - 18 - wide;
      const expected = [[0, 0, wide, 738], [wide + 18, 0, narrow, 360], [wide + 18, 378, narrow, 360], [0, 756, wide, 330], [wide + 18, 756, narrow, 330]];
      geometry.forEach((box, index) => box.forEach((value, k) => expect(Math.abs(value - expected[index][k]), `card ${index + 1} [${k}]`).toBeLessThanOrEqual(0.5)));

      // The band's tab stops are the five cards (the wide-screen sheets are a pointer's shortcut, out of the tab order)
      expect(await section.evaluate((root) => [...root.querySelectorAll<HTMLAnchorElement>('a')]
        .filter((a) => a.tabIndex >= 0 && a.getClientRects().length)
        .map((a) => a.getAttribute('href')))).toEqual(directions.map(({ href }) => href));
    });
  }
});
