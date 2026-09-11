import { expect, test, type Page } from '@playwright/test';
import {
  choose,
  clickInPageLink,
  collectRuntimeErrors,
  horizontalOverflow,
  next,
  openPlanner,
  planner,
  plannerSettled,
  questions,
  result,
  reveal,
  scenarios,
} from './grain-planner.helpers';

type LeadPayload = {
  sourcePage?: string;
  details?: {
    dimensions?: string;
    configuration?: string;
    attachment?: {
      kind?: string;
      version?: string;
      data?: { schema?: string; version?: number; answers?: Record<string, unknown> };
    };
  };
};

const form = (page: Page) => page.locator('form.inquiry-form');
const attachmentCard = (page: Page) => form(page).locator('.inquiry-config-brief');

/** Every lead in this file is intercepted here — no real inquiry is ever sent. */
async function interceptLeads(page: Page) {
  const payloads: LeadPayload[] = [];
  await page.route('**/api/leads', async (route) => {
    payloads.push(route.request().postDataJSON() as LeadPayload);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 84, isNew: true }) });
  });
  return () => payloads.at(-1);
}

async function submitInquiry(page: Page) {
  await form(page).getByLabel(/Ваше ім’я/).fill('Іван Петренко');
  await form(page).getByLabel(/Телефон/).fill('+380671234567');
  await form(page).getByLabel(/Погоджуюся на обробку персональних даних/).check();
  await form(page).getByRole('button', { name: 'Надіслати запит', exact: true }).click();
  await expect(form(page).locator('.inquiry-status')).toContainText('Дякуємо! Запит надіслано');
}

async function detach(page: Page) {
  await attachmentCard(page).getByRole('button', { name: 'Не додавати', exact: true }).click();
  await expect(attachmentCard(page)).toHaveCount(0);
}

/** Edits «Майданчик» from the brief and finishes the edit; the result comes back by itself. */
async function editSitePressure(page: Page, option: string) {
  await result(page).getByRole('button', { name: 'Змінити: Майданчик' }).click();
  await choose(page, questions.pressure, option);
  await next(page);
  await expect(result(page).locator('.planner-scenario')).toBeVisible();
}

