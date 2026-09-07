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
  test('cladding comparison changes only the preview and has an explicit return', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract is viewport-independent');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHangarPage(page);

    const summary = page.locator('.hc-summary-flagship');
    await expect(summary.locator('.hc-summary-facts')).toContainText('ОгородженняПрофнастил');
    await page.getByRole('button', { name: /Порівняти із сендвіч-панеллю/ }).click();

    const status = page.locator('.hc-preview-demo-status');
    await expect(status).toContainText('Показ огородження · сендвіч-панель · ваш вибір не змінено');
    await expect(page.locator('.hc-preview-svg .hc-envelope-insulated').first()).toBeAttached();
    await expect(summary.locator('.hc-summary-facts')).toContainText('ОгородженняПрофнастил');
    await expect(attachmentCard(page)).toHaveCount(0);

    await page.locator('#hc-dimension-width').focus();
    await page.locator('#hc-dimension-width').blur();
    await expect(status).toHaveCount(1);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(status).toHaveCount(1);

    await status.getByRole('button', { name: 'Повернутись до мого вибору', exact: true }).click();
    await expect(status).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Технічний вид', exact: true })).toBeFocused();
    await expect(summary.locator('.hc-summary-facts')).toContainText('ОгородженняПрофнастил');
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

test('mobile inquiry CTA follows attachment, form and overlay conditions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit mobile viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await openHangarPage(page, false);
  await setWidth(page, '30');

  const stickyCta = page.getByRole('link', { name: /До заявки/ });
  await expect(stickyCta).toBeHidden();
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  await expect(stickyCta).toBeVisible();

  await page.locator('#hc-dimension-length').focus();
  await expect(stickyCta).toBeHidden();
  await page.locator('#hc-dimension-length').blur();
  await expect(stickyCta).toBeVisible();

  const mobileMenu = page.locator('.mobile-menu');
  await mobileMenu.locator('summary').click();
  await expect(stickyCta).toBeHidden();
  await mobileMenu.locator('summary').click();
  await expect(stickyCta).toBeVisible();

  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.getByRole('button', { name: 'Розгорнути', exact: true }).click();
  await expect(stickyCta).toBeHidden();
  await page.getByRole('button', { name: /Закрити/ }).click();
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
  await expect(stickyCta).toBeVisible();
  await page.setViewportSize({ width: 761, height: 1024 });
  await expect(stickyCta).toBeHidden();
});
