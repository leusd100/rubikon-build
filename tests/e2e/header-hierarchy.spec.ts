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
    for (const width of [1180, 1181, 1279, 1280, 1440, 1920]) {
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
          logo: Math.round(element.querySelector('.brand-link .brand')!.getBoundingClientRect().width),
          step: Math.max(...steps), groups: [items[0].left - logo.right, contacts.left - items.at(-1)!.right],
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(header.framed, `${width}px`).toEqual(['header-phone']);
      expect(header.face, `${width}px`).toContain('IBM Plex Sans Condensed');
      expect(header.weight, `${width}px`).toBe('600');
      expect(header.size, `${width}px`).toBe(width < 1280 ? '15px' : '17px');
      expect(header.navWeight, `${width}px`).toBe('600');
      // the lockup: 226 px up to 1279 px, 250 px from 1280 px («Збалансована», 226–250 by width)
      expect(header.logo, `${width}px logo`).toBe(width < 1280 ? 226 : 250);
      for (const gap of header.groups) expect(gap, `${width}px: groups at least twice the items' step`).toBeGreaterThanOrEqual(2 * header.step - 0.5);
      expect(header.overflow, `${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test('below 1180 px the compact header calls in place of the number (GLB-03 A); from 960 px its sections show in one row (owner 22.10)', async ({ page }) => {
    for (const width of [959, 1100, 1179]) {
      await open(page, '/metalokonstruktsii', width);
      await expect(page.locator('.site-header .mobile-call'), `${width}px`).toBeVisible();
      await expect(page.locator('.site-header .mobile-menu summary'), `${width}px`).toBeVisible();
      await expect(page.locator('.site-header .header-phone'), `${width}px`).toBeHidden();
      if (width >= 960) await expect(page.locator('.site-header .desktop-nav'), `${width}px`).toBeVisible();
      else await expect(page.locator('.site-header .desktop-nav'), `${width}px`).toBeHidden();
    }
    await open(page, '/metalokonstruktsii', 1180);
    await expect(page.locator('.site-header .mobile-call')).toBeHidden();
    await expect(page.locator('.site-header .header-phone')).toBeVisible();
  });

  test('the messengers keep their own colours at rest — header, menu and footer — with no plate, filter or opacity', async ({ page }) => {
    test.setTimeout(90_000);
    // «Збалансована» with «Оригінальний колір» (owner 21.10): the brands' blue, green and purple without a hover, on the
    // 92 % header itself (no plate of their own), and the same in the footer
    const untouched = (icon: Locator) => icon.evaluate((element) => {
      const chain: string[] = [];
      for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.filter !== 'none') chain.push(`${node.className} filter ${style.filter}`);
        if (Number(style.opacity) < 1) chain.push(`${node.className} opacity ${style.opacity}`);
      }
      return chain;
    });
    for (const path of ['/metalokonstruktsii', '/']) {
      await open(page, path, 1440);
      await page.mouse.move(700, 600);
      await expect(page.locator('.site-header .header-messengers')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(page.locator('.site-header .header-email')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      for (const kind of ['telegram', 'whatsapp', 'viber']) {
        const icon = page.locator(`.site-header .header-messengers .messenger-${kind} .messenger-brand-icon`);
        await expect(icon, `${path} ${kind}`).toHaveCSS('width', '23px');
        expect(await untouched(icon), `${path} ${kind}`).toEqual([]);
        await expect.poll(() => saturatedShare(page, icon), `${path} ${kind} at rest`).toBeGreaterThan(.1);
        const footer = page.locator(`footer .messenger-${kind} .messenger-brand-icon`);
        await footer.scrollIntoViewIfNeeded();
        expect(await untouched(footer), `footer ${kind}`).toEqual([]);
        await expect.poll(() => saturatedShare(page, footer), `footer ${kind} at rest`).toBeGreaterThan(.1);
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }
    // the number: light words in its frame, a light copper icon, no fill — at rest and on hover; the mail icon copper as
    // the number's icon (owner 21.10), the theme switch's knob grey
    const phone = page.locator('.site-header .header-phone');
    await expect(phone).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(phone.locator('svg')).toHaveCSS('color', 'rgb(204, 132, 85)');
    await expect(phone.locator('strong')).toHaveCSS('color', 'rgb(245, 242, 235)');
    await phone.hover();
    await expect(phone).toHaveCSS('border-top-color', 'rgb(204, 132, 85)');
    await expect(phone.locator('strong')).toHaveCSS('color', 'rgb(245, 242, 235)');
    await page.mouse.move(700, 600);
    await expect(page.locator('.site-header .header-email svg')).toHaveCSS('color', 'rgb(204, 132, 85)');
    // no rule between the number and the messengers (owner 21.10)
    await expect(page.locator('.site-header .header-messengers')).toHaveCSS('border-left-width', '0px');
    await expect(page.locator('.site-header .theme-switch-knob')).toHaveCSS('background-color', 'rgb(158, 152, 141)');
  });

  test('in the menu the messengers keep their own colours and their short names', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 1179);
    await page.locator('.site-header .mobile-menu summary').click();
    for (const [kind, name] of [['telegram', 'TG'], ['whatsapp', 'WA'], ['viber', 'VB']] as const) {
      const link = page.locator(`.mobile-menu .mobile-messengers .messenger-${kind}`);
      await expect(link, kind).toBeVisible();
      await expect(link, kind).toContainText(name);
      await expect(link.locator('.messenger-brand-icon'), kind).toHaveCSS('filter', 'none');
      await expect.poll(() => saturatedShare(page, link.locator('.messenger-brand-icon')), `menu ${kind}`).toBeGreaterThan(.1);
    }
  });
});
