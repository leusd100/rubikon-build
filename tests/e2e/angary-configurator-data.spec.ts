import { expect, test, type Page } from '@playwright/test';
import { openControlGroup } from './configurator.helpers';
import { stubTurnstile } from './turnstile.helpers';

// /angary configurator: what its values say and keep (04.10) — the example is never the visitor's choice, numbers keep
// the decimal comma and their units, a size passing through a smaller one costs no gate, door or ridge, and the phone's
// server markup is already folded like the accordion.

const NBSP = ' ';

async function openHangarPage(page: Page) {
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  await essentialCookies.click();
}

async function typeSize(page: Page, field: 'width' | 'length' | 'height' | 'ridge', value: string) {
  await openControlGroup(page, 'dimensions');
  const input = page.locator(`#hc-dimension-${field}`);
  await input.fill(value);
  await input.blur();
}

const stampTitle = (page: Page) => page.locator('.hc-stamp-row .hc-summary-title');
const stampFacts = (page: Page) => page.locator('.hc-stamp-row .hc-summary-facts');
const attachmentCard = (page: Page) => page.locator('form.inquiry-form .inquiry-config-brief');
const costList = (page: Page) => page.locator('#vartist');

test('«Об’єкт» answers alone add the answers; the example’s sizes stay the defaults, also in the lead', async ({ page }, testInfo) => {
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

  await page.locator('label:has(input[name="hc-purpose"][value="storage"])').click();
  // the drawings still say «Приклад», and so does the stamp: answering «Для чого ангар?» draws nothing new
  await expect(stampTitle(page)).toHaveText('Приклад конфігурації');
  const brief = attachmentCard(page);
  await expect(brief).toContainText('До заявки додано відповіді про об’єкт');
  await brief.getByText('Переглянути параметри', { exact: true }).click();
  await expect(brief.getByRole('heading')).toHaveText(['Про об’єкт', 'Базові параметри (за замовчуванням)', 'Попередні дані']);
  // the form keeps its own «Орієнтовні розміри»: the lead's «Габарити» is not the example's 24 × 60 × 8 м
  const form = page.locator('form.inquiry-form');
  await expect(form.locator('input[type="hidden"][name="dimensions"]')).toHaveCount(0);
  await form.getByText('Додати параметри об’єкта', { exact: true }).click();
  await expect(form.getByLabel('Орієнтовні розміри', { exact: true })).toBeVisible();

  await form.getByLabel(/Ваше ім’я/).fill('Іван Петренко');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
  await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(form.locator('.inquiry-status')).toContainText('Дякуємо! Запит надіслано');
  expect(configuration.split('\n').slice(0, 3)).toEqual([
    'Про об’єкт:',
    'Призначення: Склад',
    'Базова конфігурація (параметри за замовчуванням):',
  ]);
  expect(configuration).not.toContain('Вибрана конфігурація');
  expect(dimensions ?? '').toBe('');

  // a size of the visitor's own makes it theirs
  await typeSize(page, 'width', '30');
  await expect(stampTitle(page)).toHaveText('Ви обрали');
});

test('sizes keep the decimal comma and hold their units in the stamp, the cost note and the route', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  await typeSize(page, 'height', '7,5');

  const stamp = page.locator('.hc-stamp-row .hc-summary-dimensions');
  expect(await stamp.textContent()).toBe(['24', '60', '7,5'].join(`${NBSP}×${NBSP}`) + `${NBSP}м`);
  await expect(costList(page)).toContainText('У вашій конфігурації: 24 × 60 × 7,5 м');
  await expect(costList(page)).not.toContainText('7.5');
  await page.locator('.hc-summary').getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
  await expect(page.locator('#process li').first()).toContainText('Додано до заявки: 24 × 60 × 7,5 м · Холодний');
  await expect(page.locator('form.inquiry-form input[type="hidden"][name="dimensions"]')).toHaveValue(`24${NBSP}×${NBSP}60${NBSP}×${NBSP}7,5${NBSP}м`);
});

test('the cost notes describe the configuration without crediting the visitor with its defaults', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  await typeSize(page, 'width', '12');
  await expect(costList(page)).toContainText('У вашій конфігурації: холодний контур, профнастил');
  await expect(costList(page)).toContainText('Ворота: одні стандартні, 4 × 4 м');
  await expect(costList(page)).not.toContainText('Ви вказали');

  // walls and roof out of the request: the contour is too, in the stamp and in the note
  await page.getByRole('checkbox', { name: 'Стіни / огороджувальний контур' }).uncheck();
  await page.getByRole('checkbox', { name: 'Покрівля', exact: true }).uncheck();
  await expect(stampFacts(page)).toContainText('КонтурПоза обсягом заявки');
  await expect(costList(page)).toContainText('Стіни й покрівля поза обсягом заявки');
});

