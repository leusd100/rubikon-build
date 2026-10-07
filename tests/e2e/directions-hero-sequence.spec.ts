import { expect, test } from '@playwright/test';

const sequenceNames = [
  'angary',
  'zernoskhovyshcha',
  'metalokonstruktsii',
  'betonni-roboty',
  'pokrivelni-roboty',
];

test('directions static hero sequence crossfades in the approved order without video', async ({ page }) => {
  const mediaRequests: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'media' || /directions-montage\.mp4/i.test(request.url())) {
      mediaRequests.push(request.url());
    }
  });

  await page.goto('/napryamky', { waitUntil: 'load' });

  const hero = page.locator('.directions-subhero');
  const frames = hero.locator('img.directions-hero-sequence-image');
  await expect(frames).toHaveCount(5);
  await expect(hero.locator('video')).toHaveCount(0);

  await expect.poll(
    () => frames.evaluateAll((images) => images.map((image) => image.classList.contains('is-active'))),
    { timeout: 2_000 },
  ).toEqual([true, false, false, false, false]);

  // Progressive loading, one slide ahead of whatever's active — not all 5 at once. Only the
  // active slide (0) and the next one up (1) should have a real source this early.
  await expect.poll(
    () => frames.evaluateAll((images) => images.map((image) => image.getAttribute('src'))),
    { timeout: 2_000 },
  ).toEqual([
    expect.stringContaining(`directions-sequence-${sequenceNames[0]}`),
    expect.stringContaining(`directions-sequence-${sequenceNames[1]}`),
    null,
    null,
    null,
  ]);

  // One slide lasts 6 s (UX pass 2026-10), so the second one is active within ~9 s.
  await expect.poll(
    () => frames.evaluateAll((images) => images.map((image) => image.classList.contains('is-active'))),
    { timeout: 9_000 },
  ).toEqual([false, true, false, false, false]);

  // By the time slide 1 becomes active, slide 2 should already be unlocked one step ahead of
  // it (same monotonic rule) — slides 3/4 still shouldn't have loaded yet.
  await expect.poll(
    () => frames.evaluateAll((images) => images.map((image) => image.getAttribute('src'))),
  ).toEqual([
    expect.stringContaining(`directions-sequence-${sequenceNames[0]}`),
    expect.stringContaining(`directions-sequence-${sequenceNames[1]}`),
    expect.stringContaining(`directions-sequence-${sequenceNames[2]}`),
    null,
    null,
  ]);

  expect(mediaRequests).toEqual([]);
});

test('directions static hero sequence remains on the first image for reduced motion and Save-Data', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
  });

  await page.clock.install();
  await page.goto('/napryamky', { waitUntil: 'load' });
  const frames = page.locator('.directions-subhero img.directions-hero-sequence-image');

  // Longer than one 6 s slide on the page's own clock: a sequence that moved would have moved by now
  await page.clock.runFor(7_500);
  expect(await frames.evaluateAll((images) => images.map((image) => image.classList.contains('is-active'))))
    .toEqual([true, false, false, false, false]);
  expect(await frames.evaluateAll((images) => images.map((image) => image.getAttribute('src'))))
    .toEqual([
      expect.stringContaining('directions-sequence-angary'),
      null,
      null,
      null,
      null,
    ]);
});

// Exercise actual decoded images, including later slides: a missing hashed variant or a landscape
// selected on a tall screen otherwise looks like a blank/soft background without any build error.
for (const viewport of [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 657 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1080 },
]) {
  test(`all five hero photographs load and fit at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.goto('/napryamky', { waitUntil: 'load' });

    const hero = page.locator('.directions-subhero');
    await expect(hero.getByRole('button', { name: 'Пауза показу напрямів', exact: true })).toBeVisible();
    // Let hydration and deferred loading complete first, then freeze between explicit ticks:
    // screenshot encoding must not advance the real-time carousel on slower CI machines.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const necessaryCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
    if (await necessaryCookies.isVisible()) await necessaryCookies.click();
    const frames = hero.locator('img.directions-hero-sequence-image');
    const portrait = viewport.width <= 1050 && viewport.height >= viewport.width;

    for (let index = 0; index < sequenceNames.length; index++) {
      const frame = frames.nth(index);
      await expect(frame).toHaveClass(/is-active/);
      await expect.poll(() => frame.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      const source = await frame.evaluate((image: HTMLImageElement) => image.currentSrc);
      expect(source).toContain(`directions-sequence-${sequenceNames[index]}-`);
      expect(source.includes('-portrait-')).toBe(portrait);

      const suffix = index === 0 ? '' : `-${sequenceNames[index]}`;
      await page.screenshot({
        path: testInfo.outputPath(`directions-${viewport.width}x${viewport.height}${suffix}.png`),
        animations: 'disabled',
        scale: 'css',
      });
      if (index < sequenceNames.length - 1) await page.clock.fastForward(6000);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    const heroBox = await hero.boundingBox();
    for (const link of await hero.locator('.directions-hero-actions a:visible').all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(heroBox!.y + heroBox!.height);
    }
    const pause = hero.locator('.hero-video-control');
    expect((await pause.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await pause.click();
    await expect(pause).toHaveAccessibleName('Відтворити показ напрямів');
    await page.clock.fastForward(12_000);
    await expect(frames.last()).toHaveClass(/is-active/);
    await pause.press('Space');
    await expect(pause).toHaveAccessibleName('Пауза показу напрямів');
    await page.clock.fastForward(6000);
    await expect(frames.first()).toHaveClass(/is-active/);
  });
}
