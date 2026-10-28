import { expect, test, type Page } from '@playwright/test';

// W2-14 · the mobile menu panel (PDO-47, PDO-25; owner 21.10: OD-PX-31 a1, the numbers kept). A layer of its own: a solid
// ground, the page under it dimmed, the width of the column on a phone, never taller than the window — the panel scrolls
// on a phone held sideways or a short screen, where its lower items used to be off screen with no way to reach them
// (7 of 12 at 844×390). Numbers 01–04 at 11 px, the messengers by their icons (the names stay in aria-label), «Меню» 12 px.
// Every test denies the optional cookies and answers any Google request with an empty 200.

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function openMenu(page: Page, width: number, height: number, path = '/angary') {
  await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const summary = page.locator('.site-header .mobile-menu summary');
  await summary.click();
  await expect(page.locator('.site-header .mobile-menu')).toHaveAttribute('open', '');
  return page.locator('.site-header .mobile-menu nav');
}

/** Every control of the open panel: what it is, its box, and whether the panel shows it */
const controls = (page: Page) => page.locator('.site-header .mobile-menu nav').evaluate((panel) => {
  const frame = panel.getBoundingClientRect();
  return [...panel.querySelectorAll<HTMLElement>('a, button, input')].filter((element) => element.getClientRects().length || element.matches('input')).map((element) => {
    const target = element.matches('input') ? element.closest('label') ?? element : element;
    const r = target.getBoundingClientRect();
    return { name: element.getAttribute('aria-label') || target.textContent?.trim() || element.getAttribute('value') || '', top: r.top, bottom: r.bottom, inPanel: r.top >= frame.top - 0.5 && r.bottom <= frame.bottom + 0.5, inWindow: r.top >= 0 && r.bottom <= innerHeight + 0.5 };
  });
});

