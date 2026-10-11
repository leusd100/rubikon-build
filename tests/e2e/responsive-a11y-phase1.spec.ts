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

/** The keyboard's tests run in Chromium, and in Firefox and WebKit too where those projects are asked for */
const KEYBOARD_PROJECTS = ['desktop-chromium', 'firefox', 'webkit'];

/** Safari's Tab moves over buttons and fields only; Option+Tab (or its «Press Tab to highlight each item») takes in
 * links too, as Tab does in Chrome and Firefox, and that is the keyboard user these checks stand for */
const tabKey = (page: Page, back = false) =>
  `${page.context().browser()?.browserType().name() === 'webkit' ? 'Alt+' : ''}${back ? 'Shift+' : ''}Tab`;

/** What a page reported going wrong: its uncaught errors, console errors and scripts that did not load */
const reports = new WeakMap<Page, string[]>();

function listen(page: Page) {
  const seen: string[] = [];
  reports.set(page, seen);
  page.on('pageerror', (error) => seen.push(`error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') seen.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    if (request.resourceType() === 'script') seen.push(`script: ${request.url()} ${request.failure()?.errorText ?? ''}`);
  });
}

/** Opens a page and waits for React to take it over: the keyboard's handlers (the menu's, FocusClearance) are React's,
 * and hydration can land after `load`. A page that never hydrates fails here, with what it reported */
async function open(page: Page, path: string) {
  // The production build's CSP ends in upgrade-insecure-requests. Chrome and Firefox leave this plain-http local server
  // alone; WebKit asks it for https and no script loads, so the page never hydrates (the first WebKit run). The site
  // itself is served over https only: WebKit is given the page without that one directive
  if (page.context().browser()?.browserType().name() === 'webkit') {
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() !== 'document') return route.fallback();
      const response = await route.fetch();
      const headers = { ...response.headers() };
      headers['content-security-policy'] = (headers['content-security-policy'] ?? '').replace(/;\s*upgrade-insecure-requests/, '');
      delete headers['strict-transport-security'];
      await route.fulfill({ response, headers });
    });
  }
  await page.goto(path, { waitUntil: 'load' });
  const hydrated = () => {
    const menu = document.querySelector('.mobile-menu');
    return !!menu && Object.keys(menu).some((key) => key.startsWith('__reactProps'));
  };
  await page.waitForFunction(hydrated, null, { timeout: 15_000 }).catch(() => {
    throw new Error(`${path} did not hydrate in 15 s; the page reported: ${reports.get(page)?.join(' | ') || 'nothing'}`);
  });
}

/** Until the page has stood still for 12 frames (the browser's own scroll for a focus, and the clearance after it) */
const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const started = performance.now();
        let last = window.scrollY;
        let quiet = 0;
        const tick = (now: number) => {
          if (window.scrollY === last) quiet += 1;
          else {
            quiet = 0;
            last = window.scrollY;
          }
          if (quiet >= 12 || now - started > 3000) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );

/** Shift+Tab from the foot of the page to its header; every control the focus stood on, if the header lay over it */
async function walkBack(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await settle(page);
  const hidden: string[] = [];
  let walked = 0;
  for (let step = 0; step < 120; step++) {
    await page.keyboard.press(tabKey(page, true));
    await settle(page);
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return { done: true };
      if (element.closest('.site-header, .cookie-banner') || element.classList.contains('skip-link')) return { skip: true };
      // the X-Ray's seam slider is a transparent input over the whole frame; the frame draws its focus (sweep §5)
      if (element.matches('.hv2-contour-range')) return { skip: true };
      const box = element.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return { skip: true };
      const name = (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 40);
      const id = element.id ? '#' + element.id : '';
      const tag = element.tagName.toLowerCase() + id + [...element.classList].slice(0, 2).map((c) => '.' + c).join('');
      return { top: box.top, bottom: box.bottom, name: `${tag} «${name}»` };
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
  return { walked, hidden };
}

test.describe('keyboard', () => {
  test.beforeEach(({ page }) => listen(page));

  test('Tab past the mobile menu’s last item closes it; Shift+Tab back past its button closes it too', async ({ page }, testInfo) => {
    test.skip(!KEYBOARD_PROJECTS.includes(testInfo.project.name), 'each test sets its own windows');
    await skipBanner(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/');
    const menu = page.locator('.mobile-menu');
    const summary = menu.locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    const inMenu = () => page.evaluate(() => document.querySelector('.mobile-menu')!.contains(document.activeElement));
    for (let step = 0; step < 20 && (await inMenu()); step++) await page.keyboard.press(tabKey(page));
    expect(await inMenu()).toBe(false);
    await expect(menu).not.toHaveAttribute('open', '');

    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    await page.keyboard.press(tabKey(page, true));
    await expect(menu).not.toHaveAttribute('open', '');

    // Escape still closes it and hands the focus back to its button
    await summary.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press(tabKey(page));
    await page.keyboard.press('Escape');
    await expect(menu).not.toHaveAttribute('open', '');
    await expect(summary).toBeFocused();
  });

  test('the menu marks the page in view, and its numbers are not read out', async ({ page }, testInfo) => {
    test.skip(!KEYBOARD_PROJECTS.includes(testInfo.project.name), 'each test sets its own windows');
    await skipBanner(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/pro-nas');
    const links = page.locator('.mobile-menu nav a');
    await expect(page.locator('.mobile-menu nav a[aria-current="page"]')).toHaveText(/Про компанію/);
    await expect(page.locator('.mobile-menu nav a[aria-current]')).toHaveCount(1);
    await expect(links.first().locator('small')).toHaveAttribute('aria-hidden', 'true');
    await page.locator('.mobile-menu summary').click();
    await expect(page.locator('.mobile-menu nav').getByRole('link', { name: 'Напрямки', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('.desktop-nav a[aria-current="page"]')).toHaveText('Про компанію');
    // An <address>, which browsers expose as a named group (Chromium: group «Контакти компанії»); Playwright's own role
    // engine does not map the tag, so the element and its name are checked as they are
    await expect(page.locator('header address.header-contacts')).toHaveAttribute('aria-label', 'Контакти компанії');
  });

  // Moving back, the browser did not scroll to a control it counted as in view though the header lay over it: FAQ
  // questions, links and node pins stayed under it for good (sweep 2.1, reproduced with reduced motion too)
  for (const [path, width, height] of [['/metalokonstruktsii', 390, 844], ['/pro-nas', 390, 844], ['/yak-pratsyuiemo', 390, 844], ['/', 1250, 613], ['/metalokonstruktsii', 1440, 900]] as const) {
    test(`Shift+Tab never leaves the focus under the fixed header: ${path} at ${width}×${height}`, async ({ page }, testInfo) => {
      test.skip(!KEYBOARD_PROJECTS.includes(testInfo.project.name), 'each test sets its own windows');
      test.setTimeout(90_000);
      await skipBanner(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height });
      await open(page, path);
      const { walked, hidden } = await walkBack(page);
      expect(walked).toBeGreaterThan(10);
      expect(hidden).toEqual([]);
    });
  }

  // With motion allowed the browser scrolls smoothly to a control it does bring into view, for ~0.7 s in Chromium; the
  // clearance waits for that scroll to end however long it runs (a fixed 700 ms wait ran out before it did)
  for (const [path, width, height] of [['/pro-nas', 390, 844], ['/metalokonstruktsii', 1440, 900]] as const) {
    test(`with motion allowed, Shift+Tab leaves no focus under the header once the page is still: ${path} at ${width}×${height}`, async ({ page }, testInfo) => {
      test.skip(!KEYBOARD_PROJECTS.includes(testInfo.project.name), 'each test sets its own windows');
      test.setTimeout(120_000);
      await skipBanner(page);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setViewportSize({ width, height });
      await open(page, path);
      const { walked, hidden } = await walkBack(page);
      expect(walked).toBeGreaterThan(10);
      expect(hidden).toEqual([]);
    });
  }

  test('a control a script focused without a scroll, wholly above the window, is left where the script put it', async ({ page }, testInfo) => {
    test.skip(!KEYBOARD_PROJECTS.includes(testInfo.project.name), 'each test sets its own windows');
    await skipBanner(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/pro-nas');
    // a key pressed first, so the focus that follows counts as the keyboard's (:focus-visible)
    await page.keyboard.press(tabKey(page));
    await page.evaluate(() => window.scrollTo({ top: 2500, behavior: 'instant' }));
    await settle(page);
    const moved = await page.evaluate(async () => {
      const link = [...document.querySelectorAll<HTMLElement>('main a[href]')].find((a) => a.getBoundingClientRect().bottom < 0)!;
      const y = window.scrollY;
      link.focus({ preventScroll: true });
      const keyboard = link.matches(':focus-visible');
      await new Promise((resolve) => setTimeout(resolve, 600));
      return { keyboard, by: window.scrollY - y, focused: document.activeElement === link };
    });
    expect(moved).toEqual({ keyboard: true, by: 0, focused: true });
  });

  test('on a phone the configurator’s first step tab comes out from under the sticky mini preview on Shift+Tab', async ({ page }, testInfo) => {
    test.skip(!KEYBOARD_PROJECTS.includes(testInfo.project.name), 'each test sets its own windows');
    await skipBanner(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/angary');
    const tab = page.locator('#hc-step-task-tab');
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    const radio = page.locator('#hc-step-task-panel input:checked, [aria-labelledby="hc-step-task-tab"] input:checked').first();
    await radio.focus();
    await page.evaluate(() => window.scrollBy(0, document.activeElement!.getBoundingClientRect().top - window.innerHeight * 0.7));
    for (let step = 0; step < 30; step++) {
      await page.keyboard.press(tabKey(page, true));
      if (await page.evaluate(() => document.activeElement?.id === 'hc-step-task-tab')) break;
    }
    await expect(tab).toBeFocused();
    // «clear», or what lay over the tab: the element, where the tab and the mini drawing stood, whether the sheet was held
    await expect.poll(() => tab.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + 4);
      if (hit && element.contains(hit)) return 'clear';
      const layout = element.closest<HTMLElement>('.hc-layout');
      const sheet = layout?.querySelector('.hc-preview-surface')?.getBoundingClientRect();
      const header = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
      const over = hit ? [hit.tagName.toLowerCase(), ...hit.classList].join('.') : 'nothing';
      return `${over} over the tab at ${Math.round(box.top)}; `
        + `header ${Math.round(header)}, sheet ${Math.round(sheet?.top ?? 0)}–${Math.round(sheet?.bottom ?? 0)}, `
        + `held ${layout ? 'configuring' in layout.dataset : '?'}, --hc-mini-h ${layout?.style.getPropertyValue('--hc-mini-h') || '–'}, scrollY ${Math.round(window.scrollY)}`;
    })).toBe('clear');
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
      // Both of the row's buttons since Phase 2: the call (copper) and «Обговорити задачу» beside it (DEC-41, PROPOSED)
      const actions = page.locator('.service-subhero-content .hero-action-row .button');
      await expect(actions).toHaveCount(2);
      for (const action of await actions.all()) {
        const box = (await action.boundingBox())!;
        expect(box.y + box.height, path).toBeLessThanOrEqual(613);
      }
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
