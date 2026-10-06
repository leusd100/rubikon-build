import { expect, test, type Page } from '@playwright/test';
import { GRAIN_HERO_BOUNDARY, GRAIN_RESPONSIBILITY_STATEMENT, GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT } from '../../app/data/grainPage';
import { GRAIN_PAGE, PREVIEW, collectRuntimeErrors, horizontalOverflow, openPlanner, result, reveal, scenarios } from './grain-planner.helpers';

/** The main bands in DOM order, named by what they are. */
async function bands(page: Page) {
  return page.locator('main > section').evaluateAll((sections) => sections.map((section) => {
    if (section.classList.contains('service-subhero')) return 'hero';
    if (section.id === 'kompleks') return 'complex';
    if (section.classList.contains('direction-entry')) return 'situations';
    if (section.id === 'planner') return 'planner';
    if (section.id === 'result') return 'result';
    if (section.classList.contains('grain-implementation-band')) return 'implementation';
    if (section.classList.contains('cost-section')) return 'cost';
    if (section.classList.contains('grain-process-band')) return 'process';
    if (section.classList.contains('faq-section')) return 'faq';
    if (section.classList.contains('related-directions-section')) return 'related';
    if (section.id === 'inquiry') return 'inquiry';
    return `other:${section.className}`;
  }));
}

const complex = (page: Page) => page.locator('#kompleks');
/** The chain as the title block shows it (its arrows; a screen reader hears the same modules by commas) */
const chain = (page: Page) => complex(page).locator('.sheet-cell-main b [aria-hidden="true"]');
const inquiryComment = (page: Page) => page.locator('#inquiry-comment');

