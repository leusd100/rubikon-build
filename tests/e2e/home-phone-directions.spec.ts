import { expect, test, type Locator, type Page } from '@playwright/test';
import { directions } from '../../app/data/directions';

// HOME «П’ять напрямів» on a phone (≤ 760 px) — B «Один аркуш + індекс» (owner 21.10, after PDO-42 a's five mini sheets of
// 20.10). One large scheme sheet over an index of the five directions, one action per control: a row only picks the
// direction (its sheet takes the scheme, number and name; nothing scrolls, nothing under the sheet moves, the change is
// read out), and the sheet is the one link to the picked direction's page, «Про напрям», with the site's SVG arrow — the
// bare ↗ of #219 became a blue emoji on the owner's iPhone. The first direction is picked from the first paint. The
// intro's second sentence speaks of the card images, so it is not shown where there are none; its words are unchanged.
// From 761 px nothing changes: the mosaic, its labelled illustrations and the wide-screen sheets.

const SUPPORT_FIRST = 'Оберіть напрям, найближчий до вашої задачі.';
const SUPPORT_FULL = `${SUPPORT_FIRST} Зображення на картках — ілюстрації, а не фото виконаних об’єктів.`;
const PHONES = [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }];

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

const band = (page: Page) => page.locator('#directions');
const sheet = (page: Page) => band(page).locator('a.dxi-sheet');
const rows = (page: Page) => band(page).getByRole('list').getByRole('button');

/** Picks a row; the first picks may land before hydration, so the pick is repeated until the sheet follows */
async function pick(page: Page, row: Locator, href: string) {
  await expect(async () => {
    await row.click();
    await expect(sheet(page)).toHaveAttribute('href', href, { timeout: 1_000 });
  }).toPass();
}

/** The section scrolled so its index stands wholly in the window, under the fixed header */
const showIndex = (page: Page) => page.evaluate(() => {
  const list = document.querySelector('#directions .dxi-list')!.getBoundingClientRect();
  scrollBy({ top: list.bottom - innerHeight + 8, behavior: 'instant' });
});

/** What the sheet shows: its href, its visible strip, name and drawing, its box, and the index's box */
const shown = (page: Page) => page.evaluate(() => {
  const root = document.querySelector('#directions .dxi')!;
  const link = root.querySelector<HTMLAnchorElement>('a.dxi-sheet')!;
  const visible = (el: Element) => getComputedStyle(el).visibility === 'visible' && el.getClientRects().length > 0;
  const box = (el: Element) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top * 10) / 10, height: Math.round(r.height * 10) / 10 }; };
  return {
    href: link.getAttribute('href'),
    label: link.getAttribute('aria-label'),
    strip: [...root.querySelector('.dxi-strip')!.children].map((part) => part.textContent?.trim()).join(' · '),
    names: [...root.querySelectorAll('.dxi-name')].filter(visible).map((el) => el.textContent?.trim()),
    drawings: [...root.querySelectorAll<HTMLElement>('.dxi-drawing')].filter(visible).map((el) => el.dataset.id),
    sheet: box(link),
    list: box(root.querySelector('.dxi-list')!),
    scrollY,
    live: root.querySelector('[aria-live]')!.textContent,
  };
});

