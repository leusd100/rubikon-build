import { expect, test, type Locator } from '@playwright/test';

// The hero control names the next action («Пауза відео» ↔ «Відтворити відео»), so it carries no aria-pressed; the
// icon in its circle and the visible word change with it.
async function expectPaused(control: Locator, paused: boolean) {
  await expect(control).toHaveAccessibleName(paused ? 'Відтворити відео' : 'Пауза відео');
  await expect(control).not.toHaveAttribute('aria-pressed');
  await expect(control.locator('.hero-video-control-label')).toHaveText(paused ? 'Відтворити відео' : 'Пауза відео');
}

for (const route of ['/', '/pro-nas']) {
  test(`hero ${route} resumes the visible clip and supports keyboard pause`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(route);
    await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
    const video = page.locator('video.direction-hero-video');
    await expect(page.getByRole('button', { name: 'Пауза відео', exact: true })).toBeVisible();
    const pause = page.locator('.hero-video-control');
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
    await expectPaused(pause, true);
    await expect.poll(() => video.evaluateAll((videos) => videos.every((node) => (node as HTMLVideoElement).paused))).toBe(true);
    expect((await pause.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await pause.press('Space');
    await expectPaused(pause, false);
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
  // Out of sight the clips pause and keep their sources (07.10: taking them away reloaded the clip on the way back up,
  // and the hero showed its bare ground until the first frame came)
  await expect.poll(() => page.locator('video.direction-hero-video').evaluateAll((videos) => videos.every((node) => (node as HTMLVideoElement).paused))).toBe(true);
  await expect(page.locator('video[src]')).not.toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('video.direction-hero-video.is-active')).toHaveCount(1);
  await expect.poll(() => page.locator('video.direction-hero-video.is-active').evaluate(
    (node) => !(node as HTMLVideoElement).paused,
  )).toBe(true);
});

// HOME v2 plays no video at ≤ 760 px (a still instead), so its phone sizes have no pause button to test.
const PAUSE_SIZES = [[320, 568], [360, 640], [390, 844], [430, 844], [820, 900]] as const;
for (const path of ['/', '/pro-nas']) {
  // Phones get a still and no video: HOME up to 760 px, /pro-nas up to 600 px (UX pass 2026-10)
  for (const [width, height] of PAUSE_SIZES.filter(([w]) => w > (path === '/' ? 760 : 600))) {
    test(`pause has its own touch target at ${path} ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(path);
      await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Пауза відео', exact: true })).toBeVisible();
      const pause = page.locator('.hero-video-control');
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
      await expectPaused(pause, true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    });
  }
}

test('the homepage phone hero has no video and no pause button', async ({ page }) => {
  for (const [width, height] of [[320, 568], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('.hero video')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Пауза відео', exact: true })).toHaveCount(0);
    await expect(page.locator('.hero img.hv2-hero-still')).toBeVisible();
  }
});

for (const [density, width] of [[1, 480], [2, 752]] as const) {
  test(`HOME first visit at 390 px / DPR ${density} fetches only its selected hero poster`, async ({ browser, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'explicit cold contexts run once per density');
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 },
      deviceScaleFactor: density, isMobile: true, hasTouch: true });
    try {
      const page = await context.newPage();
      const posters: string[] = [];
      page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (path.includes('/hero-mobile-band-')) posters.push(path);
      });
      await page.goto('/');
      const still = page.locator('.hero img.hv2-hero-still');
      await expect(still).toBeVisible();
      await expect.poll(() => still.evaluate((element) => {
        const image = element as HTMLImageElement;
        return image.complete && image.naturalWidth > 0 ? new URL(image.currentSrc).pathname : null;
      })).toBe(`/media/home-v2/concepts/hero-mobile-band-${width}w.avif`);
      expect(posters).toEqual([`/media/home-v2/concepts/hero-mobile-band-${width}w.avif`]);
      await expect(page.locator('.hero video')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
}

for (const [density, width] of [[1, 480], [2, 752]] as const) {
  for (const fallback of [false, true]) {
    test(`HOME SSR at DPR ${density}: ${fallback ? 'unsupported AVIF type falls back to WebP' : 'AVIF decodes before JavaScript'}`, async ({ browser, baseURL }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'explicit no-JS cold contexts');
      const context = await browser.newContext({ baseURL, javaScriptEnabled: false,
        viewport: { width: 390, height: 844 }, deviceScaleFactor: density });
      try {
        const page = await context.newPage();
        // A controlled unsupported MIME type exercises picture + typed preload
        // fallback selection. This is not a claim of testing an older Safari.
        if (fallback) await page.route('**/', async (route) => {
          const response = await route.fetch();
          await route.fulfill({ response, body: (await response.text()).replaceAll('image/avif', 'image/x-unsupported-qa') });
        });
        const posters: string[] = [];
        page.on('request', (request) => {
          const path = new URL(request.url()).pathname;
          if (path.includes('/hero-mobile-band-')) posters.push(path);
        });
        await page.goto('/');
        const expected = `/media/home-v2/concepts/hero-mobile-band-${width}w.${fallback ? 'webp' : 'avif'}`;
        const image = page.locator('.hero-media img.direction-hero-poster');
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate((node) => {
          const img = node as HTMLImageElement;
          return img.complete && img.naturalWidth > 0 ? new URL(img.currentSrc).pathname : null;
        })).toBe(expected);
        expect(posters).toEqual([expected]);
      } finally {
        await context.close();
      }
    });
  }
}

// Owner, 08.10: the cookie strip along the bottom covered the pause in the hero's corner. On a computer it stands on the
// line of the hero's buttons — its centre on theirs where there is room, its circle alone or just above the row where a
// button reaches under it — and never under the strip or over a button.
for (const route of ['/', '/pro-nas', '/napryamky']) {
  for (const [width, height] of [[1440, 900], [1280, 720], [1024, 768], [768, 1024]] as const) {
    test(`hero ${route} at ${width}×${height}: the pause stays clear of the cookie strip and the buttons`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'mobile-chromium', 'explicit desktop and tablet viewports run once');
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(route);
      await expect(page.locator('.cookie-banner')).toBeVisible();
      const control = page.locator('.hero-video-control');
      await expect(control).toBeVisible();
      const geometry = await control.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const strip = document.querySelector('.cookie-banner')!.getBoundingClientRect();
        const row = document.querySelector('[data-hero-actions]')!;
        const buttons = [...row.children].map((child) => child.getBoundingClientRect()).filter((rect) => rect.width > 0);
        const overButton = buttons.some((rect) => rect.right > box.left && rect.left < box.right && rect.bottom > box.top && rect.top < box.bottom);
        const rowBox = row.getBoundingClientRect();
        return {
          clearOfStrip: box.bottom <= strip.top,
          overButton,
          centreOffset: Math.abs((box.top + box.bottom) / 2 - (rowBox.top + rowBox.bottom) / 2),
          compact: element.hasAttribute('data-compact'),
        };
      });
      expect(geometry.clearOfStrip).toBe(true);
      expect(geometry.overButton).toBe(false);
      // on the row's line wherever it has the room in full
      if (!geometry.compact) expect(geometry.centreOffset).toBeLessThanOrEqual(1);
    });
  }
}

// Owner, 09.10: on a phone the bottom corner lay under the cookie strip too, and the buttons fill the width — the control
// stands at the top right, under the «Ілюстрація» tag and clear of every word
for (const [width, height] of [[390, 844], [320, 568], [740, 360]] as const) {
  test(`/napryamky on a ${width}×${height} phone: the pause stands at the top, clear of the strip, the tag and the text`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'explicit phone viewports run once');
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/napryamky');
    await expect(page.locator('.cookie-banner')).toBeVisible();
    const control = page.locator('.hero-video-control');
    await expect(control).toBeVisible();
    const geometry = await control.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const meets = (rect: DOMRect) => rect.right > box.left && rect.left < box.right && rect.bottom > box.top && rect.top < box.bottom;
      const range = document.createRange();
      const words = [...document.querySelectorAll('.directions-subhero :is(nav, .eyebrow, h1, p, a, .hero-provenance)')]
        .filter((node) => !element.contains(node))
        .flatMap((node) => { range.selectNodeContents(node); return [...range.getClientRects()]; });
      const header = document.querySelector('.site-header')!.getBoundingClientRect();
      const strip = document.querySelector('.cookie-banner')!.getBoundingClientRect();
      return { overWords: words.some(meets), underHeader: box.top >= header.bottom, aboveStrip: box.bottom <= strip.top };
    });
    expect(geometry).toEqual({ overWords: false, underHeader: true, aboveStrip: true });
  });
}

// Source selection is part of the existing PR hero/media gate.

for (const width of [821, 1250, 1440, 1920]) {
  for (const density of [1, 2]) {
    test(`HOME direction images cover their real crop at ${width}px / DPR${density}`, async ({ browser, baseURL }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'explicit cold desktop contexts');
      const context = await browser.newContext({ baseURL,
        viewport: { width, height: 900 }, deviceScaleFactor: density });
      try {
        const page = await context.newPage();
        await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
        await page.goto('/');
        const images = page.locator('.direction-card img');
        await expect(images).toHaveCount(5);
        for (let index = 0; index < 5; index++) {
          const image = images.nth(index);
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate((node) => {
            const img = node as HTMLImageElement;
            return img.complete && img.naturalWidth > 0;
          })).toBe(true);
          const state = await image.evaluate((node) => {
            const img = node as HTMLImageElement;
            const box = img.getBoundingClientRect();
            return { width: box.width, height: box.height, source: img.currentSrc };
          });
          // The portrait is 4:5, the other committed images 3:2. cover
          // needs the larger of card width and the image width at card height.
          const needed = Math.max(state.width, state.height * (index === 0 ? .8 : 1.5)) * density;
          const expectedWidth = [480, 768, 1200].find((candidate) => candidate >= needed) ?? 1200;
          expect(state.source).toContain(`-${expectedWidth}w.`);
        }
      } finally {
        await context.close();
      }
    });
  }
}