test.describe('W2-14 · the mobile menu on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'a phone check; the mobile project runs it');

  test('390: the panel spans the column on a solid ground over a dimmed page; numbers 11 px, messengers as icons, «Меню» 12 px', async ({ page }) => {
    const panel = await openMenu(page, 390, 844);
    const box = (await panel.boundingBox())!;
    expect(Math.round(box.x)).toBe(16);
    expect(Math.round(box.x + box.width)).toBe(390 - 16);
    expect(await panel.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toMatch(/\/\s*0?\.\d+\)$|,\s*0?\.\d+\)$/);
    const dim = await page.locator('.site-header').evaluate((header) => ({ content: getComputedStyle(header, '::after').content, background: getComputedStyle(header, '::after').backgroundColor }));
    expect(dim.content).not.toBe('none');
    expect(dim.background).toBe('rgba(10, 11, 10, 0.55)');
    // the numbers stay, at 11 px; no text in the panel smaller than that
    await expect(panel.locator('a small')).toHaveCount(4);
    expect(await panel.evaluate((element) => Math.min(...[...element.querySelectorAll<HTMLElement>('*')]
      .filter((node) => node.getClientRects().length && [...node.childNodes].some((child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim()))
      .map((node) => parseFloat(getComputedStyle(node).fontSize))))).toBeGreaterThanOrEqual(11);
    // the messengers: their own icons, the names in the accessible name only
    for (const name of ['Написати в Telegram', 'Написати в WhatsApp']) {
      const link = panel.getByRole('link', { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link.locator('span')).toBeHidden();
    }
    await expect(panel.getByRole('button', { name: 'Написати у Viber', exact: true })).toBeVisible();
    await expect(page.locator('.site-header .mobile-menu summary > span')).toHaveCSS('font-size', '12px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });

  test('390: a tap on the dimmed page closes the menu; Escape closes it and gives the focus back to «Меню»', async ({ page }) => {
    const panel = await openMenu(page, 390, 844);
    const box = (await panel.boundingBox())!;
    await page.mouse.click(195, Math.min(box.y + box.height + 40, 830));
    await expect(page.locator('.site-header .mobile-menu')).not.toHaveAttribute('open');
    await page.locator('.site-header .mobile-menu summary').click();
    await expect(page.locator('.site-header .mobile-menu')).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('.site-header .mobile-menu')).not.toHaveAttribute('open');
    await expect(page.locator('.site-header .mobile-menu summary')).toBeFocused();
  });

  // Low windows: a phone held sideways, short phones, and a larger system text
  // (At 200 % the header itself no longer fits 390 px and widens the page, as on main — a header limit outside this step.)
  for (const { width, height, scale } of [{ width: 844, height: 390, scale: 100 }, { width: 667, height: 375, scale: 100 }, { width: 320, height: 568, scale: 100 }, { width: 390, height: 664, scale: 150 }]) {
    test(`${width}×${height}${scale !== 100 ? `, system text ${scale} %` : ''}: the panel stays in the window and scrolls to every one of its controls, the page under it does not move`, async ({ page }) => {
      await page.route(/\.mp4(?:\?|$)/, (route) => route.abort());
      await page.setViewportSize({ width, height });
      await page.goto('/angary', { waitUntil: 'load' });
      if (scale !== 100) await page.addStyleTag({ content: `html { -webkit-text-size-adjust: ${scale}% !important; text-size-adjust: ${scale}% !important; }` });
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.site-header .mobile-menu summary').click();
      const panel = page.locator('.site-header .mobile-menu nav');
      const frame = (await panel.boundingBox())!;
      expect(frame.y + frame.height, 'the panel ends inside the window').toBeLessThanOrEqual(height);
      const pageY = await page.evaluate(() => window.scrollY);
      // every control, brought into the panel's view one by one, ends up inside the panel and the window
      const names = (await controls(page)).map((control) => control.name);
      expect(names.length).toBeGreaterThanOrEqual(12);
      for (const [index, name] of names.entries()) {
        await panel.evaluate((element, i) => {
          const items = [...element.querySelectorAll<HTMLElement>('a, button, input')].filter((node) => node.getClientRects().length || node.matches('input'));
          const target = items[i].matches('input') ? items[i].closest('label') ?? items[i] : items[i];
          target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        }, index);
        const control = (await controls(page))[index];
        expect(control.inPanel && control.inWindow, `${name}`).toBe(true);
      }
      // the wheel at the panel's end does not scroll the page under it
      await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
      await page.mouse.wheel(0, 800);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(pageY);
    });
  }
});

// RA-01 · the phone layout's widest windows: the column stops at 620 px, and a window-wide panel hanging from «Меню» at the
// column's right edge ran past the window's left edge from 685 px (−30 px at 744, an iPad mini held upright; −38 at 760),
// cutting the numbers and the icons. Both projects: a touch tablet, and a desktop window at 175–200 % zoom.
test.describe('RA-01 · the menu panel between the phone column and the tablet', () => {
  for (const { width, height } of [{ width: 744, height: 1133 }, { width: 760, height: 800 }]) {
    test(`${width}×${height}: the panel is the column's 620 px, inside the window`, async ({ page }) => {
      const panel = await openMenu(page, width, height);
      const box = (await panel.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(Math.round(box.width)).toBe(620);
      const column = (await page.locator('.site-header .nav-wrap').boundingBox())!;
      expect(Math.abs(box.x - column.x)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    });
  }
});

test.describe('W2-14 · the menu on a tablet', () => {
  test.skip(({ isMobile }) => isMobile, 'explicit tablet viewports');

  test('1024 and 1179: the 310 px panel on a solid ground over a dimmed page', async ({ page }) => {
    for (const width of [1024, 1179]) {
      const panel = await openMenu(page, width, 800);
      const box = (await panel.boundingBox())!;
      expect(Math.round(box.width), `${width}`).toBe(310);
      expect(await page.locator('.site-header').evaluate((header) => getComputedStyle(header, '::after').content), `${width}`).not.toBe('none');
      expect(box.y + box.height, `${width}`).toBeLessThanOrEqual(800);
      await page.keyboard.press('Escape');
    }
  });
});
