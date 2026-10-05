import { expect, test } from '@playwright/test';

// /napryamky below 1051 px: every catalogue row carries a small drawing sheet — a line scheme over a one-line title
// block («Аркуш NN · Схема») — where a 92 px photo thumbnail used to stand (owner, 04.10: the photos were too small to
// read on a phone). These pin what that change promised: the picture is big enough, the rows hold no image, the row is
// still one link, nothing overflows on the narrowest phones, and the desktop catalogue is as it was.

const ROWS = '#directions-list .route-service';

test.describe('/napryamky rows on narrow screens', () => {
  for (const width of [320, 344, 360, 390]) {
    test(`each row shows a scheme sheet and fits a ${width}px screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/napryamky', { waitUntil: 'load' });

      const rows = page.locator(ROWS);
      await expect(rows).toHaveCount(5);
      await expect(page.locator(`${ROWS} .dcat-thumb svg`)).toHaveCount(5);
      await expect(page.locator(`${ROWS} img`)).toHaveCount(0);
      await expect(page.locator(`${ROWS} .dcat-strip`).first()).toHaveText(/Аркуш 01\s*Схема/);

      const sheets = await page.locator(`${ROWS} .dcat-thumb`).evaluateAll((thumbs) => thumbs.map((thumb) => {
        const box = thumb.getBoundingClientRect();
        return { width: box.width, right: box.right, hidden: thumb.getAttribute('aria-hidden') };
      }));
      for (const sheet of sheets) {
        // 92 px was the photo; a scheme reads from about 116 px, and gets 150 px or more on an ordinary phone
        expect(sheet.width).toBeGreaterThanOrEqual(width >= 390 ? 150 : 116);
        expect(sheet.right).toBeLessThanOrEqual(width + 0.5);
        expect(sheet.hidden).toBe('true');
      }

      // A focused row is padded: the longest word of the copy must still fit beside the sheet
      await rows.first().focus();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      expect(await page.locator(`${ROWS} p`).evaluateAll((copy) => copy.filter((text) => text.scrollWidth > text.clientWidth + 1).length)).toBe(0);
    });
  }

  test('the list stays a list: about a third of a screen longer than with thumbnails, not a screen per row', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/napryamky', { waitUntil: 'load' });
    const height = await page.locator('.dcat').evaluate((catalog) => catalog.getBoundingClientRect().height);
    // 893 px with the thumbnails; full-width sheets would have cost more than a thousand
    expect(height).toBeLessThanOrEqual(893 + 340);
  });

  test('a tablet shows the same sheets, larger', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/napryamky', { waitUntil: 'load' });
    await expect(page.locator(`${ROWS} .dcat-thumb svg`)).toHaveCount(5);
    const widths = await page.locator(`${ROWS} .dcat-thumb`).evaluateAll((thumbs) => thumbs.map((thumb) => thumb.getBoundingClientRect().width));
    for (const sheetWidth of widths) expect(sheetWidth).toBeGreaterThanOrEqual(170);
  });
});

test('/napryamky from 1051 px keeps the sticky sheet with illustrations and shows no row sheets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/napryamky', { waitUntil: 'load' });
  await expect(page.locator('.dcat-preview')).toBeVisible();
  await expect(page.locator('.dcat-preview .dcat-frame img')).toHaveCount(5);
  for (const thumb of await page.locator(`${ROWS} .dcat-thumb`).all()) await expect(thumb).toBeHidden();
});
