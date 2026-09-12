import { expect, test, type Page } from '@playwright/test';

const EMAIL = 'office@rubikonbuild.com';
const MAILTO = `mailto:${EMAIL}`;

// Every page with the shared #inquiry section. The privacy page has the footer only.
const PAGES_WITH_INQUIRY = ['/', '/pro-nas', '/napryamky', '/angary', '/zernoskhovyshcha', '/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty'];

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function expectMailtoLink(page: Page, scope: string) {
  const link = page.locator(scope).getByRole('link', { name: EMAIL });
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', MAILTO);
  await link.scrollIntoViewIfNeeded();
  await expect(link).toBeVisible();
  await expect(link).toContainText(EMAIL);
}

test.describe('the corporate email', () => {
  for (const path of PAGES_WITH_INQUIRY) {
    test(`${path}: the footer and the inquiry area link it with mailto`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'load' });
      await expectMailtoLink(page, 'footer');
      await expectMailtoLink(page, '#inquiry .contact-links');
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test('the privacy page has it in the footer', async ({ page }) => {
    await page.goto('/polityka-konfidentsiinosti', { waitUntil: 'load' });
    await expectMailtoLink(page, 'footer');
  });

  test('the Organization structured data carries the same address, and no other mailbox appears', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const nodes = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((text) => JSON.parse(text) as Record<string, unknown>);
    const organization = nodes.find((node) => node['@id'] === 'https://rubikonbuild.com/#organization');
    expect(organization?.email).toBe(EMAIL);
    expect(await page.content()).not.toMatch(/\b(info|sales|projects)@rubikonbuild\.com/);
  });

  test('no horizontal overflow at 360 px, loaded fresh at that width', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone widths');
    await page.setViewportSize({ width: 360, height: 800 });
    for (const path of ['/', '/pro-nas', '/angary', '/polityka-konfidentsiinosti']) {
      await page.goto(path, { waitUntil: 'load' });
      expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
    }
  });
});
