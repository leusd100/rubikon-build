import { expect, test, type Page } from '@playwright/test';
import { GRAIN_RESPONSIBILITY_STATEMENT } from '../../app/data/grainPage';
import { PREVIEW, collectRuntimeErrors, horizontalOverflow, openPlanner, result, reveal, scenarios } from './grain-planner.helpers';

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

test.describe('Grain page composition on /planner-preview', () => {
  test('is the full future page, in order, with one h1, one form and one #inquiry', async ({ page }) => {
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
    expect(errors).toEqual([]);
  });

  test('the hero leads into the planner and into the conversation', async ({ page }) => {
    await openPlanner(page);
    const hero = page.locator('.service-subhero');
    await expect(hero.getByRole('link', { name: /Сформувати задачу/ })).toHaveAttribute('href', '#planner');
    await expect(hero.getByRole('link', { name: /Обговорити з інженером/ })).toHaveAttribute('href', '#inquiry');
  });

  test('quotes the one responsibility statement in the hero, bands 04–05, the FAQ and the result — and never «не входить»', async ({ page }) => {
    await openPlanner(page);
    const holders = ['.service-subhero-lead', '.grain-implementation-band', '.grain-process-band', '.faq-section'];
    for (const selector of holders) expect(await page.locator(selector).first().textContent()).toContain(GRAIN_RESPONSIBILITY_STATEMENT);

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

// The spec's budget — 7.3 screens at 1440×900, 11.7 at 390×844 — is the height of the page the
// planner replaces. Measuring that page in the same run keeps the check honest under any font
// rendering (CI fonts are wider than macOS ones): the new composition may not be taller than it.
async function settledHeight(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'load' });
  const essential = page.getByRole('button', { name: 'Лише необхідні', exact: true });
  if (await essential.isVisible({ timeout: 10_000 }).catch(() => false)) await essential.click();
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => document.documentElement.scrollHeight);
}

test.describe('Grain page height budget (before the planner is used)', () => {
  test('desktop 1440×900: no taller than the page it replaces (spec budget 7.3 screens)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop budget');
    await page.setViewportSize({ width: 1440, height: 900 });
    const current = await settledHeight(page, '/zernoskhovyshcha');
    const composition = await settledHeight(page, PREVIEW);
    test.info().annotations.push({ type: 'height', description: `composition ${(composition / 900).toFixed(2)} screens, current page ${(current / 900).toFixed(2)}` });
    expect(composition).toBeLessThanOrEqual(current);
  });

  test('phone 390×844: no taller than the page it replaces (spec budget 11.7 screens), no overflow at 390 or 360', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone budget');
    await page.setViewportSize({ width: 390, height: 844 });
    const current = await settledHeight(page, '/zernoskhovyshcha');
    const composition = await settledHeight(page, PREVIEW);
    test.info().annotations.push({ type: 'height', description: `composition ${(composition / 844).toFixed(2)} screens, current page ${(current / 844).toFixed(2)}` });
    expect(composition).toBeLessThanOrEqual(current);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('Grain page without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the server HTML already carries the page', async ({ page }) => {
    await page.goto(PREVIEW, { waitUntil: 'load' });
    await expect(page.locator('h1')).toHaveCount(1);
    const jsonLd = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n');
    expect(jsonLd).toContain('"@type":"Service"');
    expect(jsonLd).toContain('"@type":"FAQPage"');
    expect(jsonLd).toContain('Чи займаєтеся ви технологічним обладнанням?');
    await expect(page.locator('#planner h2')).toContainText('Який зерновий об’єкт вам насправді потрібен?');
    await expect(page.locator('#planner').getByRole('heading', { name: 'Що потрібно зберігати?' })).toBeAttached();
    await expect(page.locator('#result article.planner-approach')).toHaveCount(3);
    await expect(page.locator('.grain-implementation-band h2')).toHaveText('Одна точка координації');
    await expect(page.locator('.grain-process-band h2')).toHaveText('Від опису до реалізації');
    await expect(page.locator('.faq-section summary')).toHaveCount(6);
    await expect(page.locator('.related-directions-section .related-card')).toHaveCount(3);
    await expect(page.locator('#inquiry form')).toHaveCount(1);
  });
});

test.describe('/zernoskhovyshcha while the flag is off', () => {
  test('is still the current page — no planner, the old bands, the old FAQ', async ({ page }) => {
    await page.goto('/zernoskhovyshcha', { waitUntil: 'load' });
    await expect(page.locator('#planner')).toHaveCount(0);
    await expect(page.locator('#result')).toHaveCount(0);
    await expect(page.locator('main')).toContainText('Склад робіт');
    await expect(page.locator('.cost-section')).toHaveCount(1);
    await expect(page.locator('main')).toContainText('лише за орієнтовною місткістю');
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
