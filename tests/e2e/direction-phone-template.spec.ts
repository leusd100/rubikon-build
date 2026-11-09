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

  test('the node doubles its words and grows its badges, in the overview and on a step', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 390, 844);
    await page.locator('.dn-sheet').scrollIntoViewIfNeeded();
    await expect(page.locator('.dn')).not.toHaveAttribute('data-step', /.+/);
    expect(await words(page)).toEqual({ note: '44px', title: '52px' });
    expect(await badge(page)).toBeGreaterThanOrEqual(22);
    await page.locator('.dn-step').nth(2).click();
    await expect(page.locator('.dn')).toHaveAttribute('data-step', '3');
    expect(await words(page)).toEqual({ note: '44px', title: '52px' });
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

  test('/yak: the frames’ names are readable on a phone, under the three drawings, and clear each other', async ({ page }) => {
    // PDO-20 (owner 22.10): the only words that say what the dashed frames are. Since 09.11 (the formats side by side)
    // a phone shows the three drawings three across, a third of the width each: the names stand under them, not inside
    for (const width of [320, 390]) {
      await open(page, '/yak-pratsyuiemo', width, 844);
      const where = `${width}px`;
      const names = await page.locator('#obsiah .dfmt-frame-name').evaluateAll((all) => all.map((name) => {
        const box = name.getBoundingClientRect();
        const column = name.closest('.dfmt-fig')!.getBoundingClientRect();
        return { size: parseFloat(getComputedStyle(name).fontSize), left: box.left, right: box.right, inside: box.left >= column.left - 1 && box.right <= column.right + 1 };
      }));
      expect(names, where).toHaveLength(3);
      for (const name of names) {
        expect(name.size, where).toBeGreaterThanOrEqual(11);
        expect(name.inside, where).toBe(true);
      }
      for (let a = 1; a < names.length; a += 1) expect(names[a - 1].right, `${where}: names overlap`).toBeLessThanOrEqual(names[a].left + 1);
      await expect(page.locator('#obsiah .fs-label').first()).toBeHidden();
    }
    await open(page, '/yak-pratsyuiemo', 1440);
    await expect(page.locator('#obsiah .fs-label').first()).toBeVisible();
    await expect(page.locator('#obsiah .dfmt-frame-name').first()).toBeHidden();
  });
});
