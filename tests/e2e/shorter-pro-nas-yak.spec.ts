import { expect, test, type Page } from '@playwright/test';

// W2-05 · fewer repeats on /yak-pratsyuiemo and /pro-nas (owner 23.10: OD-PX-24 (b) on /yak with PDO-78; on /pro-nas
// ABT-05 B — the principles stay as they are). Every test denies the optional cookies and answers any Google request
// with an empty 200, so no tag can load.

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

const YAK = '/yak-pratsyuiemo';

test.describe('/yak-pratsyuiemo says each thing once', () => {
  test('«Що буде після звернення» names the stages, under the eyebrow «Від задачі до будівництва» (PDO-78)', async ({ page }) => {
    await open(page, YAK, 1440);
    await expect(page.locator('#etapy h2')).toHaveText('Що буде після звернення');
    await expect(page.locator('#etapy .eyebrow')).toHaveText('Від задачі до будівництва');
  });

  test('the «Далі» plate goes on a phone and stays on a desktop; the cost section has no lead about itself', async ({ page }) => {
    await open(page, YAK, 390, 844);
    await expect(page.locator('.proc-start-merge')).toBeHidden();
    await expect(page.locator('#koshtorys .section-header-support')).toHaveCount(0);
    await open(page, YAK, 1440);
    await expect(page.locator('.proc-start-merge')).toBeVisible();
  });

  test('«Наш обсяг» and the responsibility map are one band: one background, no seam, the map under a subheading with its hint', async ({ page }) => {
    for (const width of [390, 1440]) {
      await open(page, YAK, width, width < 761 ? 844 : 900);
      const where = `${width}px`;
      const band = await page.evaluate(() => {
        const scope = document.querySelector('#obsiah')!;
        const map = document.querySelector('#vidpovidalnist')!;
        return {
          scopeBg: getComputedStyle(scope).backgroundColor,
          mapBg: getComputedStyle(map).backgroundColor,
          scopeBottom: getComputedStyle(scope).paddingBottom,
          gap: map.getBoundingClientRect().top - scope.getBoundingClientRect().bottom,
          labelledBy: document.getElementById(map.getAttribute('aria-labelledby')!)?.tagName,
        };
      });
      expect(band.mapBg, where).toBe(band.scopeBg);
      expect(band.scopeBottom, where).toBe('0px');
      expect(Math.abs(band.gap), where).toBeLessThan(1);
      expect(band.labelledBy, where).toBe('H3');
      await expect(page.locator('#vidpovidalnist .section-header h3'), where).toHaveText('Відповідальність без дрібного шрифту');
      await expect(page.locator('#vidpovidalnist h2, #vidpovidalnist .section-header .eyebrow'), where).toHaveCount(0);
      await expect(page.locator('#vidpovidalnist .section-header-support'), where).toContainText('Оберіть формат — таблиця покаже');
    }
  });

  test('on a phone the «Кошторис» sheet is compact: 24 px rows, the name only on the changed one', async ({ page }) => {
    await open(page, YAK, 390, 844);
    const rows = await page.locator('.cs-estimate .cs-rows li').evaluateAll((items) => items.map((item) => ({
      height: item.getBoundingClientRect().height,
      hot: item.classList.contains('cs-hot'),
      named: getComputedStyle(item.querySelector('.cs-name')!).visibility === 'visible',
    })));
    expect(rows).toHaveLength(7);
    for (const row of rows.filter((item) => !item.hot)) expect(row.height).toBeLessThan(26);
    expect(rows.filter((row) => row.named).map((row) => row.hot)).toEqual([true]);
    // the list above the sheet still names all seven
    await expect(page.locator('#koshtorys').getByText('Технологія й обладнання').first()).toBeVisible();
  });
});

test.describe('/pro-nas', () => {
  test('each person keeps the fuller paragraph, without the chips that repeated it (ABT-05 B); the principles stay three', async ({ page }) => {
    await open(page, '/pro-nas', 390, 844);
    await expect(page.locator('.team-about .person-focus, .team-about .person-focus-label')).toHaveCount(0);
    await expect(page.locator('.team-about .person-story').first()).toContainText('Його практичний досвід охоплює організацію робіт на майданчику');
    await expect(page.locator('.about-principles-grid > li')).toHaveCount(3);
  });
});
