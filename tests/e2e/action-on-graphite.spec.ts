import { expect, test, type Locator, type Page } from '@playwright/test';

// W1-09 · the light copper action on charcoal (PDO-17; owner 20.10: OD-PX-10 a). Every test denies the optional cookies and answers any Google request with an empty
// 200, so no tag can load.

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, path: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

test.describe('PDO-17 · the light copper action on charcoal', () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, 'wide screens; the phone heroes already had it (#206)'));

  const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const luminance = (value: string) => {
    const [r, g, b] = rgb(value).map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  };
  const colours = (target: Locator) => target.evaluate((element) => {
    const style = getComputedStyle(element);
    return { fill: style.backgroundColor, label: style.color };
  });
  const graphite = { light: 'rgb(23, 25, 24)', dark: 'rgb(18, 20, 19)' } as const;

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: every hero’s call (the 404’s «На головну») and the /angary title block’s button are #CC8455 with a graphite label`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.addInitScript((value) => localStorage.setItem('rubikon-theme', value), theme);
      for (const path of ['/', '/pro-nas', '/napryamky', '/metalokonstruktsii', '/yak-pratsyuiemo', '/angary', '/nemaie-takoi-storinky']) {
        await open(page, path, 1440);
        const call = page.locator('main a.hero-call-primary, main .not-found-hero a.button-primary').first();
        const { fill, label } = await colours(call);
        expect(fill, `${path}`).toBe('rgb(204, 132, 85)');
        expect(label, `${path}`).toBe(graphite[theme]);
        expect(contrast(fill, label), `${path}`).toBeGreaterThanOrEqual(4.5);
        await call.hover();
        await expect.poll(async () => (await colours(call)).fill, `${path} hover`).toBe('rgb(221, 162, 122)');
        expect(contrast((await colours(call)).fill, label), `${path} hover`).toBeGreaterThanOrEqual(4.5);
      }
      const stamp = page.locator('.angary-process a.angary-stamp-cta');
      await open(page, '/angary', 1440);
      expect(await colours(stamp)).toEqual({ fill: 'rgb(204, 132, 85)', label: graphite[theme] });
    });

    test(`${theme}: the X-Ray brief on hover and the lit cost factor’s number read at ≥ 4.5 : 1`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.addInitScript((value) => localStorage.setItem('rubikon-theme', value), theme);
      await open(page, '/', 1440);
      const brief = page.locator('main .hv2-contour-brief');
      await brief.scrollIntoViewIfNeeded();
      expect(contrast(...Object.values(await colours(brief)) as [string, string]), 'brief at rest').toBeGreaterThanOrEqual(4.5);
      await brief.hover();
      await expect.poll(async () => (await colours(brief)).fill, 'brief hover').toBe('rgb(221, 162, 122)');
      expect(contrast(...Object.values(await colours(brief)) as [string, string]), 'brief hover').toBeGreaterThanOrEqual(4.5);

      await open(page, '/yak-pratsyuiemo', 1440);
      const factor = page.locator('.proc-factors li[data-factor]').first();
      await factor.scrollIntoViewIfNeeded();
      await factor.hover();
      const number = factor.locator('.cf-number');
      await expect.poll(() => factor.evaluate((element) => element.closest('.proc-factors')?.getAttribute('data-active') === element.getAttribute('data-factor'))).toBe(true);
      await expect.poll(async () => contrast(...Object.values(await colours(number)) as [string, string]), 'lit factor number').toBeGreaterThanOrEqual(4.5);
    });
  }

  test('the cookie banner is untouched: «Прийняти все» stays an outline, equal to «Лише необхідні»', async ({ browser, baseURL }) => {
    // a first visit (no saved choice), nothing clicked
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
    await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
    const page = await context.newPage();
    await page.goto('/metalokonstruktsii', { waitUntil: 'load' });
    const accept = page.locator('.cookie-banner').getByRole('button', { name: 'Прийняти все', exact: true });
    const essential = page.locator('.cookie-banner').getByRole('button', { name: 'Лише необхідні', exact: true });
    await expect(accept).toBeVisible();
    expect(await colours(accept)).toEqual({ fill: 'rgba(0, 0, 0, 0)', label: 'rgb(245, 242, 235)' });
    expect(await colours(accept)).toEqual(await colours(essential));
    await context.close();
  });
});
