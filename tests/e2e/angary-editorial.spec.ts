import { expect, test } from '@playwright/test';
import { company } from '../../app/data/company';
import { deliveryModel } from '../../app/data/deliveryModel';
import { homeProofCase } from '../../app/data/homeProof';
import { openControlGroup } from './configurator.helpers';

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

    // Owner, 03.10: brief → the visitor's frame → a real hangar → cost → route with its title block → FAQ → the form,
    // and the separate stages after it. The frame is the configurator's «Каркас» step since 07.10, not a section of its own
    await expect(page.locator('#structure')).toHaveCount(0);
    const sequence = await page.locator([
      '.service-subhero',
      '#configurator',
      '#real-object',
      '#vartist',
      '#process',
      '.faq-section',
      '#inquiry',
      '.related-directions-section',
    ].join(', ')).evaluateAll((sections) => sections.map((section) => ({
      key: section.id || [...section.classList].find((name) => ['service-subhero', 'faq-section', 'related-directions-section'].includes(name)),
      top: section.getBoundingClientRect().top + window.scrollY,
    })));

    expect(sequence.map(({ key }) => key)).toEqual([
      'service-subhero', 'configurator', 'real-object', 'vartist', 'process', 'faq-section', 'inquiry',
      'related-directions-section',
    ]);
    expect(sequence.map(({ top }) => top)).toEqual([...sequence.map(({ top }) => top)].sort((a, b) => a - b));

    const configurator = page.locator('#configurator');
    await expect(configurator).toContainText('Сформуйте базову конфігурацію ангара');
    // No vocabulary cells (they repeated the groups under other names); the summary is the drawing's title block under
    // the layout — not inside the sticky pane — and the preliminary scheme is told by the frame drawing on «Каркас»
    await expect(configurator.locator('.hc-vocabulary')).toHaveCount(0);
    await expect(configurator.locator('.hc-preview-pane .hc-summary')).toHaveCount(0);
    await expect(configurator.locator('.hc-stamp-row .hc-summary-flagship')).toBeVisible();
    // the untouched example is called one, as the sheet above it says «Приклад» (04.10); «Ваша конфігурація» once the
    // visitor answers anything (08.10)
    await expect(configurator.getByRole('heading', { name: 'Приклад конфігурації' })).toBeVisible();
    await expect(configurator.locator('.hc-preview-sheet .sheet-stamp')).toContainText('Приклад · 24 × 60 × 8 м');
    await expect(configurator.locator('.hc-summary-area')).toContainText('коник 10,6 м');
    // the stamp's thumbnail: the configured hangar's section and plan
    await expect(configurator.locator('.hc-stamp-row svg.hc-sketch')).toBeVisible();
    const disclaimer = configurator.locator('.hc-summary-disclaimer');
    await expect(disclaimer).toBeVisible();
    expect(await disclaimer.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)))
      .toBeGreaterThanOrEqual(13);

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

    // «Рішення, які приймаєте ви» is gone as a section; the decisions are the configurator's five steps (07.10), one open
    // at a time on every width, the task first
    await expect(page.locator('#decisions')).toHaveCount(0);
    await expect(configurator.getByRole('tab')).toHaveText(['1Задача', '2Габарити', '3Стіни й ворота', '4Каркас', '5Обсяг']);
    await expect(configurator.getByRole('tab', { selected: true })).toHaveText('1Задача');
    await expect(configurator.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    // «Каркас»: the frame drawing on the configurator's own sheet, and its five steps in the step's panel
    await openControlGroup(page, 'space');
    await expect(configurator.locator('svg.ft-drawing')).toBeVisible();
    const frameItems = configurator.locator('#hc-frame-panel .hc-frame-item');
    await expect(frameItems).toHaveCount(5);
    await frameItems.nth(1).click();
    await expect(configurator.locator('#hc-frame-panel .hc-frame-text')).toContainText(
      'Для ширини 24 м на попередній схемі показано ферму з центральним рядом колон.',
    );
    // The cost block: the seven factors of the model on the /yak drawing, laid on the «Креслення» sheet, no prices
    await expect(page.locator('#vartist .proc-factors li')).toHaveCount(7);
    await expect(page.locator('#vartist .cf-sheet .sheet-stamp')).toContainText('Що впливає на вартість');
    await expect(page.locator('#vartist')).not.toContainText('грн');
    await expect(page.locator('#process li')).toHaveCount(5);
    await expect(page.locator('#process li').nth(3)).toContainText('Узгоджуємо обсяг і кошторис');
    // The two people as named roles in the route's title block: the generated portraits were withdrawn (#124)
    await expect(page.locator('#responsibility dl > div:not(.is-wide)')).toHaveCount(2);
    await expect(page.locator('#responsibility figure, #responsibility img')).toHaveCount(0);
    // …and it hands over to them (owner, 03.10): the form under the Delivery Model's words, a call, the company quietly
    const stamp = page.locator('#responsibility');
    const leadCta = stamp.getByRole('link', { name: deliveryModel.contactRoles.constructionLead.cta });
    await expect(leadCta).toHaveAttribute('href', '#inquiry');
    await expect(leadCta).toHaveAttribute('data-open-inquiry');
    await expect(leadCta).toHaveClass(/\bbutton-primary\b/);
    await expect(stamp.getByRole('link', { name: `Зателефонувати, ${company.phone.display}` })).toHaveAttribute('href', `tel:${company.phone.international}`);
    await expect(stamp.getByRole('link', { name: /Про компанію/ })).toHaveAttribute('href', '/pro-nas');
    await expect(page.locator('.faq-list details')).toHaveCount(6);
    await expect(page.locator('.faq-list details[open]')).toHaveCount(0);
    // The related directions close the page as its separate stages (owner, 03.10): the same three cards, retitled
    const related = page.locator('.related-directions-section');
    await expect(related.locator('.eyebrow')).toHaveText('Окремим етапом');
    await expect(related.getByRole('heading', { level: 2 })).toHaveText('Потрібен лише один етап?');
    await expect(related).toContainText('Фундамент, металокаркас чи покрівлю можна замовити окремо.');
    expect(await related.locator('.related-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('href'))))
      .toEqual(['/betonni-roboty', '/metalokonstruktsii', '/pokrivelni-roboty']);
    await expect(page.locator('#inquiry .conversation-journey')).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

// Owner, 03.10: after the frame tour, the one real hangar the site may show — HOME's record, in its own words only
test('/angary shows HOME\'s real hangar after the frame, with its attribution and scope and nothing more', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the record is viewport-independent; the sizes run below');
  expect(homeProofCase).not.toBeNull();
  const proof = homeProofCase!;
  await page.goto('/angary', { waitUntil: 'load' });
  const real = page.locator('#real-object');

  await expect(real.locator('.eyebrow')).toHaveText('Реалізований об’єкт до створення RUBIKON BUILD');
  await expect(real.getByRole('heading', { level: 2 })).toHaveText('Ангар: каркас, стінові панелі, покрівля');
  await expect(real).toContainText(proof.attribution);
  await expect(real.locator('.hv2-scope-chips li')).toHaveText([...proof.scope.subject]);
  const stamp = real.locator('.sheet-stamp');
  await expect(stamp).toContainText('Фото об’єкта');
  await expect(stamp).toContainText(`Реальний об’єкт. ${proof.caption}. Фото з ретушшю переднього плану.`);
  const image = real.locator('img');
  await expect(image).toHaveAttribute('alt', proof.photo.alt);
  await expect(image).toHaveAttribute('src', proof.photo.src);
  await expect(image).toHaveAttribute('loading', 'lazy');
  await expect(real.locator('source[type="image/webp"]')).toHaveAttribute('srcset', /hangar-retouched-960w\.webp 960w/);
  // No size, place, year, client or number of any kind: the record gives none
  expect(await real.evaluate((element) => element.textContent ?? '')).not.toMatch(/\d/);

  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).currentSrc)).toContain('hangar-retouched-960w.webp');
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
  test(`the real hangar's row stays whole at ${viewport.width}px, in both themes`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport matrix runs once');
    await page.setViewportSize(viewport);
    for (const theme of ['light', 'dark']) {
      await page.addInitScript((value) => window.localStorage.setItem('rubikon-theme', value), theme);
      await page.goto('/angary', { waitUntil: 'load' });
      const real = page.locator('#real-object');
      await real.scrollIntoViewIfNeeded();
      const box = await real.locator('.angary-real-media').boundingBox();
      expect(box!.width).toBeGreaterThan(viewport.width <= 390 ? 280 : 400);
      const facts = await real.locator('.angary-real-facts').boundingBox();
      // stacked under the photo up to 1023 px, beside it above
      if (viewport.width <= 1023) expect(facts!.y).toBeGreaterThan(box!.y + box!.height);
      else expect(facts!.x).toBeGreaterThan(box!.x + box!.width);
      const sizes = await real.locator(':is(.sheet-cell b, .hv2-scope-chips li, p)').evaluateAll((elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)));
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    }
  });
}

