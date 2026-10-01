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

      // /pro-nas and /napryamky take the /yak-pratsyuiemo composition: the lead and actions sit under the title
      if (viewport.stacked || path === '/pro-nas' || path === '/napryamky') {
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

      if (path === '/pro-nas') {
        // One row of actions from 761 px; on a phone the call sits under the full-width button
        const [ctaBox, callBox] = await Promise.all([
          hero.getByRole('link', { name: 'Обговорити задачу' }).boundingBox(),
          hero.locator('.hero-call').boundingBox(),
        ]);
        if (viewport.width > 760) {
          expect(Math.abs((ctaBox!.y + ctaBox!.height / 2) - (callBox!.y + callBox!.height / 2))).toBeLessThanOrEqual(6);
          expect(ctaBox!.x + ctaBox!.width).toBeLessThan(callBox!.x);
          expect(heroBox!.height).toBeGreaterThanOrEqual(viewport.height);
        } else {
          expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(callBox!.y);
        }
      }
    }
  });
}

// The /pro-nas actions sat on the bottom edge of a short laptop window: from 761 px they keep at least 56 px above it,
// and the crumbs stay clear of the fixed header, from a 1250 × 613 window to a large screen. /napryamky shares the rule.
for (const [path, primary] of [['/pro-nas', 'Обговорити задачу'], ['/napryamky', 'Обрати напрям']] as const) test(`${path} keeps its hero actions clear of the window edges`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [
    { width: 1250, height: 613 },
    { width: 1366, height: 657 },
    { width: 1280, height: 720 },
    { width: 1440, height: 820 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 820, height: 1180 },
  ]) {
    const size = `${viewport.width}×${viewport.height}`;
    await page.setViewportSize(viewport);
    await page.goto(path, { waitUntil: 'load' });
    const hero = page.locator('.subhero');
    const [ctaBox, callBox, crumbsBox, headerBox] = await Promise.all([
      hero.getByRole('link', { name: primary }).first().boundingBox(),
      hero.locator('.hero-call').boundingBox(),
      hero.locator('.breadcrumb').boundingBox(),
      page.locator('.site-header').boundingBox(),
    ]);
    const actionsBottom = Math.max(ctaBox!.y + ctaBox!.height, callBox!.y + callBox!.height);
    expect(viewport.height - actionsBottom, size).toBeGreaterThanOrEqual(56);
    expect(crumbsBox!.y, size).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height + 8);
  }
});

test('homepage hero keeps its title above the copy, with the written channels only in the closing block', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto('/', { waitUntil: 'load' });

    const titleBox = await page.locator('.hero h1').boundingBox();
    const copyBox = await page.locator('.hero-copy').boundingBox();
    expect(titleBox).not.toBeNull();
    expect(copyBox).not.toBeNull();
    expect(titleBox!.y + titleBox!.height).toBeLessThan(copyBox!.y);

    // HOME v2: no written-contact card in the hero — messengers and email live once, in #inquiry.
    await expect(page.locator('.hero-contact-card')).toHaveCount(0);
    await expect(page.locator('.hero .messenger-link')).toHaveCount(0);
    await expect(page.locator('#inquiry .conversation-channels .messenger-link')).toHaveCount(4);

    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
});
