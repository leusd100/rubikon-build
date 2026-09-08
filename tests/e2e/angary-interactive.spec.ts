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

test.describe('angary presentation-only previews', () => {
  test('original demo trigger is a keyboard-operable two-state toggle', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);

    const trigger = page.getByRole('button', { name: /Подивитись каркас/ });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-pressed', 'true');
    const returnAction = page.getByRole('button', { name: 'Повернути мій варіант', exact: true });
    await expect(returnAction).toBeVisible();
    expect((await returnAction.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-pressed', 'false');
    await expect(returnAction).toHaveCount(0);
  });

  test('cladding comparison changes only the preview and has an explicit return', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);

    const summary = page.locator('.hc-summary-flagship');
    const trigger = page.getByRole('button', { name: /Порівняти із сендвіч-панеллю/ });
    await expect(summary.locator('.hc-summary-facts')).toContainText('ОгородженняПрофнастил');
    await expect(trigger).toHaveAttribute('aria-pressed', 'false');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-pressed', 'true');

    const status = page.locator('.hc-preview-demo-status');
    await expect(status).toContainText('Показ огородження · сендвіч-панель · ваш вибір не змінено');
    await expect(status).not.toHaveAttribute('role', 'status');
    await expect(page.locator('.hc-visually-hidden[role="status"]')).toContainText(
      'Показ огородження · сендвіч-панель. Ваш вибір не змінено.',
    );
    await expect(page.locator('.hc-preview-svg .hc-envelope-insulated').first()).toBeAttached();
    await expect(summary.locator('.hc-summary-facts')).toContainText('ОгородженняПрофнастил');
    await expect(attachmentCard(page)).toHaveCount(0);

    await page.locator('#hc-dimension-width').focus();
    await page.locator('#hc-dimension-width').blur();
    await expect(status).toHaveCount(1);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(status).toHaveCount(1);

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-pressed', 'false');
    await expect(status).toHaveCount(0);

    await trigger.click();
    await status.getByRole('button', { name: 'Повернути мій варіант', exact: true }).click();
    await expect(trigger).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Технічний вид', exact: true })).toBeFocused();
    await expect(summary.locator('.hc-summary-facts')).toContainText('ОгородженняПрофнастил');
  });

  test('demo remains active across presentation controls and is operable inside fullscreen', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);

    const summaryBefore = await page.locator('.hc-summary-flagship').innerText();
    await page.getByRole('button', { name: /Порівняти із сендвіч-панеллю/ }).click();
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.getByRole('radio', { name: 'Графіт' }).first().click();
    await page.getByRole('checkbox', { name: 'Показати людину для масштабу' }).check();
    await page.getByRole('button', { name: 'Розгорнути', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Показ огородження · сендвіч-панель · ваш вибір не змінено');
    await expect(dialog.getByRole('button', { name: 'Повернути мій варіант', exact: true })).toBeVisible();
    const activeAnnouncement = dialog.locator('.hc-presentation-announcement[role="status"]');
    await expect(activeAnnouncement).toHaveCount(1);
    await expect(page.locator('.hc-presentation-announcement[role="status"]')).toHaveCount(1);
    expect(await activeAnnouncement.evaluate((element) => Boolean(element.closest('[inert]')))).toBe(false);
    await expect(page.locator('canvas')).toHaveCount(1);

    await dialog.getByRole('button', { name: 'Повернути мій варіант', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.hc-preview-demo-status')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: /Закрити/ })).toBeFocused();
    await expect(activeAnnouncement).toContainText('Повернуто ваш варіант.');
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(await page.locator('.hc-summary-flagship').innerText()).toBe(summaryBefore);
    await dialog.getByRole('button', { name: /Закрити/ }).click();
  });

  test('demo after detach stays detached', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);
    await setWidth(page, '30');
    await attachmentCard(page).getByRole('button', { name: 'Не додавати', exact: true }).click();

    await page.getByRole('button', { name: /Подивитись каркас/ }).click();
    await expect(page.locator('.hc-preview-demo-status')).toContainText('Показ каркаса');
    await expect(attachmentCard(page)).toHaveCount(0);

    await setWidth(page, '36');
    await expect(page.locator('.hc-preview-demo-status')).toHaveCount(0);
    await expect(attachmentCard(page)).toContainText('36 × 60 × 8 м · Холодний');
  });

  test('a meaningful business edit exits demo through the normal attachment flow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);

    await page.getByRole('button', { name: /Подивитись каркас/ }).click();
    await expect(page.locator('.hc-preview-demo-status')).toBeVisible();
    await setWidth(page, '30');

    await expect(page.locator('.hc-preview-demo-status')).toHaveCount(0);
    await expect(attachmentCard(page)).toContainText('30 × 60 × 8 м · Холодний');
  });
});

test('editorial current choices reuse canonical scope-aware summary semantics', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
  await openHangarPage(page);

  await page.getByRole('radiogroup', { name: 'Стіни' }).getByText('Сендвіч-панель', { exact: true }).click();
  await expect(page.locator('[data-decision="contour"] .angary-current-choice')).toContainText(
    'Індивідуальна конфігурація',
  );
  await expect(page.locator('[data-decision="enclosure"] .angary-current-choice')).toContainText(
    'Стіни: Сендвіч-панель, покрівля: Профнастил',
  );
  await expect(page.locator('.hc-summary-flagship .hc-summary-facts')).toContainText(
    'КонтурІндивідуальна конфігурація',
  );

  await page.getByRole('checkbox', { name: 'Стіни / огороджувальний контур' }).uncheck();
  await expect(page.locator('[data-decision="openings"] .angary-current-choice')).toContainText(
    'Поза обсягом заявки',
  );
  await expect(page.locator('.hc-summary-flagship .hc-summary-facts')).not.toContainText('Ворота');
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

  await page.getByRole('button', { name: /Подивитись каркас/ }).click();
  await page.evaluate(() => {
    const element = document.querySelector('.hc-summary-flagship');
    if (element) window.scrollTo(0, window.scrollY + element.getBoundingClientRect().bottom + 1);
  });
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
