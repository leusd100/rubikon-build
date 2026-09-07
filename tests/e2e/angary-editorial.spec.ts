import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 900, heroReveal: true },
  { name: 'laptop', width: 1366, height: 800, heroReveal: true },
  { name: 'tablet', width: 820, height: 1180, heroReveal: true },
  { name: 'tablet-768', width: 768, height: 1024, heroReveal: false },
  { name: 'mobile-boundary', width: 760, height: 1024, heroReveal: false },
  { name: 'tablet-boundary', width: 761, height: 1024, heroReveal: false },
  { name: 'mobile', width: 390, height: 844, heroReveal: false },
] as const;

for (const viewport of viewports) {
  test(`/angary keeps its flagship foundation at ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport matrix runs once');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/angary', { waitUntil: 'load' });

    const hero = page.locator('.angary-service-subhero');
    await expect(hero.getByRole('heading', { level: 1 })).toContainText('Ангари та склади');
    await expect(hero.getByRole('heading', { level: 1 })).toContainText('за вашою конфігурацією');
    await expect(hero.getByRole('link', { name: /Зібрати конфігурацію/ })).toHaveAttribute('href', '#configurator');
    await expect(hero.getByRole('link', { name: /Обговорити завдання/ })).toHaveAttribute('href', '#inquiry');
    await expect(hero.locator('.hc-controls, .hc-preview-surface')).toHaveCount(0);

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

    const configurator = page.locator('#configurator');
    await expect(configurator).toContainText('Сформуйте базову конфігурацію ангара');
    await expect(configurator.locator('.hc-vocabulary li')).toHaveCount(4);
    await expect(configurator.locator('.hc-vocabulary')).toContainText('01Габарити02Контур03Огородження04Основа');

    const vocabularyColumns = await configurator.locator('.hc-vocabulary').evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(vocabularyColumns).toBe(viewport.width >= 1024 ? 4 : 2);

    await expect(configurator.getByRole('heading', { name: 'Ви обрали' })).toBeVisible();
    await expect(configurator.getByRole('heading', { name: 'Попередня схема' })).toBeVisible();
    const disclaimer = configurator.locator('.hc-summary-disclaimer');
    await expect(disclaimer).toBeVisible();
    expect(await disclaimer.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)))
      .toBeGreaterThanOrEqual(14);

    const summaryColumns = await configurator.locator('.hc-summary-grid').evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(summaryColumns).toBe(viewport.width <= 760 ? 1 : 2);

    if (viewport.heroReveal) {
      const metrics = await page.evaluate(() => {
        const heroElement = document.querySelector<HTMLElement>('.angary-service-subhero')!;
        const heading = document.querySelector<HTMLElement>('#hangar-configurator-title')!;
        return {
          heroHeight: heroElement.getBoundingClientRect().height,
          headingTop: heading.getBoundingClientRect().top,
          heroOverflow: heroElement.scrollHeight - heroElement.clientHeight,
        };
      });
      expect(metrics.heroHeight).toBeLessThan(viewport.height);
      expect(metrics.headingTop).toBeLessThan(viewport.height);
      expect(metrics.heroOverflow).toBeLessThanOrEqual(1);
    }

    await expect(page.locator('.hangar-decision-section')).toContainText('Що визначає майбутній ангар');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('/angary keeps content readable with enlarged text', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport test runs once');
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/angary', { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html { font-size: 125% !important; }' });

  await expect(page.locator('.hc-vocabulary')).toBeVisible();
  await expect(page.locator('.hc-summary-disclaimer')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
