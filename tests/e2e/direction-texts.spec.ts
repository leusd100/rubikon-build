import { expect, test, type Page } from '@playwright/test';
import { company } from '../../app/data/company';

// W2-04 · direction texts and the form's hint (owner 24.10: PDO-33 A, PDO-66, PDO-67, PDO-31 A′) — every line in words
// the site already says. Tests that only read deny the optional cookies; the one that counts a contact_click grants
// analytics and answers every Google request with an empty 200, so no tag ever loads.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
});

async function open(page: Page, path: string, width: number, analytics: 'denied' | 'granted' = 'denied') {
  await page.addInitScript((value) => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: value, advertising: 'denied' }));
  }, analytics);
  await page.setViewportSize({ width, height: width < 761 ? 844 : 900 });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

test.describe('direction texts (W2-04)', () => {
  test('/betonni-roboty: the cost keeps the floors\' boundary, and names no evenness class (PDO-33)', async ({ page }) => {
    await open(page, '/betonni-roboty', 1440);
    const cost = page.locator('.cost-section');
    await expect(cost).toContainText('вимог до рівності основи');
    await expect(cost).toContainText('Рівність бетонної основи та умови експлуатації; спеціалізовані етапи підлог — за окремим погодженням.');
    await expect(cost).not.toContainText(/клас\S*\s+рівності/i);
  });

  test('/napryamky: steel says what we erect and what we organise (PDO-66)', async ({ page }) => {
    await open(page, '/napryamky', 1440);
    await expect(page.locator('a.route-service[href="/metalokonstruktsii"]')).toContainText('Монтуємо каркаси, ферми й окремі вузли; виготовлення організовуємо — за погодженою документацією.');
  });

  test('/metalokonstruktsii: concrete joins the related directions, in one row from 761 px (PDO-67)', async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await open(page, '/metalokonstruktsii', width);
      const cards = page.locator('.related-directions-section .related-card');
      await expect(cards).toHaveCount(3);
      await expect(cards.nth(2)).toHaveAttribute('href', '/betonni-roboty');
      await expect(cards.nth(2)).toContainText('Основа під каркас: фундаменти та бетонні основи за проєктом.');
      const tops = await cards.evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
      if (width >= 761) expect(new Set(tops).size, `${width}px`).toBe(1);
    }
  });

  test('/metalokonstruktsii: «Хто закуповує метал?» is answered from the Delivery Model, also for search (PDO-67)', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 1440);
    const third = page.locator('.faq-section details').nth(2);
    await expect(third.locator('h3')).toHaveText('Хто закуповує метал?');
    await third.locator('summary').click();
    await expect(third.locator('p')).toHaveText('Матеріали закуповує RUBIKON або надає замовник — залежно від договору.');
    const faqData = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((script) => script.textContent ?? '').join('\n'));
    expect(faqData).toContain('Хто закуповує метал?');
  });

  test('the comment\'s hint says where drawings go, by links that count as contacts (PDO-31 A′)', async ({ page }) => {
    // the links would leave the page: their default is held back, the tracking listener still sees the click
    await page.addInitScript(() => {
      document.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('#inquiry-comment-hint a')) event.preventDefault();
      }, true);
    });
    await open(page, '/metalokonstruktsii', 1440, 'granted');
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.rubikonAnalyticsConfigured ?? '')).not.toBe('');
    const hint = page.locator('#inquiry-comment-hint');
    await expect(hint).toHaveText(`Креслення можна надіслати на ${company.email} або в Telegram.`);
    const email = hint.getByRole('link', { name: company.email });
    const telegram = hint.getByRole('link', { name: 'Telegram' });
    await expect(email).toHaveAttribute('href', `mailto:${company.email}`);
    await expect(telegram).toHaveAttribute('href', /^https:\/\/t\.me\//);
    await expect(telegram).toHaveAttribute('target', '_blank');
    const clicks = () => page.evaluate(() => (window.dataLayer ?? [])
      .map((entry) => Array.from(entry as ArrayLike<unknown>))
      .filter((entry) => entry[0] === 'event' && entry[1] === 'contact_click')
      .map((entry) => (entry[2] as { contact_method?: string }).contact_method));
    await email.click();
    await telegram.click();
    await expect.poll(clicks).toEqual(['email', 'telegram']);
  });
});