test('/angary keeps content readable with enlarged text', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport test runs once');
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/angary', { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html { font-size: 125% !important; }' });

  await expect(page.locator('.hc-summary-disclaimer')).toBeVisible();
  // the frame drawing is the configurator's «Каркас» step (07.10)
  await openControlGroup(page, 'space');
  await expect(page.locator('#configurator svg.ft-drawing')).toBeVisible();
  await expect(page.locator('#hc-frame-panel .hc-frame-item')).toHaveCount(5);
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
  // «Ви · Ми» since 06.10: 01's «Ви» and its result follow the brief's state
  const idle = 'Складаєте базову конфігурацію вище або описуєте задачу словами.';
  await expect(firstStage.locator('.ps-you')).toContainText(idle);
  await expect(firstStage.locator('.ps-result')).toHaveText('Результат: Бриф до заявки');
  await expect(rail).toHaveAttribute('data-brief', 'idle');
  // Owner, 03.10: 01 acts on its state — up to the configurator while nothing is attached
  await expect(firstStage.getByRole('link')).toHaveText('Сформувати бриф ↑');
  await expect(firstStage.getByRole('link')).toHaveAttribute('href', '#configurator');

  // the untouched example goes as what it is (08.10): «Приклад з креслення · …», never as the visitor's sizes
  await page.getByRole('link', { name: /Обговорити цю конфігурацію/ }).click();
  await expect(firstStage.locator('.ps-you')).toContainText('Додано до заявки: Приклад з креслення · 24 × 60 × 8 м');
  await expect(firstStage.locator('.ps-result')).toHaveText('Результат: Бриф у заявці');
  await expect(rail).toHaveAttribute('data-brief', 'attached');
  // …and down to the attached brief in the form once something is: it lands on the brief, which says so once
  const send = firstStage.getByRole('link');
  await expect(send).toHaveText('Надіслати бриф ↓');
  await expect(send).toHaveAttribute('href', '#inquiry');
  await page.locator('#inquiry-brief-status').evaluate((status) => { status.textContent = ''; });
  await send.click();
  await expect(page.locator('#inquiry-brief')).toBeFocused();
  await expect(page.locator('#inquiry-brief-status')).toHaveText('Додано до заявки: Приклад з креслення · 24 × 60 × 8 м');

  await page.getByRole('button', { name: 'Не додавати' }).click();
  await expect(firstStage.locator('.ps-you')).toContainText(idle);
  await expect(rail).toHaveAttribute('data-brief', 'detached');
  await expect(firstStage.getByRole('link')).toHaveAttribute('href', '#configurator');
});

