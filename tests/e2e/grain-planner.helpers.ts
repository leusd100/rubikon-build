import { expect, type Locator, type Page } from '@playwright/test';

export const PREVIEW = '/planner-preview';

/** Opens the preview and settles the consent banner (client-only, so this also proves hydration). */
export async function openPlanner(page: Page) {
  await page.goto(PREVIEW, { waitUntil: 'load' });
  const essential = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essential).toBeVisible({ timeout: 15_000 });
  await essential.click();
  await expect(page.locator('.cookie-banner')).toHaveCount(0);
}

export function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  return errors;
}

export const planner = (page: Page) => page.locator('#planner');
export const result = (page: Page) => page.locator('#result');

/** Picks a radio by its option title inside the fieldset named by the question. */
export async function choose(page: Page, question: string, option: string) {
  await planner(page).getByRole('group', { name: question, exact: true }).getByRole('radio', { name: new RegExp(`^${escape(option)}`) }).check();
}

/**
 * For a follow-up that closes itself once answered (the processing step's handling question folds
 * into a context line), so `check()` cannot re-verify it: click, then confirm the context line.
 */
export async function answerFollowUp(page: Page, question: string, option: string) {
  await planner(page).getByRole('group', { name: question, exact: true }).getByRole('radio', { name: new RegExp(`^${escape(option)}`) }).click();
  await expect(planner(page).getByRole('group', { name: question, exact: true })).toHaveCount(0);
  await expect(planner(page).locator('.planner-context')).toBeVisible();
}

export async function tick(page: Page, question: string, option: string) {
  await planner(page).getByRole('group', { name: question, exact: true }).getByRole('checkbox', { name: new RegExp(`^${escape(option)}`) }).check();
}

export async function next(page: Page) {
  await planner(page).getByRole('button', { name: /^(Продовжити|Перевірити готовність)/ }).click();
}

export async function reveal(page: Page) {
  await planner(page).getByRole('button', { name: /^(Показати концепції|Показати карту уточнень)/ }).click();
}

function escape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const Q = {
  crops: 'Що потрібно зберігати?',
  separation: 'Чи потрібно зберігати партії окремо?',
  operation: 'Як зерно переважно проходитиме через об’єкт?',
  handlingNow: 'Як плануєте переміщувати зерно всередині комплексу?',
  processing: 'Чи потрібна підготовка зерна перед зберіганням?',
  handlingForProcessing: 'Як зерно рухатиметься між прийманням, підготовкою та зберіганням?',
  site: 'Що вже є на майданчику?',
  pressure: 'Чи є суттєве обмеження по площі?',
  development: 'Що може знадобитися після запуску першої черги?',
  futureHandling: 'Як у майбутньому планується переміщувати зерно?',
} as const;

async function capacity(page: Page, value: string) {
  await planner(page).getByLabel(/Скільки має поміщатися одночасно/).fill(value);
}

/** The four test scenarios from the user-test protocol, clicked through the real UI up to readiness. */
export const scenarios: Record<'A' | 'B' | 'C1' | 'C2', (page: Page) => Promise<void>> = {
  A: async (page) => {
    await tick(page, Q.crops, 'Пшениця'); await tick(page, Q.crops, 'Ячмінь'); await capacity(page, '3000');
    await choose(page, Q.separation, 'Спільне зберігання можливе'); await next(page);
    await choose(page, Q.operation, 'Сезонне зберігання'); await next(page);
    await choose(page, Q.processing, 'Ні'); await next(page);
    await choose(page, Q.site, 'Вільна ділянка'); await choose(page, Q.pressure, 'Ні, є запас площі'); await next(page);
    await tick(page, Q.development, 'Більше місткості'); await next(page);
  },
  B: async (page) => {
    for (const crop of ['Пшениця', 'Кукурудза', 'Соняшник', 'Ячмінь']) await tick(page, Q.crops, crop);
    await capacity(page, '12 000'); await choose(page, Q.separation, 'Потрібне розділення'); await next(page);
    await choose(page, Q.operation, 'Інтенсивне приймання'); await choose(page, Q.handlingNow, 'Стаціонарна механізація'); await next(page);
    await choose(page, Q.processing, 'Очищення + сушіння'); await next(page);
    await choose(page, Q.site, 'Вільна ділянка'); await choose(page, Q.pressure, 'Так, місця небагато'); await next(page);
    for (const item of ['Більше місткості', 'Вища продуктивність', 'Фізичне розширення']) await tick(page, Q.development, item);
    await choose(page, Q.futureHandling, 'Стаціонарна механізація'); await next(page);
  },
  C1: async (page) => {
    await tick(page, Q.crops, 'Пшениця'); await tick(page, Q.crops, 'Соняшник');
    await planner(page).getByRole('button', { name: 'Ще не визначили', exact: true }).click();
    await choose(page, Q.separation, 'Поки не знаю'); await next(page);
    await choose(page, Q.operation, 'Ще не знаю'); await next(page);
    await choose(page, Q.processing, 'Сушіння'); await answerFollowUp(page, Q.handlingForProcessing, 'Ще не визначили'); await next(page);
    await choose(page, Q.site, 'Вільна ділянка'); await choose(page, Q.pressure, 'Поки не знаю'); await next(page);
    await tick(page, Q.development, 'Поки не знаємо'); await next(page);
  },
  C2: async (page) => {
    await tick(page, Q.crops, 'Пшениця'); await capacity(page, '3000');
    await choose(page, Q.separation, 'Спільне зберігання можливе'); await next(page);
    await choose(page, Q.operation, 'Регулярна робота'); await next(page);
    await choose(page, Q.processing, 'Сушіння'); await answerFollowUp(page, Q.handlingForProcessing, 'Ще не визначили'); await next(page);
    await choose(page, Q.site, 'Вільна ділянка'); await choose(page, Q.pressure, 'Ні, є запас площі'); await next(page);
    await tick(page, Q.development, 'Поки не знаємо'); await next(page);
  },
};

export const questions = Q;

/** The approach titles shown in the personalised result, in order. */
export async function approachTitles(page: Page) {
  return result(page).locator('.planner-approach-grid .planner-approach h3').allTextContents();
}

/** Smallest effective label size (px) in a diagram: font-size × rendered width / viewBox width. */
export async function smallestDiagramLabel(diagram: Locator) {
  return diagram.evaluate((figure) => {
    const svg = figure.querySelector('svg');
    if (!svg) return 0;
    const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    return Math.min(...[...svg.querySelectorAll('text')].map((text) => parseFloat(getComputedStyle(text).fontSize) * scale));
  });
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
