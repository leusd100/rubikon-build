import { expect, test, type Locator, type Page } from '@playwright/test';

// W3-06 (owner 25.10, Wave 03 brief variant A: PDO-56, PDO-99, PDO-88, PDO-89).
// - One arrow link (.link-arrow): the action label (Manrope 800, 13 px, .06em, capitals), a 44 px target with its words
//   and a copper rule at the foot; hover and keyboard focus answer in copper and nudge the arrow (not under reduced
//   motion). A copy of a link hidden at one width stays hidden. /pro-nas keeps its work tags, with a 44 px target.
// - Copper buttons are 56 px, or 48 px in a sheet or a tool.
// - Focus is one of two rings — outer 3 px / 4, inner 3 px / -4 for a cell, a segment, a tab or a full-width row.
// - lucide icons have one stroke, 1.75, and corn is a cob of our own, hidden from assistive tech.
// Every test denies the optional cookies and answers any Google request with an empty 200, so no tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows (1440 and 390)');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

const PAGES = ['/', '/napryamky', '/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/angary', '/zernoskhovyshcha', '/yak-pratsyuiemo', '/pro-nas'];

async function open(page: Page, path: string, width: number) {
  await page.setViewportSize({ width, height: width < 761 ? 844 : 900 });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

/** Every rendered link in main whose words end with an arrow, except the cards, the buttons and the drawing sheets,
 *  which carry an arrow as a sign of their own (probes.js links(), the brief's inventory) */
function arrowLinks(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>('main a')]
    .filter((link) => {
      const box = link.getBoundingClientRect();
      if (box.width < 1 || box.height < 1 || getComputedStyle(link).visibility === 'hidden') return false;
      if (!/[→↗↓↑]\s*$/.test(link.textContent ?? '')) return false;
      return !link.closest('.button, .direction-card, .route-service, .related-card, .phone-hero-scroll, .dxi-sheet, .dsh-sheet, .hv2-contour-brief, .conversation-call, .about-ledger-col');
    })
    .map((link) => {
      const style = getComputedStyle(link);
      // the target as a finger meets it: the box, or an invisible zone round it (HOME's link under the sheet's note)
      link.scrollIntoView({ block: 'center', behavior: 'instant' });
      const box = link.getBoundingClientRect();
      const x = box.left + Math.min(box.width / 2, 40);
      const hits = (y: number) => link.contains(document.elementFromPoint(x, y));
      let top = box.top + box.height / 2, bottom = top;
      while (top > box.top - 30 && hits(top - 1)) top -= 1;
      while (bottom < box.bottom + 30 && hits(bottom + 1)) bottom += 1;
      return {
        name: `${link.className} «${(link.textContent ?? '').replace(/\s+/g, ' ').trim()}»`,
        arrowLink: link.classList.contains('link-arrow'),
        type: `${style.fontFamily.split(',')[0].replace(/"/g, '')} ${style.fontWeight} ${style.fontSize} ${style.letterSpacing} ${style.textTransform}`,
        target: Math.round(bottom - top + 1),
      };
    }));
}

test('every arrow link is one .link-arrow: Manrope 800 13 px, .06em, capitals, a 44 px target', async ({ page }) => {
  test.setTimeout(120_000);
  // the pages' final state, and an instant scroll for the targets
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1440, 390]) {
    for (const path of PAGES) {
      await open(page, path, width);
      const links = await arrowLinks(page);
      for (const link of links) {
        expect(link.arrowLink, `${width} ${path} ${link.name}`).toBe(true);
        expect(link.type, `${width} ${path} ${link.name}`).toBe('Manrope 800 13px 0.78px uppercase');
        expect(link.target, `${width} ${path} ${link.name}`).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

test('«Залишити запит» in the FAQ is the arrow link (13 px), the number keeps its own type', async ({ page }) => {
  await open(page, '/metalokonstruktsii', 1440);
  const write = page.locator('.faq-ask-write:visible');
  await expect(write).toHaveCSS('font-size', '13px');
  await expect(write).toHaveCSS('font-weight', '800');
  await expect(page.locator('.faq-ask-call:visible')).toHaveCSS('font-size', '15px');
  // the two stand their words on their rules: the same bottom, the words 8 px over it
  const bottoms = await page.locator('.faq-ask-side').evaluate((block) => [...block.querySelectorAll('a')].map((link) => Math.round(link.getBoundingClientRect().bottom)));
  expect(new Set(bottoms).size).toBe(1);
});

test('HOME: under the sheet\'s note the link keeps the title block\'s height; in a short window\'s narrow note it drops the capitals and stays one line', async ({ page }) => {
  for (const [width, height, capitals] of [[1440, 900, true], [1280, 720, true], [1440, 700, false], [1250, 613, false]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/', { waitUntil: 'load' });
    const link = page.locator('.hv2-contour-exit[data-place="line"]');
    await link.scrollIntoViewIfNeeded();
    await expect(link, `${width}×${height}`).toHaveCSS('text-transform', capitals ? 'uppercase' : 'none');
    // one line: its words, 8 px and the rule
    expect(Math.round((await link.boundingBox())!.height), `${width}×${height}`).toBe(25);
  }
});

test('a copy of a link hidden at one width stays hidden', async ({ page }) => {
  await open(page, '/', 1440);
  await expect(page.locator('.hv2-contour-exit[data-place="line"]')).toBeVisible();
  await expect(page.locator('.hv2-contour-exit[data-place="action"]')).toBeHidden();
  await open(page, '/', 390);
  await expect(page.locator('.hv2-contour-exit[data-place="line"]')).toBeHidden();
  await expect(page.locator('.hv2-contour-exit[data-place="action"]')).toBeVisible();
  for (const path of ['/angary', '/zernoskhovyshcha']) {
    await open(page, path, 390);
    // a phone leads with the call: the written request is the hero's quiet link only from 761 px
    await expect(page.locator('.service-subhero .text-link')).toBeHidden();
  }
  await open(page, '/yak-pratsyuiemo', 390);
  await expect(page.locator('.proc-start-merge')).toBeHidden();
  await expect(page.locator('.faq-ask-side')).toBeHidden();
});

test('/pro-nas work tags keep their look and take a 44 px target', async ({ page }) => {
  for (const width of [1440, 390]) {
    await open(page, '/pro-nas', width);
    const tags = page.locator('.about-ledger-col li b a');
    expect(await tags.count()).toBeGreaterThan(0);
    for (const tag of await tags.all()) {
      await tag.scrollIntoViewIfNeeded();
      await expect(tag).toHaveCSS('font-size', '15px');
      await expect(tag).toHaveCSS('text-transform', 'none');
      const reach = await tag.evaluate((link) => {
        const box = link.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const hits = (y: number) => link.contains(document.elementFromPoint(x, y));
        return { above: hits(box.top + box.height / 2 - 21.5), below: hits(box.top + box.height / 2 + 21.5) };
      });
      expect(reach, `${width} ${await tag.textContent()}`).toEqual({ above: true, below: true });
    }
  }
});

test('hover answers in copper and nudges the arrow; under reduced motion the arrow stays', async ({ browser }) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion, locale: 'uk-UA' });
    await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
    await context.addInitScript(() => {
      localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
    });
    const page = await context.newPage();
    await page.goto('/angary', { waitUntil: 'load' });
    const link = page.locator('.angary-text-link');
    await link.scrollIntoViewIfNeeded();
    const before = await link.evaluate((element) => getComputedStyle(element).color);
    await link.hover();
    const arrow = link.locator('[data-arrow]');
    await expect(arrow).toHaveAttribute('data-arrow', 'right');
    await expect.poll(() => link.evaluate((element) => getComputedStyle(element).color)).not.toBe(before);
    await expect.poll(() => arrow.evaluate((element) => getComputedStyle(element).transform))
      .toBe(reducedMotion === 'reduce' ? 'none' : 'matrix(1, 0, 0, 1, 3, 0)');
    await context.close();
  }
});

