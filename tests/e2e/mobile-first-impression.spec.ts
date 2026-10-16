import { expect, test, type Page } from '@playwright/test';

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
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-header');
    await expect(header).not.toHaveCSS('backdrop-filter', 'none');
    await page.goto(target.path, { waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-hero-header', 'top');
    await page.setViewportSize({ width: target.path === '/' ? 761 : 601, height: 844 });
    await expect(page.locator('html')).not.toHaveAttribute('data-hero-header');
    await expect(header).not.toHaveCSS('backdrop-filter', 'none');
  });
}
