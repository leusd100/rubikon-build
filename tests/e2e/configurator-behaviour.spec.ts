import { expect, test, type Locator, type Page } from '@playwright/test';
import { openControlGroup, openThree } from './configurator.helpers';

// Iteration 4 of the configurator audit, «Ясно й рівно» (10.10): how the block behaves — its jumps and the history, the
// focus, what a screen reader and Windows High Contrast are told, «Почати заново», and the cost of a slider step.

async function openHangarPage(page: Page) {
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  await essentialCookies.click();
}

const attachmentCard = (page: Page) => page.locator('form.inquiry-form .inquiry-config-brief');
const stampSizes = (page: Page) => page.locator('.hc-stamp-row .hc-summary-dimensions');
/** The last step's own jump to the stamp, whatever its words («До зведення ↓», «До підсумку ↓») */
const toStamp = (page: Page) => page.locator('#hc-step-check a.hc-step-next');

// Audit F161: the jumps inside the block — the last step's to the stamp, «Обговорити цю конфігурацію» to the form,
// «Змінити у конфігураторі ↑» back to the steps — each added a history entry, and Back scrolled between them before it
// left /angary (3 presses at 1440 px, 2 on a phone). Audit F129: the stamp takes the focus the jump brings.
async function walkTheBlock(page: Page) {
  await openHangarPage(page);
  const entries = await page.evaluate(() => window.history.length);
  await openControlGroup(page, 'scope');
  await toStamp(page).click();
  await expect(page).toHaveURL(/#hc-stamp$/);
  const stamp = page.locator('#hc-stamp');
  await expect(stamp).toBeFocused();
  await expect(stamp).toHaveCSS('outline-style', 'none');
  // it lands under the header, as the browser's own jump did (scroll-margin-top)
  await expect.poll(() => stamp.evaluate((element) => Math.round(element.getBoundingClientRect().top)), { timeout: 5_000 })
    .toBe(await stamp.evaluate((element) => Math.round(Number.parseFloat(getComputedStyle(element).scrollMarginTop))));
  // the next Tab goes on from the stamp, to its own «Обговорити»
  await page.keyboard.press('Tab');
  await expect(stamp.getByRole('link', { name: /Обговорити цю конфігурацію/ })).toBeFocused();
  await stamp.getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
  await expect(page).toHaveURL(/#inquiry$/);
  const card = attachmentCard(page);
  await expect(card).toBeFocused();
  await card.locator('.inquiry-config-brief-toggle').click();
  await card.getByRole('link', { name: 'Змінити у конфігураторі ↑' }).click();
  await expect(page).toHaveURL(/#configurator$/);
  await expect(page.locator('#hc-step-check-tab')).toBeFocused();
  expect(await page.evaluate(() => window.history.length)).toBe(entries);
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
}

test('the block’s own jumps keep the history: one Back leaves /angary, the stamp takes the focus', async ({ page }) => {
  await walkTheBlock(page);
});

test('the block’s own jumps keep the history at 1180 px too, where «Обговорити» lands on the brief by itself', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport runs once');
  await page.setViewportSize({ width: 1180, height: 800 });
  await walkTheBlock(page);
});

// Audit F130: on a phone a tab shows its number alone, and the number was hidden from the name — «Габарити», so «Натисни 2»
// found nothing — and an answered step was told by its copper rim alone
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`a step tab is named with its number, and an answered one says so, at ${viewport.width} px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewports run once');
    await page.setViewportSize(viewport);
    await openHangarPage(page);
    await openControlGroup(page, 'need');
    await page.locator('#hc-step-task .hc-chips .hc-option-card').first().click();
    await openControlGroup(page, 'dimensions');
    const tabs = page.getByRole('tablist', { name: 'Кроки конфігурації' }).getByRole('tab');
    await expect(tabs).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      const tab = tabs.nth(index);
      const title = (await tab.locator('.hc-step-title').textContent())!.trim();
      const words = `${index + 1} ${title}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // answered and not open: step 1 only
      const name = new RegExp(index === 0 ? `^${words}\\s*, обрано$` : `^${words}$`);
      await expect(page.getByRole('tab', { name }), title).toHaveCount(1);
    }
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });
}

