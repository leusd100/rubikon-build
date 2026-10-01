import { expect, test, type Page } from '@playwright/test';
import { GRAIN_RESPONSIBILITY_STATEMENT, GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT } from '../../app/data/grainPage';
import { GRAIN_PAGE, PREVIEW, collectRuntimeErrors, horizontalOverflow, openPlanner, result, reveal, scenarios } from './grain-planner.helpers';

/** The main bands in DOM order, named by what they are. */
async function bands(page: Page) {
  return page.locator('main > section').evaluateAll((sections) => sections.map((section) => {
    if (section.classList.contains('service-subhero')) return 'hero';
    if (section.id === 'planner') return 'planner';
    if (section.id === 'result') return 'result';
    if (section.classList.contains('grain-implementation-band')) return 'implementation';
    if (section.classList.contains('grain-process-band')) return 'process';
    if (section.classList.contains('faq-section')) return 'faq';
    if (section.classList.contains('related-directions-section')) return 'related';
    if (section.id === 'inquiry') return 'inquiry';
    return `other:${section.className}`;
  }));
}

test.describe('Grain page composition on /zernoskhovyshcha', () => {
  test('is the full page, in order, indexable, with one h1, one form and one #inquiry', async ({ page }) => {
    const errors = collectRuntimeErrors(page);
    await openPlanner(page);
    expect(await bands(page)).toEqual(['hero', 'planner', 'result', 'implementation', 'process', 'faq', 'related', 'inquiry']);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('form')).toHaveCount(1);
    await expect(page.locator('#inquiry')).toHaveCount(1);
    expect(await page.evaluate(() => {
      const planner = document.getElementById('planner');
      const resultBand = document.getElementById('result');
      return Boolean(planner && resultBand && planner.nextElementSibling === resultBand && !planner.contains(resultBand));
    })).toBe(true);
    await expect(page.getByText('Реальні об’єкти')).toHaveCount(0);
    expect(await page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '')).not.toMatch(/noindex/);
    expect(errors).toEqual([]);
  });

  test('the hero leads into the planner and into the conversation', async ({ page }) => {
    await openPlanner(page);
    const hero = page.locator('.service-subhero');
    await expect(hero.getByRole('link', { name: /Сформувати задачу/ })).toHaveAttribute('href', '#planner');
    await expect(hero.getByRole('link', { name: /Обговорити зерносховище/ })).toHaveAttribute('href', '#inquiry');
  });

  test('states the website boundary in the hero and FAQ, keeps short process copy, and preserves the Planner decision', async ({ page }) => {
    await openPlanner(page);
    const holders = ['.service-subhero-lead', '.faq-section'];
    for (const selector of holders) expect(await page.locator(selector).first().textContent()).toContain(GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT);
    await expect(page.locator('.grain-implementation-band')).toContainText('погоджену будівельну частину');
    await expect(page.locator('.grain-process-band')).toContainText('склад будівельних робіт');

    await scenarios.A(page);
    await reveal(page);
    await expect(result(page).locator('.planner-responsibility')).toContainText(GRAIN_RESPONSIBILITY_STATEMENT);
    expect(await page.locator('main').textContent()).not.toMatch(/не\s+вход(ить|ять)/i);
  });

  test('keeps personal answers out of the URL', async ({ page }) => {
    await openPlanner(page);
    await scenarios.B(page);
    await reveal(page);
    await result(page).getByRole('link', { name: /Передати опис RUBIKON/ }).click();
    const url = new URL(page.url());
    expect(url.search).toBe('');
    expect(['', '#planner', '#result', '#inquiry']).toContain(url.hash);
  });

  test('keeps personal answers out of the server HTML and out of browser storage', async ({ page }) => {
    await openPlanner(page);
    await scenarios.B(page);
    await reveal(page);
    const headline = 'окремі партії · очищення + сушіння';
    await expect(page.locator('form.inquiry-form .inquiry-config-brief strong')).toContainText(headline);
    // The page is statically rendered: what a crawler (or the next visitor) gets is the initial state.
    const html = await (await page.request.get(GRAIN_PAGE)).text();
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

  test('never skips a heading level', async ({ page }) => {
    await openPlanner(page);
    const levels = await page.locator('main').locator('h1, h2, h3, h4, h5, h6').evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
    expect(levels[0]).toBe(1);
    const skips = levels.flatMap((level, index) => (index > 0 && level > levels[index - 1] + 1 ? [`h${levels[index - 1]}→h${level} at #${index}`] : []));
    expect(skips).toEqual([]);
  });

  test('related directions are concrete, steel and roofing, and every link resolves', async ({ page, request }) => {
    await openPlanner(page);
    const hrefs = await page.locator('.related-directions-section .related-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('href')));
    expect(hrefs).toEqual(['/betonni-roboty', '/metalokonstruktsii', '/pokrivelni-roboty']);
    for (const href of hrefs) expect((await request.get(href ?? '')).status()).toBe(200);
  });
});

// The spec's budget before the planner is used was the height of the page the planner replaced (measured in
// Phase 4: 7.31 and 11.70 screens at 1440×900 and 390×844). Sprint 1 (first contact) deliberately added the hero's
// «Зателефонувати» call: it shares the buttons' row on desktop (height unchanged, 7.3) but takes its own row on phones
// (+0.07 screens), so the phone budget was 11.8.
// HOME slice 01 (#115) then made the inquiry form's helper text 13 px (it was 10–11 px, and the form is shared by every
// page that ends in it) and gave the footer's links 24 px targets. Both are deliberate (mobile readability and target
// size) and both lengthen this page: +77 px on macOS (11.71 → 11.80 screens), and 11.82 screens (9 979 px) on the Linux
// CI runner, which is over 11.8. The phone budget is therefore 11.85 — content may not grow into that margin.
// Main Regression found this only after #115 merged, because a change to globals.css did not start the planner job;
// scripts/ci/classify-changes.mjs now starts it.
async function settledHeight(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'load' });
  const essential = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  if (await essential.isVisible({ timeout: 10_000 }).catch(() => false)) await essential.click();
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => document.documentElement.scrollHeight);
}

