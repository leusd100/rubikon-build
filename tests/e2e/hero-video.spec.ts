import { expect, test } from '@playwright/test';

for (const route of ['/', '/pro-nas']) {
  test(`hero ${route} resumes the visible clip and supports keyboard pause`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(route);
    await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
    const video = page.locator('video.direction-hero-video');
    const pause = page.getByRole('button', { name: 'Пауза відео', exact: true });
    await expect(pause).toBeVisible();
    // Wait for an actual transition away from clip zero, then leave while that clip is active.
    await expect.poll(() => video.evaluateAll((videos) => {
      const visible = videos.filter((node) => node.classList.contains('is-active'));
      return visible.length === 1 ? videos.indexOf(visible[0]) : -1;
    }), { timeout: 15_000 }).toBeGreaterThan(0);
    const visibleIndex = await video.evaluateAll((videos) => videos.findIndex((node) => node.classList.contains('is-active')));
    await page.evaluate(() => window.scrollTo(0, 2000));
    await expect.poll(() => video.evaluateAll((videos) => videos.every((node) => (node as HTMLVideoElement).paused))).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => video.evaluateAll((videos) => videos.some((node) => {
      const item = node as HTMLVideoElement;
      return !item.paused && item.classList.contains('is-active') && item.currentTime > 0;
    }))).toBe(true);
    await expect.poll(() => video.evaluateAll((videos) => videos.findIndex((node) => !(node as HTMLVideoElement).paused))).toBe(visibleIndex);
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => video.evaluateAll((videos) => videos.every((node) => (node as HTMLVideoElement).paused))).toBe(true);
    expect((await pause.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await pause.press('Space');
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => video.evaluateAll((videos) => videos.some((node) => !(node as HTMLVideoElement).paused))).toBe(true);
  });
}

test('reduced motion keeps the poster without attaching video sources or a redundant pause button', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  await expect(page.locator('video[src]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Пауза відео' })).toHaveCount(0);
});


test('leaving during a crossfade does not preserve an extra visible clip on return', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  await expect(page.locator('video.direction-hero-video.is-active')).toHaveCount(2, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, 2000));
  await expect(page.locator('video[src]')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('video.direction-hero-video.is-active')).toHaveCount(1);
  await expect.poll(() => page.locator('video.direction-hero-video.is-active').evaluate(
    (node) => !(node as HTMLVideoElement).paused,
  )).toBe(true);
});

for (const path of ['/', '/pro-nas']) {
  for (const [width, height] of [[320, 568], [360, 640], [390, 844], [430, 844], [820, 900]]) {
    test(`pause has its own touch target at ${path} ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(path);
      await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
      const pause = page.getByRole('button', { name: 'Пауза відео', exact: true });
      await expect(pause).toBeVisible();
      await pause.scrollIntoViewIfNeeded();
      const overlaps = await pause.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [...element.closest('section')!.querySelectorAll('a,button')]
          .filter((other) => other !== element).filter((other) => {
            const rect = other.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0
              && Math.min(bounds.right, rect.right) > Math.max(bounds.left, rect.left)
              && Math.min(bounds.bottom, rect.bottom) > Math.max(bounds.top, rect.top);
          }).map((other) => other.textContent);
      });
      expect(overlaps).toEqual([]);
      expect((await pause.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await pause.click();
      await expect(pause).toHaveAttribute('aria-pressed', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    });
  }
}
