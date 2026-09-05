import { expect, test } from '@playwright/test';

const viewports = [
  { width: 1440, height: 900, portraitRatio: 5 / 4 },
  { width: 1024, height: 768, portraitRatio: 5 / 4 },
  { width: 820, height: 1180, portraitRatio: 5 / 4 },
  { width: 390, height: 844, portraitRatio: 4 / 3 },
] as const;

test('homepage team portraits keep a deliberate portrait crop at each layout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/', { waitUntil: 'load' });

    const portraits = page.locator('.team-home .person-photo');
    await expect(portraits).toHaveCount(2);

    for (const portrait of await portraits.all()) {
      await portrait.scrollIntoViewIfNeeded();
      const box = await portrait.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height / box!.width).toBeCloseTo(viewport.portraitRatio, 1);

      const image = portrait.locator('img');
      await expect(image).toBeVisible();
      await expect(image).toHaveCSS('object-fit', 'cover');
      await expect.poll(() => image.evaluate((node) => node.naturalWidth > 0 && node.naturalHeight > 0)).toBe(true);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test('about profiles use the compact team composition on tablet', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 820, height: 1180 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/pro-nas', { waitUntil: 'load' });

    const profiles = page.locator('.team-about .person-story');
    const photos = page.locator('.team-about .person-photo');
    await expect(profiles).toHaveCount(2);
    await expect(photos).toHaveCount(2);

    const [firstProfile, secondProfile] = await Promise.all([
      profiles.first().boundingBox(),
      profiles.nth(1).boundingBox(),
    ]);
    expect(firstProfile).not.toBeNull();
    expect(secondProfile).not.toBeNull();
    expect(Math.abs(secondProfile!.y - firstProfile!.y)).toBeLessThanOrEqual(1);

    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded();
      const box = await photo.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height / box!.width).toBeCloseTo(5 / 4, 1);
      await expect(photo.locator('img')).toHaveCSS('object-fit', 'cover');
    }

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
