import { expect, test, type Page } from '@playwright/test';
import { company, companyContactLinks } from '../../app/data/company';

// Phase 2 «UX і конверсія» (R-UX-06 §05, §06, §08, top-15 items 1 and 8). Both rules are owner decisions still PROPOSED:
// - DEC-41: one action language. Copper is the call on every hero at every width, as HOME's; the page's own next step
//   (its tool, the directions list or the written request) follows as an outline, and the written request opens the
//   folded form on a phone or tablet as HOME's does.
// - DEC-46: the closing block's written channels are one quiet line under the call, not four buttons equal to it; the
//   form keeps its own channel choice, which a reply needs.
// /planner-preview keeps its pre-Phase-2 hero while D-04 is open.

const TEL = companyContactLinks.phone;
const HERO_PAGES = ['/', '/angary', '/zernoskhovyshcha', '/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/napryamky', '/pro-nas', '/yak-pratsyuiemo'];
const WINDOWS = [
  { width: 1440, height: 900 },
  { width: 1250, height: 613 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
] as const;
const ACTION_ROWS = '.hero-actions, .hero-action-row, .angary-hero-actions, .grain-hero-actions, .directions-hero-actions, .about-hero-actions, .proc-hero-actions';

async function answerCookies(page: Page, state: 'granted' | 'denied') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: value, advertising: value }));
  }, state);
}

/** The hero's visible actions in reading order: where each goes, whether it is copper, and where it ends */
function heroActions(page: Page) {
  return page.locator('main section').first().locator(ACTION_ROWS).first().evaluate((row) => {
    const copper = (element: Element) => getComputedStyle(element).backgroundColor;
    const actions = [...row.querySelectorAll<HTMLElement>(':scope > a, :scope > button')].filter((element) => element.offsetParent !== null);
    const call = actions[0];
    return actions.map((element) => ({
      href: element.getAttribute('href'),
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      primary: element.classList.contains('button-primary'),
      sameCopper: element !== call && copper(element) === copper(call),
      openInquiry: element.hasAttribute('data-open-inquiry'),
      bottom: element.getBoundingClientRect().bottom,
    }));
  });
}

test.describe('DEC-41 · one action language', () => {
  test('copper is the call in every hero, first and alone, on the first screen', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'the test sets its own windows');
    await answerCookies(page, 'denied');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const viewport of WINDOWS) {
      await page.setViewportSize(viewport);
      for (const path of HERO_PAGES) {
        const where = `${path} ${viewport.width}×${viewport.height}`;
        await page.goto(path, { waitUntil: 'load' });
        const actions = await heroActions(page);
        expect(actions.length, where).toBeGreaterThanOrEqual(2);
        expect(actions[0], where).toMatchObject({ href: TEL, primary: true });
        expect(actions[0].text, where).toContain(company.phone.display);
        expect(actions.slice(1).filter((action) => action.primary || action.sameCopper), where).toEqual([]);
        // Every #inquiry action in a hero is the written path and opens the folded form, as HOME's
        expect(actions.filter((action) => action.href === '#inquiry' && !action.openInquiry), where).toEqual([]);
        for (const action of actions) expect(action.bottom, `${where}: ${action.text}`).toBeLessThanOrEqual(viewport.height);
      }
    }
  });

  test('the tool stays the second action on /angary and /zernoskhovyshcha and still leads into it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'the test sets its own windows');
    await answerCookies(page, 'denied');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [path, name, target] of [['/angary', 'Зібрати конфігурацію', '#configurator'], ['/zernoskhovyshcha', 'Скласти комплекс', '#kompleks']] as const) {
      for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        await page.goto(path, { waitUntil: 'load' });
        const actions = await heroActions(page);
        expect(actions[1], `${path} ${viewport.width}`).toMatchObject({ href: target, primary: false });
        await page.locator('main section').first().getByRole('link', { name: new RegExp(name) }).click();
        await expect(page.locator(target)).toBeInViewport();
      }
    }
  });

  test('the keyboard meets the call first, then the page\'s own step', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'a keyboard on a computer');
    await answerCookies(page, 'denied');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/angary', { waitUntil: 'load' });
    await page.locator('main .breadcrumb a').last().focus();
    const focused = () => page.evaluate(() => document.activeElement?.getAttribute('href'));
    await page.keyboard.press('Tab');
    expect(await focused()).toBe(TEL);
    await page.keyboard.press('Tab');
    expect(await focused()).toBe('#configurator');
    await page.keyboard.press('Tab');
    expect(await focused()).toBe('#inquiry');
  });

  for (const [path, name, viewport] of [
    ['/metalokonstruktsii', 'Обговорити задачу', { width: 390, height: 844 }],
    ['/pro-nas', 'Обговорити задачу', { width: 390, height: 844 }],
    ['/angary', 'Обговорити задачу', { width: 820, height: 1180 }],
    ['/zernoskhovyshcha', 'Обговорити зерносховище', { width: 820, height: 1180 }],
  ] as const) {
    test(`${path} at ${viewport.width} px: «${name}» opens the folded form, as HOME's written action does`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'the test sets its own windows');
      await answerCookies(page, 'denied');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize(viewport);
      await page.goto(path, { waitUntil: 'load' });
      const form = page.locator('#inquiry form.inquiry-form');
      await expect(form).toBeHidden();
      await page.locator('main section').first().getByRole('link', { name: new RegExp(name) }).click();
      await expect(form).toBeVisible();
      await expect(page.locator('#inquiry .conversation-form-toggle')).toHaveCount(0);
    });
  }

  test('/planner-preview keeps its hero as it was while D-04 is open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'the test sets its own windows');
    await answerCookies(page, 'denied');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/planner-preview', { waitUntil: 'load' });
    const actions = await heroActions(page);
    expect(actions.map(({ href, primary }) => ({ href, primary }))).toEqual([
      { href: '#planner', primary: true },
      { href: '#inquiry', primary: false },
      { href: TEL, primary: false },
    ]);
  });
});