test.describe('Grain page height budget (before the planner is used)', () => {
  test('desktop 1440×900: within 7.3 screens', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop budget');
    await page.setViewportSize({ width: 1440, height: 900 });
    const screens = (await settledHeight(page, GRAIN_PAGE)) / 900;
    test.info().annotations.push({ type: 'height', description: `${screens.toFixed(2)} screens` });
    expect(screens, 'screens at 1440×900').toBeLessThanOrEqual(7.3);
  });

  test('phone 390×844: within 11.85 screens, no overflow at 390 or 360', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone budget');
    await page.setViewportSize({ width: 390, height: 844 });
    const screens = (await settledHeight(page, GRAIN_PAGE)) / 844;
    test.info().annotations.push({ type: 'height', description: `${screens.toFixed(2)} screens` });
    expect(screens, 'screens at 390×844').toBeLessThanOrEqual(11.85);
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
    await expect(page.locator('#planner h2')).toContainText('Який зерновий об’єкт вам насправді потрібен?');
    await expect(page.locator('#planner').getByRole('heading', { name: 'Що потрібно зберігати?' })).toBeAttached();
    await expect(page.locator('#result article.planner-approach')).toHaveCount(3);
    await expect(page.locator('.grain-implementation-band h2')).toHaveText('Координуємо погоджену будівельну частину');
    await expect(page.locator('.grain-process-band h2')).toHaveText('Від опису до реалізації');
    await expect(page.locator('.faq-section summary')).toHaveCount(6);
    await expect(page.locator('.related-directions-section .related-card')).toHaveCount(3);
    await expect(page.locator('#inquiry form')).toHaveCount(1);
  });
});

test.describe('/planner-preview after the switch', () => {
  test('renders the same composition and stays noindex', async ({ page }) => {
    await openPlanner(page, PREVIEW);
    expect(await bands(page)).toEqual(['hero', 'planner', 'result', 'implementation', 'process', 'faq', 'related', 'inquiry']);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
