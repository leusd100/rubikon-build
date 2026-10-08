import { expect, test, type Page } from '@playwright/test';
import { openControlGroup } from './configurator.helpers';
import { stubTurnstile } from './turnstile.helpers';

// /angary configurator: what its values say and keep (04.10; steps, scope mode and provenance 07.10–08.10) — a value is
// the visitor's only once answered, numbers keep the decimal comma and their units, a size passing through a smaller one
// costs no gate, door or ridge, and the phone's server markup is already the steps it hydrates into.

const NBSP = '\u00A0';

async function openHangarPage(page: Page) {
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  await essentialCookies.click();
}

/** The ridge is a refinement under «Висота в конику — за потреби», folded until the visitor sets it (07.10) */
async function openRidge(page: Page) {
  const more = page.locator('#hc-dimensions-panel details.hc-more');
  if (!(await more.evaluate((details) => (details as HTMLDetailsElement).open))) await more.locator('summary').click();
  await expect(page.locator('#hc-dimension-ridge')).toBeVisible();
}

async function typeSize(page: Page, field: 'width' | 'length' | 'height' | 'ridge', value: string) {
  await openControlGroup(page, 'dimensions');
  if (field === 'ridge') await openRidge(page);
  const input = page.locator(`#hc-dimension-${field}`);
  await input.fill(value);
  await input.blur();
}

const stampTitle = (page: Page) => page.locator('.hc-stamp-row .hc-summary-title');
const stampFacts = (page: Page) => page.locator('.hc-stamp-row .hc-summary-facts');
/** A row of the stamp: its name (with «з прикладу» beside it while the value is the example's) and its value */
const stampFact = (page: Page, label: string) => stampFacts(page).locator(':scope > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}`) }) });
/** The drawing sheet's title block, «Об’єкт»: «Приклад · …», «Ваш ангар · …» or «Орієнтовно · …» (sheetLabels.ts) */
const sheetObject = (page: Page) => page.locator('.hc-preview-sheet .sheet-cell').filter({ has: page.locator('small', { hasText: 'Об’єкт' }) }).locator('b');
const attachmentCard = (page: Page) => page.locator('form.inquiry-form .inquiry-config-brief');
const costList = (page: Page) => page.locator('#vartist');

test('«Задача» answers alone add the answers; the example’s sizes stay the example’s, also in the lead', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await stubTurnstile(page);
  let configuration = '';
  let dimensions: string | undefined;
  await page.route('**/api/leads', async (route) => {
    const body = route.request().postDataJSON() as { details?: { configuration?: string; dimensions?: string } };
    configuration = body.details?.configuration ?? '';
    dimensions = body.details?.dimensions;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 71, isNew: true }) });
  });
  await openHangarPage(page);
  await expect(stampTitle(page)).toHaveText('Приклад конфігурації');
  await expect(sheetObject(page)).toHaveText('Приклад · 24 × 60 × 8 м');

  await openControlGroup(page, 'need');
  await page.locator('label:has(input[name="hc-purpose"][value="storage"])').click();
  // an answer makes the configuration the visitor's; the sizes nobody touched stay the example's — on the sheet and in
  // the stamp beside them («з прикладу»)
  await expect(stampTitle(page)).toHaveText('Ваша конфігурація');
  await expect(sheetObject(page)).toHaveText('Приклад · 24 × 60 × 8 м');
  await expect(page.locator('.hc-stamp-row .hc-summary-dimensions-status')).toContainText('з прикладу');
  await expect(stampFact(page, 'Задача').locator('dd')).toHaveText('Склад');
  const brief = attachmentCard(page);
  await expect(brief).toContainText('До заявки додано відповіді про об’єкт');
  await brief.getByText('Переглянути параметри', { exact: true }).click();
  await expect(brief.locator('.inquiry-config-brief-sections').getByRole('heading')).toHaveText(['Про об’єкт', 'Не уточнено — значення прикладу', 'Попередні дані']);
  // the form keeps its own «Орієнтовні розміри»: the lead's «Габарити» is not the example's 24 × 60 × 8 м
  const form = page.locator('form.inquiry-form');
  await expect(form.locator('input[type="hidden"][name="dimensions"]')).toHaveCount(0);
  await form.getByText('Додати деталі до заявки', { exact: true }).click();
  await expect(form.getByLabel('Орієнтовні розміри', { exact: true })).toBeVisible();

  await form.getByLabel(/Ваше ім’я/).fill('Іван Петренко');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
  await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Запит надіслано' })).toBeVisible();
  expect(configuration.split('\n').slice(0, 4)).toEqual([
    'Про об’єкт:',
    'Призначення: Склад',
    'Не уточнено клієнтом (значення прикладу на сайті):',
    `Габарити: 24${NBSP}×${NBSP}60${NBSP}×${NBSP}8${NBSP}м`,
  ]);
  expect(configuration).not.toContain('Вибрана конфігурація');
  expect(dimensions ?? '').toBe('');

  // a size of the visitor's own makes the sizes theirs
  await typeSize(page, 'width', '30');
  await expect(sheetObject(page)).toHaveText('Ваш ангар · 30 × 60 × 8 м');
  await expect(page.locator('.hc-stamp-row .hc-summary-dimensions-status')).toHaveCount(0);
});

