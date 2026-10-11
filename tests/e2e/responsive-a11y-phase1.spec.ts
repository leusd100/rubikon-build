import { expect, test, type Page } from '@playwright/test';

// Phase 1 «Вміщення й доступність» (UI/UX master review 11.10, R-UX-06 §10/§17, checked against the production reports
// R-UX-07…09). Each test holds one confirmed defect fixed: the keyboard's focus never left under the fixed header or a
// sticky panel, nor on the page under an open menu; «Контакти» lands below the header everywhere; the crumbs over a phone
// hero are light; on a short laptop window the concrete hero's action and the X-Ray's way on to a brief are in view; the
// first visit's cookie banner is compact on a short phone; a pressed node step on a phone shows its drawing.

const CONSENT = JSON.stringify({ analytics: 'denied', advertising: 'denied' });

async function skipBanner(page: Page) {
  await page.addInitScript((value) => window.localStorage.setItem('rubikon-consent-state', value), CONSENT);
}

const headerBottom = (page: Page) => page.evaluate(() => document.querySelector('.site-header')!.getBoundingClientRect().bottom);

test.describe('keyboard', () => {
  test('Tab past the mobile menu’s last item closes it; Shift+Tab back past its button closes it too', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'each test sets its own windows');
    await skipBanner(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'load' });
    const menu = page.locator('.mobile-menu');
    const summary = menu.locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    const inMenu = () => page.evaluate(() => document.querySelector('.mobile-menu')!.contains(document.activeElement));
    for (let step = 0; step < 20 && (await inMenu()); step++) await page.keyboard.press('Tab');
    expect(await inMenu()).toBe(false);
    await expect(menu).not.toHaveAttribute('open', '');

    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    await page.keyboard.press('Shift+Tab');
    await expect(menu).not.toHaveAttribute('open', '');

    // Escape still closes it and hands the focus back to its button
    await summary.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await expect(menu).not.toHaveAttribute('open', '');
    await expect(summary).toBeFocused();
  });

  test('the menu marks the page in view, and its numbers are not read out', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'each test sets its own windows');
    await skipBanner(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pro-nas', { waitUntil: 'load' });
    const links = page.locator('.mobile-menu nav a');
    await expect(page.locator('.mobile-menu nav a[aria-current="page"]')).toHaveText(/Про компанію/);
    await expect(page.locator('.mobile-menu nav a[aria-current]')).toHaveCount(1);
    await expect(links.first().locator('small')).toHaveAttribute('aria-hidden', 'true');
    await page.locator('.mobile-menu summary').click();
    await expect(page.locator('.mobile-menu nav').getByRole('link', { name: 'Напрямки', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('.desktop-nav a[aria-current="page"]')).toHaveText('Про компанію');
    await expect(page.locator('.header-contacts')).toHaveAttribute('role', 'group');
  });

  // Moving back, the browser did not scroll to a control it counted as in view though the header lay over it: FAQ
  // questions, links and node pins stayed under it for good (sweep 2.1, reproduced with reduced motion too)
  for (const [path, width, height] of [['/metalokonstruktsii', 390, 844], ['/pro-nas', 390, 844], ['/yak-pratsyuiemo', 390, 844], ['/', 1250, 613], ['/metalokonstruktsii', 1440, 900]] as const) {
    test(`Shift+Tab never leaves the focus under the fixed header: ${path} at ${width}×${height}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'each test sets its own windows');
      test.setTimeout(90_000);
      await skipBanner(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height });
      await page.goto(path, { waitUntil: 'load' });
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const hidden: string[] = [];
      let walked = 0;
      for (let step = 0; step < 120; step++) {
        await page.keyboard.press('Shift+Tab');
        // the check waits two frames for the browser's own scroll; give it those and a little more
        await page.waitForTimeout(60);
        const focus = await page.evaluate(() => {
          const element = document.activeElement;
          if (!element || element === document.body) return { done: true };
          if (element.closest('.site-header, .cookie-banner') || element.classList.contains('skip-link')) return { skip: true };
          // the X-Ray's seam slider is a transparent input over the whole frame; the frame draws its focus (sweep §5)
          if (element.matches('.hv2-contour-range')) return { skip: true };
          const box = element.getBoundingClientRect();
          if (box.width < 2 || box.height < 2) return { skip: true };
          return { top: box.top, bottom: box.bottom, name: (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 40) };
        });
        if ('done' in focus) break;
        if ('skip' in focus) {
          if (walked > 5 && (await page.evaluate(() => !!document.activeElement?.closest('.site-header')))) break;
          continue;
        }
        walked++;
        const cover = await headerBottom(page);
        if (focus.top! < cover - 0.5) hidden.push(`${focus.name} ${Math.round(focus.top!)}–${Math.round(focus.bottom!)} under ${Math.round(cover)}`);
      }
      expect(walked).toBeGreaterThan(10);
      expect(hidden).toEqual([]);
    });
  }

  test('on a phone the configurator’s first step tab comes out from under the sticky mini preview on Shift+Tab', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'each test sets its own windows');
    await skipBanner(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/angary', { waitUntil: 'load' });
    const tab = page.locator('#hc-step-task-tab');
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    const radio = page.locator('#hc-step-task-panel input:checked, [aria-labelledby="hc-step-task-tab"] input:checked').first();
    await radio.focus();
    await page.evaluate(() => window.scrollBy(0, document.activeElement!.getBoundingClientRect().top - window.innerHeight * 0.7));
    for (let step = 0; step < 30; step++) {
      await page.keyboard.press('Shift+Tab');
      if (await page.evaluate(() => document.activeElement?.id === 'hc-step-task-tab')) break;
    }
    await expect(tab).toBeFocused();
    await expect.poll(() => tab.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + 4);
      return !!hit && element.contains(hit);
    })).toBe(true);
  });
});

test.describe('anchors and contrast', () => {
  for (const [path, width, height] of [['/polityka-konfidentsiinosti', 390, 844], ['/polityka-konfidentsiinosti', 1250, 613], ['/nema-takoi-storinky', 390, 844]] as const) {
    test(`«Контакти» lands below the header: ${path} at ${width}×${height}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'each test sets its own windows');
      await skipBanner(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height });
      await page.goto(path, { waitUntil: 'load' });
      const desktop = page.locator('.desktop-nav a[href="#inquiry"]');
      if (await desktop.isVisible()) await desktop.click();
      else {
        await page.locator('.mobile-menu summary').click();
        await page.locator('.mobile-menu nav a[href="#inquiry"]').click();
      }
      await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#inquiry');
      const top = await page.evaluate(() => {
        const target = document.getElementById('inquiry')!;
        return (target.querySelector('h1, h2, h3') ?? target).getBoundingClientRect().top;
      });
      expect(top).toBeGreaterThanOrEqual(await headerBottom(page));
    });
  }

  test('over a phone hero the crumbs are light words; from 761 px they keep their muted tone', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'each test sets its own windows');
    await skipBanner(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/napryamky', { waitUntil: 'load' });
    const colors = () => page.evaluate(() => [...document.querySelectorAll('nav.breadcrumb :is(a, b)')].map((element) => getComputedStyle(element).color));
    for (const color of await colors()) expect(['rgba(255, 255, 255, 0.86)', 'rgb(255, 255, 255)']).toContain(color);
    await page.setViewportSize({ width: 1250, height: 613 });
    await expect.poll(colors).not.toContain('rgba(255, 255, 255, 0.86)');
  });
});

