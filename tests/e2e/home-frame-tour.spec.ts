import { expect, test } from '@playwright/test';

// HOME's frame tour (HomeFrameTour.tsx) and the row of direction cards (home-v2.css), owner 02.11: the tour is /angary's own
// drawing, comes only as the visitor nears it, says it is an example, and the computer's row keeps every direction reachable.

test('the tour is not fetched on the first screen and plays by itself as it comes into view', async ({ page, isMobile }) => {
  const tourFiles: string[] = [];
  page.on('request', (request) => { if (/\/(HomeFrameTour|FrameTour)-[^/]+\.js/.test(request.url())) tourFiles.push(request.url()); });
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('.hv2-frame-slot')?.hasAttribute('data-armed'));
  expect(tourFiles, 'nothing of the tour on the first screen').toHaveLength(0);

  await page.locator('.hv2-frame-slot').scrollIntoViewIfNeeded();
  const tour = page.locator('.hv2-frame-tour');
  await expect(tour).toBeVisible();
  await expect(tour).toHaveAttribute('data-touring', 'true', { timeout: 6000 });
  await expect(page.locator('.hv2-frame-stamp')).toContainText('Приклад');
  await expect(page.locator('.hv2-frame-steps button')).toHaveCount(5);
  expect(isMobile || (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1).toBe(true);
});

test('with reduced motion the tour stands still and a step switches at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'load' });
  await page.locator('.hv2-frame-slot').scrollIntoViewIfNeeded();
  const tour = page.locator('.hv2-frame-tour');
  await expect(tour).toBeVisible();
  await expect(tour).not.toHaveAttribute('data-touring', 'true');
  await page.locator('.hv2-frame-steps button').nth(3).click();
  await expect(tour).toHaveAttribute('data-step', '4');
  await expect(page.locator('.hv2-frame-text p[aria-live]')).toContainText('Сніг');
});

// Above the sheet: a tour that came in with another height moved it under a visitor who arrived at it by a link
for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1200, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`at ${viewport.width}px the tour takes exactly the room kept for it`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('.hv2-frame-slot')?.hasAttribute('data-armed'));
    const sheetTop = () => page.locator('#real-object').evaluate((sheet) => sheet.getBoundingClientRect().top + window.scrollY);
    const slotHeight = () => page.locator('.hv2-frame-slot').evaluate((slot) => slot.getBoundingClientRect().height);
    const before = { top: await sheetTop(), height: await slotHeight() };
    await page.locator('.hv2-frame-slot').scrollIntoViewIfNeeded();
    await expect(page.locator('.hv2-frame-tour')).toBeVisible();
    expect(await slotHeight()).toBeCloseTo(before.height, 0);
    expect(await sheetTop()).toBeCloseTo(before.top, 0);
    // …and it fits that room: nothing of the tour hangs out of it
    const overflow = await page.locator('.hv2-frame-slot').evaluate((slot) => {
      const bottom = slot.getBoundingClientRect().bottom;
      return Math.max(...[...slot.querySelectorAll('.hv2-frame-picture, .hv2-frame-side, .hv2-frame-text, .hv2-frame-stamp')].map((part) => part.getBoundingClientRect().bottom)) - bottom;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('without script the block reads on and leaves no empty room for the tour', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'load' });
  expect(await page.locator('.hv2-frame-slot').evaluate((slot) => (slot as HTMLElement).offsetHeight)).toBe(0);
  await expect(page.locator('#real-object')).toBeVisible();
  await context.close();
});

test('the row of cards opens the one the keyboard reaches', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a computer\'s row; a phone has the index of sheets');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'load' });
  const cards = page.locator('.hv2-directions .direction-card');
  await expect(cards).toHaveCount(5);
  await cards.nth(3).focus();
  await expect.poll(() => cards.evaluateAll((all) => all.map((card) => Math.round(card.getBoundingClientRect().width)).indexOf(Math.max(...all.map((card) => Math.round(card.getBoundingClientRect().width)))))).toBe(3);
  await expect(cards.nth(3).locator('small')).toBeVisible();
});
