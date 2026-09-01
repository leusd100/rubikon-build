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

  await expect.poll(
    () => frames.evaluateAll((images) => images.map((image) => image.getAttribute('src'))),
    { timeout: 2_000 },
  ).toEqual(sequenceNames.map((name) => expect.stringContaining(`directions-sequence-${name}`)));

  await expect.poll(
    () => frames.evaluateAll((images) => images.map((image) => image.classList.contains('is-active'))),
    { timeout: 6_000 },
  ).toEqual([false, true, false, false, false]);

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

  await page.goto('/napryamky', { waitUntil: 'load' });
  const frames = page.locator('.directions-subhero img.directions-hero-sequence-image');

  await page.waitForTimeout(4_500);
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