// /zernoskhovyshcha since 06.10: the complex on a drawing (owner's choice B) replaced the planner, with «З чим
// звертаються» and the cost factors. The planner composition stays on the noindex /planner-preview (below).
test.describe('Grain page composition on /zernoskhovyshcha', () => {
  test('is the full page, in order, indexable, with one h1, one form and one #inquiry', async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await openPlanner(page, GRAIN_PAGE);
    expect(await bands(page)).toEqual(['hero', 'complex', 'situations', 'implementation', 'cost', 'process', 'faq', 'related', 'inquiry']);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('form')).toHaveCount(1);
    await expect(page.locator('#inquiry')).toHaveCount(1);
    await expect(page.locator('#planner, #result')).toHaveCount(0);
    await expect(page.getByText('Реальні об’єкти')).toHaveCount(0);
    expect(await page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '')).not.toMatch(/noindex/);
    expect(errors).toEqual([]);
  });

  test('the hero leads into the complex and into the conversation', async ({ page, isMobile }) => {
    await openPlanner(page, GRAIN_PAGE);
    const hero = page.locator('.service-subhero');
    await expect(hero.getByRole('link', { name: /Скласти комплекс/ })).toHaveAttribute('href', '#kompleks');
    // A phone leads with the call and the complex; the conversation is one tap away in «Контакти» (UX pass 2026-10).
    if (isMobile) await expect(hero.locator('a.hero-call-phone')).toBeVisible();
    else await expect(hero.getByRole('link', { name: /Обговорити зерносховище/ })).toHaveAttribute('href', '#inquiry');
  });

  test('states the boundary: short in the hero, whole beside the building part and in the FAQ; preserves the Planner decision', async ({ page }) => {
    await openPlanner(page, GRAIN_PAGE);
    await expect(page.locator('.service-subhero-lead').first()).toContainText(GRAIN_HERO_BOUNDARY);
    for (const selector of ['.grain-implementation-band', '.faq-section']) await expect(page.locator(selector)).toContainText(GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT);
    await expect(page.locator('.grain-process-band')).toContainText('склад будівельних робіт');
    const text = (await page.locator('main').textContent()) ?? '';
    expect(text).not.toContain(GRAIN_RESPONSIBILITY_STATEMENT);
    expect(text).not.toMatch(/не\s+вход(ить|ять)/i);
  });

  test('the complex starts the message with the chosen chain, and keeps it out of the URL, the server HTML and storage', async ({ page }) => {
    await openPlanner(page, GRAIN_PAGE);
    await complex(page).getByRole('checkbox', { name: 'Очищення' }).uncheck();
    await complex(page).getByRole('radio', { name: 'Підлогове сховище' }).check();
    await complex(page).getByRole('radio', { name: '5–20 тис. т' }).check();
    await expect(chain(page)).toHaveText('Приймання → Сушіння → Підлогове сховище → Відвантаження');
    // said once, outside the title block (which a phone does not show)
    await expect(complex(page).locator('p.sr-only[aria-live="polite"]')).toHaveText('Ланцюг: Приймання, Сушіння, Підлогове сховище, Відвантаження');
    await expect(complex(page).locator('.gc-scope')).not.toContainText('Машина очищення');
    // the one visible «Обговорити такий комплекс»: in the title block on a laptop, after the choices on a phone
    await complex(page).getByRole('link', { name: /Обговорити такий комплекс/ }).click();
    await expect(inquiryComment(page)).toHaveValue('Зерновий комплекс: пшениця, кукурудза; сушіння, підлогове сховище, орієнтовно 5–20 тис. т. ');
    const url = new URL(page.url());
    expect(url.search).toBe('');
    expect(['', '#inquiry']).toContain(url.hash);
    // The page is statically rendered: what a crawler (or the next visitor) gets is the opening picture, no message
    const html = await (await page.request.get(GRAIN_PAGE)).text();
    expect(html).not.toContain('Зерновий комплекс:');
    expect(html).toContain('Зберіть свій комплекс на кресленні');
    const stored = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((key) => /grain|complex|kompleks|brief|inquiry/i.test(key)));
    expect(stored).toEqual([]);
  });

  test('a second complex replaces the line the first one wrote, never the visitor\'s own words', async ({ page }) => {
    await openPlanner(page, GRAIN_PAGE);
    const discuss = complex(page).getByRole('link', { name: /Обговорити такий комплекс/ });
    await complex(page).getByRole('radio', { name: 'Підлогове сховище' }).check();
    await discuss.click();
    await expect(inquiryComment(page)).toHaveValue(/підлогове сховище, орієнтовно 1–5 тис\. т\. $/);
    await complex(page).getByRole('radio', { name: 'Силоси' }).check();
    await complex(page).getByRole('radio', { name: 'понад 20 тис. т' }).check();
    await discuss.click();
    await expect(inquiryComment(page)).toHaveValue(/силоси, орієнтовно понад 20 тис\. т\. $/);
    await inquiryComment(page).fill('Своїми словами: склад на 3 тис. т');
    await complex(page).getByRole('radio', { name: 'до 1 тис. т' }).check();
    await discuss.click();
    await expect(inquiryComment(page)).toHaveValue('Своїми словами: склад на 3 тис. т');
  });

  test('on a low screen the complex still assembles, and its drawing scrolls away with the page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the explicit low viewport runs once');
    // a phone on its side; a 1366 × 768 laptop at 200 % is the same (683 × 384)
    await page.setViewportSize({ width: 640, height: 360 });
    await openPlanner(page, GRAIN_PAGE);
    await complex(page).locator('.gc-visual').scrollIntoViewIfNeeded();
    await expect(complex(page).locator('.gc')).not.toHaveAttribute('data-gc', 'armed', { timeout: 5_000 });
    expect(await complex(page).locator('.gc-sheet').evaluate((sheet) => getComputedStyle(sheet).position)).not.toBe('sticky');
  });

  test('the opening picture alone starts no message', async ({ page }) => {
    await openPlanner(page, GRAIN_PAGE);
    await complex(page).getByRole('link', { name: /Обговорити такий комплекс/ }).click();
    await expect(inquiryComment(page)).toHaveValue('');
  });

  test('a situation starts the message with its own name', async ({ page }) => {
    await openPlanner(page, GRAIN_PAGE);
    const card = page.locator('.gs-card', { hasText: 'Основа під силоси' });
    await card.getByRole('link', { name: /Обговорити/ }).click();
    await expect(inquiryComment(page)).toHaveValue('Основа під силоси. ');
  });

  test('the drawing answers a pointer: a tip names who builds what, a press changes the complex', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a mouse points; a phone has the chips, tested above');
    await openPlanner(page, GRAIN_PAGE);
    const dryer = complex(page).locator('.gc-hit[data-module="drying"]');
    await dryer.scrollIntoViewIfNeeded();
    await dryer.hover();
    const tip = complex(page).locator('.gc-tip');
    await expect(tip).toContainText('Сушіння');
    await expect(tip).toContainText('RUBIKON: Фундамент під сушарку');
    await expect(tip).toContainText('Спеціалісти: Зерносушарка');
    await dryer.click();
    await expect(complex(page).getByRole('checkbox', { name: 'Сушіння' })).not.toBeChecked();
    await expect(chain(page)).toHaveText('Приймання → Очищення → Силоси → Відвантаження');
    await complex(page).locator('.gc-hit[data-module="storage"]').click();
    await expect(complex(page).getByRole('radio', { name: 'Підлогове сховище' })).toBeChecked();
    await page.mouse.move(2, 2);
    await expect(tip).toHaveCount(0);
  });

  test('never skips a heading level', async ({ page }) => {
    await openPlanner(page, GRAIN_PAGE);
    const levels = await page.locator('main').locator('h1, h2, h3, h4, h5, h6').evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
    expect(levels[0]).toBe(1);
    const skips = levels.flatMap((level, index) => (index > 0 && level > levels[index - 1] + 1 ? [`h${levels[index - 1]}→h${level} at #${index}`] : []));
    expect(skips).toEqual([]);
  });

  test('related directions are concrete, steel and roofing, and every link resolves', async ({ page, request }) => {
    await openPlanner(page, GRAIN_PAGE);
    const hrefs = await page.locator('.related-directions-section .related-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('href')));
    expect(hrefs).toEqual(['/betonni-roboty', '/metalokonstruktsii', '/pokrivelni-roboty']);
    for (const href of hrefs) expect((await request.get(href ?? '')).status()).toBe(200);
  });
});

