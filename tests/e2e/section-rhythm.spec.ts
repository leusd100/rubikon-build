import { expect, test, type Page } from '@playwright/test';

// W3-03 (owner 25.10, OD-PX-17 A: PDO-21, PDO-22 A, PDO-15, PDO-62). One rule under a section header: where the content
// opens with its own top edge, the header's rule and the space above it go. A section's entry is denser: label → H2
// 20 / 16, H2 → lead 24 / 20, header → content 40 / 32 (desktop / phone). One phone scale, 72 / 56: no page sets its own.
// On metal, concrete and roofing the FAQ leads straight into the form and «Пов’язані напрямки» close the page after it,
// as on /angary; two neighbours of one tone meet at the compact space on both sides.
// Every test denies the optional cookies and answers any Google request with an empty 200, so no tag can load.

const DIRECTIONS = ['/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty'] as const;

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, path: string, width: number) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width, height: width < 761 ? 844 : 900 });
  await page.goto(path, { waitUntil: 'load' });
}

/** the main sections in reading order, by their own class (or id), with their paddings */
const sections = (page: Page) => page.evaluate(() => [...document.querySelectorAll('main > section')]
  .filter((section) => section.getBoundingClientRect().height > 0)
  .map((section) => {
    const style = getComputedStyle(section);
    const name = section.id || [...section.classList].find((cls) => /-section$|^conversation$/.test(cls) && cls !== 'page-section') || section.className;
    return { name, top: Math.round(parseFloat(style.paddingTop)), bottom: Math.round(parseFloat(style.paddingBottom)), closing: section.classList.contains('is-closing') };
  }));

for (const path of DIRECTIONS) {
  test(`${path}: the FAQ leads into the form and «Пов’язані напрямки» close the page`, async ({ page }) => {
    await open(page, path, 1440);
    const tail = (await sections(page)).slice(-4);
    expect(tail.map((section) => section.name)).toEqual(['cost-section', 'faq-section', 'inquiry', 'related-directions-section']);
    expect(tail[3].closing).toBe(true);
    await expect(page.locator('.related-directions-section').getByRole('heading', { level: 2 })).toHaveText('Пов’язані напрямки');

    // the FAQ's «Залишити запит ↓» still lands on the form, under the fixed header
    await page.locator('.faq-ask-write:visible').click();
    await expect.poll(async () => {
      const top = await page.locator('#inquiry').evaluate((el) => Math.round(el.getBoundingClientRect().top));
      return top >= 100 && top <= 130 ? 'under the header' : top;
    }).toBe('under the header');
  });
}

for (const { width, label, lead, header, costToFaq, compact } of [
  { width: 1440, label: 20, lead: 24, header: 40, costToFaq: 173, compact: 86 },
  { width: 390, label: 16, lead: 20, header: 32, costToFaq: 112, compact: 56 },
]) {
  test(`${width}px: one rule over the cost list, a denser entry and the compact seam to the FAQ`, async ({ page }) => {
    await open(page, '/metalokonstruktsii', width);
    const entry = await page.locator('.cost-section .section-header').evaluate((header) => {
      const box = (el: Element) => el.getBoundingClientRect();
      const style = getComputedStyle(header);
      const list = header.nextElementSibling!;
      return {
        rule: parseFloat(style.borderBottomWidth),
        listRule: parseFloat(getComputedStyle(list).borderTopWidth),
        label: Math.round(box(header.querySelector('h2')!).top - box(header.querySelector('.eyebrow')!).bottom),
        lead: Math.round(box(header.querySelector('.section-header-support')!).top - box(header.querySelector('h2')!).bottom),
        header: Math.round(box(list).top - box(header).bottom),
      };
    });
    expect(entry).toEqual({ rule: 0, listRule: 1, label, lead, header });

    const seam = await page.evaluate(() => {
      const list = document.querySelector('.cost-section .cost-list')!.getBoundingClientRect();
      const faqLabel = document.querySelector('.faq-section .eyebrow')!.getBoundingClientRect();
      return Math.round(faqLabel.top - list.bottom);
    });
    expect(Math.abs(seam - costToFaq)).toBeLessThanOrEqual(1);
    const [cost, faq] = (await sections(page)).filter((section) => /cost|faq/.test(section.name));
    expect(Math.abs(cost.bottom - compact)).toBeLessThanOrEqual(1);
    expect(Math.abs(faq.top - compact)).toBeLessThanOrEqual(1);

    // a list ruled only between its rows keeps the header's rule as its top: the /napryamky catalogue
    await open(page, '/napryamky', width);
    expect(await page.locator('#directions-list .section-header').evaluate((header) => parseFloat(getComputedStyle(header).borderBottomWidth))).toBe(1);
  });
}

test('390px: one phone scale — every section 72, a seam of one tone and /angary’s closing band 56', async ({ page }) => {
  const seen = new Set<number>();
  for (const path of ['/', '/napryamky', ...DIRECTIONS, '/angary', '/zernoskhovyshcha', '/yak-pratsyuiemo', '/pro-nas']) {
    await open(page, path, 390);
    // the phone heroes have their own top (under the header) and no bottom padding
    for (const section of (await sections(page)).slice(1)) {
      seen.add(section.top);
      expect([0, 48, 56, 72], `${path} ${section.name} top`).toContain(section.top);
    }
  }
  expect([...seen].sort((a, b) => a - b)).toEqual([0, 48, 56, 72]);
});
