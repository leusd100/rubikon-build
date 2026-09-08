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
      '#decisions',
      '#structure',
      '#process',
      '#responsibility',
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
    const vocabulary = configurator.locator('.hc-vocabulary li');
    await expect(vocabulary).toHaveCount(4);
    for (const [index, text] of [
      '01Габаритиширина, довжина, висота стін.',
      '02Контурхолодний або утеплений залежно від використання.',
      '03Огородженняпрофнастил або сендвіч-панель.',
      '04Основарішення уточнюється з урахуванням майданчика.',
    ].entries()) {
      await expect(vocabulary.nth(index)).toHaveText(text);
    }

    const vocabularyColumns = await configurator.locator('.hc-vocabulary').evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(vocabularyColumns).toBe(viewport.width >= 1024 ? 4 : 2);

    await expect(configurator.getByRole('heading', { name: 'Ви обрали' })).toBeVisible();
    await expect(configurator.getByRole('heading', { name: 'Попередня схема' })).toBeVisible();
    await expect(configurator.locator('.hc-summary-structure')).toContainText(
      'Для ширини 24 м у попередній візуалізації показано ферму з центральним рядом опор.',
    );
    const disclaimer = configurator.locator('.hc-summary-disclaimer');
    await expect(disclaimer).toBeVisible();
    expect(await disclaimer.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)))
      .toBeGreaterThanOrEqual(14);

    const summaryColumns = await configurator.locator('.hc-summary-grid').evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(summaryColumns).toBe(viewport.width <= 760 ? 1 : 2);

    if (viewport.width === 820) {
      const decisionColumns = await page.locator('.angary-decision-row').first().evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns.split(' ').map(Number.parseFloat),
      );
      expect(Math.abs(decisionColumns[0] - decisionColumns[1])).toBeLessThanOrEqual(1);
    }

    if (viewport.width <= 760) {
      const currentChoiceSize = await page.locator('.angary-current-choice').first().evaluate(
        (element) => Number.parseFloat(getComputedStyle(element).fontSize),
      );
      expect(currentChoiceSize).toBeGreaterThanOrEqual(13);
    }

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

    await expect(page.locator('#decisions [data-decision]')).toHaveCount(4);
    await expect(page.locator('#structure .angary-diagram')).toHaveCount(3);
    await expect(page.locator('#structure')).toContainText('6–8 м і уточнюється після розрахунку');
    await expect(page.locator('#process li')).toHaveCount(5);
    await expect(page.locator('#responsibility figure')).toHaveCount(2);
    await expect(page.locator('.faq-list details')).toHaveCount(6);
    await expect(page.locator('.faq-list details[open]')).toHaveCount(0);
    await expect(page.locator('.related-directions-section .related-card')).toHaveCount(3);
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

test('/angary process stage follows the authoritative attachment state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract runs once');
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  await essentialCookies.click();

  const firstStage = page.locator('#process li').first();
  await expect(firstStage).toContainText('Базову конфігурацію можна сформувати вище.');

  await page.getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
  await expect(firstStage).toContainText('Конфігурацію додано до заявки.');

  await page.getByRole('button', { name: 'Не додавати' }).click();
  await expect(firstStage).toContainText('Базову конфігурацію можна сформувати вище.');
});

for (const width of [320, 390, 760, 761, 820, 1000]) {
  test(`structural HTML captions remain readable at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport matrix runs once');
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 1024 });
    await page.goto('/angary', { waitUntil: 'load' });

    const captions = page.locator('#structure :is(.angary-diagram-key, figcaption > span, figcaption > p)');
    await expect(captions).toHaveCount(9);
    const sizes = await captions.evaluateAll((elements) => elements.map(
      (element) => Number.parseFloat(getComputedStyle(element).fontSize),
    ));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13);
    await expect(page.locator('.angary-longitudinal-diagram .angary-diagram-key')).toContainText(
      'Попередньо 6–8 м · уточнюється після розрахунку',
    );
  });
}

for (const dpr of [1, 2]) {
  test.describe(`editorial responsive images at DPR ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr, viewport: { width: 1440, height: 900 } });

    test('selects generated WebP candidates', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'mobile-chromium', 'the DPR matrix runs once');
      await page.goto('/angary', { waitUntil: 'load' });
      for (const selector of ['[data-decision="enclosure"]', '[data-decision="foundation"]']) {
        const section = page.locator(selector);
        await section.scrollIntoViewIfNeeded();
        await section.locator('img').evaluateAll((images) => Promise.all(
          (images as HTMLImageElement[]).map((image) => image.decode()),
        ));
      }

      const selected = await page.locator([
        '[data-decision="enclosure"] img',
        '[data-decision="foundation"] img',
      ].join(', ')).evaluateAll((images) => (
        images as HTMLImageElement[]
      ).map((image) => image.currentSrc));
      expect(selected).toHaveLength(4);
      for (const source of selected) {
        expect(source).toContain('/media-responsive/');
        expect(source).toContain(dpr === 1 ? '-480w.' : '-768w.');
      }
    });
  });
}
