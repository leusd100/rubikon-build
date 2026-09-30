import { expect, test } from '@playwright/test';

const routes = ['/', '/napryamky', '/yak-pratsyuiemo', '/angary', '/zernoskhovyshcha', '/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty'];
for (const width of [375, 768, 1440]) {
  test(`P01 rendered claims and copy wrapping at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      const copy = await page.locator('main').evaluate((main) => {
        const content = main.cloneNode(true) as HTMLElement;
        // D-04: Planner remains unchanged; this guard owns the website bands around it.
        content.querySelectorAll('#planner, .grain-approaches').forEach((node) => node.remove());
        return content.textContent ?? '';
      });
      expect(copy, route).not.toMatch(/власне виробництво|власний цех|власне або на організованому|по всій Україні|30\+|1995|Формуємо конструктивну схему/iu);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
      const descriptions = await page.locator('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('content')));
      expect(descriptions.join(' ')).not.toMatch(/по всій Україні|Дніпрі та Україні|власне виробництво/iu);
      const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
      for (const json of schema) {
        const data = JSON.parse(json);
        if (data.areaServed) expect(data.areaServed.map((area: { name: string }) => area.name)).toEqual(['Дніпропетровська область']);
      }
      if (route === '/') {
        await expect(page.locator('.hero-actions a').first()).toHaveAttribute('href', /^tel:/);
        await expect(page.locator('#real-object')).toHaveCount(1);
        await expect(page.locator('#real-object')).toContainText('Сергій Іванович працював над цим об’єктом до створення RUBIKON BUILD');
        await expect(page.locator('#real-object')).toContainText('Каркас');
      }
      if (route === '/yak-pratsyuiemo') {
        // The result promise is said once, on the comprehensive scope card; the responsibility map does not repeat it
        await expect(page.locator('#obsiah')).toContainText('беремо погоджений комплекс');
        await expect(page.locator('#etapy')).toContainText('Проєкт надає замовник або його окремий проєктувальник');
      }
    }
  });
}
