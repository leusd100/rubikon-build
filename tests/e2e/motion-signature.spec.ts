import { expect, test, type Page } from '@playwright/test';

// The deck in motion and the moments around it (owner 01.11, app/motion.css): a read block holds and sinks under the next one,
// the block's heading, rule and lead reveal once, a light follows the pointer over a material. Every test denies the optional
// cookies and answers Google with an empty 200. All of it is decoration: without it the page must be complete.

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

const PAGE = '/metalokonstruktsii';
const BLOCK = 'main > .page-section-dark';

async function open(page: Page, path = PAGE) {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${path}?lenis=off`, { waitUntil: 'load' });
}
const scrollTo = async (page: Page, y: number) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const shift = (page: Page) => page.locator(BLOCK).evaluate((block) => new DOMMatrix(getComputedStyle(block).transform).m42);

test.describe('the stack', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit windows');

  test('a read block moves down exactly as far as the page scrolls, and its layout box stays', async ({ page }) => {
    await open(page);
    const foot = await page.locator(BLOCK).evaluate((block) => block.getBoundingClientRect().bottom + scrollY);
    // the hold starts when the block's foot is 55 % of the window's height below its top
    const start = foot - 495;
    await scrollTo(page, start - 200);
    expect(await shift(page), 'before the hold').toBe(0);
    await scrollTo(page, start + 300);
    expect(Math.abs(await shift(page) - 300)).toBeLessThanOrEqual(1);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await scrollTo(page, 0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight), 'the page keeps its length').toBe(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });

  test('keyboard focus inside the page turns the hold off', async ({ page }) => {
    await open(page);
    const foot = await page.locator(BLOCK).evaluate((block) => block.getBoundingClientRect().bottom + scrollY);
    await scrollTo(page, foot - 200);
    expect(await shift(page)).toBeGreaterThan(0);
    await page.locator('main > .cost-section').evaluate((block) => block.setAttribute('tabindex', '-1'));
    await page.keyboard.press('Tab');
    await page.locator(`${BLOCK} a`).first().focus();
    await expect.poll(() => shift(page)).toBe(0);
  });

  test('blocks a visitor works in stay out: they must not move under the hand', async ({ page }) => {
    const held = (selector: string) => page.locator(selector).evaluateAll((blocks) => blocks.map((block) => getComputedStyle(block).animationName));
    await open(page, '/angary');
    expect(await held('main > .hangar-configurator'), 'a transformed ancestor would catch its full screen').toEqual(['none']);
    expect(await held('main > .conversation'), 'a field would jump when it takes focus').toEqual(['none']);
    expect(await held('main > .faq-section'), 'an answer that opens would push its question up').toEqual(['none']);
    await open(page, '/yak-pratsyuiemo');
    expect(await held('main > .proc-responsibility'), 'an answer that opens, and a sticky switch').toEqual(['none']);
    await open(page, '/planner-preview');
    expect(await held('main > .grain-planner-root'), 'the scale shrinks its buttons, the shortcut waits for the result to pass').toEqual(['none', 'none']);
  });

  test('a click in a form field leaves the block above the form where it is', async ({ page }) => {
    await open(page, '/pro-nas');
    const form = page.locator('main > .conversation');
    const top = await form.evaluate((block) => block.getBoundingClientRect().top + scrollY);
    await scrollTo(page, top - 300);
    const above = () => form.evaluate((block) => new DOMMatrix(getComputedStyle(block.previousElementSibling!).transform).m42);
    const before = await above();
    expect(before).toBeGreaterThan(0);
    await form.locator('input[type="text"]:visible').first().click();
    expect(Math.abs(await above() - before)).toBeLessThanOrEqual(1);
  });

  test('a sheet going down gets darker, and only a block that holds has a shade', async ({ page }) => {
    await open(page);
    await expect(page.locator(`${BLOCK} > .stack-shade`)).toHaveCount(1);
    await expect(page.locator('main > .conversation > .stack-shade, main > .faq-section > .stack-shade')).toHaveCount(0);
    const shade = () => page.locator(`${BLOCK} > .stack-shade`).evaluate((element) => Number(getComputedStyle(element).opacity));
    expect(await shade()).toBe(0);
    const foot = await page.locator(BLOCK).evaluate((block) => block.getBoundingClientRect().bottom + scrollY);
    await scrollTo(page, foot - 150);
    expect(await shade()).toBeGreaterThan(.2);
  });

  test('reduced motion: no hold, no reveal, no light, no page transition', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.waitForLoadState('networkidle');
    expect(await page.locator(BLOCK).evaluate((block) => getComputedStyle(block).animationName)).toBe('none');
    await expect(page.locator('[data-reveal]')).toHaveCount(0);
    await expect(page.locator('.material-light')).toHaveCount(0);
    expect(await page.evaluate(() => [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).some((rule) => rule instanceof CSSMediaRule && window.matchMedia(rule.media.mediaText).matches && rule.cssText.includes('@view-transition')))).toBe(false);
  });
});

test.describe('the reveal', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit windows');

  test('the first screen is never held back; a block below it shows once, as it comes up', async ({ page }) => {
    await open(page);
    await expect(page.locator('.service-subhero [data-reveal]')).toHaveCount(0);
    const heading = page.locator('main > .cost-section h2');
    await expect(heading).toHaveAttribute('data-reveal', 'mask');
    await expect(heading).not.toHaveAttribute('data-reveal-state', 'on');
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toHaveAttribute('data-reveal-state', 'on');
    await expect.poll(() => heading.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  });

  test('Tab into a block before it has shown, and it shows', async ({ page }) => {
    await open(page);
    const block = page.locator('main > .faq-section');
    await block.locator('summary').first().focus();
    await expect(block.locator('h2')).toHaveAttribute('data-reveal-state', 'on');
  });

  test('printing shows everything', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-reveal]').first()).toBeAttached();
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await expect(page.locator('[data-reveal]:not([data-reveal-state="on"])')).toHaveCount(0);
  });

  test('without script the page is whole', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-reveal]')).toHaveCount(0);
    await context.close();
  });
});

test.describe('the light on a material', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit windows');

  test('follows the pointer on a dark block with a material, and goes when it leaves', async ({ page }) => {
    await open(page);
    await expect(page.locator('.material-light')).toHaveCount(1);
    const block = page.locator(BLOCK);
    await block.scrollIntoViewIfNeeded();
    const box = (await block.boundingBox())!;
    await page.mouse.move(box.x + 900, Math.max(box.y, 0) + 200);
    await page.mouse.move(box.x + 940, Math.max(box.y, 0) + 230, { steps: 4 });
    const light = block.locator('.material-light');
    await expect(light).toHaveAttribute('data-on', '');
    expect(await light.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
    await page.mouse.move(2, 2);
    await expect(light).not.toHaveAttribute('data-on', '');
  });

  test('a touch screen gets none', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
    const page = await context.newPage();
    await page.goto(PAGE, { waitUntil: 'networkidle' });
    await expect(page.locator('.material-light')).toHaveCount(0);
    await context.close();
  });
});

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch and the phone header');

  const openPhone = async (page: Page, path: string) => {
    await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
    await page.goto(`${path}?lenis=off`, { waitUntil: 'load' });
  };
  const headerFoot = (page: Page) => page.locator('.site-header').evaluate((header) => header.getBoundingClientRect().bottom);

  test('an anchor brings a heading that has not shown yet to rest below the header', async ({ page }) => {
    await openPhone(page, '/pokrivelni-roboty');
    const link = page.locator('a[href$="#direction-entry-title"]').first();
    await link.scrollIntoViewIfNeeded();
    await link.tap();
    const heading = page.locator('#direction-entry-title');
    await expect.poll(() => heading.evaluate((element) => element.dataset.revealState)).toBe('on');
    await expect.poll(async () => (await heading.boundingBox())?.y).toBeGreaterThanOrEqual(await headerFoot(page));
  });

  test('an answer that opens leaves its question in view', async ({ page }) => {
    await openPhone(page, '/metalokonstruktsii');
    const foot = await page.locator('main > .faq-section').evaluate((block) => block.getBoundingClientRect().bottom + scrollY);
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), foot - 330);
    const question = page.locator('main > .faq-section summary').last();
    const before = (await question.boundingBox())!.y;
    await question.tap();
    await expect(question.locator('..')).toHaveAttribute('open', '');
    await expect(page.locator('main > .faq-section details[open] > p')).toBeVisible();
    const after = (await question.boundingBox())!.y;
    expect(after).toBeGreaterThanOrEqual(await headerFoot(page));
    expect(Math.abs(after - before)).toBeLessThanOrEqual(120);
  });
});