test('a size field entered and left without typing answers nothing; «Точних розмірів ще немає» is an orientation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  await openControlGroup(page, 'dimensions');
  await page.locator('#hc-dimension-width').focus();
  await page.locator('#hc-dimension-width').blur();
  await expect(stampTitle(page)).toHaveText('Приклад конфігурації');
  await expect(sheetObject(page)).toHaveText('Приклад · 24 × 60 × 8 м');
  await expect(costList(page).locator('.proc-factors')).not.toContainText('У вашій конфігурації');

  await page.getByRole('checkbox', { name: /Точних розмірів ще немає/ }).check();
  await expect(sheetObject(page)).toHaveText('Орієнтовно · 24 × 60 × 8 м');
  await expect(page.locator('.hc-preview-sheet .hc-sheet-readout')).toHaveText('≈ 24 × 60 × 8 м');
  await expect(page.locator('.hc-stamp-row .hc-summary-dimensions-status')).toContainText('орієнтовно · уточнюємо');
  await expect(costList(page)).toContainText('Орієнтовно: 24 × 60 × 8 м — розміри уточнюємо');
});

test('sizes keep the decimal comma and hold their units in the stamp, the cost note and the route', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  await typeSize(page, 'height', '7,5');

  const stamp = page.locator('.hc-stamp-row .hc-summary-dimensions');
  expect(await stamp.textContent()).toBe(['24', '60', '7,5'].join(`${NBSP}×${NBSP}`) + `${NBSP}м`);
  await expect(costList(page)).toContainText('У вашій конфігурації: 24 × 60 × 7,5 м, коник');
  await expect(costList(page)).not.toContainText('7.5');
  await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
  await expect(page.locator('#process li').first()).toContainText('Додано до заявки: 24 × 60 × 7,5 м');
  await expect(page.locator('form.inquiry-form input[type="hidden"][name="dimensions"]')).toHaveValue(`24${NBSP}×${NBSP}60${NBSP}×${NBSP}7,5${NBSP}м`);
});

