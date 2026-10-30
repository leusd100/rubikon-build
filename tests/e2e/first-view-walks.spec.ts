import { expect, test, type Locator, type Page } from '@playwright/test';

// Motion v1 rule 7 (docs/ui-system-v1.md §6.4, PDO-55, OD-PX-34 a): the auto-shows of /yak-pratsyuiemo and /pro-nas walk
// once at 2.2 s a step, end for good on a person's action, and play one at a time. The page's clock is ours; the observer
// that arms a walk is not on it, so a walk's first step is polled for.

const STEP_MS = 2200;

test.beforeEach(async ({ context, page }, testInfo) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 204, body: '' }));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // A real wheel and the browser's hover after a scroll need the real clock
  if (!testInfo.title.includes('resting pointer')) await page.clock.install();
});

const firstStep = async (page: Page, read: () => Promise<string | null>) => {
  await expect.poll(async () => { await page.clock.runFor(300); return read(); }, { timeout: 15_000 }).not.toBeNull();
  return read();
};

/** The cookie banner sits over the bottom of the window, where a pointer test would land on it */
const closeBanner = async (page: Page) => {
  const decline = page.getByRole('button', { name: /необхідн/i }).first();
  await decline.waitFor({ state: 'visible' });
  await decline.click();
};

/** Every change of an attribute with the page's own time: the clock also runs on its own, so a gap measured from outside lies */
const watch = (page: Page, selector: string, name: string) => page.locator(selector).evaluate((element, attribute) => {
  const log: { at: number; value: string | null }[] = [];
  (window as unknown as { __walk: typeof log }).__walk = log;
  new MutationObserver(() => log.push({ at: Date.now(), value: element.getAttribute(attribute) }))
    .observe(element, { attributes: true, attributeFilter: [attribute] });
}, name);
const changes = (page: Page) => page.evaluate(() => (window as unknown as { __walk: { at: number; value: string | null }[] }).__walk);

/**
 * The pointer onto an element by its coordinates, in two real moves: the first move after a load has no distance in the
 * browser, and only a pointer that really moves is an action. Not `hover()`: when it retries it scrolls again, this site
 * scrolls smoothly, and the pointer lands wherever the page has carried it (pro-nas-capability.spec.ts).
 */
const pointAt = async (page: Page, locator: Locator) => {
  await locator.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const box = (await locator.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 + 1);
};

/** Fake time in short runs, so that each step's render lands in the log at its own moment */
const run = async (page: Page, ms: number) => {
  for (let left = ms; left > 0; left -= 200) await page.clock.runFor(200);
};

test('/yak-pratsyuiemo cost factors walk one factor per 2200 ms and come to rest', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const root = page.locator('.proc-factors');
  await watch(page, '.proc-factors', 'data-active');
  await root.scrollIntoViewIfNeeded();
  await expect.poll(async () => { await page.clock.runFor(200); return (await changes(page)).length; }, { timeout: 15_000 }).toBeGreaterThan(0);
  const factors = await root.locator('li[data-factor]').count();
  await run(page, STEP_MS * (factors + 1));
  const log = await changes(page);
  expect(log.map(({ value }) => value).filter(Boolean)).toHaveLength(factors);
  expect(log.at(-1)?.value).toBeNull();
  const gaps = log.slice(1, factors).map(({ at }, index) => at - log[index].at);
  expect(Math.min(...gaps)).toBeGreaterThanOrEqual(STEP_MS - 250);
  expect(Math.max(...gaps)).toBeLessThanOrEqual(STEP_MS + 500);
});

test('/pro-nas capability walks at 2200 ms a step; pointing ends it for good', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pro-nas', { waitUntil: 'load' });
  await closeBanner(page);
  const block = page.locator('.about-cap');
  await watch(page, '.about-cap', 'data-cap');
  await page.locator('.cap-fig').scrollIntoViewIfNeeded();
  await expect.poll(async () => { await page.clock.runFor(200); return (await changes(page)).length; }, { timeout: 15_000 }).toBeGreaterThan(0);
  await run(page, STEP_MS + 400);
  const [one, two] = await changes(page);
  expect(two.at - one.at).toBeGreaterThanOrEqual(STEP_MS - 250);
  expect(two.at - one.at).toBeLessThanOrEqual(STEP_MS + 500);
  await pointAt(page, page.locator('.cap-fig'));
  await page.mouse.move(2, 2);
  await page.clock.runFor(STEP_MS * 3);
  expect(await block.getAttribute('data-cap')).toBeNull();
});

test('/pro-nas pointing at the scheme before it is in view keeps the walk from starting', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pro-nas', { waitUntil: 'load' });
  await closeBanner(page);
  const figure = page.locator('.cap-fig');
  // About a third of the scheme over the bottom edge: under the 50 % that starts the walk, and within a pointer's reach
  await figure.evaluate((element) => {
    const { top, height } = element.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + top + height * 0.3 - window.innerHeight, behavior: 'instant' });
  });
  const box = (await figure.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, 880);
  await page.mouse.move(box.x + box.width / 2 + 8, 884);
  await page.mouse.move(2, 2);
  await figure.scrollIntoViewIfNeeded();
  for (let round = 0; round < 6; round += 1) {
    await page.clock.runFor(2000);
    expect(await page.locator('.about-cap').getAttribute('data-cap')).toBeNull();
  }
});

