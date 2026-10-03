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
    // The first screen says what RUBIKON does and for whom (UX review 2026-10)
    await expect(hero.getByRole('heading', { level: 1 })).toContainText('Будуємо ангари та склади');
    await expect(hero.getByRole('heading', { level: 1 })).toContainText('під вашу задачу');
    await expect(hero.getByRole('link', { name: /Зібрати конфігурацію/ })).toHaveAttribute('href', '#configurator');
    // ≤ 760 px the call leads and the configurator follows; the conversation link stays off the phone's first screen
    // (UX pass 2026-10). Wider screens keep the configurator + «Обговорити задачу» pair.
    if (viewport.width <= 760) {
      await expect(hero.locator('a.hero-call-phone')).toBeVisible();
      await expect(hero.locator('a.angary-hero-secondary')).toBeHidden();
    } else {
      await expect(hero.getByRole('link', { name: /Обговорити задачу/ })).toHaveAttribute('href', '#inquiry');
    }
    await expect(hero.locator('.hc-controls, .hc-preview-surface')).toHaveCount(0);

    // The order of the UX review 2026-10: brief → cost → the visitor's frame → route with its title block → FAQ
    const sequence = await page.locator([
      '.service-subhero',
      '#configurator',
      '#vartist',
      '#structure',
      '#process',
      '.faq-section',
      '.related-directions-section',
      '#inquiry',
    ].join(', ')).evaluateAll((sections) => sections.map((section) => ({
      className: section.className,
      id: section.id,
      top: section.getBoundingClientRect().top + window.scrollY,
    })));

    expect(sequence).toHaveLength(8);
    expect(sequence.map(({ top }) => top)).toEqual([...sequence.map(({ top }) => top)].sort((a, b) => a - b));

    const configurator = page.locator('#configurator');
    await expect(configurator).toContainText('Сформуйте базову конфігурацію ангара');
    // No vocabulary cells (they repeated the groups under other names); the summary is the drawing's title block under
    // the layout — not inside the sticky pane — and the preliminary scheme is told by the frame drawing below
    await expect(configurator.locator('.hc-vocabulary')).toHaveCount(0);
    await expect(configurator.locator('.hc-preview-pane .hc-summary')).toHaveCount(0);
    await expect(configurator.locator('.hc-stamp-row .hc-summary-flagship')).toBeVisible();
    await expect(configurator.getByRole('heading', { name: 'Ви обрали' })).toBeVisible();
    await expect(configurator.locator('.hc-summary-area')).toContainText('коник 10,6 м');
    // the stamp's thumbnail: the configured hangar's section and plan
    await expect(configurator.locator('.hc-stamp-row svg.hc-sketch')).toBeVisible();
    const disclaimer = configurator.locator('.hc-summary-disclaimer');
    await expect(disclaimer).toBeVisible();
    expect(await disclaimer.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)))
      .toBeGreaterThanOrEqual(13);
    await expect(page.locator('#structure .ft-step, #structure .dn-step')).toHaveCount(5);
    await expect(page.locator('#structure .dn-step').nth(1)).toContainText(
      'Для ширини 24 м у попередній візуалізації показано ферму з центральним рядом опор.',
    );

    if (viewport.heroReveal) {
      // The hero standard (owner, 02.10): the window's height, as every direction page — no longer a shorter «reveal»;
      // its actions stay clear of the window's bottom edge
      const metrics = await page.evaluate(() => {
        const heroElement = document.querySelector<HTMLElement>('.angary-service-subhero')!;
        const actions = [...heroElement.querySelectorAll<HTMLElement>('a.button, a.hero-call')].filter((element) => element.offsetParent);
        return {
          heroHeight: heroElement.getBoundingClientRect().height,
          actionsBottom: Math.max(...actions.map((element) => element.getBoundingClientRect().bottom)),
          heroOverflow: heroElement.scrollHeight - heroElement.clientHeight,
        };
      });
      expect(metrics.heroHeight).toBeGreaterThanOrEqual(viewport.height - 1);
      expect(metrics.actionsBottom).toBeLessThanOrEqual(viewport.height - 40);
      expect(metrics.heroOverflow).toBeLessThanOrEqual(1);
    }

    // «Рішення, які приймаєте ви» lives in the configurator now: one folded «Чому це важливо» per decision
    await expect(page.locator('#decisions')).toHaveCount(0);
    await expect(configurator.locator('.hc-why')).toHaveCount(3);
    await expect(configurator.locator('.hc-why[open]')).toHaveCount(0);
    // The cost block: the seven factors of the model on the /yak drawing, laid on the «Креслення» sheet, no prices
    await expect(page.locator('#vartist .proc-factors li')).toHaveCount(7);
    await expect(page.locator('#vartist .cf-sheet .sheet-stamp')).toContainText('Що впливає на вартість');
    await expect(page.locator('#vartist')).not.toContainText('грн');
    await expect(page.locator('#structure svg.ft-drawing')).toBeVisible();
    await expect(page.locator('#process li')).toHaveCount(5);
    await expect(page.locator('#process li').nth(3)).toContainText('Узгоджуємо обсяг і кошторис');
    // The two people as named roles in the route's title block: the generated portraits were withdrawn (#124)
    await expect(page.locator('#responsibility dl > div:not(.is-wide)')).toHaveCount(2);
    await expect(page.locator('#responsibility figure, #responsibility img')).toHaveCount(0);
    await expect(page.locator('.faq-list details')).toHaveCount(6);
    await expect(page.locator('.faq-list details[open]')).toHaveCount(0);
    await expect(page.locator('.related-directions-section .related-card')).toHaveCount(3);
    await expect(page.locator('#inquiry .conversation-journey')).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('/angary keeps content readable with enlarged text', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport test runs once');
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/angary', { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html { font-size: 125% !important; }' });

  await expect(page.locator('.hc-summary-disclaimer')).toBeVisible();
  await expect(page.locator('#structure svg.ft-drawing')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('/angary process stage follows the authoritative attachment state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the state contract runs once');
  await page.goto('/angary', { waitUntil: 'load' });
  const essentialCookies = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essentialCookies).toBeVisible({ timeout: 10_000 });
  await essentialCookies.click();

  const rail = page.locator('#process ol');
  const firstStage = page.locator('#process li').first();
  await expect(firstStage).toContainText('Базову конфігурацію можна сформувати вище.');
  await expect(rail).toHaveAttribute('data-brief', 'idle');

  await page.getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
  await expect(firstStage).toContainText('Додано до заявки: 24 × 60 × 8 м · Холодний');
  await expect(rail).toHaveAttribute('data-brief', 'attached');

  await page.getByRole('button', { name: 'Не додавати' }).click();
  await expect(firstStage).toContainText('Базову конфігурацію можна сформувати вище.');
  await expect(rail).toHaveAttribute('data-brief', 'detached');
});