test.describe('fit', () => {
  test('on a 1250 × 613 window the concrete hero’s action is whole above the window’s edge', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'each test sets its own windows');
    await skipBanner(page);
    await page.setViewportSize({ width: 1250, height: 613 });
    for (const path of ['/betonni-roboty', '/metalokonstruktsii', '/pokrivelni-roboty']) {
      await page.goto(path, { waitUntil: 'load' });
      const action = (await page.locator('.service-subhero-content .hero-action-row .button-primary:not(.hero-call-phone)').first().boundingBox())!;
      expect(action.y + action.height, path).toBeLessThanOrEqual(613);
    }
  });

  test('on a 1250 × 613 window the X-Ray photo and its title block’s way on to a brief are seen together under the header', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'each test sets its own windows');
    await skipBanner(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, height] of [[1250, 613], [1366, 657]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto('/', { waitUntil: 'load' });
      const sheet = page.locator('.hv2-contour');
      await sheet.evaluate((element) => {
        const image = element.querySelector('.sheet-image')!;
        const cover = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
        window.scrollTo({ top: window.scrollY + image.getBoundingClientRect().top - cover, behavior: 'instant' });
      });
      const brief = (await sheet.locator('.hv2-contour-brief').boundingBox())!;
      const layers = (await sheet.locator('.hv2-contour-layers').boundingBox())!;
      expect(brief.y + brief.height, `${width}×${height}`).toBeLessThanOrEqual(height);
      expect(layers.y + layers.height, `${width}×${height}`).toBeLessThanOrEqual(height);
    }
  });

  test('on a short phone the first visit’s cookie banner is compact, its answers still a finger’s 40 px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'each test sets its own windows');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/metalokonstruktsii', { waitUntil: 'load' });
    const banner = page.locator('.cookie-banner');
    await expect(banner).toBeVisible();
    expect((await banner.boundingBox())!.height).toBeLessThanOrEqual(124);
    for (const button of await banner.locator('.cookie-actions button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    // the header's call is never under it
    const call = (await page.locator('.site-header .mobile-call').boundingBox())!;
    expect(call.y + call.height).toBeLessThanOrEqual((await banner.boundingBox())!.y);
  });

  test('on a phone a pressed node step shows its drawing: the sheet comes back under the header', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'each test sets its own windows');
    await skipBanner(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/metalokonstruktsii', '/pokrivelni-roboty']) {
      await page.goto(path, { waitUntil: 'load' });
      const section = page.locator('.dn-section');
      const last = section.locator('.dn-step').last();
      await last.scrollIntoViewIfNeeded();
      // the visitor reading the list: the last step half way down the window, the drawing above it out of view (on main
      // 48c870d the sheet then stood at −174 px)
      await last.evaluate((element) => window.scrollBy({ top: element.getBoundingClientRect().top - window.innerHeight * 0.5, behavior: 'instant' }));
      await last.click();
      await expect(last).toHaveAttribute('aria-pressed', 'true');
      const cover = await headerBottom(page);
      await expect.poll(async () => (await section.locator('.dn-sheet').boundingBox())!.y, path).toBeGreaterThanOrEqual(cover);
      // …and the step pressed is still in view below it
      const step = (await last.boundingBox())!;
      expect(step.y + step.height, path).toBeLessThanOrEqual(844);
    }
  });
});