// The spec's budget was the height of the page the planner replaced (measured in Phase 4: 7.31 and 11.70 screens at
// 1440×900 and 390×844). Sprint 1 (first contact) deliberately added the hero's «Зателефонувати» call: it shares the
// buttons' row on desktop (height unchanged, 7.3) but takes its own row on phones (+0.07 screens), so the phone budget
// was 11.8.
// HOME slice 01 (#115) then made the inquiry form's helper text 13 px (it was 10–11 px, and the form is shared by every
// page that ends in it) and gave the footer's links 24 px targets. Both are deliberate (mobile readability and target
// size) and both lengthen this page: +77 px on macOS (11.71 → 11.80 screens), and 11.82 screens (9 979 px) on the Linux
// CI runner, which is over 11.8. The phone budget is therefore 11.85 — content may not grow into that margin.
// Main Regression found this only after #115 merged, because a change to globals.css did not start the planner job;
// scripts/ci/classify-changes.mjs now starts it.
// UX pass 2026-10 raised body copy to 15–16 px site-wide (process steps, cost rows, FAQ answers, planner labels): the
// desktop page grows ~110 px (7.23 → 7.36 screens), so the desktop budget is 7.4. The same pass folds the closing form
// on a phone behind «Залишити запит», so the phone page is ~1.1 screens shorter and stays well inside 11.85.
// Owner, 02.10: the grain hero is now the window's height like every direction hero (it was 78 % of it, a «reveal» of
// the planner): +198 px at 1440×900 (7.37 → 7.59 screens), so the desktop budget is 7.65 — content may not grow into it.
// Owner, 06.10 (#149): the complex on a drawing replaced the planner, and two blocks he chose joined it — «З чим
// звертаються» (four situations) and the cost factors — while the process band became «Ви · Ми» with each step's result
// drawn: 7.63 → 8.95 screens at 1440×900 and 9.84 → 12.51 at 390×844 (macOS). The budgets are 9.0 and 12.6 — content
// may not grow into that margin.
// The page is measured without the cookie banner. While it shows, the footer keeps its clearance below the links
// (+237 px at 1440×900), and it mounts only after hydration, which can land after `load`; `isVisible()` doesn't wait
// for it (its timeout is ignored), so the budget used to be measured with or without that padding by chance.
async function settledHeight(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'load' });
  const essential = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  await expect(essential).toBeVisible({ timeout: 10_000 });
  await essential.click();
  await expect(page.locator('.cookie-banner')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => document.documentElement.scrollHeight);
}

