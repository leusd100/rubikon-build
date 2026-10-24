import { expect, test, type Page } from '@playwright/test';

// W2-07 · the grain complex on a phone (owner 24.10: PDO-13 A, PDO-49 A′ and legend A, PDO-82; PDO-100 by OD-PX-23 (a)).
// Every option of every group is in sight, a chosen one is graphite with its crop's own colour on the icon, the drawing's
// caveat stands under it, band 04's building is copper as its key says, and a finger's first tap on a module names it —
// the second changes it. Every test denies the optional cookies and answers any Google request with an empty 200, so no
// tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

const GRAIN = '/zernoskhovyshcha';

async function open(page: Page, width: number, height = 844) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(GRAIN, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

/** A colour the page resolves from a custom property, as `rgb(…)` */
const resolved = (page: Page, value: string, inside = 'body') => page.evaluate(([css, host]) => {
  const probe = document.createElement('i');
  probe.style.color = css;
  document.querySelector(host)!.appendChild(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}, [value, inside] as const);

test.describe('/zernoskhovyshcha · the complex on a phone (W2-07)', () => {
  test('every option of every group is on screen, with no sideways row (PDO-13 A)', async ({ page }) => {
    for (const width of [320, 390]) {
      await open(page, width, width === 320 ? 700 : 844);
      const outside = await page.locator('.gc-chip').evaluateAll((chips) => chips
        .filter((chip) => { const box = chip.getBoundingClientRect(); return box.left < 0 || box.right > innerWidth; })
        .map((chip) => chip.textContent?.trim()));
      expect(outside, `${width}px`).toEqual([]);
      await expect(page.locator('.gc-chip')).toHaveCount(15);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test('in a 700 × 900 window, Shift+Tab to «Соя» leaves the chip clear of the sticky drawing', async ({ page }) => {
    await open(page, 700, 900);
    await page.getByRole('checkbox', { name: 'Очищення' }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('checkbox', { name: 'Соя' })).toBeFocused();
    const [chip, sheet] = await Promise.all([
      page.locator('.gc-chip', { hasText: 'Соя' }).evaluate((element) => element.getBoundingClientRect().top),
      page.locator('.gc-sheet').evaluate((element) => element.getBoundingClientRect().bottom),
    ]);
    expect(chip).toBeGreaterThanOrEqual(sheet);
  });

  test('a chosen chip is graphite and its crop icon keeps the crop\'s colour (PDO-49 A′)', async ({ page }) => {
    for (const width of [390, 1440]) {
      await open(page, width, width < 761 ? 844 : 900);
      const chosen = page.locator('.gc-chip', { hasText: 'Пшениця' }).locator('span').first();
      await expect(chosen).toHaveCSS('background-color', await resolved(page, 'var(--color-text)'));
      await expect(chosen.locator('.gc-crop-icon')).toHaveCSS('color', await resolved(page, 'var(--crop-wheat)', '.gc'));
      await expect(page.locator('.gc-chip', { hasText: 'Соняшник' }).locator('span').first()).not.toHaveCSS('background-color', await resolved(page, 'var(--color-text)'));
    }
  });

  test('on a phone the drawing\'s caveat stands right under it; a wider screen keeps it at the end (PDO-82)', async ({ page }) => {
    await open(page, 390);
    const caption = page.locator('.gc-caption-phone');
    await expect(caption).toHaveText('Схема без масштабу: кількість силосів і розміри визначає проєкт.');
    const gap = await page.evaluate(() => document.querySelector('.gc-caption-phone')!.getBoundingClientRect().top - document.querySelector('.gc-sheet')!.getBoundingClientRect().bottom);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(60);
    await expect(page.locator('.gc-next-scale')).toBeHidden();
    await expect(page.locator('.gc-scope-col li').first()).toHaveCSS('font-size', '15px');
    await open(page, 1440, 900);
    await expect(caption).toBeHidden();
    await expect(page.locator('.gc-next-scale')).toBeVisible();
  });

  test('band 04\'s overview draws the building in copper, as its key says (PDO-49 legend A)', async ({ page }) => {
    for (const width of [390, 1440]) {
      await open(page, width, width < 761 ? 844 : 900);
      await expect(page.locator('.grain-implementation-band .dn')).not.toHaveAttribute('data-step', /.*/);
      const copper = await resolved(page, 'var(--color-accent)');
      const strokes = await page.locator('.grain-implementation-band .node-drawing-grain-store .nd-part').evaluateAll((parts) => [...new Set(parts.map((part) => getComputedStyle(part).stroke))]);
      expect(strokes, `${width}px`).toEqual([copper]);
    }
  });
});

test.describe('/zernoskhovyshcha · a finger on the drawing (PDO-100)', () => {
  test.use({ hasTouch: true });

  test('the first tap names the module, the second changes it; a tap elsewhere or a scroll closes the tip', async ({ page }) => {
    await open(page, 390);
    const cleaning = page.locator('.gc-hit[data-module="cleaning"]');
    const tip = page.locator('.gc-tip');
    const checkbox = page.getByRole('checkbox', { name: 'Очищення' });
    await cleaning.tap();
    await expect(tip).toContainText('Очищення');
    await expect(tip).toContainText('Торкніться ще раз, щоб прибрати з ланцюга');
    await expect(checkbox).toBeChecked();
    await cleaning.tap();
    await expect(checkbox).not.toBeChecked();
    await expect(tip).toContainText('Торкніться ще раз, щоб додати в ланцюг');
    await page.locator('.gc-group-crops legend').tap();
    await expect(tip).toHaveCount(0);
    await expect(checkbox).not.toBeChecked();

    // a first tap on another module names it too, and the page scrolling away closes its tip
    await page.locator('.gc-hit[data-module="receiving"]').tap();
    await expect(tip).toContainText('Приймання');
    await page.evaluate(() => window.scrollBy({ top: 120, behavior: 'instant' }));
    await expect(tip).toHaveCount(0);
  });
});