// Audit F131: «Згорнути» (a phone, aria-expanded) and «Сховати розміри» (3D, aria-pressed) said their state twice — the
// words and the attribute, «Згорнути, розгорнуто». The words alone say it now.
test('«Сховати розміри» says its state in its words alone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the 3D sizes are not offered on a phone');
  await openHangarPage(page);
  await openThree(page);
  const hide = page.getByRole('button', { name: 'Сховати розміри', exact: true });
  await expect(hide).toBeVisible();
  await expect(hide).not.toHaveAttribute('aria-pressed');
  await hide.click();
  const show = page.getByRole('button', { name: 'Показати розміри', exact: true });
  await expect(show).toBeFocused();
  await expect(show).not.toHaveAttribute('aria-pressed');
});

// Audit F77: Windows High Contrast takes fills away, and the open step, a pressed «Що показати» item or node and a chosen
// answer were told by their fill alone. In forced colours they keep a mark, in the system's selection colour.
test('in forced colours the open step, a pressed frame item and node, and a chosen answer stay marked', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the colour contract is viewport-independent');
  const fill = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).backgroundColor);
  const marks = async () => {
    await openControlGroup(page, 'need');
    await page.locator('#hc-step-task .hc-chips .hc-option-card').first().click();
    const chips = page.locator('#hc-step-task .hc-chips').first().locator('.hc-option-card span');
    await openControlGroup(page, 'space');
    await page.locator('.hc-frame-item').nth(1).click();
    await page.locator('.hc-frame-node').first().click();
    await page.mouse.move(1, 1);
    return {
      tab: [await fill(page.locator('#hc-step-frame-tab .hc-step-number')), await fill(page.locator('#hc-step-task-tab .hc-step-number'))],
      chip: [await fill(chips.first()), await fill(chips.nth(1))],
      item: [await fill(page.locator('.hc-frame-item[aria-pressed="true"]')), await fill(page.locator('.hc-frame-item[aria-pressed="false"]').first())],
      node: [await fill(page.locator('.hc-frame-node[aria-pressed="true"]')), await fill(page.locator('.hc-frame-node[aria-pressed="false"]').first())],
    };
  };
  await page.emulateMedia({ forcedColors: 'active' });
  await openHangarPage(page);
  const forced = await marks();
  for (const [what, [chosen, other]] of Object.entries(forced)) expect(chosen, what).not.toBe(other);
  // the open step keeps its rule under the tab, too: it was painted in the page's own Canvas
  const rule = await page.locator('#hc-step-frame-tab').evaluate((tab) => getComputedStyle(tab, '::after').backgroundColor);
  expect(rule).not.toBe(await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor));
  // outside the mode nothing changed: the chosen ones are filled with the text colour, as before (a fresh page: pressed
  // again, a frame item or a node goes back to the whole frame)
  await page.emulateMedia({ forcedColors: 'none' });
  await page.reload({ waitUntil: 'load' });
  const text = await page.locator('body').evaluate((body) => getComputedStyle(body).color);
  const normal = await marks();
  for (const [what, [chosen]] of Object.entries(normal)) if (what !== 'node' && what !== 'item') expect(chosen, what).toBe(text);
  // the «Що показати» list is a drawing's legend since 10.10 (audit F29): the shown item is marked by a copper rule on
  // its left, not filled
  const leftRule = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).borderLeftColor);
  expect(await leftRule(page.locator('.hc-frame-item[aria-pressed="true"]'))).not.toBe(await leftRule(page.locator('.hc-frame-item[aria-pressed="false"]').first()));
});

