import { expect, test, type Page } from '@playwright/test';
import { deliveryModel } from '../../app/data/deliveryModel';
import { setTurnstileMode, solveTurnstile, stubTurnstile, turnstileLog } from './turnstile.helpers';

// The consent banner is client-only, so seeing either button proves hydration is complete.
async function acceptOnlyEssentialCookies(page: Page) {
  const essentialCookiesButton = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
  await essentialCookiesButton.click();
}

async function acceptAllCookies(page: Page) {
  const acceptAllButton = page.getByRole('button', { name: 'Прийняти все', exact: true });
  await expect(acceptAllButton).toBeVisible({ timeout: 10_000 });
  await acceptAllButton.click();
}

async function fillInquiryFields(page: Page) {
  const form = page.locator('form.inquiry-form');

  await form.getByText('Telegram', { exact: true }).click();
  await expect(form.getByRole('radio', { name: 'Telegram', exact: true })).toBeChecked();
  await form.getByText('Дзвінок', { exact: true }).click();
  await expect(form.getByRole('radio', { name: 'Дзвінок', exact: true })).toBeChecked();
  await expect(form.getByRole('button', { name: 'Надіслати запит', exact: true })).toBeVisible();

  await form.getByLabel(/Ваше ім’я/).fill('Іван Петренко');
  await form.getByLabel(/Телефон/).fill('+380671234567');
  await form.getByLabel(/Напрям робіт/).selectOption({ index: 1 });
  await form.getByLabel('Коротко про завдання', { exact: true }).fill('Потрібен виробничий ангар');
  await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
}

async function fillValidInquiry(page: Page) {
  await acceptOnlyEssentialCookies(page);
  await fillInquiryFields(page);
}

// The form fetches a Turnstile token before every submit; serve a controlled stub, never live Cloudflare.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await stubTurnstile(page);
});

test.describe('project inquiry form', () => {
  test('shows the saved state after a successful API response', async ({ page }) => {
    let submittedPayload: Record<string, unknown> | undefined;

    await page.route('**/api/leads', async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 42, isNew: true }),
      });
    });
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);

    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    await expect(page.locator('.inquiry-status')).toHaveText(`Дякуємо! Запит надіслано. ${deliveryModel.statements.firstContact}`);
    expect(submittedPayload).toMatchObject({
      name: 'Іван Петренко',
      phone: '+380671234567',
      contactMethod: 'Дзвінок',
      sourcePage: '/',
      details: {
        comment: 'Потрібен виробничий ангар',
      },
    });
  });

  test('offers the three Delivery Model formats and submits the chosen label', async ({ page }) => {
    let submittedPayload: { details?: { cooperation?: string } } | undefined;
    await page.route('**/api/leads', async (route) => {
      submittedPayload = route.request().postDataJSON() as typeof submittedPayload;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 7, isNew: true }) });
    });
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);

    const form = page.locator('form.inquiry-form');
    await form.getByText('Додати параметри об’єкта', { exact: true }).click();
    // A <select> inside its <label> takes the chosen option into its accessible name, so match the start.
    const cooperation = form.getByLabel(/^Формат співпраці/);
    await expect(cooperation.locator('option')).toHaveText(['Ще не визначено', ...deliveryModel.formats.map((format) => format.label)]);
    await cooperation.selectOption('Окремий підряд');
    await form.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');
    expect(submittedPayload?.details?.cooperation).toBe('Окремий підряд');
  });

  test('shows the short task field immediately and keeps secondary parameters progressive', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await acceptOnlyEssentialCookies(page);

    const form = page.locator('form.inquiry-form');
    await expect(form.getByLabel('Коротко про завдання', { exact: true })).toBeVisible();
    await expect(form.getByLabel('Місто або область', { exact: true })).toBeHidden();
    await form.getByText('Додати параметри об’єкта', { exact: true }).click();
    await expect(form.getByLabel('Місто або область', { exact: true })).toBeVisible();
  });

  test('shows the recoverable error state after a failed API response', async ({ page }) => {
    await page.route('**/api/leads', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'server' }),
      });
    });
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);

    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    const status = page.locator('.inquiry-status');
    await expect(status).toContainText('Не вдалося зберегти запит');
    await expect(status).toHaveClass(/is-error/);
    await expect(status.locator('a[href="tel:+380682614264"]')).toBeVisible();
  });

  test('keeps one submissionId through retries, then rotates it after confirmed success', async ({ page }) => {
    const ids: string[] = [];
    await page.route('**/api/leads', async (route) => {
      ids.push((route.request().postDataJSON() as { submissionId: string }).submissionId);
      const ok = ids.length > 1;
      await route.fulfill({
        status: ok ? 200 : 500,
        contentType: 'application/json',
        body: JSON.stringify(ok ? { ok: true, id: ids.length, isNew: true } : { ok: false, error: 'server' }),
      });
    });
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);
    const submit = page.getByRole('button', { name: 'Надіслати запит', exact: true });

    await submit.click();
    await expect(page.locator('.inquiry-status')).toContainText('Не вдалося');
    await submit.click();
    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');
    await submit.click();
    await expect.poll(() => ids.length).toBe(3);

    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[1]);
  });

  test('a double click while one request is in flight sends one lead', async ({ page }) => {
    const ids: string[] = [];
    await page.route('**/api/leads', async (route) => {
      ids.push((route.request().postDataJSON() as { submissionId: string }).submissionId);
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 1, isNew: true }) });
    });
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);

    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).dblclick();
    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');
    expect(ids).toHaveLength(1);
  });
});