test('on a phone the title block\'s «Обговорити з керівником…» opens the folded form', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/angary', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  const form = page.locator('#inquiry form.inquiry-form');
  await expect(form).toBeHidden();
  const cta = page.locator('#responsibility').getByRole('link', { name: deliveryModel.contactRoles.constructionLead.cta });
  const box = await cta.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await cta.click();
  await expect(form).toBeVisible();
  await expect(page).toHaveURL(/#inquiry$/);
});

for (const width of [320, 390, 760, 761, 820, 1000]) {
  test(`the frame drawing's steps and title block stay readable at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport matrix runs once');
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 1024 });
    await page.goto('/angary', { waitUntil: 'load' });
    // the frame drawing is the configurator's «Каркас» step (07.10): its steps in the step's panel, its title block the
    // configurator's sheet; a step shown, so its text is on the page
    await openControlGroup(page, 'space');
    await page.locator('#hc-frame-panel .hc-frame-item').nth(1).click();

    const texts = page.locator('#configurator :is(.hc-frame-item, .hc-frame-text, .hc-preview-sheet .sheet-stamp b, .hc-preview-sheet .sheet-stamp small)');
    const sizes = await texts.evaluateAll((elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)));
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

// «editorial responsive images» (the cladding pictures in «Чому це важливо») went with «Чому це важливо» itself, removed
// from the configurator's steps on 07.10 (550c450); the page's other pictures are covered by the real-hangar tests here
// and direction-static-hero.spec.ts.

// 04.10: the blocks after the frame keep their shape between the breakpoints
for (const width of [768, 820, 1024]) {
  test(`/angary «Потрібен лише один етап?» keeps its three cards on one ruled row at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport matrix runs once');
    await page.setViewportSize({ width, height: 1024 });
    await page.goto('/angary', { waitUntil: 'load' });
    const tops = await page.locator('.related-directions-section .related-card').evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });
}

