import { expect, test, type Page } from '@playwright/test';

// «Де ваш об’єкт?» on the region block (/pro-nas and /napryamky, owner 08.11): the example until the visitor chooses, a
// town chosen from the list or on the map says its straight-line kilometres, «Вказати в заявці» carries the place into
// the form's «Місто або область» (unfolding «Додати параметри об’єкта», and the folded form on a phone) and lands on it.
// The visitor's own words in the field are never replaced. A point past the boundary says so and offers no carry.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

/** A point of the map's drawing (its viewBox) as a place on the page, for a real click */
async function pagePoint(page: Page, x: number, y: number) {
  return page.locator('.region-block svg.arm').evaluate((svg, [px, py]) => {
    const point = new DOMPoint(px, py).matrixTransform((svg as SVGSVGElement).getScreenCTM()!);
    return { x: point.x, y: point.y };
  }, [x, y] as const);
}

for (const path of ['/pro-nas', '/napryamky']) {
  test(`${path}: a town chosen from the list goes into the form`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' });
    const block = page.locator('.region-block');
    await block.scrollIntoViewIfNeeded();
    const card = block.locator('.region-reach');
    await expect(card).toHaveAttribute('data-ready', 'true');
    await expect(card.locator('.region-reach-answer')).toHaveText('Наприклад, Павлоград · 61 км');
    // the example carries nothing: only a choice does
    await expect(card.getByRole('link', { name: 'Вказати в заявці' })).toHaveCount(0);

    await card.getByRole('combobox', { name: 'Оберіть місто області' }).selectOption('Нікополь');
    await expect(card.locator('.region-reach-answer')).toHaveText('Нікополь · 111 км');
    await expect(card.locator('.region-reach-note')).toHaveText('від Дніпра по прямій; дорогою буде більше.');
    await expect(block.locator('.arm-tag text')).toHaveText('Нікополь · 111 км');

    await card.getByRole('link', { name: 'Вказати в заявці' }).click();
    const field = page.locator('#inquiry-location');
    await expect(field).toHaveValue('Нікополь і околиці');
    await expect(page.locator('.inquiry-details')).toHaveAttribute('open', '');
    await expect(field).toBeInViewport();

    // A second choice replaces the first one it wrote …
    await card.getByRole('combobox', { name: 'Оберіть місто області' }).selectOption('Павлоград');
    await card.getByRole('link', { name: 'Вказати в заявці' }).click();
    await expect(field).toHaveValue('Павлоград і околиці');
    // … but never the visitor's own words
    await field.fill('с. Новоолександрівка');
    await card.getByRole('combobox', { name: 'Оберіть місто області' }).selectOption('Самар');
    await card.getByRole('link', { name: 'Вказати в заявці' }).click();
    await expect(field).toHaveValue('с. Новоолександрівка');
  });
}

test('/pro-nas: a click (a tap on a phone) on the map chooses its town, and a point past the boundary says so', async ({ page, isMobile }) => {
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const block = page.locator('.region-block');
  await block.scrollIntoViewIfNeeded();
  await expect(block.locator('.region-reach')).toHaveAttribute('data-ready', 'true');
  const town = await block.locator('.arm-town').evaluateAll((dots) => {
    // Kryvyi Rih: the westmost dot
    const all = dots.map((dot) => ({ x: Number(dot.getAttribute('cx')), y: Number(dot.getAttribute('cy')) }));
    return all.reduce((west, dot) => (dot.x < west.x ? dot : west));
  });
  // near the dot, not on it: the point snaps to the town
  const press = async (x: number, y: number) => {
    const point = await pagePoint(page, x, y);
    if (isMobile) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
  };
  await press(town.x + 8, town.y - 6);
  await expect(block.locator('.region-reach-answer')).toHaveText('Кривий Ріг · 137 км');
  await expect(block.getByRole('combobox', { name: 'Оберіть місто області' })).toHaveValue('Кривий Ріг');
  const carry = block.getByRole('link', { name: 'Вказати в заявці' });
  await expect(carry).toBeVisible();
  if (!isMobile) {
    // The mouse resting and moving over the map previews other points on the map only: the words and the link stay
    // with the choice (review 08.11: the link vanished on the first move after the click)
    const elsewhere = await pagePoint(page, 600, 300);
    await page.mouse.move(elsewhere.x, elsewhere.y, { steps: 4 });
    await expect(block.locator('.arm-tag text')).not.toHaveText('Кривий Ріг · 137 км');
    await expect(block.locator('.region-reach-answer')).toHaveText('Кривий Ріг · 137 км');
    await expect(carry).toBeVisible();
  }

  // the drawing's top-left corner lies outside the oblast
  await press(8, 8);
  await expect(block.locator('.region-reach-answer')).toHaveText('Поза областю');
  await expect(block.locator('svg.arm')).toHaveAttribute('data-reach', 'out');
  await expect(block.getByRole('link', { name: 'Вказати в заявці' })).toHaveCount(0);
});

test('/pro-nas: the keyboard alone chooses a town and carries it into the form', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a keyboard path');
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const block = page.locator('.region-block');
  await block.scrollIntoViewIfNeeded();
  await expect(block.locator('.region-reach')).toHaveAttribute('data-ready', 'true');
  const list = block.getByRole('combobox', { name: 'Оберіть місто області' });
  await list.focus();
  await list.selectOption('Тернівка');
  await page.keyboard.press('Tab');
  await expect(block.getByRole('link', { name: 'Вказати в заявці' })).toBeFocused();
  await page.keyboard.press('Enter');
  const field = page.locator('#inquiry-location');
  await expect(field).toHaveValue('Тернівка і околиці');
  await expect(field).toBeInViewport();
  // landed with its caption below the header: the field's top is clear of the sticky header
  const header = await page.locator('.site-header').boundingBox();
  const box = await field.boundingBox();
  expect(box!.y).toBeGreaterThan(header!.y + header!.height);
});