test('openings: «одні / двоє», one sign per size, the door placed where it goes, «Без дверей» on one line', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await openHangarPage(page);
  await openControlGroup(page, 'openings');
  await page.getByRole('radiogroup', { name: 'Ворота' }).locator('label').filter({ hasText: /^2$/ }).click();
  await page.locator('label:has(input[name="hc-doors"][value="1"])').click();
  await expect(page.locator('[data-group="openings"] .hc-group-value')).toHaveText('двоє воріт · одні двері');
  await expect(stampFacts(page)).toContainText('ВоротаДвоє стандартних, 4 × 4 м');
  await expect(stampFacts(page)).toContainText('ДверіОдні службові, 1 × 2,1 м');

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
  const gates = page.getByRole('radiogroup', { name: 'Ворота' });
  await gates.locator('label').filter({ hasText: /^2$/ }).click();
  await page.locator('label:has(input[name="hc-gate-type"])').filter({ hasText: 'Для заїзду техніки' }).click();
  await page.locator('label:has(input[name="hc-doors"][value="1"])').click();

  // at 14 m both gates fit but the door does not; at 12 m one gate does, and the door beside it: shown, said, held
  const held = page.locator('[data-group="openings"] .hc-field-note-warning');
  await typeSize(page, 'width', '14');
  await expect(page.locator('label:has(input[name="hc-gates"]:checked)')).toHaveText('2');
  await expect(page.locator('input[name="hc-doors"]:checked')).toHaveValue('0');
  await expect(held).toContainText('Для дверей немає місця');
  await typeSize(page, 'width', '12');
  await expect(page.locator('label:has(input[name="hc-gates"]:checked)')).toHaveText('1');
  await expect(page.locator('input[name="hc-doors"]:checked')).toHaveValue('1');
  await expect(held).toContainText('Обрані ворота не поміщаються');
  await expect(held).toContainText('Ваш вибір повернеться');
  await expect(stampFacts(page)).toContainText('ВоротаОдні для заїзду техніки, 5 × 5 м');
  await typeSize(page, 'width', '24');
  await expect(stampFacts(page)).toContainText('ВоротаДвоє для заїзду техніки, 5 × 5 м');
  await expect(stampFacts(page)).toContainText('ДверіОдні службові');
  await expect(page.locator('[data-group="openings"] .hc-field-note-warning')).toHaveCount(0);

  // typed key by key, «5,5» passes «5», where this gate does not fit — the type is still the visitor's at 5,5
  await page.locator('#hc-dimension-height').fill('');
  await page.locator('#hc-dimension-height').pressSequentially('5,5');
  await page.locator('#hc-dimension-height').blur();
  await expect(page.locator('label:has(input[name="hc-gate-type"]:checked)')).toHaveText('Для заїзду техніки');
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
  // typing the span rule's own value is the span rule again: it follows the width
  await typeSize(page, 'ridge', '12');
  await typeSize(page, 'ridge', '10,6');
  await expect(hint).toContainText('Поки ви не задали коник самі');
  await typeSize(page, 'width', '30');
  await expect(ridge).toHaveValue('11');
});

test('the controls speak plainly: keyboard take-back, clamp notes, slider values, topic names', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);

  // «Для чого ангар?» has no «Ще не знаю»: Space on the chosen chip takes it back, as a second click does
  const storage = page.locator('input[name="hc-purpose"][value="storage"]');
  await storage.focus();
  await page.keyboard.press('Space');
  await expect(storage).toBeChecked();
  await page.keyboard.press('Space');
  await expect(storage).not.toBeChecked();

  // a typed size the field had to change says so
  const width = page.locator('#hc-dimension-width');
  await width.fill('500');
  await width.blur();
  await expect(width).toHaveValue('50');
  await expect(page.locator('#hc-dimension-width-note')).toHaveText('Найбільше можливе значення — 50 м.');
  await expect(width).toHaveAccessibleDescription(/Від 10 до 50\sм\.\s+Найбільше можливе значення — 50\sм\./);
  await width.fill('40');
  await expect(page.locator('#hc-dimension-width-note')).toHaveText('');

  // sliders are named by their label and read their value in metres
  const widthSlider = page.locator('#hc-dimensions-panel input[type="range"]').first();
  await expect(widthSlider).toHaveAccessibleName('Ширина');
  await expect(widthSlider).toHaveAttribute('aria-valuetext', '40 м');

  // each «Чому це важливо» says what it explains; the drawn «+» is not part of a name
  await expect(page.locator('.hc-why[data-why="openings"] > summary')).toHaveAccessibleName('Чому це важливо — прорізи');
  await expect(page.locator('.hc-why[data-why="contour"] > summary')).toHaveAccessibleName('Чому це важливо — контур будівлі');
  await expect(page.locator('.hc-why[data-why="openings"]')).toContainText('Ворота для заїзду техніки');
  await expect(page.locator('.hc-why[data-why="openings"]')).not.toContainText('Великі ворота');
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
  test('the server markup is folded like the accordion, so nothing moves and a link lands on its heading', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
    await page.setViewportSize({ width: 390, height: 844 });
    const groupBoxes = () => page.locator('#configurator .hc-control-group').evaluateAll((groups) => groups.map((group) => {
      const box = group.getBoundingClientRect();
      return [Math.round(box.top + window.scrollY), Math.round(box.height)];
    }));

    // the scripts held back: the head script has set data-theme, React has not run
    await page.route(/\/_next\/static\/.*\.js(\?|$)/, (route) => route.abort());
    await page.goto('/angary', { waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
    await expect(page.locator('#configurator .hc-group-toggle')).toHaveCount(0);
    await expect(page.locator('#hc-object-panel')).toBeVisible();
    await expect(page.locator('#hc-dimensions-panel')).toBeHidden();
    const before = await groupBoxes();
    await page.unroute(/\/_next\/static\/.*\.js(\?|$)/);

    await page.goto('/angary', { waitUntil: 'load' });
    await expect(page.locator('#configurator .hc-controls')).toHaveAttribute('data-accordion', '');
    expect(await groupBoxes()).toEqual(before);

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