test('copper buttons: 56 px, 48 px in a sheet or a tool', async ({ page }) => {
  for (const width of [1440, 390]) {
    await open(page, '/', width);
    expect(Math.round((await page.locator('#inquiry .conversation-call').boundingBox())!.height), `${width} call`).toBe(56);
    expect(Math.round((await page.locator('.hv2-contour-brief').boundingBox())!.height), `${width} brief`).toBe(48);
    await open(page, '/angary', width);
    expect(Math.round((await page.locator('.hc-summary-action').first().boundingBox())!.height), `${width} configurator`).toBe(48);
  }
  await open(page, '/zernoskhovyshcha', 1440);
  expect(Math.round((await page.locator('.gc-sheet .gc-cta').first().boundingBox())!.height)).toBe(48);
});

/** Focus as the keyboard gives it: a key first, so the focus is :focus-visible */
async function keyboardFocus(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await page.keyboard.press('Shift');
  await target.focus();
  expect(await target.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
}

async function ring(target: Locator) {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    return `${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}`;
  });
}

test('focus is one of two rings: outer 3 px / 4, inner 3 px / -4', async ({ page }) => {
  await open(page, '/', 1440);
  const cell = page.locator('.hv2-scope-cell').first();
  await keyboardFocus(page, cell);
  expect(await ring(cell)).toBe('solid 3px -4px');
  const exit = page.locator('.hv2-contour-exit[data-place="line"]');
  await keyboardFocus(page, exit);
  expect(await ring(exit)).toBe('solid 3px 4px');
  const brief = page.locator('.hv2-contour-brief');
  await keyboardFocus(page, brief);
  expect(await ring(brief)).toBe('solid 3px 4px');

  await open(page, '/zernoskhovyshcha', 390);
  const chip = page.locator('.gc-chip input').first();
  await keyboardFocus(page, chip);
  expect(await ring(page.locator('.gc-chip input:focus-visible + span'))).toBe('solid 3px 4px');

  await open(page, '/yak-pratsyuiemo', 1440);
  const segment = page.locator('.proc-resp-switch input').first();
  await keyboardFocus(page, segment);
  expect(await ring(page.locator('.proc-resp-switch input:focus-visible + span'))).toBe('solid 3px -4px');
});

test('icons: one lucide stroke, 1.75; corn is our cob, hidden from assistive tech', async ({ page }) => {
  for (const path of ['/', '/zernoskhovyshcha']) {
    await open(page, path, 1440);
    const strokes = await page.locator('svg.lucide').evaluateAll((icons) => [...new Set(icons.map((icon) => getComputedStyle(icon).strokeWidth))]);
    expect(strokes, path).toEqual(['1.75px']);
  }
  await expect(page.locator('svg.lucide-vegan')).toHaveCount(0);
  const cob = page.locator('.gc-chip svg.lucide-corn-cob');
  await expect(cob).toHaveCount(1);
  await expect(cob).toHaveAttribute('aria-hidden', 'true');
  await expect(cob).toHaveAttribute('viewBox', '0 0 24 24');
  await expect(cob).toHaveCSS('stroke-linecap', 'round');
});
