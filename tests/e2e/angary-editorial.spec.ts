import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`/angary keeps its flagship editorial sequence at ${viewport.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/angary', { waitUntil: 'load' });

    const sequence = await page.locator([
      '.service-subhero',
      '#configurator',
      '.ghost-section',
      '.direction-editorial-section',
      '.hangar-decision-section',
      '.page-section-dark',
      '.faq-section',
      '.related-directions-section',
      '#inquiry',
    ].join(', ')).evaluateAll((sections) => sections.map((section) => ({
      className: section.className,
      id: section.id,
      top: section.getBoundingClientRect().top + window.scrollY,
    })));

    expect(sequence).toHaveLength(9);
    expect(sequence.map(({ top }) => top)).toEqual([...sequence.map(({ top }) => top)].sort((a, b) => a - b));

    await expect(page.locator('#configurator')).toContainText('Сформуйте базову конфігурацію ангара');
    await expect(page.locator('.hangar-decision-section')).toContainText('Що визначає майбутній ангар');
    await expect(page.locator('.service-subhero').getByRole('link', { name: 'Обговорити проєкт' }))
      .toHaveAttribute('href', '#inquiry');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