test.describe('advertising-gated attribution on submit', () => {
  test('gclid is stripped from the lead payload when Advertising consent is denied', async ({ page }) => {
    let submittedPayload: Record<string, unknown> | undefined;
    await page.route('**/api/leads', async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 1, isNew: true }),
      });
    });

    await page.goto('/?gclid=test-click-id&utm_source=google&utm_medium=cpc', { waitUntil: 'load' });
    await acceptOnlyEssentialCookies(page);
    await fillInquiryFields(page);
    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');
    expect(submittedPayload?.clickIds).toEqual({ gclid: '', gbraid: '', wbraid: '' });
    // Lead-context fields are never gated on cookie consent, only the click IDs are.
    expect((submittedPayload?.utm as { source?: string } | undefined)?.source).toBe('google');
  });

  test('gclid reaches the lead payload once Advertising consent is granted', async ({ page }) => {
    let submittedPayload: Record<string, unknown> | undefined;
    await page.route('**/api/leads', async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 2, isNew: true }),
      });
    });

    await page.goto('/?gclid=test-click-id', { waitUntil: 'load' });
    await acceptAllCookies(page);
    await fillInquiryFields(page);
    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');
    expect((submittedPayload?.clickIds as { gclid?: string } | undefined)?.gclid).toBe('test-click-id');
  });
});

// ── Turnstile + «Ще не визначено» (Sprint 2) ──────────────────────────────────────────────────────

const VERIFICATION_FAILED = 'Не вдалося підтвердити надсилання запиту';
const SAVE_FAILED = 'Не вдалося зберегти запит';

function leadEvents(page: Page, name: string) {
  return page.evaluate((eventName) => (window.dataLayer ?? [])
    .map((entry) => Array.from(entry as ArrayLike<unknown>))
    .filter((entry) => entry[0] === 'event' && entry[1] === eventName).length, name);
}

