import { expect, test, type Page } from '@playwright/test';

async function openConfigurator(page: Page) {
  await page.goto('/configurator-preview', { waitUntil: 'load' });
  const essentialCookiesButton = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookiesButton).toBeVisible({ timeout: 10_000 });
  await essentialCookiesButton.click();
}

test.describe('hangar configurator POC', () => {
  test('is excluded from indexing', async ({ page }) => {
    await openConfigurator(page);
    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveAttribute('content', /noindex/);
  });

  test('shows the schematic-not-engineering disclaimer', async ({ page }) => {
    await openConfigurator(page);
    await expect(page.getByText('не є проєктною або конструкторською документацією')).toBeVisible();
  });

  test('changing a dimension updates both the summary text and the on-screen dimension label', async ({ page }) => {
    await openConfigurator(page);
    const widthInput = page.getByRole('spinbutton', { name: /Ширина/i }).or(page.locator('#hc-dimension-width'));

    await widthInput.fill('30');
    await widthInput.blur();

    await expect(page.locator('.hc-summary-dimensions')).toHaveText('30 × 60 × 8 м');
    await expect(page.locator('.hc-preview-svg')).toContainText('30 м');
  });

  test('area recalculates as width × length', async ({ page }) => {
    await openConfigurator(page);
    const widthInput = page.locator('#hc-dimension-width');
    const lengthInput = page.locator('#hc-dimension-length');

    await widthInput.fill('20');
    await lengthInput.fill('50');
    await lengthInput.blur();

    await expect(page.locator('.hc-summary-area')).toContainText('1 000 м²');
  });

  test('unchecking a scope item removes its fill layer and updates the summary list', async ({ page }) => {
    await openConfigurator(page);

    await expect(page.locator('.hc-front.has-walls')).toHaveCount(1);
    await page.getByText('Стіни / огороджувальний контур', { exact: true }).click();

    await expect(page.locator('.hc-front.no-walls')).toHaveCount(1);
    await expect(page.locator('.hc-summary-facts')).not.toContainText('Стіни');
  });

  test('gate count controls how many gate shapes render and what the summary says', async ({ page }) => {
    await openConfigurator(page);

    await expect(page.locator('.hc-preview-svg .hc-gate')).toHaveCount(1);
    await expect(page.locator('.hc-summary-facts')).toContainText('1 ворота');

    await page.locator('.hc-option-card', { hasText: '2' }).click();
    await expect(page.locator('.hc-preview-svg .hc-gate')).toHaveCount(2);
    await expect(page.locator('.hc-summary-facts')).toContainText('2 воріт');

    await page.locator('.hc-option-card', { hasText: '0' }).click();
    await expect(page.locator('.hc-preview-svg .hc-gate')).toHaveCount(0);
    await expect(page.locator('.hc-summary-facts')).toContainText('Без воріт');
  });

  test('respects prefers-reduced-motion — no animation classes block the update', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openConfigurator(page);

    const widthInput = page.locator('#hc-dimension-width');
    await widthInput.fill('45');
    await widthInput.blur();

    // The value must land immediately (not mid-transition) — this is the behavioural
    // guarantee reduced-motion asks for; the actual zero-duration transition is asserted
    // separately via computed style.
    await expect(page.locator('.hc-summary-dimensions')).toHaveText('45 × 60 × 8 м');
    const transitionDurationSeconds = await page
      .locator('.hc-layer.hc-front polygon')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
    expect(transitionDurationSeconds).toBeLessThan(0.001);
  });
});

test.describe('hangar configurator POC — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('has no horizontal overflow and keeps controls before the preview', async ({ page }) => {
    await openConfigurator(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    const order = await page.evaluate(() => {
      const root = document.querySelector('.hangar-configurator');
      const controls = root?.querySelector('.hc-controls');
      const preview = root?.querySelector('.hc-preview-pane');
      if (!controls || !preview) return null;
      return controls.compareDocumentPosition(preview) === Node.DOCUMENT_POSITION_FOLLOWING;
    });
    expect(order).toBe(true);
  });

  test('summary is collapsible', async ({ page }) => {
    await openConfigurator(page);
    const summary = page.locator('.hc-summary');
    await expect(summary).toHaveJSProperty('open', true);

    await summary.locator('summary').click();
    await expect(summary).toHaveJSProperty('open', false);
  });
});
