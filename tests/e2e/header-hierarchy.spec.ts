import { expect, test, type Locator, type Page } from '@playwright/test';

// W1-09 · the header hierarchy (PDO-19; owner 20.10: OD-PX-08 a). Every test denies the optional cookies and answers any Google request with an empty
// 200, so no tag can load.

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

/** The share of an element's rendered pixels that read as a colour (HSV saturation > .35, value > .25), 0–1. */
async function saturatedShare(page: Page, target: Locator) {
  const png = await target.screenshot({ animations: 'disabled' });
  return page.evaluate(async (base64) => {
    // decoded in the page without a request (the app's CSP does not allow fetching a data: URL)
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    let saturated = 0;
    for (let index = 0; index < data.length; index += 4) {
      const max = Math.max(data[index], data[index + 1], data[index + 2]);
      const min = Math.min(data[index], data[index + 1], data[index + 2]);
      if (max / 255 > .25 && (max - min) / max > .35) saturated += 1;
    }
    return saturated / (data.length / 4);
  }, png.toString('base64'));
}

async function open(page: Page, path: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

test.describe('PDO-19 · header hierarchy', () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, 'the desktop header'));

  test('the number is the one framed element of the header, in the heroes’ face, and the groups stand apart', async ({ page }) => {
    test.setTimeout(60_000);
    for (const width of [1180, 1280, 1440, 1920]) {
      await open(page, '/metalokonstruktsii', width);
      const header = await page.locator('.site-header').evaluate((element) => {
        const shown = (node: Element) => {
          const box = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        };
        // a frame: a visible line on all four sides of a square box (the theme switch's rounded track is a switch)
        const framed = [...element.querySelectorAll('*')].filter(shown).filter((node) => {
          const style = getComputedStyle(node);
          const lined = ['Top', 'Right', 'Bottom', 'Left'].every((side) => {
            const color = style.getPropertyValue(`border-${side.toLowerCase()}-color`);
            return Number.parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) >= 1 && !/,\s*0\)$|transparent/.test(color);
          });
          return lined && Number.parseFloat(style.borderTopLeftRadius) < 8;
        });
        const strong = getComputedStyle(element.querySelector('.header-phone strong')!);
        const items = [...element.querySelectorAll('.desktop-nav a')].map((link) => link.getBoundingClientRect());
        const steps = items.slice(1).map((box, index) => box.left - items[index].right);
        const logo = element.querySelector('.brand-link')!.getBoundingClientRect();
        const contacts = element.querySelector('.header-actions')!.getBoundingClientRect();
        return {
          framed: framed.map((node) => (node.classList.contains('header-phone') ? 'header-phone' : node.className.toString())),
          face: strong.fontFamily, weight: strong.fontWeight, size: strong.fontSize,
          navWeight: getComputedStyle(element.querySelector('.desktop-nav')!).fontWeight,
          step: Math.max(...steps), groups: [items[0].left - logo.right, contacts.left - items.at(-1)!.right],
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(header.framed, `${width}px`).toEqual(['header-phone']);
      expect(header.face, `${width}px`).toContain('IBM Plex Sans Condensed');
      expect(header.weight, `${width}px`).toBe('600');
      expect(header.size, `${width}px`).toBe(width < 1280 ? '15px' : '17px');
      expect(header.navWeight, `${width}px`).toBe('600');
      for (const gap of header.groups) expect(gap, `${width}px: groups at least twice the items' step`).toBeGreaterThanOrEqual(2 * header.step - 0.5);
      expect(header.overflow, `${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test('below 1180 px the compact header calls in place of the number (GLB-03 A)', async ({ page }) => {
    for (const width of [1100, 1179]) {
      await open(page, '/metalokonstruktsii', width);
      await expect(page.locator('.site-header .mobile-call'), `${width}px`).toBeVisible();
      await expect(page.locator('.site-header .mobile-menu summary'), `${width}px`).toBeVisible();
      await expect(page.locator('.site-header .desktop-nav'), `${width}px`).toBeHidden();
      await expect(page.locator('.site-header .header-phone'), `${width}px`).toBeHidden();
    }
    await open(page, '/metalokonstruktsii', 1180);
    await expect(page.locator('.site-header .mobile-call')).toBeHidden();
    await expect(page.locator('.site-header .header-phone')).toBeVisible();
  });

  test('the messengers are grey at rest and take their colour back on hover and on keyboard focus', async ({ page }) => {
    test.setTimeout(60_000);
    for (const path of ['/metalokonstruktsii', '/']) {
      await open(page, path, 1440);
      for (const kind of ['telegram', 'whatsapp', 'viber']) {
        const link = page.locator(`.site-header .header-messengers .messenger-${kind}`);
        const icon = link.locator('.messenger-brand-icon');
        await page.mouse.move(700, 600);
        await expect.poll(() => saturatedShare(page, icon), `${path} ${kind} at rest`).toBeLessThanOrEqual(.005);
        await link.hover();
        await expect.poll(() => saturatedShare(page, icon), `${path} ${kind} on hover`).toBeGreaterThan(.1);
        await page.mouse.move(700, 600);
        await page.keyboard.press('Shift');
        await link.focus();
        expect(await link.evaluate((element) => element.matches(':focus-visible')), `${path} ${kind} focus-visible`).toBe(true);
        await expect.poll(() => saturatedShare(page, icon), `${path} ${kind} on keyboard focus`).toBeGreaterThan(.1);
        await link.blur();
      }
    }
    // the same grey in the footer; the mail icon and the theme switch's knob are grey too — copper is the number's
    for (const kind of ['telegram', 'whatsapp', 'viber']) {
      await expect(page.locator(`footer .messenger-${kind} .messenger-brand-icon`)).toHaveCSS('filter', /grayscale\(1\)/);
    }
    await expect(page.locator('.site-header .header-email svg')).toHaveCSS('color', 'rgb(189, 183, 172)');
    await expect(page.locator('.site-header .theme-switch-knob')).toHaveCSS('background-color', 'rgb(158, 152, 141)');
  });
});