test.describe('Turnstile on the inquiry form', () => {
  test('loads the widget only when the form approaches, renders it invisible and on-demand for lead_submit', async ({ page }) => {
    const scriptRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().startsWith('https://challenges.cloudflare.com/')) scriptRequests.push(request.url());
    });
    await page.goto('/', { waitUntil: 'load' });
    await acceptOnlyEssentialCookies(page);
    // Hydrated (the banner is client-only) with the form far below the fold: nothing loaded yet.
    const container = page.locator('.inquiry-turnstile');
    await expect(container).toHaveAttribute('data-turnstile-state', 'idle');
    expect(scriptRequests).toEqual([]);

    await page.locator('form.inquiry-form').scrollIntoViewIfNeeded();
    await expect(container).toHaveAttribute('data-turnstile-state', 'ready');
    expect(scriptRequests).toEqual(['https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit']);
    expect((await turnstileLog(page)).renders).toEqual([expect.objectContaining({
      sitekey: '1x00000000000000000000AA',
      action: 'lead_submit',
      execution: 'execute',
      appearance: 'interaction-only',
      size: 'flexible',
    })]);
    expect((await container.boundingBox())?.height ?? 0).toBe(0);
    expect((await turnstileLog(page)).executes).toBe(0);
  });

  test('sends a fresh token with every submit and never reuses one', async ({ page }) => {
    const tokens: string[] = [];
    await page.route('**/api/leads', async (route) => {
      tokens.push((route.request().postDataJSON() as { turnstileToken: string }).turnstileToken);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: tokens.length, isNew: true }) });
    });
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);
    const submit = page.getByRole('button', { name: 'Надіслати запит', exact: true });

    await submit.click();
    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');
    await submit.click();
    await expect.poll(() => tokens.length).toBe(2);

    expect(tokens).toEqual(['stub-token-1', 'stub-token-2']);
    expect((await turnstileLog(page)).resets).toBeGreaterThanOrEqual(2);
  });

  for (const [mode, label] of [['error', 'a challenge error'], ['expire', 'an expired token'], ['unavailable', 'a blocked Turnstile script']] as const) {
    test(`${label} sends nothing, explains generically, and a later submit recovers with a new token`, async ({ page }) => {
      const payloads: Array<{ submissionId: string; turnstileToken: string }> = [];
      await page.route('**/api/leads', async (route) => {
        payloads.push(route.request().postDataJSON() as { submissionId: string; turnstileToken: string });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 5, isNew: true }) });
      });
      // A blocker drops the script from the start; the other failures happen inside a loaded widget.
      if (mode === 'unavailable') await setTurnstileMode(page, mode);
      await page.goto('/', { waitUntil: 'load' });
      await fillValidInquiry(page);
      await setTurnstileMode(page, mode);
      const submit = page.getByRole('button', { name: 'Надіслати запит', exact: true });
      const status = page.locator('.inquiry-status');

      await submit.click();
      await expect(status).toContainText(VERIFICATION_FAILED);
      await expect(status).toHaveClass(/is-error/);
      await expect(status.locator('a[href="tel:+380682614264"]')).toBeVisible();
      await expect(submit).toBeEnabled();
      expect(payloads).toEqual([]);

      await setTurnstileMode(page, 'pass');
      await submit.click();
      await expect(status).toContainText('Дякуємо!');
      expect(payloads).toHaveLength(1);
      expect(payloads[0]?.turnstileToken).toBe('stub-token-1');
    });
  }

  for (const [status, error] of [[403, 'verification'], [503, 'verification_unavailable']] as const) {
    test(`a server-side ${error} (${status}) resets the widget and the retry keeps the submissionId with a new token`, async ({ page }) => {
      const payloads: Array<{ submissionId: string; turnstileToken: string }> = [];
      await page.route('**/api/leads', async (route) => {
        payloads.push(route.request().postDataJSON() as { submissionId: string; turnstileToken: string });
        const ok = payloads.length > 1;
        await route.fulfill({
          status: ok ? 200 : status,
          contentType: 'application/json',
          body: JSON.stringify(ok ? { ok: true, id: 9, isNew: true } : { ok: false, error }),
        });
      });
      await page.goto('/', { waitUntil: 'load' });
      await fillValidInquiry(page);
      const submit = page.getByRole('button', { name: 'Надіслати запит', exact: true });

      await submit.click();
      await expect(page.locator('.inquiry-status')).toContainText(VERIFICATION_FAILED);
      await submit.click();
      await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');

      expect(payloads.map((payload) => payload.turnstileToken)).toEqual(['stub-token-1', 'stub-token-2']);
      expect(payloads[1]?.submissionId).toBe(payloads[0]?.submissionId);
    });
  }

  test('a rate-limited submission keeps the existing generic save error, not the verification one', async ({ page }) => {
    await page.route('**/api/leads', (route) => route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'rate_limited' }) }));
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);

    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    await expect(page.locator('.inquiry-status')).toContainText(SAVE_FAILED);
  });

  test('a double click while the challenge is still running sends one lead with one token', async ({ page }) => {
    const tokens: string[] = [];
    await page.route('**/api/leads', async (route) => {
      tokens.push((route.request().postDataJSON() as { turnstileToken: string }).turnstileToken);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 1, isNew: true }) });
    });
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);
    await setTurnstileMode(page, 'interactive');

    const submit = page.locator('form.inquiry-form .inquiry-submit');
    await submit.dblclick();
    await page.locator('form.inquiry-form input[name="name"]').press('Enter');
    await expect(submit).toBeDisabled();
    await solveTurnstile(page);
    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');

    expect(tokens).toEqual(['stub-token-1']);
    expect((await turnstileLog(page)).executes).toBe(1);
  });

  test('a retry clears the previous error while the new challenge runs', async ({ page }) => {
    await page.route('**/api/leads', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 1, isNew: true }) }));
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);
    const submit = page.locator('form.inquiry-form .inquiry-submit');
    const status = page.locator('.inquiry-status');

    await setTurnstileMode(page, 'error');
    await submit.click();
    await expect(status).toContainText(VERIFICATION_FAILED);

    await setTurnstileMode(page, 'interactive');
    await submit.click();
    await expect(page.locator('.inquiry-turnstile')).toHaveAttribute('data-turnstile-state', 'verifying');
    await expect(status).toHaveText('');
    await expect(status).not.toHaveClass(/is-visible/);

    await solveTurnstile(page);
    await expect(status).toContainText('Дякуємо!');
  });

  test('an interactive challenge shows full-width above the button, then the layout returns to normal', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'the two-column submit layout exists on desktop only');
    await page.route('**/api/leads', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 1, isNew: true }) }));
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);
    await setTurnstileMode(page, 'interactive');
    const layout = page.locator('.inquiry-form-submit-layout');
    const submit = page.locator('form.inquiry-form .inquiry-submit');

    await submit.click();
    await expect(layout).toHaveClass(/has-turnstile-challenge/);
    const challenge = await page.locator('.inquiry-turnstile').boundingBox();
    const button = await submit.boundingBox();
    expect(challenge?.width ?? 0).toBeGreaterThanOrEqual(300);
    expect((challenge?.y ?? 0) + (challenge?.height ?? 0)).toBeLessThanOrEqual(button?.y ?? 0);

    await solveTurnstile(page);
    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');
    await expect(layout).not.toHaveClass(/has-turnstile-challenge/);
  });

  test('submits from the keyboard alone and announces the result in the status region', async ({ page }) => {
    await page.route('**/api/leads', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 1, isNew: true }) }));
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);

    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).focus();
    await page.keyboard.press('Enter');

    const status = page.getByRole('status').filter({ hasText: 'Дякуємо!' });
    await expect(status).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('«Ще не визначено» direction', () => {
  test('is offered after the other directions and submitted as a normal value', async ({ page }) => {
    let submittedPayload: { direction?: string } | undefined;
    await page.route('**/api/leads', async (route) => {
      submittedPayload = route.request().postDataJSON() as typeof submittedPayload;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 3, isNew: true }) });
    });
    await page.goto('/', { waitUntil: 'load' });
    await fillValidInquiry(page);
    const direction = page.locator('form.inquiry-form').getByLabel(/Напрям робіт/);

    await expect(direction.locator('option').last()).toHaveText('Ще не визначено');
    await direction.selectOption('Ще не визначено');
    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    await expect(page.locator('.inquiry-status')).toContainText('Дякуємо!');
    expect(submittedPayload?.direction).toBe('Ще не визначено');
  });

  test('the field stays required: the placeholder alone does not submit', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/leads', async (route) => {
      requests += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 1, isNew: true }) });
    });
    await page.goto('/', { waitUntil: 'load' });
    await acceptOnlyEssentialCookies(page);
    const form = page.locator('form.inquiry-form');
    await form.getByLabel(/Ваше ім’я/).fill('Іван Петренко');
    await form.getByLabel(/Телефон/).fill('+380671234567');
    await form.getByLabel(/Погоджуюся на обробку персональних даних/).check();
    const direction = form.getByLabel(/Напрям робіт/);
    await expect(direction).toHaveValue('');

    await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();

    // Native validation stops the submit and moves focus to the first invalid control.
    await expect(direction).toBeFocused();
    expect(await direction.evaluate((select) => select instanceof HTMLSelectElement && select.validity.valueMissing)).toBe(true);
    expect((await turnstileLog(page)).executes).toBe(0);
    expect(requests).toBe(0);
  });
});

