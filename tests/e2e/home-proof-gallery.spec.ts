import { expect, test } from '@playwright/test';

for (const width of [320, 390]) {
  test(`refined gallery keeps names and persistent actions beside the images at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' })));
    await page.goto('/');
    const gallery = page.locator('.hv2-gallery-a');
    await gallery.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const cells = gallery.locator('.hv2-scope-cell');
    await expect(cells).toHaveCount(3);
    for (const cell of await cells.all()) {
      const hint = cell.locator('.hv2-scope-hint');
      await expect(hint).toBeVisible();
      await expect(hint).toContainText('Показати на кресленні');
      const boxes = await cell.evaluate((el) => {
        const box = (selector: string) => el.querySelector(selector)!.getBoundingClientRect();
        const image = box('img'), name = box('.hv2-scope-name'), action = box('.hv2-scope-hint'), button = el.getBoundingClientRect();
        return { imageRight: image.right, nameLeft: name.left, nameBottom: name.bottom, actionTop: action.top, actionBottom: action.bottom, buttonBottom: button.bottom };
      });
      expect(boxes.nameLeft).toBeGreaterThan(boxes.imageRight);
      expect(boxes.actionTop).toBeGreaterThanOrEqual(boxes.nameBottom);
      expect(boxes.actionBottom).toBeLessThanOrEqual(boxes.buttonBottom);
    }
    await expect(gallery.locator('.hv2-scope-kind')).toHaveText(['Схема', 'Фото', 'Фото']);
    await expect(gallery).toContainText('Фото з ретушшю переднього плану.');
  });
}

for (const lenis of ['on', 'off']) {
  test(`scope press wins over wheel momentum with Lenis ${lenis}`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Lenis only runs with a desktop pointer.');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' })));
    await page.goto(`/?lenis=${lenis}`);
    await page.evaluate(() => document.fonts.ready);
    if (lenis === 'on') await expect(page.locator('html')).toHaveClass(/lenis/);
    const roof = page.locator('.hv2-gallery-a .hv2-scope-cell').filter({ hasText: 'Покрівля' });
    await roof.scrollIntoViewIfNeeded();
    await expect(page.locator('.hv2-gallery-a .hv2-scope-chips')).toHaveAttribute('data-draw', 'on');
    await page.mouse.move(1250, 500);
    await page.mouse.wheel(0, 220);
    if (lenis === 'on') await expect(page.locator('html')).toHaveClass(/lenis-smooth/);
    // Let the dispatched wheel reach the compositor before taking the moving card's coordinates.
    await page.evaluate(() => new Promise<number>((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const box = await roof.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(roof).toHaveAttribute('aria-pressed', 'true');
    const stage = page.locator('.hv2-contour-stage');
    await expect(stage).toHaveAttribute('data-focus', 'roof');
    await expect.poll(() => stage.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const header = document.querySelector('.site-header')!.getBoundingClientRect();
      return rect.top >= header.bottom - 1 && rect.bottom <= innerHeight + 1;
    })).toBe(true);
    if (lenis === 'on') await expect(page.locator('html')).not.toHaveClass(/lenis-smooth/);
  });
}
