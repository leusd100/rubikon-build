import { expect, test, type Page } from '@playwright/test';

// PDO-24 (owner 24.10: «поправ висоту блока „Ще не визначено“»): the form's selects are drawn like the fields beside them.
// Safari's own menu ignored min-height and shrank «Напрям робіт» to ~24 px beside 50–54 px inputs (Playwright WebKit:
// 24 → 50 px at 1440, 27 → 54 px at 390). This guards the drawing in Chromium. Every test denies the optional cookies and
// answers any Google request with an empty 200, so no tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function openForm(page: Page, width: number) {
  await page.setViewportSize({ width, height: width < 761 ? 844 : 900 });
  await page.goto('/', { waitUntil: 'load' });
  // phones and tablets fold the form behind «Залишити запит»
  const toggle = page.locator('#inquiry .conversation-form-toggle');
  if (await toggle.isVisible()) await toggle.click();
  await page.locator('#inquiry details.inquiry-details summary').click();
}

test('the form\'s selects carry no system menu look, a chevron of their own, and the fields\' height', async ({ page }) => {
  for (const width of [1440, 390]) {
    await openForm(page, width);
    const field = await page.locator('#inquiry input[name="name"]').evaluate((input) => input.getBoundingClientRect().height);
    for (const name of ['direction', 'cooperation']) {
      const select = page.locator(`#inquiry select[name="${name}"]`);
      const drawn = await select.evaluate((element) => {
        const style = getComputedStyle(element);
        return { appearance: style.appearance, chevron: style.backgroundImage.includes('linear-gradient'), height: element.getBoundingClientRect().height };
      });
      expect(drawn.appearance, `${width}px ${name}`).toBe('none');
      expect(drawn.chevron, `${width}px ${name}`).toBe(true);
      expect(Math.abs(drawn.height - field), `${width}px ${name}`).toBeLessThan(1);
    }
  }
});

test('the chevron stays when the select has focus', async ({ page }) => {
  await openForm(page, 1440);
  const select = page.locator('#inquiry select[name="direction"]');
  await select.focus();
  expect(await select.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain('linear-gradient');
});