for (const width of [1920, 1440, 1280, 1024]) {
  test(`/angary title block of the route: the two names share a line at ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport matrix runs once');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/angary', { waitUntil: 'load' });
    const stamp = page.locator('#responsibility');
    // a group named by its title (a plain div cannot take a name)
    await expect(page.getByRole('group', { name: 'За погоджений обсяг відповідаємо особисто' })).toHaveCount(1);
    const tops = await stamp.locator('dl > div:not(.is-wide) dd').evaluateAll((names) => names.map((name) => Math.round(name.getBoundingClientRect().top)));
    expect(tops).toHaveLength(2);
    expect(Math.abs(tops[0] - tops[1])).toBeLessThanOrEqual(1);
    // the cost foot's text keeps a readable column beside or over its actions (279 px at 1024 before)
    const foot = await page.locator('.angary-cost-foot p').boundingBox();
    expect(foot!.width).toBeGreaterThan(420);
  });
}

for (const viewport of [{ width: 1440, height: 900, header: 116 }, { width: 390, height: 844, header: 88 }]) {
  test(`/angary#responsibility lands under the site header at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit viewport matrix runs once');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/angary', { waitUntil: 'load' });
    await page.locator('#responsibility').evaluate((element) => element.scrollIntoView());
    expect(await page.locator('#responsibility').evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(viewport.header);
  });
}

test.describe('the real hangar on a 3× phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });

  test('takes the 1536w photo for its 4 : 3 crop, as HOME does', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'the DPR case runs once');
    await page.goto('/angary', { waitUntil: 'load' });
    const image = page.locator('#real-object img');
    await image.scrollIntoViewIfNeeded();
    // 04.10: sizes said 314 px for a photo drawn ~474 px wide in the crop, and a 3× phone took the 960w
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).currentSrc)).toContain('hangar-retouched-1536w.webp');
  });
});

test('on a phone the focused FAQ question scrolls clear of «До заявки»', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the explicit phone viewport runs once');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/angary', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Лише необхідні', exact: true }).click();
  // a size changed attaches the brief, which shows the shortcut once the summary has scrolled past
  await openControlGroup(page, 'dimensions');
  await page.locator('#hc-dimension-width').fill('30');
  await page.locator('#hc-dimension-width').blur();
  const cta = page.locator('.angary-mobile-inquiry-cta');
  const questions = page.locator('.faq-list summary');
  // reached with the keyboard, as a visitor would: Tab from the question before
  for (let index = 1; index < 4; index += 1) {
    await questions.nth(index - 1).focus();
    await page.keyboard.press('Tab');
    await expect(questions.nth(index)).toBeFocused();
    const covered = await page.evaluate(() => {
      const focused = document.activeElement!.getBoundingClientRect();
      const bar = document.querySelector<HTMLElement>('.angary-mobile-inquiry-cta');
      if (!bar || bar.hidden) return 0;
      const rect = bar.getBoundingClientRect();
      return Math.max(0, Math.min(focused.bottom, rect.bottom) - Math.max(focused.top, rect.top));
    });
    // 04.10: the fourth question sat 85 % under the bar
    expect(covered, `question ${index + 1}`).toBe(0);
  }
  await expect(cta).toHaveCount(1);
});