test.describe('Grain page height budget', () => {
  test('desktop 1440×900: within 9.0 screens', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop budget');
    await page.setViewportSize({ width: 1440, height: 900 });
    const screens = (await settledHeight(page, GRAIN_PAGE)) / 900;
    test.info().annotations.push({ type: 'height', description: `${screens.toFixed(2)} screens` });
    expect(screens, 'screens at 1440×900').toBeLessThanOrEqual(9.0);
  });

  test('phone 390×844: within 12.6 screens, no overflow at 390 or 360', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone budget');
    await page.setViewportSize({ width: 390, height: 844 });
    const screens = (await settledHeight(page, GRAIN_PAGE)) / 844;
    test.info().annotations.push({ type: 'height', description: `${screens.toFixed(2)} screens` });
    expect(screens, 'screens at 390×844').toBeLessThanOrEqual(12.6);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('Grain page without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the server HTML already carries the page', async ({ page }) => {
    await page.goto(GRAIN_PAGE, { waitUntil: 'load' });
    await expect(page.locator('h1')).toHaveCount(1);
    const jsonLd = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n');
    expect(jsonLd).toContain('"@type":"Service"');
    expect(jsonLd).toContain('"@type":"FAQPage"');
    expect(jsonLd).toContain('Чи займаєтеся ви технологічним обладнанням?');
    await expect(page.locator('#kompleks h2')).toHaveText('Зберіть свій комплекс на кресленні');
    // the whole complex at work, drawn, with every choice as a real form control
    await expect(page.locator('#kompleks svg[role="img"]')).toHaveAttribute('aria-label', 'Схема зернового комплексу: Приймання, Очищення, Сушіння, Силоси, Відвантаження — пшениця, кукурудза');
    await expect(page.locator('#kompleks input[type="checkbox"]')).toHaveCount(8);
    await expect(page.locator('#kompleks input[type="radio"]')).toHaveCount(7);
    await expect(page.locator('.direction-entry .gs-card')).toHaveCount(4);
    await expect(page.locator('.grain-implementation-band h2')).toHaveText('Будівельна частина');
    await expect(page.locator('.cost-section h2')).toHaveText('Вартість визначає склад комплексу, а не одна цифра за тонну');
    await expect(page.locator('.grain-process-band h2')).toHaveText('Від опису до реалізації');
    await expect(page.locator('.faq-section summary')).toHaveCount(5);
    await expect(page.locator('.related-directions-section .related-card')).toHaveCount(3);
    await expect(page.locator('#inquiry form')).toHaveCount(1);
  });
});

// The planner composition /zernoskhovyshcha showed until 06.10 stays on the noindex preview, with its own guarantees
test.describe('/planner-preview keeps the planner composition', () => {
  test('renders it in order and stays noindex', async ({ page }) => {
    await openPlanner(page, PREVIEW);
    expect(await bands(page)).toEqual(['hero', 'planner', 'result', 'implementation', 'process', 'faq', 'related', 'inquiry']);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.evaluate(() => {
      const planner = document.getElementById('planner');
      const resultBand = document.getElementById('result');
      return Boolean(planner && resultBand && planner.nextElementSibling === resultBand && !planner.contains(resultBand));
    })).toBe(true);
  });

  test('states the website boundary and preserves the Planner decision in the result', async ({ page }) => {
    await openPlanner(page, PREVIEW);
    await expect(page.locator('.service-subhero-lead').first()).toContainText(GRAIN_HERO_BOUNDARY);
    for (const selector of ['.grain-implementation-band', '.faq-section']) await expect(page.locator(selector)).toContainText(GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT);
    await expect(page.locator('.grain-process-band')).toContainText('склад будівельних робіт');
    await scenarios.A(page);
    await reveal(page);
    await expect(result(page).locator('.planner-responsibility')).toContainText(GRAIN_RESPONSIBILITY_STATEMENT);
    expect(await page.locator('main').textContent()).not.toMatch(/не\s+вход(ить|ять)/i);
  });

  test('keeps personal answers out of the URL', async ({ page }) => {
    await openPlanner(page, PREVIEW);
    await scenarios.B(page);
    await reveal(page);
    await result(page).getByRole('link', { name: /Передати опис RUBIKON/ }).click();
    const url = new URL(page.url());
    expect(url.search).toBe('');
    expect(['', '#planner', '#result', '#inquiry']).toContain(url.hash);
  });

  test('keeps personal answers out of the server HTML and out of browser storage', async ({ page }) => {
    await openPlanner(page, PREVIEW);
    await scenarios.B(page);
    await reveal(page);
    const headline = 'окремі партії · очищення + сушіння';
    await expect(page.locator('form.inquiry-form .inquiry-config-brief strong')).toContainText(headline);
    // The page is statically rendered: what a crawler (or the next visitor) gets is the initial state.
    const html = await (await page.request.get(PREVIEW)).text();
    expect(html).not.toContain(headline);
    expect(html).toContain('Що потрібно зберігати?');
    // The brief and the attached card render only in the browser. The RSC payload does name the
    // CTA's gate selector, so the elements are looked for in the markup, scripts aside.
    const markup = await page.evaluate((source) => {
      const doc = new DOMParser().parseFromString(source, 'text/html');
      for (const script of doc.querySelectorAll('script')) script.remove();
      return doc.documentElement.outerHTML;
    }, html);
    for (const element of ['data-planner-brief', 'inquiry-config-brief']) expect(markup).not.toContain(element);
    const stored = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((key) => /planner|grain|brief|inquiry/i.test(key)));
    expect(stored).toEqual([]);
  });
});
