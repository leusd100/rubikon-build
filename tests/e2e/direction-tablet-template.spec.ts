import { expect, test, type Page } from '@playwright/test';

// W2-03 · the direction template on a tablet and a desktop (owner 22.10: PDO-43 S2 up to 900 px, PDO-50 (a)). Every test
// denies the optional cookies and answers any Google request with an empty 200, so no tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, path: string, width: number, height = 1000) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

const node = (page: Page) => page.locator('.dn').evaluate((grid) => {
  const box = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  };
  const part = (selector: string) => box(grid.querySelector(selector)!);
  return { grid: box(grid), copy: part('.direction-editorial-copy'), steps: part('.dn-steps'), sheet: part('.dn-sheet'), image: part('.dn-sheet .sheet-image') };
});

test.describe('PDO-43 · the node on a portrait tablet', () => {
  test('768–900 px: the text and the steps side by side, the sheet under them the full width in a 3 : 2 frame', async ({ page }) => {
    test.setTimeout(60_000);
    for (const path of ['/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty']) {
      for (const width of [768, 820, 900]) {
        const where = `${path} ${width}px`;
        await open(page, path, width);
        const { grid, copy, steps, sheet, image } = await node(page);
        expect(steps.left, `${where}: steps right of the text`).toBeGreaterThanOrEqual(copy.right);
        expect(Math.abs(steps.top - copy.top), `${where}: on one line`).toBeLessThanOrEqual(2);
        expect(sheet.top, `${where}: the sheet under both`).toBeGreaterThanOrEqual(Math.max(copy.bottom, steps.bottom));
        expect(sheet.width, `${where}: the full width`).toBeCloseTo(grid.width, 0);
        expect(image.width / image.height, `${where}: 3 : 2`).toBeCloseTo(1.5, 1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), where).toBeLessThanOrEqual(width);
      }
    }
  });

  test('the tour still walks its steps in the new frame', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 768);
    for (const step of [1, 2, 3]) {
      await page.locator('.dn-step').nth(step - 1).click();
      await expect(page.locator('.dn')).toHaveAttribute('data-step', String(step));
      await expect(page.locator('.dn-step').nth(step - 1)).toHaveAttribute('aria-pressed', 'true');
    }
    const { image } = await node(page);
    expect(image.height).toBeGreaterThan(400);
  });

  test('from 901 px the sheet stands beside the text as before; the grain store keeps its own tablet layout', async ({ page }) => {
    for (const width of [901, 1024]) {
      await open(page, '/metalokonstruktsii', width);
      const { copy, sheet } = await node(page);
      expect(sheet.left, `${width}px`).toBeGreaterThan(copy.right);
    }
    await open(page, '/zernoskhovyshcha', 820);
    await expect(page.locator('.dn')).not.toHaveCSS('grid-template-areas', /copy steps/);
  });
});

test.describe('PDO-50 · the situation cards', () => {
  const rows = (page: Page) => page.locator('.direction-entry-list > li').evaluateAll((cards) => cards.map((card) => ({
    title: Math.round(card.querySelector('h3')!.getBoundingClientRect().top),
    start: Math.round(card.querySelector('.direction-entry-start')!.getBoundingClientRect().top),
    link: Math.round(card.querySelector('.direction-entry-link')!.getBoundingClientRect().top),
  })));
  const spread = (values: number[]) => Math.max(...values) - Math.min(...values);

  test('roofing, from 901 px: «Почнемо з» and the links of the three cards on one line each', async ({ page }) => {
    for (const width of [901, 1024, 1280, 1440, 1920]) {
      await open(page, '/pokrivelni-roboty', width);
      const cards = await rows(page);
      expect(cards).toHaveLength(3);
      expect(spread(cards.map((card) => card.start)), `${width}px: «Почнемо з»`).toBeLessThanOrEqual(1);
      expect(spread(cards.map((card) => card.link)), `${width}px: the links`).toBeLessThanOrEqual(1);
    }
    await open(page, '/pokrivelni-roboty', 900);
    const stacked = await rows(page);
    expect(stacked[1].title, '900 px: one under another').toBeGreaterThan(stacked[0].link);
  });

  test('roofing: «Почнемо з» reads as one phrase, and situation 2 no longer repeats it', async ({ page }) => {
    await open(page, '/pokrivelni-roboty', 1440);
    const starts = await page.locator('.direction-entry-start').evaluateAll((items) => items.map((item) => item.textContent?.replace(/\s+/g, ' ').trim()));
    expect(starts).toEqual([
      'Почнемо з огляду й замірів: площа, ухили, стан основи, примикання',
      'Почнемо з огляду основи й покриття — тоді визначимо обсяг ремонту',
      'Почнемо з площі й ухилу даху, типу основи, бажаного покриття',
    ]);
    await expect(page.locator('.direction-entry-list > li').nth(1).locator('.direction-entry-copy p')).toHaveText('Локальний ремонт пошкоджених ділянок або поетапна заміна наявного покриття.');
  });

  test('the grain store: the four titles and «Почнемо з» on one line each from 1051 px, per row on a tablet', async ({ page }) => {
    for (const width of [1280, 1440, 1920]) {
      await open(page, '/zernoskhovyshcha', width);
      const cards = await rows(page);
      expect(cards).toHaveLength(4);
      expect(spread(cards.map((card) => card.title)), `${width}px: titles`).toBeLessThanOrEqual(1);
      expect(spread(cards.map((card) => card.start)), `${width}px: «Почнемо з»`).toBeLessThanOrEqual(1);
    }
    for (const width of [820, 1024]) {
      await open(page, '/zernoskhovyshcha', width);
      const cards = await rows(page);
      for (const [one, two] of [[cards[0], cards[1]], [cards[2], cards[3]]]) {
        expect(Math.abs(one.title - two.title), `${width}px: titles in a row`).toBeLessThanOrEqual(1);
      }
    }
  });
});
