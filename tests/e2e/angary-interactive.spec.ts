import { expect, test, type Page } from '@playwright/test';

async function openHangarPage(page: Page, dismissCookies = true) {
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  if (dismissCookies) await essentialCookies.click();
}

async function setWidth(page: Page, value: string) {
  const input = page.locator('#hc-dimension-width');
  await input.fill(value);
  await input.blur();
}

function attachmentCard(page: Page) {
  return page.locator('form.inquiry-form .inquiry-config-brief');
}

// The two presentation-only demos («Подивитись каркас», «Порівняти із сендвіч-панеллю») are gone (UX review 2026-10): the
// frame is now told by «Каркас вашого ангара», and the comparison changed 0 pixels of the technical view.
test('the frame drawing follows the configuration and walks a snow and a wind load through it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  const frame = page.locator('#structure');
  await expect(frame.locator('.sheet-stamp')).toContainText('Приклад · 24 × 60 × 8 м');
  await expect(page.getByRole('button', { name: /Подивитись каркас|Порівняти із сендвіч-панеллю/ })).toHaveCount(0);

  await setWidth(page, '16');
  await expect(frame.locator('.sheet-stamp')).toContainText('Ваш ангар · 16 × 60 × 8 м');
  // the configurator's stamp marks the value that changed
  await expect(page.locator('.hc-stamp-row .hc-summary-dimensions')).toHaveClass(/is-changed/);
  await expect(frame.locator('.dn-step').nth(1)).toContainText('Для ширини 16 м у попередній візуалізації показано портальну раму');

  const steps = frame.locator('.dn-step');
  for (const index of [0, 1, 2, 3, 4]) {
    await steps.nth(index).click();
    await expect(steps.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect(frame.locator('.ft')).toHaveAttribute('data-step', String(index + 1));
  }
  // steps 4 and 5 follow a load through the frame, with the chain it takes over the drawing; the other steps do not
  const snow = frame.locator('[data-load="snow"]');
  const wind = frame.locator('[data-load="wind"]');
  await steps.nth(3).click();
  await expect(snow).toHaveCSS('opacity', '1');
  await expect(wind).toHaveCSS('opacity', '0');
  await expect(frame.locator('.ft-chain li')).toHaveText(['Покрівля', 'Прогони', 'Ригель рами', 'Колони', 'Фундаменти', 'Ґрунт']);
  await steps.nth(4).click();
  await expect(wind).toHaveCSS('opacity', '1');
  await expect(frame.locator('.ft-chain li')).toHaveText(['Торцева стіна', 'В’язі покрівлі', 'В’язі стін', 'Фундаменти']);
  await steps.nth(0).click();
  await expect(snow).toHaveCSS('opacity', '0');
  await expect(wind).toHaveCSS('opacity', '0');
  await expect(frame.locator('.ft-chain')).toHaveCount(0);
  // it attaches nothing: the brief is attached by the width edit, not by the drawing
  await expect(attachmentCard(page)).toContainText('16 × 60 × 8 м');
});

test('the summary carries the scope-aware choices; «Чому це важливо» explains a group in place', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);

  await page.getByRole('radiogroup', { name: 'Стіни' }).getByText('Сендвіч-панель', { exact: true }).click();
  await expect(page.locator('.hc-summary-flagship .hc-summary-facts')).toContainText(
    'КонтурІндивідуальна конфігурація',
  );

  await page.getByRole('checkbox', { name: 'Стіни / огороджувальний контур' }).uncheck();
  await expect(page.locator('.hc-summary-flagship .hc-summary-facts')).not.toContainText('Ворота');

  // The explanation that used to be its own section, folded under the group it explains
  const why = page.locator('.hc-why[data-why="cladding"]');
  await expect(why.locator('img')).toHaveCount(2);
  await expect(why.locator('img').first()).toBeHidden();
  await why.locator('summary').click();
  await expect(why).toHaveAttribute('open', '');
  await expect(why.locator('img').first()).toBeVisible();
  await expect(why).toContainText('Профнастил формує легкий неутеплений контур.');
  // the foundation type is not the visitor's choice on /angary (owner, 03.10)
  await expect(page.locator('#hc-foundation-heading, input[name="hc-foundation-type"]')).toHaveCount(0);
});

test('a chosen option is graphite; copper is left for actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);
  const chosen = page.locator('.hc-option-card input:checked + span').first();
  const text = await page.locator('body').evaluate((element) => getComputedStyle(element).color);
  await expect(chosen).toHaveCSS('background-color', text);
  const action = page.locator('.hc-summary-action');
  expect(await action.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(text);
});

