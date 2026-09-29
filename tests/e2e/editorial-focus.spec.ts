import { expect, test } from '@playwright/test';

const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
] as const;

test('homepage shows named team roles without synthetic portraits at each layout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/', { waitUntil: 'load' });

    // HOME v2: the roles sit compactly beside the real-object proof, with no portraits.
    const people = page.locator('#real-object .hv2-people');
    await expect(people.locator('.hv2-person')).toHaveCount(2);
    await expect(people.locator('img')).toHaveCount(0);
    await expect(people).toContainText('Сергій Іванович Леус');
    await expect(people).toContainText('Дмитро Сергійович Леус');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test('about profiles use a compact text composition on tablet', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 820, height: 1180 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/pro-nas', { waitUntil: 'load' });

    const profiles = page.locator('.team-about .person-story');
    await expect(profiles).toHaveCount(2);
    await expect(page.locator('.team-about .person-photo, .team-about img')).toHaveCount(0);

    const [firstProfile, secondProfile] = await Promise.all([
      profiles.first().boundingBox(),
      profiles.nth(1).boundingBox(),
    ]);
    expect(firstProfile).not.toBeNull();
    expect(secondProfile).not.toBeNull();
    expect(Math.abs(secondProfile!.y - firstProfile!.y)).toBeLessThanOrEqual(1);

    for (const name of await page.locator('.team-about .person-info h3').all()) {
      const lineCount = await name.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getClientRects().length;
      });
      expect(lineCount).toBe(1);
    }
  }
});

test('about editorial word and image stay inside their composition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/pro-nas', { waitUntil: 'load' });

    const story = page.locator('.about-story-section');
    const image = story.locator('.promise-visual img');
    await expect(image).toHaveAttribute('src', '/media/about-quality-control.webp');
    await expect(image).toBeVisible();

    const ghostWord = story.locator('.ghost-word');
    if (viewport.width <= 760) {
      await expect(ghostWord).toBeHidden();
    } else {
      const [storyBox, wordBox] = await Promise.all([story.boundingBox(), ghostWord.boundingBox()]);
      expect(storyBox).not.toBeNull();
      expect(wordBox).not.toBeNull();
      expect(wordBox!.x).toBeGreaterThanOrEqual(0);
      expect(wordBox!.x + wordBox!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(wordBox!.y).toBeGreaterThanOrEqual(storyBox!.y);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
