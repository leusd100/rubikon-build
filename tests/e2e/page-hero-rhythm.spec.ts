import { expect, test } from '@playwright/test';

const editorialHeroes = ['/napryamky', '/pro-nas'] as const;

for (const path of editorialHeroes) {
  test(`${path} keeps the canonical hero rhythm`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    for (const viewport of [
      { width: 1440, height: 900, stacked: false },
      { width: 1280, height: 800, stacked: false },
      { width: 820, height: 1024, stacked: true },
      { width: 390, height: 844, stacked: true },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(path, { waitUntil: 'load' });

      const hero = page.locator('.subhero');
      const copy = hero.locator('.subhero-copy');
      const side = hero.locator('.subhero-side');
      const [heroBox, copyBox, sideBox] = await Promise.all([
        hero.boundingBox(),
        copy.boundingBox(),
        side.boundingBox(),
      ]);

      expect(heroBox).not.toBeNull();
      expect(copyBox).not.toBeNull();
      expect(sideBox).not.toBeNull();

      if (viewport.stacked) {
        expect(copyBox!.y + copyBox!.height).toBeLessThan(sideBox!.y);
      } else {
        expect(copyBox!.x + copyBox!.width).toBeLessThan(sideBox!.x);
      }

      expect(sideBox!.y + sideBox!.height).toBeLessThanOrEqual(heroBox!.y + heroBox!.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

      if (path === '/napryamky') {
        const chooseDirection = hero.getByRole('link', { name: 'Обрати напрям' });
        const describeTask = hero.getByRole('link', { name: 'Обговорити задачу' });
        const [chooseBox, describeBox] = await Promise.all([
          chooseDirection.boundingBox(),
          describeTask.boundingBox(),
        ]);

        await expect(chooseDirection).toHaveAttribute('href', '#directions-list');
        await expect(describeTask).toHaveAttribute('href', '#inquiry');
        await expect(page.locator('#directions-list .route-service')).toHaveCount(5);
        expect(chooseBox).not.toBeNull();
        expect(describeBox).not.toBeNull();
        expect(
          chooseBox!.x < describeBox!.x + describeBox!.width
          && chooseBox!.x + chooseBox!.width > describeBox!.x
          && chooseBox!.y < describeBox!.y + describeBox!.height
          && chooseBox!.y + chooseBox!.height > describeBox!.y,
        ).toBe(false);

        if (viewport.width > 760) expect(heroBox!.height).toBeGreaterThanOrEqual(viewport.height);
        await chooseDirection.click();
        await expect(page.locator('#directions-list')).toBeInViewport();
      }
    }
  });
}

test('homepage hero keeps its title, actions, and written-contact card separated', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of [
    { width: 1440, height: 900, card: 'beside' },
    { width: 768, height: 1024, card: 'beside' },
    { width: 390, height: 844, card: 'hidden' },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto('/', { waitUntil: 'load' });

    const titleBox = await page.locator('.hero h1').boundingBox();
    const copyBox = await page.locator('.hero-copy').boundingBox();
    const contact = page.locator('.hero-contact-card');

    expect(titleBox).not.toBeNull();
    expect(copyBox).not.toBeNull();
    expect(titleBox!.y + titleBox!.height).toBeLessThan(copyBox!.y);

    if (viewport.card === 'hidden') {
      // Phones: the call leads, and «Написати або залишити запит» carries the written channels.
      await expect(contact).toBeHidden();
    } else {
      const contactBox = await contact.boundingBox();
      expect(contactBox).not.toBeNull();
      expect(copyBox!.x + copyBox!.width).toBeLessThan(contactBox!.x);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
});