test.describe('HOME directions on a phone: one sheet and an index (B)', () => {
  test.skip(({ isMobile }) => !isMobile, 'a phone check; the mobile project runs it');

  for (const viewport of PHONES) {
    test(`${viewport.width}×${viewport.height}: one sheet link and five pick buttons, the first picked, no rail and no sideways scroll`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      const section = band(page);

      // One list: the five directions by their full names, in order, as pick buttons; the first is the picked one
      const list = section.getByRole('list');
      await expect(list).toHaveCount(1);
      await expect(list.getByRole('listitem')).toHaveCount(directions.length);
      await expect(rows(page).locator('.dxi-row-name')).toHaveText(directions.map(({ cardTitle }) => cardTitle));
      // each named by the direction alone: its number is a mark for the eye
      for (const { cardTitle } of directions) await expect(list.getByRole('button', { name: cardTitle, exact: true }), cardTitle).toHaveCount(1);
      expect(await rows(page).evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-pressed')))).toEqual(directions.map((_, i) => String(i === 0)));
      await expect(list.getByRole('link')).toHaveCount(0);

      // The sheet: the one link of the band, to the first direction, «Аркуш 01 · Умовна схема», its name and «Про напрям»
      const [first] = directions;
      await expect(section.getByRole('link')).toHaveCount(1);
      await expect(section.getByRole('link', { name: `Про напрям: ${first.cardTitle}`, exact: true })).toHaveAttribute('href', first.href);
      const state = await shown(page);
      expect(state.strip).toBe(`Аркуш ${first.number} · Умовна схема`);
      expect(state.names).toEqual([first.cardTitle]);
      expect(state.drawings).toEqual([first.id]);
      await expect(sheet(page).locator('.dxi-more')).toHaveText('Про напрям');
      // its arrow is the site's SVG in currentColor — no arrow character for iOS to draw as an emoji
      await expect(sheet(page).locator('.dxi-more svg')).toHaveCount(1);
      expect(await section.locator('.dxi').innerText()).not.toMatch(/[↗→➔➜⇨]/u);
      // the sheet holds nothing else to press
      await expect(sheet(page).locator('a, button, input, [tabindex]')).toHaveCount(0);

      // No rail: no image card, image or sideways scroller in the band, and the page never scrolls sideways
      await expect(section.locator('.direction-card:visible')).toHaveCount(0);
      expect(await section.locator('img:visible').count()).toBe(0);
      expect(await section.evaluate((root) => [...root.querySelectorAll<HTMLElement>('*')]
        .filter((el) => el.getClientRects().length && /auto|scroll/.test(getComputedStyle(el).overflowX) && el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.className))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

      // Targets: every row full width and at least 44 px tall, and so is «Про напрям» inside the sheet
      for (const target of await rows(page).evaluateAll((buttons) => buttons.map((b) => { const r = b.getBoundingClientRect(); return { width: r.width, height: r.height }; }))) {
        expect(target.height).toBeGreaterThanOrEqual(44);
        expect(target.width).toBeGreaterThanOrEqual(viewport.width * 0.8);
      }
      expect((await sheet(page).locator('.dxi-more').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    });
  }

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    test(`${viewport.width}×${viewport.height}: each row picks its direction — the sheet follows, nothing scrolls or moves, the change is read out`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      await open(page);
      await showIndex(page);
      const before = await shown(page);
      expect(before.live, 'nothing is read out before a pick').toBe('');
      for (const index of [2, 4, 1, 3, 0]) {
        const direction = directions[index];
        const row = rows(page).nth(index);
        await pick(page, row, direction.href);
        const after = await shown(page);
        expect(after.label).toBe(`Про напрям: ${direction.cardTitle}`);
        expect(after.strip).toBe(`Аркуш ${direction.number} · Умовна схема`);
        expect(after.names).toEqual([direction.cardTitle]);
        expect(after.drawings).toEqual([direction.id]);
        expect(after.live).toBe(`Показано схему: ${direction.cardTitle}`);
        expect(await rows(page).evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-pressed')))).toEqual(directions.map((_, i) => String(i === index)));
        // the picked row has a mark of its own beside its number, not only its colour
        expect(await row.evaluate((b) => getComputedStyle(b, '::before').content)).not.toBe('none');
        expect(await rows(page).nth((index + 1) % directions.length).evaluate((b) => getComputedStyle(b, '::before').content)).toBe('none');
        // no scroll, and the sheet and the index keep their place and size
        expect(after.scrollY, `${direction.cardTitle}: no scroll`).toBe(before.scrollY);
        expect(after.sheet, `${direction.cardTitle}: the sheet`).toEqual(before.sheet);
        expect(after.list, `${direction.cardTitle}: the index`).toEqual(before.list);
        await expect(row).toBeFocused();
      }
    });
  }

  test('390: Tab reaches the sheet, then the five rows in order, each with a visible focus ring; Enter and Space pick, Enter on the sheet opens the picked page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    // Start from the intro (not focusable itself), so the next Tab is the band's first stop
    await page.locator('#directions .section-header-support').evaluate((el) => { el.setAttribute('tabindex', '-1'); (el as HTMLElement).focus(); });
    const stops: string[] = [];
    for (let i = 0; i <= directions.length; i += 1) {
      await page.keyboard.press('Tab');
      stops.push(await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = getComputedStyle(el);
        const ring = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
        const what = el.matches('a.dxi-sheet') ? 'sheet' : el.matches('#directions ul button') ? `row ${el.textContent?.trim()}` : 'other';
        return `${what} ${ring ? 'ring' : 'no-ring'}`;
      }));
    }
    expect(stops).toEqual(['sheet ring', ...directions.map(({ number, cardTitle }) => `row ${number}${cardTitle} ring`)]);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('#directions .dxi')))).toBe(false);

    // Enter on the fourth row and Space on the third pick them; the focus stays on the row
    await rows(page).nth(3).focus();
    await expect(async () => {
      await page.keyboard.press('Enter');
      await expect(sheet(page)).toHaveAttribute('href', directions[3].href, { timeout: 1_000 });
    }).toPass();
    await expect(rows(page).nth(3)).toBeFocused();
    await rows(page).nth(2).focus();
    await page.keyboard.press('Space');
    await expect(sheet(page)).toHaveAttribute('href', directions[2].href);
    await expect(rows(page).nth(2)).toHaveAttribute('aria-pressed', 'true');
    // Enter on the sheet opens the picked direction
    await sheet(page).focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(`**${directions[2].href}`);
  });

  test('320: every name stays whole in the index and on the sheet — «Металоконструкції» one word on one line, clear of its neighbours', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await open(page);
    await pick(page, rows(page).nth(2), directions[2].href);
    const measured = await band(page).evaluate((root) => {
      const words = (el: Element) => {
        const node = el.firstChild!;
        return [...(node.textContent ?? '').matchAll(/\S+/g)].map((m) => {
          const range = document.createRange();
          range.setStart(node, m.index!);
          range.setEnd(node, m.index! + m[0].length);
          const rects = [...range.getClientRects()].filter((r) => r.width > 0.5);
          return { word: m[0], lines: new Set(rects.map((r) => Math.round(r.top))).size, right: Math.max(...rects.map((r) => r.right)) };
        });
      };
      const clear = (a: DOMRect, b: DOMRect) => a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5;
      const index = [...root.querySelectorAll('.dxi-row')].map((row) => {
        const name = row.querySelector('.dxi-row-name')!;
        return { name: name.textContent?.trim(), words: words(name), right: row.getBoundingClientRect().right, clear: clear(name.getBoundingClientRect(), row.querySelector('.dxi-num')!.getBoundingClientRect()) };
      });
      const sheetName = root.querySelector('.dxi-name.is-active')!;
      const sheetBox = root.querySelector('.dxi-sheet')!.getBoundingClientRect();
      return {
        index,
        sheet: { name: sheetName.textContent?.trim(), words: words(sheetName), right: sheetBox.right, clear: clear(sheetName.getBoundingClientRect(), root.querySelector('.dxi-more')!.getBoundingClientRect()) },
      };
    });
    for (const entry of [...measured.index, measured.sheet]) {
      for (const word of entry.words) {
        expect(word.lines, `${entry.name}: «${word.word}» on one line`).toBe(1);
        expect(word.right, `${entry.name}: «${word.word}» inside its box`).toBeLessThanOrEqual(entry.right + 0.5);
      }
      expect(entry.clear, `${entry.name} clear of its neighbour`).toBe(true);
    }
    expect(measured.sheet.name).toBe('Металоконструкції');
    expect(measured.sheet.words).toHaveLength(1);
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

test.describe('HOME directions from 761 px: the mosaic as it was', () => {
  test.skip(({ isMobile }) => isMobile, 'a desktop and tablet check; the desktop project runs it');

  for (const viewport of [{ width: 761, height: 1024 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    test(`${viewport.width}: five labelled illustration cards in the mosaic, the intro whole, no phone sheet or index`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page);
      const section = page.locator('#directions');
      await expect(section.getByRole('list')).toHaveCount(0);
      await expect(section.locator('.dxi')).toBeHidden();
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
      expect(await section.evaluate((root) => [...root.querySelectorAll<HTMLElement>('a, button')]
        .filter((a) => a.tabIndex >= 0 && a.getClientRects().length)
        .map((a) => a.getAttribute('href')))).toEqual(directions.map(({ href }) => href));
    });
  }
});