// Audit F64: «Почати заново» threw a restored draft away for good with one press; the line went, and the focus with it.
test('«Почати заново» can be taken back until the visitor changes something or opens another step', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the draft contract is viewport-independent');
  await openHangarPage(page);
  await page.evaluate(() => window.localStorage.setItem('rubikon-hangar-draft', JSON.stringify({
    v: 1, savedAt: Date.now(), attached: false, step: 1,
    configuration: { dimensions: { width: 30, length: 60, height: 8 }, confirmed: ['dimensions'] },
  })));
  await page.reload({ waitUntil: 'load' });
  const note = page.locator('#configurator .hc-draft-note');
  const stored = () => page.evaluate(() => JSON.parse(window.localStorage.getItem('rubikon-hangar-draft') ?? 'null')?.configuration.dimensions.width ?? null);
  await expect(note).toContainText('Відновлено вашу конфігурацію.');
  await expect(stampSizes(page)).toHaveText(/^30\s×\s60\s×\s8\s?м$/);

  await note.getByRole('button', { name: 'Почати заново', exact: true }).focus();
  await page.keyboard.press('Enter');
  // the same line, the way back in it, the focus kept there
  const back = note.getByRole('button', { name: 'Повернути мою конфігурацію', exact: true });
  await expect(note).toHaveText(/^Показано приклад\.\s+Повернути мою конфігурацію$/);
  await expect(back).toBeFocused();
  await expect(stampSizes(page)).toHaveText(/^24\s×\s60\s×\s8\s?м$/);
  await expect.poll(stored).toBeNull();

  await page.keyboard.press('Enter');
  await expect(stampSizes(page)).toHaveText(/^30\s×\s60\s×\s8\s?м$/);
  await expect(page.locator('#hc-step-size-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(note.getByRole('button', { name: 'Почати заново', exact: true })).toBeFocused();
  await expect.poll(stored).toBe(30);

  // another step: the line goes, with the way back
  await note.getByRole('button', { name: 'Почати заново', exact: true }).click();
  await expect(back).toBeVisible();
  await openControlGroup(page, 'dimensions');
  await expect(note).toHaveCount(0);

  // …and so it does after a change
  await page.reload({ waitUntil: 'load' });
  await expect(note).toHaveCount(0);
  await page.evaluate(() => window.localStorage.setItem('rubikon-hangar-draft', JSON.stringify({
    v: 1, savedAt: Date.now(), attached: false, step: 0,
    configuration: { dimensions: { width: 30, length: 60, height: 8 }, confirmed: ['dimensions'] },
  })));
  await page.reload({ waitUntil: 'load' });
  await note.getByRole('button', { name: 'Почати заново', exact: true }).click();
  await expect(back).toBeVisible();
  await page.locator('#hc-step-task .hc-chips .hc-option-card').first().click();
  await expect(note).toHaveCount(0);
});

// Audit F61 (08.10): typed past the span rule's own value the ridge lost its digits — 17 × 8 m, whose rule gives 10 m,
// kept 10 of «10,5» — and the slider's arrows stuck on it. Fixed with #158 (the fold is the visitor's); kept here.
test('the ridge keeps what is typed through the span rule’s value, and its arrows step through it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  await openControlGroup(page, 'dimensions');
  await page.locator('#hc-dimension-width').fill('17');
  await page.locator('#hc-dimension-width').blur();
  const fold = page.locator('#hc-dimensions-panel details.hc-more');
  await fold.locator('summary').click();
  const ridge = page.locator('#hc-dimension-ridge');
  await expect(ridge).toHaveValue('10');
  await ridge.click();
  await ridge.press('ControlOrMeta+a');
  await ridge.pressSequentially('10,5');
  await expect(ridge).toHaveValue('10,5');
  await expect(ridge).toBeFocused();
  await ridge.blur();
  await expect(ridge).toHaveValue('10,5');
  const slider = fold.locator('input[type="range"]');
  await ridge.fill('10,2');
  await ridge.blur();
  await slider.focus();
  for (const value of ['10.1', '10', '9.9']) {
    await slider.press('ArrowLeft');
    await expect(slider).toHaveValue(value);
  }
  for (const value of ['10', '10.1']) {
    await slider.press('ArrowRight');
    await expect(slider).toHaveValue(value);
  }
  await expect(fold).toHaveJSProperty('open', true);
});

// Audit F80/F79: each step of a size slider built 107 number formatters (toLocaleString with options builds one per
// call), and on a slower phone the drawing fell behind the finger. They are made once now (formatNumber.ts).
test('a size slider’s step builds no number formatter', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the cost is viewport-independent');
  await page.addInitScript(() => {
    const counts = { made: 0 };
    (window as unknown as { formatters: typeof counts }).formatters = counts;
    const Original = Intl.NumberFormat;
    class Counted extends Original {
      constructor(...args: ConstructorParameters<typeof Intl.NumberFormat>) {
        super(...args);
        counts.made += 1;
      }
    }
    Intl.NumberFormat = Counted as typeof Intl.NumberFormat;
    const toLocaleString = Number.prototype.toLocaleString;
    Number.prototype.toLocaleString = function count(this: number, ...args: Parameters<typeof toLocaleString>) {
      counts.made += 1;
      return toLocaleString.apply(this, args);
    };
  });
  await openHangarPage(page);
  await openControlGroup(page, 'dimensions');
  const slider = page.locator('#hc-dimensions-panel input[type="range"]').first();
  await slider.focus();
  // a first step makes whatever is made once
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('25');
  const made = () => page.evaluate(() => (window as unknown as { formatters: { made: number } }).formatters.made);
  const before = await made();
  for (let step = 0; step < 10; step += 1) await slider.press('ArrowRight');
  await expect(slider).toHaveValue('35');
  await expect(stampSizes(page)).toHaveText(/^35\s×\s60\s×\s8\s?м$/);
  expect(await made()).toBe(before);
});
