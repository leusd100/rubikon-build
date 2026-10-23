import { expect, test, type Page } from '@playwright/test';

// W2-06 · /yak-pratsyuiemo and /pro-nas on a phone and a tablet (owner 23.10: OD-PX-23 (a) with /pro-nas A, PDO-52
// variant 1, PDO-53, PDO-54). Every test denies the optional cookies and answers any Google request with an empty 200, so
// no tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, path: string, width: number, height = 900, motion: 'reduce' | 'no-preference' = 'reduce') {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

const YAK = '/yak-pratsyuiemo';
const top = (page: Page, selector: string) => page.locator(selector).first().evaluate((element) => element.getBoundingClientRect().top + window.scrollY);

test.describe('/yak-pratsyuiemo · «Якщо щось змінюється» on a phone (PDO-100)', () => {
  test('the sheets stand first in their final state, the procedure under them with every step\'s words, and no tour runs', async ({ page }) => {
    await open(page, YAK, 390, 844, 'no-preference');
    expect(await top(page, '.cs-sheets')).toBeLessThan(await top(page, '.cs-change'));
    await expect(page.locator('.cs-hint')).toBeHidden();
    await expect(page.locator('.cs-said')).toBeHidden();
    const details = page.locator('.cs-steps .cs-detail');
    await expect(details).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) await expect(details.nth(index)).toBeVisible();
    await page.locator('.cs').scrollIntoViewIfNeeded();
    // a tour arms the block as soon as the page is hydrated (data-hero-header is set from an effect then)
    await page.waitForFunction(() => document.documentElement.dataset.heroHeader);
    await expect(page.locator('.cs')).not.toHaveAttribute('data-armed', /.*/);
    await expect(page.locator('.cs')).toHaveAttribute('data-reached', '1 2 3 4');
  });

  test('from 761 px the procedure stands beside the sheets and the tour still plays', async ({ page }) => {
    await open(page, YAK, 1440, 900, 'no-preference');
    await page.locator('.cs').scrollIntoViewIfNeeded();
    await expect(page.locator('.cs')).toHaveAttribute('data-armed', '');
    await expect(page.locator('.cs-hint')).toBeVisible();
  });
});

test.describe('/yak-pratsyuiemo · the matrix switcher on a wide screen (PDO-52)', () => {
  test('while the table scrolls by, the switcher\'s band is solid from the header to the table head', async ({ page }) => {
    for (const width of [1051, 1440]) {
      await open(page, YAK, width);
      await page.evaluate(() => {
        const table = document.querySelector('.resp-matrix')!;
        window.scrollTo({ top: table.getBoundingClientRect().top + window.scrollY + 400, behavior: 'instant' });
      });
      const state = await page.evaluate(() => {
        const band = document.querySelector('.proc-resp-switch')!;
        const box = band.getBoundingClientRect();
        return {
          header: Math.round(document.querySelector('.site-header')!.getBoundingClientRect().height),
          top: Math.round(box.top),
          bottom: box.bottom,
          head: document.querySelector('.rm-head')!.getBoundingClientRect().top,
          colour: getComputedStyle(band).backgroundColor,
          section: getComputedStyle(band.closest('section')!).backgroundColor,
        };
      });
      expect(state.top, `${width}px`).toBe(state.header);
      expect(state.colour, `${width}px`).toBe(state.section);
      expect(Math.abs(state.head - state.bottom), `${width}px`).toBeLessThan(1);
    }
  });
});

test.describe('/pro-nas', () => {
  test('up to 1050 px the practice\'s title comes before its drawing and the steps after it (PDO-100 A); a desktop keeps the two columns', async ({ page }) => {
    for (const width of [390, 768, 1024]) {
      await open(page, '/pro-nas', width, width < 761 ? 844 : 1024);
      const where = `${width}px`;
      const [title, sheet, steps] = [await top(page, '.about-story-copy h2'), await top(page, '.ps-sheet'), await top(page, '.about-before')];
      expect(title, where).toBeLessThan(sheet);
      expect(sheet, where).toBeLessThan(steps);
    }
    await open(page, '/pro-nas', 1440);
    const columns = await page.evaluate(() => ({ sheet: document.querySelector('.ps-sheet')!.getBoundingClientRect().right, copy: document.querySelector('.about-story-copy h2')!.getBoundingClientRect().left }));
    expect(columns.sheet).toBeLessThanOrEqual(columns.copy);
  });

  test('on a phone «Два покоління — одна відповідальність» stands under a full-width rule (PDO-53)', async ({ page }) => {
    for (const width of [320, 390]) {
      await open(page, '/pro-nas', width, 844);
      const rule = await page.locator('.team-bond').evaluate((element) => ({
        width: Number.parseFloat(getComputedStyle(element, '::before').width),
        line: element.getBoundingClientRect().width,
      }));
      expect(rule.width, `${width}px`).toBeGreaterThan(rule.line - 2);
    }
  });

  test('on a tablet the principles\' marks are at most 420 px wide (PDO-54)', async ({ page }) => {
    for (const width of [768, 1024]) {
      await open(page, '/pro-nas', width, 1024);
      const widths = await page.locator('.principle-mark').evaluateAll((marks) => marks.map((mark) => mark.getBoundingClientRect().width));
      expect(widths.length, `${width}px`).toBe(3);
      for (const markWidth of widths) expect(markWidth, `${width}px`).toBeLessThanOrEqual(420.5);
    }
  });
});
