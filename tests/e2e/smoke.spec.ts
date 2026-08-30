import { expect, test, type Page } from '@playwright/test';

type PublicRoute = {
  path: string;
  hasProjectCta: boolean;
  hasHeroMedia: boolean;
};

const publicRoutes: PublicRoute[] = [
  { path: '/', hasProjectCta: true, hasHeroMedia: true },
  { path: '/napryamky', hasProjectCta: true, hasHeroMedia: true },
  { path: '/angary', hasProjectCta: true, hasHeroMedia: true },
  { path: '/zernoskhovyshcha', hasProjectCta: true, hasHeroMedia: true },
  { path: '/metalokonstruktsii', hasProjectCta: true, hasHeroMedia: true },
  { path: '/betonni-roboty', hasProjectCta: true, hasHeroMedia: true },
  { path: '/pokrivelni-roboty', hasProjectCta: true, hasHeroMedia: true },
  { path: '/pro-nas', hasProjectCta: true, hasHeroMedia: true },
  { path: '/polityka-konfidentsiinosti', hasProjectCta: false, hasHeroMedia: false },
];

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

  return errors;
}

test.describe('public route smoke tests', () => {
  for (const route of publicRoutes) {
    test(`${route.path} renders its critical shell`, async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);
      const response = await page.goto(route.path, { waitUntil: 'load' });

      expect(response?.status(), `${route.path} should return HTTP 200`).toBe(200);

      const header = page.locator('header.site-header');
      const main = page.locator('main#main-content');
      const hero = main.locator(':scope > section').first();
      const footer = page.locator('footer');

      await expect(header).toBeVisible();
      await expect(main).toBeVisible();
      await expect(hero).toBeVisible();
      await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(footer).toBeVisible();
      await expect(footer.locator('a[href="tel:+380682614264"]')).toHaveAttribute(
        'href',
        'tel:+380682614264',
      );

      if (route.hasProjectCta) {
        const projectCta = hero.getByRole('link', { name: 'Обговорити проєкт', exact: true });

        await expect(projectCta).toBeVisible();
        await expect(projectCta).toHaveAttribute('href', '#inquiry');
        await expect(page.locator('#inquiry')).toBeAttached();
      }

      if (route.hasHeroMedia) {
        expect(
          await hero.locator('img, video').count(),
          `${route.path} should retain its hero media`,
        ).toBeGreaterThan(0);
      }

      expect(runtimeErrors, `${route.path} should not emit browser runtime errors`).toEqual([]);
    });
  }

  test('homepage project CTA reaches the inquiry form', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });

    await page
      .locator('main > section')
      .first()
      .getByRole('link', { name: 'Обговорити проєкт', exact: true })
      .click();

    await expect(page).toHaveURL(/\/#inquiry$/);
    await expect(page.locator('#inquiry')).toBeVisible();
  });

  test('directions page links to every direction route', async ({ page }) => {
    const directionPaths = [
      '/angary',
      '/zernoskhovyshcha',
      '/metalokonstruktsii',
      '/betonni-roboty',
      '/pokrivelni-roboty',
    ];

    await page.goto('/napryamky', { waitUntil: 'load' });

    for (const path of directionPaths) {
      await expect(page.locator(`main a[href="${path}"]`).first()).toBeVisible();
    }
  });
});