test('on a phone the model stays under the header while the parameters are set, never covers the summary, and lets go above the controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHangarPage(page);
  const stage = page.locator('#configurator .hc-preview-surface');
  const header = await page.locator('.site-header').evaluate((element) => Math.round(element.getBoundingClientRect().height));

  await page.locator('#hc-scope-heading').scrollIntoViewIfNeeded();
  await expect(page.locator('#configurator .hc-layout')).toHaveAttribute('data-configuring', '');
  expect(await stage.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(header);
  const stageHeight = await stage.evaluate((element) => element.getBoundingClientRect().height);
  expect(stageHeight).toBeLessThan(844 * 0.3);

  // Past the controls the model stays small, out of sight: grown back above the screen it pushed the summary down
  // under the finger (03.10). It cannot stick beyond the layout, so nothing covers the summary, and nothing moves.
  await page.locator('.hc-summary-disclaimer').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 200));
  const summary = page.locator('.hc-summary-flagship');
  const summaryTop = await summary.evaluate((element) => element.getBoundingClientRect().top);
  expect(await stage.evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(summaryTop);
  await page.waitForTimeout(300);
  expect(await summary.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(summaryTop, 0);
  // Back above the controls it lets go, and the model grows in view
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('#configurator .hc-layout')).not.toHaveAttribute('data-configuring', '');
});

test('mobile inquiry CTA follows attachment, form and overlay conditions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await openHangarPage(page, false);
  await setWidth(page, '30');

  const stickyCta = page.getByRole('link', { name: /До заявки/ });
  await expect(stickyCta).toBeHidden();
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  await expect(stickyCta).toBeHidden();

  // A direct jump can skip every IntersectionObserver transition. The CTA must still derive its
  // state from the summary's real viewport position on the resulting scroll frame.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(stickyCta).toBeHidden();
  await page.evaluate(() => {
    const target = document.getElementById('process');
    if (target) window.scrollTo(0, window.scrollY + target.getBoundingClientRect().top);
  });
  await expect(stickyCta).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(stickyCta).toBeHidden();

  const summary = page.locator('.hc-summary-flagship');
  await summary.scrollIntoViewIfNeeded();
  await expect(stickyCta).toBeHidden();
  await page.evaluate(() => {
    const element = document.querySelector('.hc-summary-flagship');
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().bottom + 1);
  });
  await expect(stickyCta).toBeVisible();

  await page.locator('#hc-dimension-length').focus();
  await expect(stickyCta).toBeHidden();
  await page.locator('#hc-dimension-length').blur();
  await expect(stickyCta).toBeHidden();
  await page.evaluate(() => {
    const element = document.querySelector('.hc-summary-flagship');
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().bottom + 1);
  });
  await expect(stickyCta).toBeVisible();

  const mobileMenu = page.locator('.mobile-menu');
  await mobileMenu.locator('summary').click();
  await expect(stickyCta).toBeHidden();
  await mobileMenu.locator('summary').click();
  await expect(stickyCta).toBeVisible();

  await page.getByRole('button', { name: '3D', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Розгорнути', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(stickyCta).toBeHidden();
  await page.getByRole('button', { name: /Закрити/ }).click();
  await page.evaluate(() => {
    const element = document.querySelector('.hc-summary-flagship');
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().bottom + 1);
  });
  await expect(stickyCta).toBeVisible();

  await page.locator('#inquiry').scrollIntoViewIfNeeded();
  await expect(stickyCta).toBeHidden();
  // Past the form — /angary closes with the separate stages after it (03.10) — a «↓» would point the wrong way
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  expect(await page.locator('#inquiry').evaluate((element) => element.getBoundingClientRect().bottom)).toBeLessThan(0);
  // the CTA measures on the next frame: let it, so a stale «hidden» cannot pass for the answer
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(stickyCta).toBeHidden();
  await page.locator('#inquiry').scrollIntoViewIfNeeded();
  await attachmentCard(page).getByRole('button', { name: 'Не додавати', exact: true }).click();
  await page.locator('#configurator').scrollIntoViewIfNeeded();
  await expect(stickyCta).toHaveCount(0);
  const overflow = await page.evaluate(() => ({
    difference: document.documentElement.scrollWidth - window.innerWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 10)
      .map((element) => ({
        className: element.className,
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
      })),
  }));
  expect(overflow.difference, JSON.stringify(overflow.offenders)).toBeLessThanOrEqual(1);
});

test('sticky inquiry CTA honours the /angary 760/761 breakpoint', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit boundary runs once');
  await page.setViewportSize({ width: 760, height: 1024 });
  await openHangarPage(page);
  await setWidth(page, '30');
  const stickyCta = page.getByRole('link', { name: /До заявки/ });
  await page.evaluate(() => {
    const element = document.querySelector('.hc-summary-flagship');
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().bottom + 1);
  });
  await expect(stickyCta).toBeVisible();
  await page.setViewportSize({ width: 761, height: 1024 });
  await expect(stickyCta).toBeHidden();
});
