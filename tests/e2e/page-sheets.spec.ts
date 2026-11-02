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
    return { band: section.id === 'vidpovidalnist', top: box.top + scrollY, bottom: box.bottom + scrollY, radius: parseFloat(style.borderTopLeftRadius), filled: style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none' };
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
          // the one approved band of two blocks on /yak-pratsyuiemo: it runs on, with no seam of its own
          if (sheet.band) {
            expect(sheet.radius, path).toBe(0);
            expect(Math.abs(sheets[index].bottom - sheet.top), path).toBeLessThanOrEqual(1);
            return;
          }
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

test.describe('the first sheet and the hero', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit windows');

  for (const path of ['/', '/metalokonstruktsii', '/betonni-roboty', '/angary', '/zernoskhovyshcha', '/pokrivelni-roboty', '/yak-pratsyuiemo', '/pro-nas', '/napryamky']) {
    for (const [width, height] of [[1440, 900], [1280, 720], [768, 1024]]) {
      test(`${path} at ${width}×${height}: no strip of the sheet along the first screen's foot`, async ({ page }) => {
        await open(page, path, width, height);
        const top = await page.locator('main > section').nth(1).evaluate((sheet) => sheet.getBoundingClientRect().top);
        expect(top).toBeGreaterThanOrEqual(height);
      });
    }
  }

  for (const path of ['/metalokonstruktsii', '/betonni-roboty', '/angary', '/zernoskhovyshcha', '/pokrivelni-roboty', '/yak-pratsyuiemo']) {
    for (const width of [1440, 1100, 768]) {
      test(`${path} at ${width}: the «Ілюстрація» stamp stays clear of the sheet`, async ({ page }) => {
        await open(page, path, width);
        const gap = await page.locator('main > :first-of-type').locator('.hero-provenance, .proc-provenance').evaluate((stamp) => {
          const sheet = stamp.closest('section')!.nextElementSibling!;
          return sheet.getBoundingClientRect().top - stamp.getBoundingClientRect().bottom;
        });
        expect(gap).toBeGreaterThanOrEqual(0);
      });
    }
  }
});

test.describe('the pages\' materials', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit windows');

  const material = (page: Page, selector: string) => page.locator(selector).first().evaluate((block) => getComputedStyle(block).backgroundImage);

  for (const [path, selector, file] of [
    ['/metalokonstruktsii', 'main > .page-section-dark', 'perforated-dark'],
    ['/metalokonstruktsii', 'main > .cost-section', 'scene-sparks-paper'],
    ['/betonni-roboty', 'main > .page-section-dark', 'concrete-dark'],
    ['/betonni-roboty', 'main > .cost-section', 'scene-pour-paper'],
    ['/angary', 'main > .angary-cost', 'scene-bays-paper'],
    ['/angary', 'main > .angary-process', 'panel-dark'],
    ['/zernoskhovyshcha', 'main > .grain-process-band', 'silo-dark'],
    ['/zernoskhovyshcha', 'main > .cost-section', 'grainfall-paper'],
    ['/pokrivelni-roboty', 'main > .direction-entry', 'scene-rain-paper'],
    ['/yak-pratsyuiemo', 'main > .proc-terms', 'scene-beams-paper'],
    ['/pro-nas', 'main > .team-about', 'scene-merge-paper'],
    ['/yak-pratsyuiemo', 'main > .proc-route', 'knurl-dark'],
    ['/pro-nas', 'main > .about-principles', 'brushed-dark'],
    ['/napryamky', 'main > .dhow', 'scene-five-dark'],
  ] as const) {
    test(`${path} ${selector}: ${file}, and the file answers`, async ({ page, request }) => {
      // a live scene takes over from the still picture on the screen: this is the picture it falls back to
      await page.emulateMedia({ reducedMotion: 'reduce' });
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
    expect(await material(page, 'main > .cost-section')).toContain('scene-sparks-dark');
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

test.describe('the live scenes', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit windows');

  for (const [path, selector] of [
    ['/metalokonstruktsii', 'main > .cost-section'], ['/betonni-roboty', 'main > .cost-section'], ['/angary', 'main > .angary-cost'],
    ['/zernoskhovyshcha', 'main > .cost-section'], ['/pokrivelni-roboty', 'main > .direction-entry'], ['/yak-pratsyuiemo', 'main > .proc-terms'],
    ['/pro-nas', 'main > .team-about'], ['/napryamky', 'main > .dhow'],
  ] as const) {
    test(`${path}: the scene wakes on the screen, and its pixels change`, async ({ page }) => {
      await open(page, path, 1440);
      const canvas = page.locator(`${selector} > canvas.live-scene`);
      await expect(canvas).toHaveCount(1);
      await canvas.scrollIntoViewIfNeeded();
      const pixels = () => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
      const first = await pixels();
      await expect.poll(pixels).not.toBe(first);
    });
  }

  test('a window narrowed after the page has loaded gets no sideways scroll, and the hub its band back', async ({ page }) => {
    await open(page, '/napryamky', 1440);
    const block = page.locator('main > .dhow');
    await block.scrollIntoViewIfNeeded();
    await expect.poll(() => block.evaluate((element) => element.style.getPropertyValue('--material'))).toBe('none');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.live-scene')).toBeHidden();
    await expect.poll(() => block.evaluate((element) => element.style.getPropertyValue('--material'))).toBe('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });

  test('a width without room, and reduced motion, keep the still picture', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, '/metalokonstruktsii', 1440);
    await expect(page.locator('.live-scene')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await open(page, '/metalokonstruktsii', 1000);
    await expect(page.locator('.live-scene')).toHaveCount(0);
  });
});