test('the cost notes speak only of what the visitor answered, never of the example’s defaults', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  const notes = costList(page).locator('.proc-factors');
  // the untouched example: the cost factors stay general
  await expect(notes).not.toContainText('У вашій конфігурації');
  await expect(notes).not.toContainText('У попередній схемі');

  await typeSize(page, 'width', '12');
  await expect(notes).toContainText('У вашій конфігурації: 12 × 60 × 8 м, коник');
  // the insulation, the cladding and the gates nobody touched say nothing
  await expect(notes).not.toContainText('профнастил');
  await expect(notes).not.toContainText('Ворота');
  await expect(notes).not.toContainText('Ви вказали');

  // the example's own insulation pressed again is an answer, in the stamp's words
  await openControlGroup(page, 'envelope');
  await page.locator('#hc-envelope-panel label').filter({ hasText: 'Без утеплення' }).click();
  await expect(notes).toContainText('У вашій конфігурації: без утеплення, профнастил');
  await expect(stampFact(page, 'Утеплення').locator('dd')).toHaveText('Без утеплення');
  await expect(stampFact(page, 'Утеплення')).not.toContainText('з прикладу');
  // the cladding was not answered: still the example's
  await expect(stampFact(page, 'Огородження')).toContainText('з прикладу');

  // walls and roof out of the request: no envelope rows in the stamp, and the note says so
  // «Окремі роботи», clicked as a visitor clicks it: on its label (the drawn square covers the radio itself)
  await openControlGroup(page, 'scope');
  await page.locator('#hc-scope-panel label').filter({ hasText: 'Окремі роботи' }).click();
  await expect(page.getByRole('radio', { name: 'Окремі роботи', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Стіни / огороджувальний контур' }).uncheck();
  await page.getByRole('checkbox', { name: 'Покрівля', exact: true }).uncheck();
  await expect(stampFacts(page)).not.toContainText('Утеплення');
  await expect(stampFacts(page)).not.toContainText('Огородження');
  await expect(notes).toContainText('Стіни й покрівля поза обсягом заявки');
});

test('openings: «одні / двоє», one sign per size, the door placed where it goes, «Без дверей» on one line', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await openHangarPage(page);
  await openControlGroup(page, 'openings');
  await page.getByRole('radiogroup', { name: 'Ворота' }).locator('label').filter({ hasText: /^2$/ }).click();
  await page.locator('label:has(input[name="hc-doors"][value="1"])').click();
  await expect(stampFact(page, 'Ворота').locator('dd')).toHaveText('Двоє стандартних, 4 × 4 м');
  await expect(stampFact(page, 'Двері').locator('dd')).toHaveText('Одні службові, 1 × 2,1 м');

  const doorNote = page.locator('.hc-door-field .hc-field-note');
  await expect(doorNote).toContainText('поруч із воротами, поза їхнім прорізом');
  await page.getByRole('radiogroup', { name: 'Ворота' }).locator('label').filter({ hasText: /^0$/ }).click();
  await expect(doorNote).toContainText('у торцевій стіні, без перетину з колонами');
  await expect(doorNote).not.toContainText('воротами');

  // «Без дверей» used to break into two lines in a 68 px tile
  const chips = page.locator('.hc-door-options .hc-option-card span');
  const [none, one] = await chips.evaluateAll((spans) => spans.map((span) => span.getBoundingClientRect().height));
  expect(none).toBe(one);
  expect(await chips.first().evaluate((span) => span.getClientRects().length)).toBe(1);
});

test('a size passing through a smaller one keeps the gates, the door and the ridge the visitor chose', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  await openControlGroup(page, 'openings');
  const gates = page.getByRole('radiogroup', { name: 'Ворота' });
  await gates.locator('label').filter({ hasText: /^2$/ }).click();
  await page.locator('label:has(input[name="hc-gate-type"])').filter({ hasText: 'Для заїзду техніки' }).click();
  await page.locator('label:has(input[name="hc-doors"][value="1"])').click();

  // at 14 m both gates fit but the door does not; at 12 m one gate does, and the door beside it: shown, said, held
  const held = page.locator('[data-group="openings"] .hc-field-note-warning');
  await typeSize(page, 'width', '14');
  await openControlGroup(page, 'openings');
  await expect(page.locator('label:has(input[name="hc-gates"]:checked)')).toHaveText('2');
  await expect(page.locator('input[name="hc-doors"]:checked')).toHaveValue('0');
  await expect(held).toContainText('Для дверей немає місця');
  await typeSize(page, 'width', '12');
  await openControlGroup(page, 'openings');
  await expect(page.locator('label:has(input[name="hc-gates"]:checked)')).toHaveText('1');
  await expect(page.locator('input[name="hc-doors"]:checked')).toHaveValue('1');
  await expect(held).toContainText(`Ворота 5${NBSP}×${NBSP}5${NBSP}м у такій кількості не вміщуються за ширини 12${NBSP}м.`);
  await expect(held).toContainText('Ваш вибір повернеться');
  // the stamp (and the lead) name the gates asked for and why the scheme does not draw them (08.10)
  await expect(stampFact(page, 'Ворота').locator('dd')).toHaveText('Двоє для заїзду техніки, 5 × 5 м — за ширини 12 м у схемі не вміщуються');
  await typeSize(page, 'width', '24');
  await expect(stampFact(page, 'Ворота').locator('dd')).toHaveText('Двоє для заїзду техніки, 5 × 5 м');
  await expect(stampFact(page, 'Двері').locator('dd')).toHaveText('Одні службові, 1 × 2,1 м');
  await expect(page.locator('[data-group="openings"] .hc-field-note-warning')).toHaveCount(0);

  // typed key by key, «5,5» passes «5», where this gate does not fit — the type is still the visitor's at 5,5
  await page.locator('#hc-dimension-height').fill('');
  await page.locator('#hc-dimension-height').pressSequentially('5,5');
  await page.locator('#hc-dimension-height').blur();
  await expect(page.locator('label:has(input[name="hc-gate-type"]:checked)')).toContainText('Для заїзду техніки');
  await typeSize(page, 'height', '8');

  // the ridge: 11 m, a wall raised past it and lowered again
  await typeSize(page, 'ridge', '11');
  await typeSize(page, 'height', '12');
  await typeSize(page, 'height', '8');
  await expect(page.locator('#hc-dimension-ridge')).toHaveValue('11');
});