test.describe('Grain Planner → inquiry handoff', () => {
  test('nothing is attached before the result; the reveal attaches the brief without a dimensions field', async ({ page }) => {
    await interceptLeads(page);
    const errors = collectRuntimeErrors(page);
    await openPlanner(page);
    await scenarios.B(page);
    await expect(attachmentCard(page)).toHaveCount(0);

    await reveal(page);
    const card = attachmentCard(page);
    await expect(card).toContainText('До заявки додано ваш опис задачі');
    await expect(card.locator('strong')).toContainText('окремі партії · очищення + сушіння');
    await form(page).getByText('Додати параметри об’єкта', { exact: true }).click();
    await expect(form(page).getByLabel('Місто або область')).toBeVisible();
    await expect(form(page).locator('input[name="dimensions"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('the visible rows are exactly the text the lead carries, with kind, version and state', async ({ page }) => {
    const lastLead = await interceptLeads(page);
    await openPlanner(page);
    await scenarios.B(page);
    await reveal(page);

    const card = attachmentCard(page);
    await card.getByRole('button', { name: 'Переглянути опис' }).click();
    await expect(card.getByRole('heading', { name: 'Ваша задача' })).toBeVisible();
    await expect(card.getByRole('link', { name: 'Змінити в планувальнику ↑' })).toHaveAttribute('href', '#planner');
    const visibleRows = await card.locator('dl > div').evaluateAll((rows) => rows.map((row) => {
      const label = row.querySelector('dt')?.textContent?.trim() ?? '';
      const value = row.querySelector('dd')?.textContent?.trim() ?? '';
      return `${label}: ${value}`;
    }));

    await submitInquiry(page);
    const lead = lastLead();
    const configuration = lead?.details?.configuration ?? '';
    const [header, ...lines] = configuration.split('\n');
    expect(header).toBe('Опис задачі (Зерновий планувальник v1)');
    expect(lines).toEqual(visibleRows);
    expect(configuration.length).toBeLessThanOrEqual(1600);
    expect(lead?.details?.attachment).toMatchObject({
      kind: 'grain-brief',
      version: 'grain-planner@1.0.0',
      data: { schema: 'rubikon.grain-planner.state', version: 1 },
    });
    expect(lead?.details?.attachment?.data?.answers).toMatchObject({ capacity: '12 000', separation: 'required', processing: 'both' });
    expect(lead?.details?.dimensions).toBe('');
    expect(lead?.sourcePage).toBe('/planner-preview');
  });

  test('«Не додавати» takes the brief out of the lead', async ({ page }) => {
    const lastLead = await interceptLeads(page);
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    await detach(page);

    await submitInquiry(page);
    expect(lastLead()?.details).not.toHaveProperty('configuration');
    expect(lastLead()?.details).not.toHaveProperty('attachment');
  });

  test('an edit that changes an answer re-attaches the brief; an edit that changes nothing does not', async ({ page }) => {
    const lastLead = await interceptLeads(page);
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    await detach(page);

    await editSitePressure(page, 'Ні, є запас площі');
    await expect(attachmentCard(page)).toHaveCount(0);

    await editSitePressure(page, 'Так, місця небагато');
    await expect(attachmentCard(page)).toContainText('До заявки додано ваш опис задачі');
    await submitInquiry(page);
    expect(lastLead()?.details?.configuration).toContain('компактний майданчик');
    expect(lastLead()?.details?.attachment?.data?.answers).toMatchObject({ sitePressure: 'compact' });
  });

  test('«Передати опис RUBIKON» attaches the brief again and brings the form into view', async ({ page }) => {
    await interceptLeads(page);
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    await detach(page);

    await clickInPageLink(page, result(page).getByRole('link', { name: /Передати опис RUBIKON/ }));
    await expect(page.locator('#inquiry')).toBeInViewport({ timeout: 5_000 });
    await expect(attachmentCard(page)).toContainText('До заявки додано ваш опис задачі');
  });

  test('«Почати спочатку» clears the attachment', async ({ page }) => {
    const lastLead = await interceptLeads(page);
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    await expect(attachmentCard(page)).toBeVisible();

    await planner(page).getByRole('button', { name: 'Почати спочатку' }).click();
    await plannerSettled(page);
    await expect(attachmentCard(page)).toHaveCount(0);
    await submitInquiry(page);
    expect(lastLead()?.details).not.toHaveProperty('configuration');
  });

  test('presentation-only interactions never change what is attached', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the concept tabs are the wide layout; the state machine is viewport-independent');
    await interceptLeads(page);
    await openPlanner(page);
    await scenarios.B(page);
    await reveal(page);

    const tabs = result(page).getByRole('tab');
    await tabs.nth(1).click();
    await tabs.nth(2).click();
    await expect(attachmentCard(page)).toContainText('До заявки додано ваш опис задачі');

    await detach(page);
    await tabs.nth(0).click();
    await expect(attachmentCard(page)).toHaveCount(0);
  });

  test('on a wide screen there is no phone shortcut', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop layout');
    await interceptLeads(page);
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    await page.evaluate(() => {
      const brief = document.querySelector('[data-planner-brief]');
      if (brief) window.scrollTo(0, window.scrollY + brief.getBoundingClientRect().bottom + 200);
    });
    await expect(page.locator('a.grain-handoff-cta')).toBeHidden();
  });
});

test.describe('Grain Planner → inquiry handoff on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout and shortcut');

  test('the attached brief fits 390 px, and the shortcut follows the brief until the form is on screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await interceptLeads(page);
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);

    const shortcut = page.locator('a.grain-handoff-cta');
    await expect(shortcut).toBeHidden();
    await page.evaluate(() => {
      const brief = document.querySelector('[data-planner-brief]');
      if (brief) window.scrollTo(0, window.scrollY + brief.getBoundingClientRect().bottom + 200);
    });
    await expect(shortcut).toBeVisible();
    await expect(shortcut).toHaveCSS('position', 'fixed');
    expect((await shortcut.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    await shortcut.click();
    await expect(page.locator('#inquiry')).toBeInViewport({ timeout: 5_000 });
    await expect(shortcut).toBeHidden();

    const card = attachmentCard(page);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toContainText('До заявки додано ваш опис задачі');
    await expect(card.getByRole('button', { name: 'Не додавати', exact: true })).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);
  });
});
