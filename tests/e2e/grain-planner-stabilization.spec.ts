import { expect, test, type Page } from '@playwright/test';
import { choose, next, openPlanner, planner, questions, result, reveal, scenarios, tick } from './grain-planner.helpers';

type LeadPayload = {
  submissionId?: string;
  details?: { configuration?: string; attachment?: { data?: { answers?: { capacity?: string } } } };
};

const form = (page: Page) => page.locator('form.inquiry-form');

async function interceptLeads(page: Page) {
  const payloads: LeadPayload[] = [];
  await page.route('**/api/leads', async (route) => {
    payloads.push(route.request().postDataJSON() as LeadPayload);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: payloads.length, isNew: true }) });
  });
  return payloads;
}

async function submitInquiry(page: Page) {
  await form(page).getByLabel(/Ваше ім’я/).fill('Іван Петренко');
  const phone = form(page).getByLabel(/Телефон/);
  await phone.fill('+380671234567');
  await expect(phone).toHaveValue('+380671234567');
  await form(page).getByLabel(/Погоджуюся на обробку персональних даних/).check();
  await form(page).getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(form(page).locator('.inquiry-status')).toContainText('Дякуємо!');
}

test.describe('Grain Planner stabilization regressions', () => {
  test('a readiness edit that first reveals the result also attaches its committed brief', async ({ page }) => {
    await openPlanner(page);
    await scenarios.A(page);
    await planner(page).getByRole('button', { name: 'Змінити: Зберігання' }).click();
    await planner(page).getByLabel(/Скільки має поміщатися одночасно/).fill('5000');
    await next(page);

    await expect(result(page).locator('.planner-scenario')).toBeVisible();
    await expect(form(page).locator('.inquiry-config-brief')).toContainText('До заявки додано ваш опис задачі');
  });

  test('an attached brief keeps the last committed valid capacity during an unfinished edit', async ({ page }) => {
    const payloads = await interceptLeads(page);
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    await result(page).getByRole('button', { name: 'Редагувати', exact: true }).click();
    await planner(page).getByLabel(/Скільки має поміщатися одночасно/).fill('');

    await submitInquiry(page);
    const lead = payloads.at(-1);
    expect(lead?.details?.attachment?.data?.answers?.capacity).toBe('3000');
    expect(lead?.details?.configuration?.replaceAll('\u00a0', ' ')).toContain('3 000 т');
  });

  test('a personalized-result chunk failure is local, handled, and retryable', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the exact lazy-chunk recovery contract is viewport-independent');
    await page.addInitScript(() => {
      (window as unknown as { __plannerUnhandled: string[] }).__plannerUnhandled = [];
      window.addEventListener('unhandledrejection', (event) => {
        (window as unknown as { __plannerUnhandled: string[] }).__plannerUnhandled.push(String(event.reason));
      });
    });
    let blocked = true;
    await page.route(/GrainPersonalizedResult/, async (route) => {
      if (blocked) await route.abort('failed');
      else await route.continue();
    });
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page).catch(() => undefined);

    await expect(page.getByRole('heading', { name: 'Не вдалося завантажити персональний результат' })).toBeVisible();
    await expect(planner(page)).toBeVisible();
    await expect(form(page)).toBeVisible();
    await expect(form(page).locator('.inquiry-config-brief')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __plannerUnhandled: string[] }).__plannerUnhandled)).toEqual([]);

    blocked = false;
    // A failed module request intentionally opens vinext's diagnostic overlay in the CI dev
    // server. Activate the real fallback control through the DOM so that overlay cannot turn this
    // recovery assertion into a pointer-interception test; production has no such dev overlay.
    await page.getByRole('button', { name: 'Спробувати ще раз' }).evaluate((button) => (button as HTMLElement).click());
    await expect(result(page).locator('.planner-scenario')).toBeVisible();
  });

  test('the mobile attached CTA resets when the result brief unmounts and watches its remount', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone-only observer regression');
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    const shortcut = page.locator('a.grain-handoff-cta');
    await page.evaluate(() => {
      const brief = document.querySelector('[data-planner-brief]');
      if (brief) window.scrollTo(0, window.scrollY + brief.getBoundingClientRect().bottom + 200);
    });
    await expect(shortcut).toBeVisible();

    await result(page).getByRole('button', { name: 'Змінити: Майданчик' }).click();
    await expect(page.locator('[data-planner-brief]')).toHaveCount(0);
    await expect(shortcut).toBeHidden();
    await choose(page, questions.pressure, 'Так, місця небагато');
    await next(page);
    await expect(page.locator('[data-planner-brief]')).toBeVisible();
    await expect(shortcut).toBeHidden();
  });

  test('keyboard focus moves to stable context when a conditional processing radio disappears', async ({ page, isMobile }) => {
    test.skip(isMobile, 'hardware keyboard regression');
    await openPlanner(page);
    await tick(page, questions.crops, 'Пшениця');
    await planner(page).getByLabel(/Скільки має поміщатися одночасно/).fill('3000');
    await choose(page, questions.separation, 'Спільне зберігання можливе');
    await next(page);
    await choose(page, questions.operation, 'Регулярна робота');
    await next(page);
    await choose(page, questions.processing, 'Сушіння');
    const handling = planner(page).getByRole('group', { name: questions.handlingForProcessing, exact: true })
      .getByRole('radio', { name: /^Мобільна техніка/ });
    await handling.focus();
    await page.keyboard.press('Space');

    await expect(planner(page).locator('.planner-context')).toBeFocused();
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  });
});

test.describe('shared inquiry no-JS safety', () => {
  test('does not expose a native PII submit and offers direct contact', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'shared SSR contract is viewport-independent');
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const path of ['/', '/angary', '/zernoskhovyshcha']) {
      await page.goto(path, { waitUntil: 'load' });
      const inquiry = form(page);
      await expect(inquiry).toHaveAttribute('method', 'post');
      await expect(inquiry.getByRole('button', { name: 'Надіслати запит', exact: true })).toBeDisabled();
      await expect(inquiry.getByText(/Для онлайн-заявки потрібен JavaScript/)).toBeVisible();
      await expect(inquiry.locator('a[href="tel:+380682614264"]')).toBeVisible();
      expect(await inquiry.locator('input[name="name"], input[name="phone"], textarea[name="comment"]').count()).toBe(0);
      expect(page.url()).not.toContain('?');
    }
    await context.close();
  });
});