for (const width of [320, 390, 760, 761, 820, 1000]) {
  test(`the frame drawing's steps and title block stay readable at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport matrix runs once');
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 1024 });
    await page.goto('/angary', { waitUntil: 'load' });

    const texts = page.locator('#structure :is(.dn-step-text, .sheet-stamp dd, .sheet-stamp strong, .sheet-stamp b)');
    const sizes = await texts.evaluateAll((elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)));
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

for (const dpr of [1, 2]) {
  test.describe(`editorial responsive images at DPR ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr, viewport: { width: 1440, height: 900 } });

    test('selects generated WebP candidates', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'mobile-chromium', 'the DPR matrix runs once');
      await page.goto('/angary', { waitUntil: 'load' });
      // The pictures live in «Чому це важливо» under the cladding group (180 px wide on a desktop); /angary offers no foundation choice
      for (const selector of ['.hc-why[data-why="cladding"]']) {
        const section = page.locator(selector);
        await section.locator('summary').click();
        await section.scrollIntoViewIfNeeded();
        await section.locator('img').evaluateAll((images) => Promise.all(
          (images as HTMLImageElement[]).map((image) => image.decode()),
        ));
      }

      const selected = await page.locator('.hc-why[data-why="cladding"] img').evaluateAll((images) => (
        images as HTMLImageElement[]
      ).map((image) => image.currentSrc));
      expect(selected).toHaveLength(2);
      for (const source of selected) {
        expect(source).toContain('/media-responsive/');
        expect(source).toContain('-480w.');
      }
    });
  });
}
