import { expect, test, type Page } from '@playwright/test';

// W2-02 · the direction template on a phone (owner 22.10: PDO-14 A, PDO-51 V2, PDO-20 C′ and the /yak frames at 16 units).
// Every test denies the optional cookies and answers any Google request with an empty 200, so no tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, path: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

const FAQ_PAGES = ['/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/zernoskhovyshcha', '/angary', '/yak-pratsyuiemo'];

test.describe('PDO-14 · «Не знайшли свого питання?»', () => {
  test('on a phone it closes the list: one copy shown, after the last question, and the questions come first in the tab order', async ({ page }) => {
    test.setTimeout(90_000);
    for (const width of [320, 390]) {
      for (const path of FAQ_PAGES) {
        const where = `${path} ${width}px`;
        await open(page, path, width, 844);
        const section = page.locator('.faq-section');
        await expect(section.locator('.faq-ask:visible'), where).toHaveCount(1);
        await expect(section.locator('.faq-ask-end'), where).toBeVisible();
        const { askTop, listBottom } = await section.evaluate((element) => ({
          askTop: element.querySelector('.faq-ask-end')!.getBoundingClientRect().top,
          listBottom: element.querySelector('.faq-list')!.getBoundingClientRect().bottom,
        }));
        expect(askTop, where).toBeGreaterThanOrEqual(listBottom);
        // what the keyboard reaches, in order: every question, then the call and the form
        const order = await section.locator(':is(summary, a):visible').evaluateAll((items) => items.map((item) => item.tagName));
        expect(order.lastIndexOf('SUMMARY'), where).toBeLessThan(order.indexOf('A'));
        expect(await page.evaluate(() => document.documentElement.scrollWidth), where).toBeLessThanOrEqual(width);
      }
    }
  });

  test('from 768 px it stays under the title beside the list, and the title column of /angary and the grain store stays sticky', async ({ page }) => {
    test.setTimeout(60_000);
    for (const width of [768, 1440]) {
      for (const path of FAQ_PAGES) {
        const where = `${path} ${width}px`;
        await open(page, path, width);
        const section = page.locator('.faq-section');
        await expect(section.locator('.faq-ask:visible'), where).toHaveCount(1);
        await expect(section.locator('.faq-heading .faq-ask-side'), where).toBeVisible();
        await expect(section.locator('.faq-ask-end'), where).toBeHidden();
      }
    }
    for (const path of ['/angary', '/zernoskhovyshcha']) {
      await open(page, path, 1440);
      await expect(page.locator('.faq-heading'), path).toHaveCSS('position', 'sticky');
    }
  });
});

test.describe('PDO-51 · «Що виконуємо» on a phone', () => {
  test('the number and the title share a line and the text takes the full width, as in the cost list', async ({ page }) => {
    for (const path of ['/metalokonstruktsii', '/betonni-roboty']) {
      for (const width of [320, 390]) {
        const where = `${path} ${width}px`;
        await open(page, path, width, 844);
        const cards = await page.locator('.feature-list article').evaluateAll((articles) => articles.map((article) => {
          const box = article.getBoundingClientRect();
          const number = article.querySelector('span')!.getBoundingClientRect();
          const title = article.querySelector('h3')!.getBoundingClientRect();
          const text = article.querySelector('p')!.getBoundingClientRect();
          return { left: box.left, width: box.width, numberWidth: number.width, titleLeft: title.left, titleTop: title.top, numberBottom: number.bottom, textLeft: text.left, textWidth: text.width };
        }));
        expect(cards.length, where).toBeGreaterThanOrEqual(4);
        for (const card of cards) {
          expect(card.textLeft, where).toBeCloseTo(card.left, 0);
          expect(card.textWidth, where).toBeCloseTo(card.width, 0);
          expect(card.titleLeft - card.left, `${where}: 26 px number + 12 px`).toBeCloseTo(38, 0);
          expect(card.numberBottom, `${where}: the number beside the title`).toBeGreaterThan(card.titleTop);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth), where).toBeLessThanOrEqual(width);
      }
    }
  });

  test('from 761 px the list keeps its 54 px number column', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 1024);
    await expect(page.locator('.feature-list article').first()).toHaveCSS('grid-template-columns', /^54px /);
  });
});

test.describe('PDO-20 · drawings on a phone', () => {
  const words = (page: Page) => page.locator('.dn .node-drawing').evaluate((drawing) => ({
    note: getComputedStyle(drawing.querySelector('.nd-note')!).fontSize,
    title: getComputedStyle(drawing.querySelector('.nd-title')!).fontSize,
  }));
  const badge = (page: Page) => page.locator('.dn-badge circle').first().evaluate((circle) => Math.round(circle.getBoundingClientRect().width));

  test('the node overview doubles its words and grows its badges; a step keeps the words as they were', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 390, 844);
    await page.locator('.dn-sheet').scrollIntoViewIfNeeded();
    await expect(page.locator('.dn')).not.toHaveAttribute('data-step', /.+/);
    expect(await words(page)).toEqual({ note: '44px', title: '52px' });
    expect(await badge(page)).toBeGreaterThanOrEqual(22);
    await page.locator('.dn-step').nth(2).click();
    await expect(page.locator('.dn')).toHaveAttribute('data-step', '3');
    expect(await words(page)).toEqual({ note: '22px', title: '34px' });
    for (const path of ['/betonni-roboty', '/pokrivelni-roboty']) {
      await open(page, path, 390, 844);
      expect(await badge(page), path).toBeGreaterThanOrEqual(22);
    }
  });

  test('from 761 px the node is as it was', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 1024);
    expect(await words(page)).toEqual({ note: '22px', title: '34px' });
    await expect(page.locator('.dn-badge').first()).toHaveCSS('scale', 'none');
  });

  test('/yak: the frames’ names are 16 units on a phone, and in every format they clear each other and the drawing’s edge', async ({ page }) => {
    for (const width of [320, 390]) {
      await open(page, '/yak-pratsyuiemo', width, 844);
      const options = page.locator('#obsiah .dfmt-option');
      const count = await options.count();
      expect(count).toBe(3);
      for (let index = 0; index < count; index += 1) {
        await options.nth(index).click();
        const where = `${width}px, format ${index + 1}`;
        const labels = await page.locator('#obsiah .fs').evaluate((drawing) => {
          const edge = drawing.getBoundingClientRect();
          const shown = [...drawing.querySelectorAll('.fs-label')].filter((label) => getComputedStyle(label).opacity !== '0');
          return {
            size: shown.map((label) => getComputedStyle(label).fontSize),
            boxes: shown.map((label) => label.getBoundingClientRect()).map((box) => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom })),
            edge: { left: edge.left, right: edge.right },
          };
        });
        expect(labels.size.length, where).toBeGreaterThanOrEqual(1);
        for (const size of labels.size) expect(size, where).toBe('16px');
        for (const box of labels.boxes) {
          expect(box.left, where).toBeGreaterThanOrEqual(labels.edge.left - 1);
          expect(box.right, where).toBeLessThanOrEqual(labels.edge.right + 1);
        }
        for (let a = 0; a < labels.boxes.length; a += 1) for (let b = a + 1; b < labels.boxes.length; b += 1) {
          const [one, two] = [labels.boxes[a], labels.boxes[b]];
          expect(one.right <= two.left || two.right <= one.left || one.bottom <= two.top || two.bottom <= one.top, `${where}: names overlap`).toBe(true);
        }
      }
    }
    await open(page, '/yak-pratsyuiemo', 1440);
    await expect(page.locator('#obsiah .fs-label').first()).toHaveCSS('font-size', '11px');
  });
});