for (const [route, block, read] of [
  ['/pro-nas', '.cap-fig', '.about-cap'],
  ['/yak-pratsyuiemo', '.proc-factors', '.proc-factors'],
] as const) {
  test(`${route}: a block the page scrolls under a resting pointer still walks`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route, { waitUntil: 'load' });
    await closeBanner(page);
    const figure = page.locator(block);
    // The pointer rests where the block's middle will stand; it moves once, on the way there, and never again
    const box = (await figure.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, 450);
    const distance = () => figure.evaluate((element) => {
      const { top, height } = element.getBoundingClientRect();
      return top + height / 2 - window.innerHeight / 2;
    });
    // A wheel, as a person scrolls: the pointer rests and the block comes to it
    for (let left = await distance(); Math.abs(left) > 40; left = await distance()) {
      await page.mouse.wheel(0, Math.sign(left) * Math.min(400, Math.abs(left)));
      await page.waitForTimeout(160);
    }
    await page.waitForTimeout(400);
    await expect.poll(() => figure.evaluate((element) => element.matches(':hover'))).toBe(true);
    const attribute = route === '/pro-nas' ? 'data-cap' : 'data-active';
    const shown = () => page.locator(read).getAttribute(attribute);
    await expect.poll(shown, { timeout: 8000 }).not.toBeNull();
    const first = await shown();
    await expect.poll(shown, { timeout: 4000 }).not.toBe(first);
  });
}

test('/yak-pratsyuiemo a mouse that crosses the change sheets before the first step leaves the whole story on them', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  await closeBanner(page);
  const sheets = page.locator('.cs');
  await sheets.evaluate((element) => {
    const { top } = element.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + top + 300 - window.innerHeight, behavior: 'instant' }); // under half in view: the walk has not started
  });
  await expect(sheets).toHaveAttribute('data-reached', '');
  const box = (await sheets.boundingBox())!;
  await page.mouse.move(300, box.y + 120);
  await page.mouse.move(304, box.y + 124);
  await expect(sheets).toHaveAttribute('data-reached', '1 2 3 4');
});

test('a finger that starts a swipe on the block does not stop the walk; a tap does', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const figure = page.locator('.cap-fig');
  await figure.scrollIntoViewIfNeeded();
  const cap = () => page.locator('.about-cap').getAttribute('data-cap');
  await figure.evaluate((element) => {
    const touch = { bubbles: true, pointerType: 'touch', pointerId: 7 };
    element.dispatchEvent(new PointerEvent('pointerdown', touch));
    element.dispatchEvent(new PointerEvent('pointercancel', touch));
  });
  expect(await firstStep(page, cap)).not.toBeNull();
  await figure.evaluate((element) => {
    const touch = { bubbles: true, pointerType: 'touch', pointerId: 7 };
    element.dispatchEvent(new PointerEvent('pointerdown', touch));
    element.dispatchEvent(new PointerEvent('pointerup', touch));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await expect.poll(cap).toBeNull();
  await page.clock.runFor(STEP_MS * 2);
  expect(await cap()).toBeNull();
});

test('/yak-pratsyuiemo plays one walk at a time', async ({ page }) => {
  // A window tall enough for the factors and the change sheets to be half in view together: measured, not assumed,
  // because the page's own heights follow the window
  await page.setViewportSize({ width: 1440, height: 2400 });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const measure = () => page.evaluate(() => {
    const [factors, sheets] = ['.proc-factors', '.cs'].map((selector) => document.querySelector(selector)!.getBoundingClientRect());
    return { top: factors.top + window.scrollY, height: Math.ceil(sheets.top + sheets.height / 2 - factors.top + 60) };
  });
  const { height } = await measure();
  if (height > 2400) {
    await page.setViewportSize({ width: 1440, height });
    await page.reload({ waitUntil: 'load' });
  }
  const { top } = await measure();
  await page.evaluate((y) => window.scrollTo({ top: y - 20, behavior: 'instant' }), top);
  const inView = await page.evaluate(() => ['.proc-factors', '.cs'].map((selector) => {
    const { top: from, bottom } = document.querySelector(selector)!.getBoundingClientRect();
    return (Math.min(bottom, window.innerHeight) - Math.max(from, 0)) / (bottom - from);
  }));
  expect(Math.min(...inView)).toBeGreaterThanOrEqual(0.5);
  const factors = () => page.locator('.proc-factors').getAttribute('data-active');
  const reached = () => page.locator('.cs').getAttribute('data-reached');
  await firstStep(page, factors);
  const held = await reached();
  for (let round = 0; round < 3; round += 1) {
    expect(await factors()).not.toBeNull();
    await page.clock.runFor(STEP_MS);
    expect(await reached()).toBe(held);
  }
  await page.clock.runFor(STEP_MS * 8);
  expect(await factors()).toBeNull();
  await page.clock.runFor(STEP_MS * 5);
  expect(await reached()).toBe('1 2 3 4');
});

test('/yak-pratsyuiemo nothing loops while the formats are on screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const figure = page.locator('#obsiah .dfmt-figure');
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toHaveAttribute('data-live', 'true');
  await expect(figure.locator('svg.fs')).toHaveAttribute('data-format', 'comprehensive');
  const endless = () => page.evaluate(() => document.getAnimations()
    .filter((animation) => animation.effect?.getTiming().iterations === Infinity)
    .map((animation) => (animation as CSSAnimation).animationName));
  expect(await endless()).toEqual([]);
});

