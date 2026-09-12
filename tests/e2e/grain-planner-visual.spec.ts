import { expect, test, type Locator, type Page } from '@playwright/test';
import { openPlanner, planner, result, reveal, scenarios } from './grain-planner.helpers';

const SCREENSHOT_OPTIONS = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.01,
  scale: 'css' as const,
  threshold: 0.2,
};

async function prepare(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await openPlanner(page);
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }',
  });
  await page.evaluate(() => document.fonts.ready);
}

async function screenshot(locator: Locator, name: string) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  await expect(locator).toHaveScreenshot(name, SCREENSHOT_OPTIONS);
}

test.describe('Grain Planner visual contract', () => {
  test('desktop initial', async ({ page }) => {
    await prepare(page, 1440, 900);
    await screenshot(planner(page).locator(':scope > .shell'), 'grain-planner-desktop-initial.png');
  });

  test('desktop personalized result', async ({ page }) => {
    await prepare(page, 1440, 900);
    await scenarios.A(page);
    await reveal(page);
    await screenshot(result(page).locator(':scope > .shell'), 'grain-planner-desktop-result.png');
  });

  test('mobile 390 initial', async ({ page }) => {
    await prepare(page, 390, 844);
    await screenshot(planner(page).locator(':scope > .shell'), 'grain-planner-mobile-390-initial.png');
  });

  test('mobile 390 personalized result', async ({ page }) => {
    await prepare(page, 390, 844);
    await scenarios.A(page);
    await reveal(page);
    await screenshot(result(page).locator(':scope > .shell'), 'grain-planner-mobile-390-result.png');
  });
});