test.describe('generate_lead with Turnstile', () => {
  test('fires once for one saved lead and never for a verification, API, rate-limit or network failure', async ({ page }) => {
    await page.route('**/googletagmanager.com/**', (route) => route.abort());
    const responses: Array<() => Parameters<import('@playwright/test').Route['fulfill']>[0] | 'abort'> = [
      () => ({ status: 403, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'verification' }) }),
      () => ({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'validation', fields: ['phone'] }) }),
      () => ({ status: 429, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'rate_limited' }) }),
      () => 'abort',
      () => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 11, isNew: true }) }),
      () => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 11, isNew: false }) }),
    ];
    let call = 0;
    await page.route('**/api/leads', async (route) => {
      const response = responses[call++]?.();
      if (!response || response === 'abort') return route.abort('failed');
      return route.fulfill(response);
    });
    await page.goto('/', { waitUntil: 'load' });
    await acceptAllCookies(page);
    await fillInquiryFields(page);
    const submit = page.getByRole('button', { name: 'Надіслати запит', exact: true });
    const status = page.locator('.inquiry-status');

    // A challenge that never yields a token: no request, no conversion.
    await setTurnstileMode(page, 'error');
    await submit.click();
    await expect(status).toContainText(VERIFICATION_FAILED);
    await setTurnstileMode(page, 'pass');

    for (const [index, expected] of [VERIFICATION_FAILED, SAVE_FAILED, SAVE_FAILED, SAVE_FAILED].entries()) {
      await submit.click();
      await expect.poll(() => call).toBe(index + 1);
      await expect(submit).toBeEnabled();
      await expect(status).toContainText(expected);
    }
    expect(await leadEvents(page, 'generate_lead')).toBe(0);

    await submit.click();
    await expect.poll(() => call).toBe(5);
    await expect(status).toContainText('Дякуємо!');
    await expect.poll(() => leadEvents(page, 'generate_lead')).toBe(1);

    // An idempotent replay of the same lead (isNew: false) is not a second conversion.
    await submit.click();
    await expect.poll(() => call).toBe(6);
    await expect(submit).toBeEnabled();
    expect(await leadEvents(page, 'generate_lead')).toBe(1);
    expect(await leadEvents(page, 'inquiry_contact_attempt')).toBe(7);
  });
});


