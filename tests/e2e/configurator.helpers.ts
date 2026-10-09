import { expect, type Page } from '@playwright/test';

export type ControlGroup =
  | 'need' | 'dimensions' | 'envelope' | 'cladding' | 'foundation' | 'openings' | 'space' | 'scope' | 'project'
  /** «Об’єкт» before 07.10: what the hangar is for and where now open «Задача» */
  | 'object';

/** The step each group is walked in (controlGroups.ts CONTROL_STEPS, 07.10) */
const STEP_OF: Record<ControlGroup, string> = {
  need: 'task',
  object: 'task',
  dimensions: 'size',
  envelope: 'shell',
  cladding: 'shell',
  foundation: 'shell',
  openings: 'shell',
  space: 'frame',
  scope: 'check',
  project: 'check',
};

/**
 * The configurator walks its groups as steps, one open at a time on every width (07.10): open the step a control lives
 * in before using it. The tabs answer only once the page has hydrated — until then the server markup shows the first
 * step — so this clicks until the tab is the selected one.
 */
export async function openControlGroup(page: Page, group: ControlGroup) {
  const tab = page.locator(`#hc-step-${STEP_OF[group]}-tab`);
  await expect(async () => {
    if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

/**
 * «Обсяг робіт» is the whole list («Комплекс робіт») unless the visitor picks «Окремі роботи» (07.10): only then does
 * each work have its own checkbox, every one still ticked.
 */
export async function chooseSeparateWorks(page: Page) {
  await openControlGroup(page, 'scope');
  const separate = page.getByRole('radio', { name: 'Окремі роботи', exact: true });
  // the answer's square covers its input, as for every option card: click the answer, as a visitor does
  await page.locator('.hc-option-card').filter({ hasText: 'Окремі роботи' }).click();
  await expect(separate).toBeChecked();
}

/**
 * 3D on /angary is a secondary look (07.10): a chip on the drawing, «Подивитися в 3D», opens it and «← Креслення» goes
 * back. The research screen (/configurator-preview) keeps its two-button switch «Технічний вид» / «3D».
 */
export async function openThree(page: Page) {
  const chip = page.getByRole('button', { name: 'Подивитися в 3D', exact: true });
  if (await chip.count()) await chip.click();
  else await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('.hc-preview-surface canvas, .hc-preview-sheet canvas').first()).toBeVisible({ timeout: 20_000 });
}

export async function backToDrawing(page: Page) {
  const chip = page.getByRole('button', { name: /Креслення$/ });
  if (await chip.count()) await chip.click();
  else await page.getByRole('button', { name: 'Технічний вид', exact: true }).click();
}

/**
 * On a phone, scrolls on until the mini drawing holds, and `past` px further (09.10, audit F120): the sheet turns mini
 * as its bottom edge reaches the mini drawing's — the controls' top under the header, the mini drawing (`--hc-mini-h`,
 * measured by the page once it has hydrated) and the layout's gap — not as its top reaches the header.
 */
export async function scrollToMiniHold(page: Page, past = 40) {
  const layout = page.locator('#configurator .hc-layout');
  await expect.poll(() => layout.evaluate((element: HTMLElement) => element.style.getPropertyValue('--hc-mini-h'))).not.toBe('');
  await layout.evaluate((element: HTMLElement, extra) => {
    const controls = element.querySelector('.hc-controls')!;
    const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
    const line = header + Number.parseFloat(element.style.getPropertyValue('--hc-mini-h')) + (Number.parseFloat(getComputedStyle(element).rowGap) || 0);
    window.scrollBy({ top: controls.getBoundingClientRect().top - line + extra, behavior: 'instant' });
  }, past);
  await expect(layout).toHaveAttribute('data-configuring', '');
}