test('the ridge hint says when the sizes hold the ridge, and the span rule can be had back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  const ridge = page.locator('#hc-dimension-ridge');
  const hint = page.locator('#hc-dimension-ridge-hint');
  const reset = page.getByRole('button', { name: 'Підбирати ухил за шириною' });
  await expect(reset).toHaveCount(0);

  await typeSize(page, 'ridge', '11,5');
  await expect(hint).toContainText('Коник 11,5 м · ухил ≈ 16° (29 %) — ваше значення');
  await typeSize(page, 'height', '4');
  // held at the range's top, and not called the visitor's
  await expect(ridge).toHaveValue('8,3');
  await expect(hint).toContainText('Коник 8,3 м · ухил ≈ 20° (36 %) — найвищий для цієї ширини й висоти стін. Ваші 11,5 м повернуться');
  await expect(hint).not.toContainText('ваше значення');
  await typeSize(page, 'height', '8');
  await expect(ridge).toHaveValue('11,5');

  await reset.click();
  await expect(ridge).toHaveValue('10,6');
  await expect(hint).toContainText('Поки ви не задали коник самі');
  await expect(reset).toHaveCount(0);
  // the way back leaves the field open with the new value in sight, and the focus on it (08.10: the fold closed and the
  // focus fell to the page)
  await expect(ridge).toBeVisible();
  await expect(hint).toBeVisible();
  await expect(ridge).toBeFocused();
  // typing the span rule's own value is the span rule again: it follows the width
  await typeSize(page, 'ridge', '12');
  await typeSize(page, 'ridge', '10,6');
  await expect(hint).toContainText('Поки ви не задали коник самі');
  await typeSize(page, 'width', '30');
  await expect(ridge).toHaveValue('11');
});

