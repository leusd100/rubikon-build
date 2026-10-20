import { expect, test, type Locator, type Page } from '@playwright/test';

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

for (const [density, width] of [[1, 480], [2, 1024]] as const) {
  test(`HOME first visit at 390 px / DPR ${density} fetches only its selected hero poster`, async ({ browser, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'explicit cold contexts run once per density');
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 },
      deviceScaleFactor: density, isMobile: true, hasTouch: true });
    try {
      const page = await context.newPage();
      const posters: string[] = [];
      page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (path.includes('/hero-h1-') || path.includes('/hero-mobile-band-')) posters.push(path);
      });
      await page.goto('/');
      const still = page.locator('.hero img.hv2-hero-still');
      await expect(still).toBeVisible();
      await expect.poll(() => still.evaluate((element) => {
        const image = element as HTMLImageElement;
        return image.complete && image.naturalWidth > 0 ? new URL(image.currentSrc).pathname : null;
      })).toBe(`/media/home-v2/concepts/hero-h1-${width}w.webp`);
      expect(posters).toEqual([`/media/home-v2/concepts/hero-h1-${width}w.webp`]);
      await expect(page.locator('.hero video')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
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

// Phone scene contracts run in the existing mandatory Hero behavior job.
test.describe('phone first impression', () => {

async function denyOptionalCookies(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
}

const pages = [
  { path: '/', hero: '.hv2-hero', image: '.hv2-hero-still', family: 'hero-h1-', old: 'hero-mobile-band-' },
  { path: '/pro-nas', hero: '.about-subhero', image: '.about-hero-still', family: 'about-p5-', old: 'about-phone-still-' },
] as const;

test('a request link followed before hydration still opens the HOME form', async ({ page }) => {
  await denyOptionalCookies(page);
  await page.setViewportSize({ width: 390, height: 844 });
  // The native anchor survives a click before the form's document listener is installed.
  await page.goto('/#inquiry', { waitUntil: 'load' });
  await expect(page.locator('#inquiry form.inquiry-form')).toBeVisible();
  await expect(page.locator('#inquiry select[name="direction"]')).toHaveValue('Ще не визначено');
});

test('HOME inquiry keeps its phone label inside the phone breakpoint and opens the form', async ({ page }) => {
  await denyOptionalCookies(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'load' });
  const hero = page.locator('.hv2-hero');
  const inquiry = hero.locator('a[href="#inquiry"]');
  for (const { width, name } of [
    { width: 320, name: 'Обговорити задачу' },
    { width: 390, name: 'Обговорити задачу' },
    { width: 760, name: 'Обговорити задачу' },
    { width: 761, name: 'Написати або залишити запит' },
    { width: 1440, name: 'Написати або залишити запит' },
  ]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(inquiry).toHaveAccessibleName(name);
    await expect(inquiry).toHaveAttribute('data-open-inquiry', '');
    const box = await inquiry.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await hero.locator('a[href^="tel:"]').focus();
  await page.keyboard.press('Tab');
  await expect(inquiry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#inquiry form.inquiry-form')).toBeVisible();
  await expect(page.locator('#inquiry select[name="direction"]')).toHaveValue('Ще не визначено');
});

test('HOME phone image covers the full scene as doubled text grows the hero', async ({ page }) => {
  await denyOptionalCookies(page);
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const hero = page.locator('.hv2-hero');
  await expect.poll(() => hero.locator('.hv2-hero-still').evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const initialHeight = (await hero.boundingBox())!.height;
  for (const doubled of [false, true]) {
    if (doubled) {
      // Stress the actual copy, including both buttons, without claiming to emulate Dynamic Type.
      await hero.evaluate(element => {
        const nodes = [...element.querySelectorAll<HTMLElement>('h1, p, a.button, a.button small, a.button strong')];
        const sizes = nodes.map(node => Number.parseFloat(getComputedStyle(node).fontSize));
        nodes.forEach((node, index) => node.style.setProperty('font-size', `${sizes[index] * 2}px`, 'important'));
      });
    }
    const geometry = await hero.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const media = element.querySelector('.hero-media')!.getBoundingClientRect();
      const image = element.querySelector('.hv2-hero-still')!.getBoundingClientRect();
      const call = element.querySelector('a[href^="tel:"]')!.getBoundingClientRect();
      const inquiry = element.querySelector('a[href="#inquiry"]')!.getBoundingClientRect();
      const cue = element.querySelector('.phone-hero-scroll')!.getBoundingClientRect();
      return {
        height: bounds.height,
        uncovered: [media, image].map(rect => Math.max(rect.top - bounds.top, rect.left - bounds.left, bounds.bottom - rect.bottom, bounds.right - rect.right)),
        clipped: element.scrollHeight > element.clientHeight + 1,
        documentWidth: document.documentElement.scrollWidth,
        buttonGap: inquiry.top - call.bottom,
        cueGap: cue.top - inquiry.bottom,
        cueBottom: bounds.bottom - cue.bottom,
      };
    });
    for (const uncovered of geometry.uncovered) {
      expect(uncovered, `${doubled ? 'expanded' : 'ordinary'} scene: image and media must reach every hero edge`).toBeLessThanOrEqual(1);
    }
    expect(geometry.clipped).toBe(false);
    expect(geometry.documentWidth).toBeLessThanOrEqual(320);
    expect(geometry.buttonGap).toBeGreaterThanOrEqual(0);
    expect(geometry.cueGap).toBeGreaterThanOrEqual(0);
    expect(geometry.cueBottom).toBeGreaterThanOrEqual(0);
    if (doubled) expect(geometry.height).toBeGreaterThan(initialHeight);
  }
});

for (const deviceScaleFactor of [1, 2]) {
  test.describe(`phone hero at DPR ${deviceScaleFactor}`, () => {
    test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor });

    for (const target of pages) {
      test(`${target.path}: phone poster stays the same across hydration`, async ({ page }) => {
        await denyOptionalCookies(page);
        const posters: string[] = [];
        const videos: string[] = [];
        page.on('request', request => {
          const path = new URL(request.url()).pathname;
          if (path.includes(target.family) || path.includes(target.old)) posters.push(path);
          if (/\.(mp4|m4v)$/.test(path)) videos.push(path);
        });
        await page.goto(target.path, { waitUntil: 'load' });
        const image = page.locator(target.image);
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).currentSrc)).toContain(target.family);
        await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        const selected = await image.evaluate(element => new URL((element as HTMLImageElement).currentSrc).pathname);
        expect(selected).toMatch(/-(480|768|1024)w\.webp$/);
        expect(posters, 'SSR preload and hydrated img select the same resource, with no old poster').toEqual([selected]);
        expect(videos, 'a phone must not request any hero montage').toEqual([]);
        await expect(image).toHaveAttribute('loading', 'eager');
        await expect(image).toHaveAttribute('fetchpriority', 'high');
      });
    }
  });
}

