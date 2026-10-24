import { expect, test, type Page } from '@playwright/test';
import { openControlGroup } from './configurator.helpers';

// W2-01 · the /angary cost factors (owner 24.10: PDO-12 A). Every one of the seven factors has a line saying what it
// covers, in words the page already says (the configurator's and the Delivery Model's); the visitor's own note («У вашій
// конфігурації: …») stands under that line. The shared list on /yak keeps its own lines. Every test denies the optional
// cookies and answers any Google request with an empty 200, so no tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, path: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

const LINES = [
  ['Габарити', 'довжина, ширина, висота стін і в конику'],
  ['Конструктив і навантаження', 'проліт без колон чи з рядом колон, сніг, вітер, кран-балка'],
  ['Фундамент', 'визначає проєктувальник після розрахунку навантажень і з урахуванням умов майданчика'],
  ['Утеплення', 'профнастил чи сендвіч-панель для стін і покрівлі'],
  ['Технологія й обладнання', 'ворота, двері, спеціалізоване обладнання'],
  ['Умови майданчика', 'логістика, роботи на діючому об’єкті, доступність майданчика, монтажні обмеження'],
  ['Залежності від інших робіт і строки', 'строки, залежності між підрядниками'],
];

/** Each row of a cost list: its title and its line, if shown */
const rows = (page: Page, list: string) => page.locator(`${list} .proc-factors li[data-factor]`).evaluateAll((items) => items.map((item) => {
  const detail = item.querySelector('.cf-detail');
  return [item.querySelector('b')!.textContent, detail && detail.getBoundingClientRect().height > 0 ? detail.textContent : null];
}));

test.describe('/angary · what each cost factor covers (PDO-12 A)', () => {
  test('on a phone and a desktop all seven factors have their line', async ({ page }) => {
    for (const width of [390, 1440]) {
      await open(page, '/angary', width, width < 761 ? 844 : 900);
      expect(await rows(page, '#vartist'), `${width}px`).toEqual(LINES);
    }
  });

  test('the visitor\'s note stands under the factor\'s line', async ({ page }) => {
    await open(page, '/angary', 1440);
    await openControlGroup(page, 'dimensions');
    await page.locator('#hc-dimension-width').fill('12');
    await page.locator('#hc-dimension-width').blur();
    const dimensions = page.locator('#vartist li[data-factor="dimensions"]');
    await expect(dimensions.locator('.cf-note')).toContainText('У вашій конфігурації: 12 × 60 × 8 м, коник');
    const [line, note] = await Promise.all(['.cf-detail', '.cf-note'].map((selector) => dimensions.locator(selector).evaluate((element) => element.getBoundingClientRect())));
    expect(note.top).toBeGreaterThanOrEqual(line.bottom - 0.5);
  });

  test('/yak-pratsyuiemo keeps the shared list: a line only under «Умови майданчика»', async ({ page }) => {
    await open(page, '/yak-pratsyuiemo', 1440);
    expect(await rows(page, '#koshtorys')).toEqual(LINES.map(([title, line]) => [title, title === 'Умови майданчика' ? line : null]));
  });
});
