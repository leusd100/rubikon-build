import { expect, test } from '@playwright/test';
import {
  PREVIEW,
  approachTitles,
  choose,
  collectRuntimeErrors,
  next,
  openPlanner,
  planner,
  questions,
  result,
  reveal,
  scenarios,
  smallestDiagramLabel,
  tick,
} from './grain-planner.helpers';

// Runs on desktop-chromium and mobile-chromium. Layout-specific checks guard on the project.

test.describe('Grain Planner preview — scenarios', () => {
  test('A (known task, simple): two floor approaches with WHY from the client’s answer', async ({ page }, testInfo) => {
    const errors = collectRuntimeErrors(page);
    await openPlanner(page);
    await expect(result(page).getByRole('heading', { name: /Три підходи до зерносховища/ })).toBeVisible();
    await scenarios.A(page);
    await expect(planner(page).getByRole('heading', { name: 'Контексту достатньо, щоб порівняти перші концепції.' })).toBeVisible();
    await reveal(page);
    await expect(result(page).getByRole('heading', { name: 'Для вашої задачі є кілька підходів, які варто розглянути.' })).toBeVisible();
    expect(await approachTitles(page)).toEqual(['Каркасне підлогове', 'Безкаркасне арочне']);

    if (testInfo.project.name === 'mobile-chromium') await result(page).locator('details > summary', { hasText: 'Каркасне підлогове' }).click();
    const why = result(page).locator('.planner-why').first();
    await expect(why.getByRole('heading', { name: 'Чому ми її показуємо' })).toBeVisible();
    await expect(why).toContainText('Ви вказали, що партії можуть зберігатися разом, — тому єдиний гнучкий внутрішній об’єм стає доречним.');
    expect(errors).toEqual([]);
  });

  test('B (complex business): three approaches, six drivers, the expansion tension', async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await openPlanner(page);
    await scenarios.B(page);
    await reveal(page);
    expect(await approachTitles(page)).toEqual(['Силосна система', 'Каркасне підлогове', 'Безкаркасне арочне']);
    await expect(result(page).locator('.planner-drivers li')).toHaveCount(6);
    await expect(result(page).getByRole('heading', { name: /Компактний майданчик сьогодні/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('C1 (uncertain): «не знаю» leads to a clarification map, not concepts', async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await openPlanner(page);
    await scenarios.C1(page);
    await expect(planner(page).getByRole('heading', { name: 'Ми вже бачимо, що потрібно уточнити перед порівнянням концепцій.' })).toBeVisible();
    await expect(planner(page).locator('.planner-readiness-body')).toContainText('6 важливих невідомих');
    await reveal(page);
    await expect(result(page).getByRole('heading', { name: /Вибір концепції ще зарано робити/ })).toBeVisible();
    await expect(result(page).locator('.planner-clarification-grid > li')).toHaveCount(6);
    await expect(result(page).locator('.planner-approach-grid')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('C2 (partly uncertain): comparison with the open questions kept', async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await openPlanner(page);
    await scenarios.C2(page);
    await reveal(page);
    expect(await approachTitles(page)).toEqual(['Силосна система', 'Каркасне підлогове', 'Безкаркасне арочне']);
    if (await result(page).locator('details.planner-disclosure', { hasText: 'Що ви ще не визначили' }).count()) {
      await result(page).locator('details > summary', { hasText: 'Що ви ще не визначили' }).click();
    }
    const undecided = result(page).locator('.planner-boundary-columns > div').first();
    await expect(undecided).toContainText('Спосіб переміщення зерна в першій черзі');
    await expect(undecided).toContainText('Майбутня стратегія розвитку');
    expect(errors).toEqual([]);
  });
});

test.describe('Grain Planner preview — edits explain their consequences', () => {
  test('compact→space, separation required→shared, high→seasonal', async ({ page }) => {
    await openPlanner(page);
    await scenarios.B(page);
    await reveal(page);

    const notes = async () => {
      await result(page).getByRole('button', { name: /Що змінилося/ }).click();
      return result(page).locator('.planner-change ul li').allTextContents();
    };

    await planner(page).getByRole('button', { name: 'Змінити: Майданчик' }).click();
    await choose(page, questions.pressure, 'Ні, є запас площі');
    await next(page);
    expect(await notes()).toEqual(['Суперечність знята: майданчик більше не створює підтвердженого конфлікту з майбутнім фізичним розширенням.']);

    await planner(page).getByRole('button', { name: 'Змінити: Зберігання' }).click();
    await choose(page, questions.separation, 'Спільне зберігання можливе');
    await next(page);
    expect(await notes()).toEqual(['Набір концепцій не змінився: «Розділення партій» більше не впливає на порівняння, але інтенсивна логістика та підготовка «очищення + сушіння» і далі підтримують поточне порівняння.']);

    await planner(page).getByRole('button', { name: 'Змінити: Робота об’єкта' }).click();
    await choose(page, questions.operation, 'Сезонне зберігання');
    await next(page);
    expect(await notes()).toEqual([
      'Набір концепцій не змінився: «Інтенсивна логістика» більше не впливає на порівняння, але підготовка «очищення + сушіння» та поточна стаціонарна механізація і далі підтримують поточне порівняння.',
      'Спосіб переміщення лишається важливим: тепер його вимагає підготовка «очищення + сушіння».',
    ]);
  });

  test('«Почати спочатку» returns to a clean first question', async ({ page }) => {
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    await planner(page).getByRole('button', { name: 'Змінити: Майданчик' }).click();
    await planner(page).getByRole('button', { name: 'Почати спочатку' }).click();
    await expect(planner(page).getByRole('heading', { name: 'Що потрібно зберігати?' })).toBeVisible();
    await expect(planner(page).getByRole('checkbox', { name: 'Пшениця', exact: true })).not.toBeChecked();
    await expect(result(page).getByRole('heading', { name: /Три підходи до зерносховища/ })).toBeVisible();
    await expect(page.locator('.planner-completed')).toHaveCount(0);
  });
});

test.describe('Grain Planner preview — page contract', () => {
  test('one site header, one h1, one form, no prototype chrome', async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await openPlanner(page);
    await expect(page.locator('.site-header')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('form')).toHaveCount(1);
    await expect(page.locator('#inquiry')).toHaveCount(1);
    for (const selector of ['.brand-rail', '.brand-header', '.demo-button', '.handoff-section', '.product-name']) {
      await expect(page.locator(selector)).toHaveCount(0);
    }
    await expect(page.getByText(/Прототип|Демо 8 000/)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('the result is its own band, generic before reveal and personalised after', async ({ page }) => {
    await openPlanner(page);
    const standalone = await page.evaluate(() => {
      const plannerBand = document.getElementById('planner');
      const resultBand = document.getElementById('result');
      return Boolean(plannerBand && resultBand && resultBand.tagName === 'SECTION' && plannerBand.parentElement === resultBand.parentElement && !plannerBand.contains(resultBand));
    });
    expect(standalone).toBe(true);
    await expect(result(page).getByRole('heading', { name: /Три підходи до зерносховища/ })).toBeVisible();
    await scenarios.A(page);
    await reveal(page);
    await expect(result(page).getByRole('heading', { name: /Три підходи до зерносховища/ })).toHaveCount(0);
    await expect(result(page).locator('.planner-scenario')).toBeVisible();
  });

  // Phase 3: the CTA hands the brief over (tests/e2e/grain-planner-handoff.spec.ts covers the
  // attachment itself); here it is the page contract — one CTA, into the site's one form.
  test('the brief CTA leads into the site’s inquiry form with the description attached', async ({ page }) => {
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    const cta = result(page).getByRole('link', { name: /Передати опис RUBIKON/ });
    await expect(cta).toHaveAttribute('href', '#inquiry');
    await cta.click();
    await expect(page.locator('#inquiry')).toBeInViewport({ timeout: 5_000 });
    await expect(page.locator('form.inquiry-form .inquiry-config-brief')).toContainText('До заявки додано ваш опис задачі');
  });

  test('stays out of search: noindex, robots disallow, not in the sitemap', async ({ page, request }) => {
    await page.goto(PREVIEW, { waitUntil: 'load' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /planner-preview');
    expect(await (await request.get('/sitemap.xml')).text()).not.toContain('planner-preview');
  });
});

test.describe('Grain Planner preview — accessibility', () => {
  test('answers are native radios and checkboxes inside named fieldsets', async ({ page }) => {
    await openPlanner(page);
    const crops = planner(page).getByRole('group', { name: questions.crops, exact: true });
    await expect(crops).toBeVisible();
    await expect(crops.locator('input[type="checkbox"]')).toHaveCount(6);
    await tick(page, questions.crops, 'Пшениця');
    const separation = planner(page).getByRole('group', { name: questions.separation, exact: true });
    await expect(separation.locator('input[type="radio"]')).toHaveCount(3);
    expect(await separation.evaluate((element) => element.tagName)).toBe('FIELDSET');
  });

  test('keyboard: Space ticks, arrow keys move within a radio group', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'Hardware keyboard behaviour is covered on desktop.');
    await openPlanner(page);
    const wheat = planner(page).getByRole('checkbox', { name: 'Пшениця', exact: true });
    await wheat.focus();
    await page.keyboard.press('Space');
    await expect(wheat).toBeChecked();
    const first = planner(page).getByRole('radio', { name: /^Потрібне розділення/ });
    await first.focus();
    await page.keyboard.press('Space');
    await expect(first).toBeChecked();
    await page.keyboard.press('ArrowDown');
    await expect(planner(page).getByRole('radio', { name: /^Спільне зберігання можливе/ })).toBeChecked();
    await expect(planner(page).getByRole('radio', { name: /^Спільне зберігання можливе/ })).toBeFocused();
  });

  test('focus follows the consultation instead of falling back to the page top', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'Hardware keyboard behaviour is covered on desktop.');
    await openPlanner(page);
    await tick(page, questions.crops, 'Пшениця');
    await planner(page).getByLabel(/Скільки має поміщатися одночасно/).fill('3000');
    await planner(page).getByRole('radio', { name: /^Спільне зберігання можливе/ }).check();
    await planner(page).getByRole('button', { name: /^Продовжити/ }).focus();
    await page.keyboard.press('Enter');
    await expect(planner(page).getByRole('heading', { name: 'Як зерно переважно проходитиме через об’єкт?' })).toBeFocused();
    await planner(page).getByRole('button', { name: 'Змінити: Зберігання' }).click();
    await expect(planner(page).getByRole('heading', { name: 'Що потрібно зберігати?' })).toBeFocused();
  });

  test('concept tabs: arrows, Home and End move and select', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'Phones get a disclosure per concept instead of tabs.');
    await openPlanner(page);
    await scenarios.B(page);
    await reveal(page);
    const tabs = result(page).getByRole('tab');
    await expect(tabs).toHaveCount(3);
    await tabs.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(result(page).getByRole('tabpanel')).toContainText('Каркасне підлогове');
    await page.keyboard.press('End');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  });

  test('prefers-reduced-motion: no planner animation or transition', async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'Motion rules are width-independent.');
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await openPlanner(page);
    await tick(page, questions.crops, 'Пшениця');
    const motion = await page.evaluate(() => {
      const styles = [...document.querySelectorAll('.grain-planner-root .planner-synthesis, .grain-planner-root .planner-facts li, .grain-planner-root .planner-question, .grain-planner-root .planner-choice-row')].map((element) => getComputedStyle(element));
      return { animations: styles.map((style) => style.animationName), transitions: styles.map((style) => style.transitionDuration) };
    });
    expect(new Set(motion.animations)).toEqual(new Set(['none']));
    // The site's own reduced-motion rule (globals.css) sets every transition to .01ms rather than
    // 0s; anything at or under 1 ms is no motion.
    expect(motion.transitions.every((duration) => duration.split(',').every((part) => parseFloat(part) <= 0.001))).toBe(true);
    await context.close();
  });
});

test.describe('Grain Planner preview — desktop layout', () => {
  test.skip(({ isMobile }) => isMobile, 'Desktop breakpoints — desktop-chromium project only.');

  test('from 1051 px the panel sits beside the consultation; at 1050 px it gives way to the strip', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPlanner(page);
    await tick(page, questions.crops, 'Пшениця');
    const panel = page.locator('.planner-panel.is-panel');
    const question = page.locator('.planner-question');
    await expect(panel).toBeVisible();
    await expect(page.locator('.planner-live-strip')).toBeHidden();
    const [panelBox, questionBox] = [await panel.boundingBox(), await question.boundingBox()];
    expect(panelBox && questionBox && panelBox.x > questionBox.x + questionBox.width).toBe(true);
    expect(await smallestDiagramLabel(page.locator('.planner-panel.is-panel .planner-diagram'))).toBeGreaterThanOrEqual(11);

    await page.setViewportSize({ width: 1051, height: 900 });
    await expect(panel).toBeVisible();
    expect(await smallestDiagramLabel(page.locator('.planner-panel.is-panel .planner-diagram'))).toBeGreaterThanOrEqual(11);

    await page.setViewportSize({ width: 1050, height: 900 });
    await expect(panel).toBeHidden();
    await expect(page.locator('.planner-live-strip')).toBeVisible();
  });

  test('the brief sits after the boundary on desktop, following the presentation config', async ({ page }) => {
    await openPlanner(page);
    await scenarios.A(page);
    await reveal(page);
    const order = await result(page).locator('.planner-result-block').evaluateAll((blocks) => blocks.map((block) => block.getAttribute('data-block')));
    expect(order).toEqual(['scenario', 'outcome', 'boundary', 'brief']);
  });
});
