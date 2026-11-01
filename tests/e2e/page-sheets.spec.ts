import { expect, test, type Page } from '@playwright/test';
import { getFromServer } from './server.helpers';

// «Колода» and the pages' materials (owner 01.11): every block after the first lies on the one before it, the footer closes
// the stack, and a page's text-only blocks carry its material in the void beside the heading (page-sheets.css,
// page-materials.css). Every test denies the optional cookies and answers Google with an empty 200.

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

const PAGES = ['/', '/napryamky', '/angary', '/zernoskhovyshcha', '/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/yak-pratsyuiemo', '/pro-nas'];

async function open(page: Page, path: string, width: number, height = 900) {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'load' });
}

const stack = (page: Page) => page.evaluate(() => {
  const sheets = [...document.querySelectorAll('main > section')].map((section) => {
    const box = section.getBoundingClientRect(), style = getComputedStyle(section);
    return { top: box.top + scrollY, bottom: box.bottom + scrollY, radius: parseFloat(style.borderTopLeftRadius), filled: style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none' };
  });
  const footer = document.querySelector('footer')!, box = footer.getBoundingClientRect();
  return {
    sheets, footerTop: box.top + scrollY, footerRadius: parseFloat(getComputedStyle(footer).borderTopLeftRadius),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});

test.describe('the blocks as a stack of sheets', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit windows');

  for (const [width, radius] of [[1440, 32], [390, 20]] as const) {
    test(`${width} px: each block lies ${radius} px over the one before, and the footer over the last`, async ({ page }) => {
      for (const path of PAGES) {
        await open(page, path, width);
        const { sheets, footerTop, footerRadius, overflow } = await stack(page);
        expect(sheets[0].radius, `${path}: the hero is not a sheet`).toBe(0);
        sheets.slice(1).forEach((sheet, index) => {
          expect(sheet.radius, `${path} ${index + 1}`).toBe(radius);
          expect(Math.abs(sheets[index].bottom - radius - sheet.top), `${path} ${index + 1}`).toBeLessThanOrEqual(1);
          expect(sheet.filled, `${path} ${index + 1}: a corner never shows a hole`).toBe(true);
        });
        expect(footerRadius, path).toBe(radius);
        expect(Math.abs(sheets.at(-1)!.bottom - radius - footerTop), path).toBeLessThanOrEqual(1);
        expect(overflow, path).toBe(0);
      }
    });
  }

  test('the pages outside the stack keep their square blocks', async ({ page }) => {
    await open(page, '/polityka-konfidentsiinosti', 1440);
    expect(await page.locator('footer').evaluate((footer) => getComputedStyle(footer).borderTopLeftRadius)).toBe('0px');
  });
});

test.describe('the pages\' materials', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit windows');

  const material = (page: Page, selector: string) => page.locator(selector).first().evaluate((block) => getComputedStyle(block).backgroundImage);

  for (const [path, selector, file] of [
    ['/metalokonstruktsii', 'main > .page-section-dark', 'perforated-dark'],
    ['/metalokonstruktsii', 'main > .cost-section', 'tread-paper'],
    ['/betonni-roboty', 'main > .page-section-dark', 'concrete-dark'],
    ['/betonni-roboty', 'main > .cost-section', 'concrete-paper'],
    ['/angary', 'main > .angary-process', 'panel-dark'],
    ['/zernoskhovyshcha', 'main > .grain-process-band', 'silo-dark'],
    ['/zernoskhovyshcha', 'main > .cost-section', 'grainfall-paper'],
    ['/pokrivelni-roboty', 'main > .direction-entry', 'sheet-paper'],
    ['/yak-pratsyuiemo', 'main > .proc-route', 'knurl-dark'],
    ['/pro-nas', 'main > .about-principles', 'concrete-dark'],
    ['/napryamky', 'main > .dhow', 'perforated-dark'],
  ] as const) {
    test(`${path} ${selector}: ${file}, and the file answers`, async ({ page, request }) => {
      await open(page, path, 1440);
      const image = await material(page, selector);
      expect(image).toContain(`/media/materials/${file}.`);
      const url = /url\("([^"]+materials[^"]+)"\)/.exec(image)![1];
      expect((await getFromServer(request, new URL(url).pathname)).status()).toBe(200);
    });
  }

  test('a paper block takes the surface\'s dark side in Dark', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('rubikon-theme', 'dark'));
    await open(page, '/metalokonstruktsii', 1440);
    expect(await material(page, 'main > .cost-section')).toContain('tread-dark');
  });

  test('a phone: dark blocks keep their band, paper blocks carry nothing', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 390, 844);
    expect(await material(page, 'main > .page-section-dark')).toContain('perforated-dark');
    expect(await material(page, 'main > .cost-section')).toBe('none');
  });
});

test.describe('the form on the band', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit windows');

  test('Light: the block is charcoal, the form stays paper; its text beside the form reads on the band', async ({ page }) => {
    await open(page, '/', 1440);
    const colours = await page.locator('#inquiry').evaluate((block) => ({
      block: getComputedStyle(block).backgroundColor,
      image: getComputedStyle(block).backgroundImage,
      form: getComputedStyle(block.querySelector('.inquiry-form')!).backgroundColor,
      heading: getComputedStyle(block.querySelector('h2')!).color,
    }));
    expect(colours.block).toBe('rgb(23, 25, 24)');
    expect(colours.image).toContain('contours-dark');
    expect(colours.form).toBe('rgb(250, 248, 243)');
    expect(colours.heading).toBe('rgb(245, 242, 235)');
  });

  test('contours belong to the form: no other block and not the footer draws them', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 1440);
    const others = await page.evaluate(() => [...document.querySelectorAll('main > section:not(.conversation), footer')].filter((block) => getComputedStyle(block).backgroundImage.includes('contours')).length);
    expect(others).toBe(0);
  });
});