test('/yak-pratsyuiemo a format the browser restored stops the walk', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  // A real press: the browser restores only what a person changed
  await page.locator('input[name="resp-format"][value="subcontract"]').check({ force: true });
  // Back, not a reload: automated Chromium restores a radio only on a history navigation
  await page.goto('/pro-nas', { waitUntil: 'load' });
  await page.goBack({ waitUntil: 'load' });
  const drawing = page.locator('#obsiah svg.fs');
  await drawing.scrollIntoViewIfNeeded();
  await expect(drawing).toHaveAttribute('data-format', 'subcontract');
  await page.clock.runFor(20_000);
  await expect(drawing).toHaveAttribute('data-format', 'subcontract');
});

test('/pro-nas a walk pauses out of view and goes on from the next step', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pro-nas', { waitUntil: 'load' });
  await watch(page, '.about-cap', 'data-cap');
  const figure = page.locator('.cap-fig');
  await figure.scrollIntoViewIfNeeded();
  await expect.poll(async () => { await page.clock.runFor(200); return (await changes(page)).length; }, { timeout: 15_000 }).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(200);
  const before = (await changes(page)).length;
  await run(page, STEP_MS * 3);
  expect((await changes(page)).length).toBe(before);
  await figure.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await run(page, STEP_MS + 400);
  expect((await changes(page)).length).toBe(before + 1);
});

test('/yak-pratsyuiemo keyboard focus on a step ends the change sheets\' walk', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  const sheets = page.locator('.cs');
  await sheets.scrollIntoViewIfNeeded();
  const reached = async () => (await sheets.getAttribute('data-reached')) ?? '';
  await expect.poll(async () => { await page.clock.runFor(300); return reached(); }, { timeout: 15_000 }).toBe('1');
  await page.locator('.cs-steps button').first().focus();
  await page.clock.runFor(STEP_MS * 4);
  expect(await reached()).toBe('1');
});

for (const action of ['pointing at', 'keyboard focus on'] as const) {
  test(`/yak-pratsyuiemo ${action} the format list ends the walk and keeps one format`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
    await closeBanner(page);
    const grid = page.locator('.dfmt-grid');
    const drawing = grid.locator('svg.fs');
    await grid.scrollIntoViewIfNeeded();
    await expect.poll(async () => { await page.clock.runFor(400); return drawing.getAttribute('data-format'); }, { timeout: 15_000 }).toBe('work-package');
    const option = grid.locator('.dfmt-option').last();
    if (action === 'pointing at') {
      await pointAt(page, option);
    } else await option.focus();
    // Mid-walk, on purpose: left alone, the walk comes back to the first format by itself and proves nothing
    await page.clock.runFor(1800);
    await expect(drawing).toHaveAttribute('data-format', 'comprehensive');
    await expect(grid.locator('.dfmt-option').first()).toHaveAttribute('aria-pressed', 'true');
    await page.clock.runFor(3600);
    await expect(drawing).toHaveAttribute('data-format', 'comprehensive');
  });
}

test('/yak-pratsyuiemo a mouse crossing the drawing mid-walk leaves one format on the page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
  await closeBanner(page);
  const grid = page.locator('.dfmt-grid');
  const drawing = grid.locator('svg.fs');
  await grid.scrollIntoViewIfNeeded();
  await expect.poll(async () => { await page.clock.runFor(400); return drawing.getAttribute('data-format'); }, { timeout: 15_000 }).toBe('work-package');
  await pointAt(page, drawing);
  await page.clock.runFor(1800);
  const checked = await page.locator('input[name="resp-format"]:checked').getAttribute('value');
  await expect(drawing).toHaveAttribute('data-format', checked!);
});

for (const [width, height] of [[844, 390], [932, 430]]) {
  test(`/yak-pratsyuiemo at ${width}×${height} half of the change sheets cannot fit: they show the whole story`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
    const sheets = page.locator('.cs');
    await sheets.scrollIntoViewIfNeeded();
    await page.clock.runFor(1000);
    await expect(sheets).toHaveAttribute('data-reached', '1 2 3 4');
    await expect(sheets).not.toHaveAttribute('data-armed', /.*/);
  });
}