test('lost acknowledgement retries the same lead and counts its first confirmed success once', async ({ page }) => {
  const ids: string[] = [];
  await page.route('**/api/leads', async (route) => {
    ids.push(route.request().postDataJSON().submissionId);
    if (ids.length === 1) return route.abort('failed');
    return route.fulfill({ json: { ok: true, id: 42, isNew: false } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Прийняти все', exact: true }).click();
  await fillInquiryFields(page);
  const conversions = () => page.evaluate(() => window.dataLayer.filter(
    (entry) => entry[0] === 'event' && entry[1] === 'generate_lead',
  ).length);
  await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(page.locator('.inquiry-status')).toContainText('Не вдалося');
  expect(await conversions()).toBe(0);
  await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(page.locator('.inquiry-status')).toContainText('Дякуємо');
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  expect(await conversions()).toBe(1);
});

test('a stalled lead request times out, preserving fields and the retry ID', async ({ page }) => {
  // Accelerate only the production 20s lead deadline; leave Turnstile's own deadline intact.
  await page.addInitScript(() => {
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout = (ms: number) => timeout(ms === 20_000 ? 200 : ms);
  });
  const ids: string[] = [];
  await page.route('**/api/leads', async (route) => {
    ids.push(route.request().postDataJSON().submissionId);
    if (ids.length === 1) return;
    await route.fulfill({ json: { ok: true, id: 42, isNew: true } });
  });
  await page.goto('/');
  await fillValidInquiry(page);
  await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(page.locator('.inquiry-status')).toContainText('Не вдалося');
  await expect(page.getByLabel(/Ваше ім’я/)).toHaveValue('Іван Петренко');
  await page.getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(page.locator('.inquiry-status')).toContainText('Дякуємо');
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});
