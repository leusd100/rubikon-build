import { expect, test, type Page } from '@playwright/test';
import {
  collectRuntimeErrors,
  horizontalOverflow,
  openPlanner,
  planner,
  questions,
  result,
  reveal,
  scenarios,
  smallestDiagramLabel,
  tick,
} from './grain-planner.helpers';

// Phone behaviour, at the two narrowest widths the brief asked for. Mobile project only.
test.skip(({ isMobile }) => !isMobile, 'Phone layout — mobile-chromium project only.');

async function expandAll(page: Page) {
  const summaries = result(page).locator('details:not([open]) > summary');
  while (await summaries.count()) await summaries.first().click();
}

for (const width of [390, 360]) {
  test.describe(`${width} px`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 780 } });

    test('no horizontal overflow from the first question to the full result', async ({ page }) => {
      const errors = collectRuntimeErrors(page);
      await openPlanner(page);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      await scenarios.B(page);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      await reveal(page);
      await result(page).locator('.planner-approach').first().waitFor();
      await expandAll(page);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });

    test('touch targets are at least 44 px tall', async ({ page }) => {
      await openPlanner(page);
      await scenarios.A(page);
      await reveal(page);
      await expandAll(page);
      const short = await page.evaluate(() => [...document.querySelectorAll('.grain-planner-root :is(button, a, summary, label.planner-choice-row, label.planner-check-option, [role="tab"])')]
        .filter((element) => (element as HTMLElement).offsetParent !== null)
        .map((element) => ({ text: (element.textContent ?? '').trim().slice(0, 40), height: Math.round(element.getBoundingClientRect().height) }))
        .filter((item) => item.height < 44));
      expect(short).toEqual([]);
    });
  });
}

test.describe('390 px — phone flow', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the live strip sits above the active question once there is a fact', async ({ page }) => {
    await openPlanner(page);
    await expect(page.locator('.planner-panel.is-panel')).toBeHidden();
    await tick(page, questions.crops, 'Пшениця');
    const strip = page.locator('.planner-live-strip');
    await expect(strip).toBeVisible();
    await expect(strip).toContainText('+ Пшениця');
    const [stripBox, questionBox] = [await strip.boundingBox(), await page.locator('.planner-question').boundingBox()];
    expect(stripBox && questionBox && stripBox.y + stripBox.height <= questionBox.y).toBe(true);
  });

  test('a compact summary appears at readiness, with readable diagram labels', async ({ page }) => {
    await openPlanner(page);
    await scenarios.B(page);
    const summary = page.locator('.planner-summary-mobile');
    await expect(summary).toBeVisible();
    await expect(summary.getByRole('heading', { name: 'Ваш опис' })).toBeVisible();
    expect(await smallestDiagramLabel(summary.locator('.planner-diagram'))).toBeGreaterThanOrEqual(10);
  });

  test('nothing in the planner is sticky or fixed — only the site header is', async ({ page }) => {
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    const pinned = await page.evaluate(() => [...document.querySelectorAll('.grain-planner-root *')]
      .filter((element) => ['sticky', 'fixed'].includes(getComputedStyle(element).position))
      .map((element) => element.className));
    expect(pinned).toEqual([]);
  });

  test('the result follows the phone order: brief before the boundary', async ({ page }) => {
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    const order = await result(page).locator('.planner-result-block').evaluateAll((blocks) => blocks.map((block) => block.getAttribute('data-block')));
    expect(order).toEqual(['scenario', 'outcome', 'brief', 'boundary']);
    await expect(planner(page).locator('.planner-readiness')).toBeVisible();
  });
});