test.describe('DEC-46 · the closing block', () => {
  test('the call, then centered written channels including narrow-screen wrapping; the form keeps its channel choice', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'the test sets its own windows');
    await answerCookies(page, 'denied');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 320, height: 700 }]) {
      await page.setViewportSize(viewport);
      for (const path of ['/', '/angary', '/metalokonstruktsii', '/yak-pratsyuiemo']) {
        const where = `${path} ${viewport.width}`;
        await page.goto(path, { waitUntil: 'load' });
        const contact = page.locator('#inquiry .conversation-contact');
        await contact.scrollIntoViewIfNeeded();
        // The call is the block's only button
        await expect(contact.locator('.button'), where).toHaveCount(1);
        await expect(contact.locator('.button')).toHaveAttribute('href', TEL);
        const channels = contact.locator('.conversation-channels .messenger-link');
        await expect(channels, where).toHaveCount(4);
        await expect(channels.nth(0)).toHaveAttribute('data-contact-method', 'telegram');
        await expect(channels.nth(1)).toHaveAttribute('data-contact-method', 'whatsapp');
        await expect(channels.nth(2)).toHaveAttribute('data-contact-method', 'viber');
        await expect(channels.nth(3)).toHaveAttribute('href', companyContactLinks.email);
        await page.evaluate(() => document.fonts.ready);
        const contactBox = (await contact.boundingBox())!;
        for (const channel of await channels.all()) await expect(channel, where).toBeVisible();
        const callBox = (await contact.locator('.conversation-call').boundingBox())!;
        const boxes = await Promise.all((await channels.all()).map((channel) => channel.boundingBox()));
        // Font metrics differ across platforms: compact phones may use two rows. Each row must stay centered.
        const channelRows = new Set(boxes.map((box) => Math.round(box!.y))).size;
        if (viewport.width >= 390) expect(channelRows, where).toBe(1);
        else expect(channelRows, where).toBeLessThanOrEqual(2);
        const labelBox = (await contact.locator('.conversation-channels-label').boundingBox())!;
        const rows = Map.groupBy([...boxes, labelBox], (box) => Math.round(box!.y + box!.height / 2));
        const callCenter = callBox.x + callBox.width / 2;
        for (const row of rows.values()) {
          const left = Math.min(...row.map((box) => box!.x));
          const right = Math.max(...row.map((box) => box!.x + box!.width));
          expect(Math.abs((left + right) / 2 - callCenter), where).toBeLessThanOrEqual(1);
        }
        if (viewport.width <= 760) {
          const labelCenter = await contact.locator('.conversation-channels-label').evaluate((label) => {
            const range = document.createRange();
            range.selectNodeContents(label);
            const rect = range.getBoundingClientRect();
            return rect.x + rect.width / 2;
          });
          expect(Math.abs(labelCenter - callCenter), where).toBeLessThanOrEqual(1);
        }
        for (const box of boxes) {
          expect(box!.y, where).toBeGreaterThan(callBox.y + callBox.height);
          expect(box!.height, where).toBeGreaterThanOrEqual(44);
          expect(box!.height, where).toBeLessThan(callBox.height);
          expect(box!.x, where).toBeGreaterThanOrEqual(contactBox.x - 1);
          expect(box!.x + box!.width, where).toBeLessThanOrEqual(contactBox.x + contactBox.width + 1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), where).toBeLessThanOrEqual(0);
        if (viewport.width === 390 && path === '/') {
          await page.mouse.move(0, 0);
          const capture = testInfo.outputPath('centered-contact-390.png');
          await page.locator('#inquiry .conversation-grid').screenshot({ path: capture, animations: 'disabled', scale: 'css' });
          await testInfo.attach('Centered contact block at 390 CSS px', { path: capture, contentType: 'image/png' });
        }
      }
    }
    // The form still asks how to reply: the call or one of the three messengers
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('#inquiry form fieldset').filter({ hasText: 'Як з вами зв’язатися' }).locator('input[type="radio"]')).toHaveCount(4);
  });

  test('a tap on the call or a channel is still counted once, with its method', async ({ context, page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'the test sets its own windows');
    // Analytics is granted, so the page asks for gtag.js: every Google request is answered here, none leaves the test
    await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
    await answerCookies(page, 'granted');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/metalokonstruktsii', { waitUntil: 'load' });
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.rubikonAnalyticsConfigured ?? '')).not.toBe('');
    // Leave the page where it is: the count is taken on the way, then the link's own navigation is cancelled
    await page.evaluate(() => window.addEventListener('click', (event) => event.preventDefault()));
    const contactClicks = () => page.evaluate(() => (window.dataLayer ?? [])
      .map((entry) => Array.from(entry as ArrayLike<unknown>))
      .filter((entry) => entry[0] === 'event' && entry[1] === 'contact_click')
      .map((entry) => (entry[2] as { contact_method?: string }).contact_method));
    await page.locator('main section').first().locator('a.hero-call-lead').click();
    await expect.poll(contactClicks).toEqual(['phone']);
    await page.locator('#inquiry .conversation-channels .messenger-telegram').click();
    await page.locator('#inquiry .conversation-channels .messenger-whatsapp').click();
    await page.locator('#inquiry .conversation-call').click();
    await expect.poll(contactClicks).toEqual(['phone', 'telegram', 'whatsapp', 'phone']);
  });
});