test('the controls speak plainly: «Ще не знаю» takes an answer back, clamp notes, slider values, step names', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);

  // «Для чого ангар?» is a radio group with an answer of its own for «not yet» (07.10): Space chooses, and pressed again
  // keeps the answer, as a radio button does; «Ще не знаю» takes it back, and the stamp is the example's again
  await openControlGroup(page, 'need');
  const storage = page.locator('input[name="hc-purpose"][value="storage"]');
  await storage.focus();
  await page.keyboard.press('Space');
  await expect(storage).toBeChecked();
  await expect(stampTitle(page)).toHaveText('Ваша конфігурація');
  await page.keyboard.press('Space');
  await expect(storage).toBeChecked();
  await page.locator('#hc-need-panel label').filter({ hasText: 'Ще не знаю' }).click();
  await expect(storage).not.toBeChecked();
  await expect(page.locator('input[name="hc-purpose"][value=""]')).toBeChecked();
  await expect(stampTitle(page)).toHaveText('Приклад конфігурації');

  // a typed size the field had to change says so — and past the largest offered, where a larger hangar goes
  await openControlGroup(page, 'dimensions');
  const width = page.locator('#hc-dimension-width');
  await width.fill('500');
  await width.blur();
  await expect(width).toHaveValue('50');
  await expect(page.locator('#hc-dimension-width-note')).toHaveText(`У конфігураторі — до 50${NBSP}м. Більший розмір вкажіть у заявці.`);
  await expect(width).toHaveAccessibleDescription(/Від 10 до 50\sм\.\s+У конфігураторі — до 50\sм\. Більший розмір вкажіть у заявці\./);
  await expect(page.locator('#hc-dimensions-panel')).toContainText('Більший ангар? Вкажіть розміри в заявці');
  await width.fill('40');
  await expect(page.locator('#hc-dimension-width-note')).toHaveText('');
  await expect(page.locator('#hc-dimensions-panel')).not.toContainText('Більший ангар?');

  // sliders are named by their label and read their value in metres
  const widthSlider = page.locator('#hc-dimensions-panel input[type="range"]').first();
  await expect(widthSlider).toHaveAccessibleName('Ширина');
  await expect(widthSlider).toHaveAttribute('aria-valuetext', '40 м');

  // the steps are named for what they hold; the arrow-only «back» says where it goes
  await expect(page.getByRole('tab')).toHaveText(['1Задача', '2Габарити', '3Стіни й ворота', '4Каркас', '5Обсяг']);
  const panel = page.locator('#hc-step-size');
  await expect(panel.getByRole('button', { name: 'Назад: Задача', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Далі: Стіни й ворота' })).toBeVisible();
  // the gate types carry their sizes in their names, the words the stamp uses
  await openControlGroup(page, 'openings');
  await expect(page.getByRole('radiogroup', { name: 'Тип воріт' }).locator('label')).toHaveText([
    `Стандартні · 4${NBSP}×${NBSP}4${NBSP}м`,
    `Для заїзду техніки · 5${NBSP}×${NBSP}5${NBSP}м`,
  ]);
});

test('the stamp’s thumbnail draws the truss the drawings draw: the centre column on a node, a vertical under the ridge', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the drawing is viewport-independent');
  await openHangarPage(page);
  const paths = await page.locator('.hc-stamp-row .hc-sketch-frame').evaluateAll((elements) => elements.map((element) => element.getAttribute('d') ?? ''));
  expect(paths).toHaveLength(2);
  const [frame, web] = paths;
  // the centre column: «M x,54.0V z» — its foot and its top; the web meets the bottom chord at that x
  const column = /M([\d.]+),54\.0V([\d.]+)$/.exec(frame);
  expect(column).not.toBeNull();
  const [, x, eave] = column!;
  expect(web.split('M')[1].split('L')).toContain(`${x},${eave}`);
  // 24 m: six panels a half, eleven web points between the heels, and the ridge vertical from the same node
  expect(web.split('M')[1].split('L')).toHaveLength(11);
  expect(web).toContain(`M${x},${eave}V`);
});

test.describe('on a phone before hydration', () => {
  test('the server markup is already the steps, the first one open, so nothing moves and a link lands on its heading', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
    await page.setViewportSize({ width: 390, height: 844 });
    // where the tabs and the open step lie, the step's entry animation (6 px) run to its end; a hidden step has no box
    const controlBoxes = () => page.locator('#configurator :is([role="tablist"], .hc-step-panel)').evaluateAll((elements) => elements.map((element) => {
      for (const animation of element.getAnimations()) animation.finish();
      if ((element as HTMLElement).offsetParent === null) return null;
      const box = element.getBoundingClientRect();
      return [Math.round(box.top + window.scrollY), Math.round(box.height)];
    }));

    // the scripts held back: the head script has set data-theme, React has not run
    await page.route(/\/_next\/static\/.*\.js(\?|$)/, (route) => route.abort());
    await page.goto('/angary', { waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
    await expect(page.locator('#configurator [role="tab"]')).toHaveCount(5);
    await expect(page.locator('#hc-step-task-tab')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#hc-step-task')).toBeVisible();
    for (const step of ['size', 'shell', 'frame', 'check']) await expect(page.locator(`#hc-step-${step}`)).toBeHidden();
    const before = await controlBoxes();
    await page.unroute(/\/_next\/static\/.*\.js(\?|$)/);

    await page.goto('/angary', { waitUntil: 'load' });
    // hydrated: the tabs answer
    await openControlGroup(page, 'dimensions');
    await openControlGroup(page, 'need');
    expect(await controlBoxes()).toEqual(before);

    // a cold entry by the link (a new page: on this one it would be a same-document jump): it used to land 1316 px past
    const linked = await page.context().newPage();
    await linked.setViewportSize({ width: 390, height: 844 });
    await linked.goto('/angary#vartist', { waitUntil: 'load' });
    await expect.poll(async () => {
      const top = await linked.locator('#angary-cost-title').evaluate((title) => title.getBoundingClientRect().top);
      return top > 0 && top < 844 / 2;
    }, { timeout: 5_000 }).toBe(true);
  });
});