for (const target of [
  { path: '/', width: 761, family: 'hero-h1-' },
  { path: '/pro-nas', width: 601, family: 'about-p5-' },
]) {
  test(`${target.path}: the phone poster is not fetched above its ${target.width - 1}px boundary`, async ({ page }) => {
    await denyOptionalCookies(page);
    await page.setViewportSize({ width: target.width, height: 932 });
    const phonePosters: string[] = [];
    page.on('request', request => {
      if (request.url().includes(target.family)) phonePosters.push(request.url());
    });
    await page.goto(target.path, { waitUntil: 'networkidle' });
    expect(phonePosters).toEqual([]);
  });
}

for (const target of pages) {
  for (const theme of ['light', 'dark']) {
    for (const firstVisit of [false, true]) {
      test(`${target.path}: ${theme}, ${firstVisit ? 'first visit' : 'consent answered'} keeps content and contact targets available`, async ({ page }) => {
        await page.addInitScript(value => localStorage.setItem('rubikon-theme', value), theme);
        if (!firstVisit) await denyOptionalCookies(page);
        await page.goto(target.path, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        for (const width of [320, 375, 390, 430]) {
          for (const height of [667, 844, 932]) {
            await page.setViewportSize({ width, height });
            const geometry = await page.locator(target.hero).evaluate(element => ({
              width: document.documentElement.scrollWidth,
              clipped: element.scrollHeight > element.clientHeight + 1,
            }));
            expect(geometry.width).toBeLessThanOrEqual(width);
            expect(geometry.clipped).toBe(false);
          }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        const call = page.locator(`${target.hero} a[href^="tel:"]`);
        await expect(call).toBeVisible();
        for (const control of [call, page.locator('.site-header .mobile-call'), page.locator('.mobile-menu summary')]) {
          const box = await control.boundingBox();
          expect(box!.width).toBeGreaterThanOrEqual(44);
          expect(box!.height).toBeGreaterThanOrEqual(44);
        }
        if (firstVisit && target.path === '/') {
          const banner = page.locator('.cookie-banner');
          await expect(banner).toBeVisible();
          expect((await call.boundingBox())!.y + (await call.boundingBox())!.height).toBeLessThanOrEqual((await banner.boundingBox())!.y);
        }
      });
    }
  }

  test(`${target.path}: next section remains reachable from the full scene`, async ({ page }) => {
    await denyOptionalCookies(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(target.path, { waitUntil: 'load' });
    const cue = page.locator(target.hero).getByRole('link', { name: 'До наступного розділу', exact: true });
    await expect(cue).toBeVisible();
    const destination = await cue.getAttribute('href');
    expect(destination).toMatch(/^#/);
    await cue.click();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect.poll(() => page.locator(destination!).evaluate(element => Math.round(element.getBoundingClientRect().top))).toBeLessThan(150);
  });

  test(`${target.path}: simulated top safe area clears the phone header`, async ({ page }) => {
    await denyOptionalCookies(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(target.path, { waitUntil: 'load' });
    const header = page.locator('.site-header');
    const original = await header.boundingBox();
    await page.addStyleTag({ content: 'body { --phone-hero-safe-top: 24px !important; }' });
    await expect.poll(() => header.evaluate(element => element.getBoundingClientRect().height)).toBeCloseTo(original!.height + 24, 0);
    expect((await header.locator('.brand-link').boundingBox())!.y).toBeGreaterThanOrEqual(24);
  });

  test(`${target.path}: full scene can grow without clipping`, async ({ page }) => {
    await denyOptionalCookies(page);
    await page.goto(target.path, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const hero = page.locator(target.hero);
    for (const width of [320, 375, 390, 430]) {
      for (const height of [667, 844, 932]) {
        await page.setViewportSize({ width, height });
        const geometry = await hero.evaluate(element => {
          const title = element.querySelector('h1')!;
          return {
            height: element.getBoundingClientRect().height,
            documentWidth: document.documentElement.scrollWidth,
            titleWidth: title.clientWidth,
            titleContentWidth: title.scrollWidth,
            clipped: element.scrollHeight > element.clientHeight + 1,
          };
        });
        expect(geometry.height, `${width}×${height}: the scene fills the small viewport`).toBeGreaterThanOrEqual(height - 1);
        expect(geometry.documentWidth).toBeLessThanOrEqual(width);
        expect(geometry.titleContentWidth).toBeLessThanOrEqual(geometry.titleWidth + 1);
        expect(geometry.clipped, 'long content must grow the hero instead of being hidden').toBe(false);
      }
    }
  });

  test(`${target.path}: doubled text remains available on a narrow phone`, async ({ page }) => {
    await denyOptionalCookies(page);
    await page.setViewportSize({ width: 320, height: 667 });
    await page.goto(target.path, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    // A deterministic text-size stress input, not a claim to emulate iOS Dynamic Type.
    await page.locator(target.hero).evaluate(element => {
      const nodes = [...element.querySelectorAll<HTMLElement>('h1, p, a.button, a.button small, a.button strong')];
      const sizes = nodes.map(node => Number.parseFloat(getComputedStyle(node).fontSize));
      nodes.forEach((node, index) => node.style.setProperty('font-size', `${sizes[index] * 2}px`, 'important'));
    });
    const geometry = await page.locator(target.hero).evaluate(element => ({
      documentWidth: document.documentElement.scrollWidth,
      clipped: element.scrollHeight > element.clientHeight + 1,
      overflowing: [...element.querySelectorAll<HTMLElement>('h1, p, a.button')].filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.className),
    }));
    expect(geometry.documentWidth).toBeLessThanOrEqual(320);
    expect(geometry.clipped).toBe(false);
    expect(geometry.overflowing).toEqual([]);
    await expect(page.locator(`${target.hero} a[href^="tel:"]`)).toBeVisible();
  });

  test(`${target.path}: header remains readable after scroll, menu and route changes`, async ({ page }) => {
    await denyOptionalCookies(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(target.path, { waitUntil: 'load' });
    const header = page.locator('.site-header');
    const background = () => header.evaluate(element => getComputedStyle(element).backgroundColor);
    await expect.poll(background).toContain('0.82');
    await expect(header).toHaveCSS('backdrop-filter', 'none');
    await page.evaluate(() => window.scrollTo(0, 420));
    await expect.poll(background).toContain('0.97');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(background).toContain('0.82');
    const summary = header.locator('.mobile-menu summary');
    await summary.click();
    await expect.poll(background).toContain('0.97');
    await page.keyboard.press('Escape');
    await expect(header.locator('.mobile-menu')).not.toHaveAttribute('open');
    await expect(summary).toBeFocused();
    await summary.click();
    await header.locator('.mobile-menu a[href="/napryamky"]').click();
    await expect(page).toHaveURL(/\/napryamky$/);
    await expect(page.locator('html')).toHaveAttribute('data-hero-header', 'top');
    await expect(header).toHaveCSS('backdrop-filter', 'none');
    await page.goto(target.path, { waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-hero-header', 'top');
    await page.setViewportSize({ width: target.path === '/' ? 761 : 601, height: 844 });
    await expect(page.locator('html')).toHaveAttribute('data-hero-header', 'top');
    await expect(header).toHaveCSS('backdrop-filter', 'none');
  });
}

});

for (const route of ['/', '/pro-nas']) for (const theme of ['light', 'dark']) {
  test(`${route} ${theme}: wide header reveals the running Hero and becomes solid on scroll`, async ({ page }) => {
    await page.addInitScript(value => {
      localStorage.setItem('rubikon-theme', value);
      localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
    }, theme);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(route, { waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const header = page.locator('.site-header');
    const shade = page.locator(route === '/' ? '.hero-shade' : '.subhero-overlay');
    const alpha = () => header.evaluate(element => Number(getComputedStyle(element).backgroundColor.match(/\/\s*([\d.]+)/)?.[1] ?? 1));
    for (const width of route === '/' ? [761, 820, 1024, 1100, 1280, 1440, 1920] : [601, 760, 761, 820, 1024, 1100, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(alpha).toBeLessThan(.8);
      await expect(header).toHaveCSS('backdrop-filter', 'none');
      // Reveal the footage behind the header, not just transparency over an opaque Hero shade.
      await expect(shade).not.toHaveCSS('mask-image', 'none');
      const media = page.locator(route === '/' ? '.hero-media' : '.about-hero-media');
      expect((await media.boundingBox())!.y).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (width === 820) {
        const menu = header.locator('.mobile-menu');
        const summary = menu.locator('summary');
        await summary.click();
        await expect.poll(alpha).toBeGreaterThan(.94);
        await page.keyboard.press('Escape');
        await expect(menu).not.toHaveAttribute('open');
        await expect(summary).toBeFocused();
        await expect.poll(alpha).toBeLessThan(.8);
      }
    }
    await expect.poll(() => page.locator('video.direction-hero-video').evaluateAll(elements => elements.some(element => {
      const video = element as HTMLVideoElement;
      return !video.paused && video.readyState >= 2;
    }))).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect.poll(alpha).toBeGreaterThan(.94);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(alpha).toBeLessThan(.8);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(alpha).toBe(.82);
    await expect(shade).toHaveCSS('mask-image', 'none');
    await page.setViewportSize({ width: 1920, height: 900 });
    await expect.poll(alpha).toBeLessThan(.8);
    await header.locator('a[href="/napryamky"]').filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/napryamky$/);
    // one header model on the inner heroes too (PDO-18): on the picture, no blur
    await expect(page.locator('html')).toHaveAttribute('data-hero-header', 'top');
    await expect(header).toHaveCSS('backdrop-filter', 'none');
    await expect.poll(alpha).toBeLessThan(.8);
  });
}


test.describe('owner iPhone feedback: shared calls and compact headers', () => {

const routes = ['/', '/napryamky', '/angary', '/metalokonstruktsii', '/zernoskhovyshcha', '/betonni-roboty', '/pokrivelni-roboty', '/yak-pratsyuiemo', '/pro-nas'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' })));
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('call label and number are centred on every public Hero', async ({ page }) => {
  test.setTimeout(90_000);
  for (const width of [390, 1024, 1440]) for (const route of routes) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const call = page.locator('main .hero-call-primary').first();
    await expect(call).toBeVisible();
    const geometry = await call.evaluate(element => {
      const box = element.getBoundingClientRect();
      const icon = element.querySelector('svg')!.getBoundingClientRect();
      const label = element.querySelector('span')!;
      const words = label.getBoundingClientRect();
      return { alignment: getComputedStyle(label).textAlign, offset: Math.abs((icon.left + words.right) / 2 - (box.left + box.right) / 2), href: element.getAttribute('href') };
    });
    expect(geometry.alignment, `${route} at ${width}`).toBe('center');
    expect(geometry.offset, `${route} at ${width}`).toBeLessThanOrEqual(1);
    expect(geometry.href).toBe('tel:+380682614264');
    await expect(page.locator('.conversation-call-text').first()).toHaveCSS('text-align', 'center');
  }
});

test('phone and tablet pages share a clear top header and dense scroll/menu states', async ({ page }) => {
  test.setTimeout(90_000);
  for (const width of [390, 1024]) for (const route of [...routes, '/polityka-konfidentsiinosti']) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route, { waitUntil: 'load' });
    const header = page.locator('.site-header');
    const alpha = () => header.evaluate(e => Number(getComputedStyle(e).backgroundColor.match(/\/\s*([\d.]+)/)?.[1] ?? 1));
    await expect(page.locator('html')).toHaveAttribute('data-hero-header', 'top');
    await expect.poll(alpha).toBe(width <= 760 ? .82 : .72);
    await expect(header).toHaveCSS('backdrop-filter', 'none');
    const media = page.locator('.service-subhero-media, .directions-hero-sequence-image, .proc-hero-media').first();
    if (await media.count()) expect((await media.boundingBox())!.y, `${route}: image extends behind header`).toBe(0);
    await header.locator('summary').click();
    await expect.poll(alpha).toBe(.97);
    await page.keyboard.press('Escape');
    await expect(header.locator('summary')).toBeFocused();
    await page.evaluate(() => scrollTo(0, 400));
    await expect(page.locator('html')).toHaveAttribute('data-hero-header', 'scrolled');
    await expect.poll(alpha).toBe(.97);
  }
  // …and so do the wide screens since PDO-18 (one header model; /zernoskhovyshcha keeps its band until W2-12)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/napryamky');
  await expect(page.locator('html')).toHaveAttribute('data-hero-header', 'top');
  await expect(page.locator('.site-header')).toHaveCSS('backdrop-filter', 'none');
});

test('HOME fills the lower browser area with photo while placing its scroll cue near the visible fold', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const bounds = await page.locator('.hv2-hero').evaluate(element => {
    const rect = (selector: string) => element.querySelector(selector)!.getBoundingClientRect();
    return { photoBottom: rect('.hero-media').bottom, cueBottom: rect('.phone-hero-scroll').bottom, ctaBottom: rect('a[href="#inquiry"]').bottom };
  });
  // Preserve a photo-only tail beyond the browser's content viewport, without pushing controls into it.
  expect(bounds.photoBottom).toBeGreaterThanOrEqual(908);
  expect(bounds.cueBottom).toBeGreaterThanOrEqual(816);
  expect(bounds.cueBottom).toBeLessThanOrEqual(832);
  expect(bounds.ctaBottom).toBeLessThanOrEqual(bounds.cueBottom - 60);
});

test('HOME keeps copy and actions above Safari controls while its photo fills the large viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  // Append the fixture to the page's own CSS, so hydration cannot replace a temporary injected style.
  await page.route(/\.css(?:\?|$)/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nmain[data-home="v2"] .hv2-hero { min-height: 844px !important; } main[data-home="v2"] .hv2-hero h1 { font-size: 32.37px !important; }` });
  });
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Model expanded Safari chrome: the visible content viewport is 664px, while the full photo scene is 844px.
  // Headless browsers have no Safari toolbar, so only the large scene height is supplied by the fixture.

  const result = await page.locator('.hv2-hero').evaluate(element => {
    const hero = element.getBoundingClientRect();
    const last = element.querySelector('a[href="#inquiry"]')!.getBoundingClientRect();
    const cue = element.querySelector('.phone-hero-scroll')!.getBoundingClientRect();
    const image = element.querySelector('.hero-media')!.getBoundingClientRect();
    return { ctaBottom: last.bottom, cueTop: cue.top, cueBottom: cue.bottom, imageBottom: image.bottom, height: hero.height, width: document.documentElement.scrollWidth };
  });
  expect(result.ctaBottom).toBeLessThanOrEqual(624);
  expect(result.cueTop).toBeGreaterThanOrEqual(result.ctaBottom + 16);
  expect(result.cueBottom).toBeLessThanOrEqual(664);
  expect(result.height).toBeGreaterThanOrEqual(844);
  expect(result.imageBottom).toBeGreaterThanOrEqual(844);
  expect(result.width).toBe(390);
});

for (const route of routes.filter(route => route !== '/')) {
  test(`${route}: the approved phone scene continues below the fold with reachable actions and a working cue`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const hero = page.locator('main > section').first();
    const cue = hero.locator('.phone-hero-scroll');
    await expect(cue).toBeVisible();
    const bounds = await hero.evaluate(element => {
      const box = element.getBoundingClientRect();
      const cue = element.querySelector('.phone-hero-scroll')!.getBoundingClientRect();
      const actions = [...element.querySelectorAll('a.button')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0);
      const photo = element.querySelector('.service-subhero-media, .about-hero-media, .proc-hero-media, .directions-hero-sequence-image')!.getBoundingClientRect();
      return { bottom: box.bottom, photoTop: photo.top, photoBottom: photo.bottom, cueBottom: cue.bottom, actionBottom: Math.max(...actions.map(r => r.bottom)) };
    });
    expect(bounds.bottom).toBeGreaterThanOrEqual(908);
    expect(bounds.photoTop).toBe(0);
    expect(bounds.photoBottom).toBeGreaterThanOrEqual(bounds.bottom - 1);
    expect(bounds.cueBottom).toBeLessThanOrEqual(832);
    expect(bounds.actionBottom).toBeLessThanOrEqual(bounds.cueBottom - 60);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await expect(hero.locator('.hero-call-primary')).toHaveAttribute('href', 'tel:+380682614264');
    const href = await cue.getAttribute('href');
    expect(href).toMatch(/^#[a-z-]+$/);
    await expect(page.locator(href!)).toHaveCount(1);
    await cue.click();
    await expect(page.locator(href!)).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    // The configurator reserves room for its sticky preview; preserve each page's own anchor clearance.
    const landing = href === '#configurator' ? page.locator('#configurator .hc-layout') : page.locator(href!);
    await expect(landing).toBeInViewport();
    const top = (await landing.boundingBox())!.y;
    expect(top).toBeGreaterThanOrEqual((await page.locator('.site-header').boundingBox())!.height - 1);
  });
}

});
