import { expect, test, type Page } from '@playwright/test';
import { nextFrames } from './frames.helpers';

// The drawing tours' framing (owner 22.10: «масштаб зменшити, щоб краще влазило»). Every state of every «Вузол
// напряму» tour and of the /pro-nas practice: the words shown on the drawing are whole in the frame and clear of the
// step bars. Reduced motion, so the camera jumps to each view. Every test denies the optional cookies and answers any
// Google request with an empty 200, so no tag can load.

test.beforeEach(async ({ context, isMobile }) => {
  test.skip(isMobile, 'each test sets its own windows');
  await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' }));
  });
});

async function open(page: Page, path: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}

/** The words shown on the drawing that are cut by the frame's edge or lie under the step bars, as «text (state)» */
const misplaced = (page: Page, frameSelector: string, wordsSelector: string, barsSelector: string) => page.evaluate(([frameQ, wordsQ, barsQ]) => {
  const frame = document.querySelector(frameQ)!.getBoundingClientRect();
  const bars = [...document.querySelectorAll(barsQ)].map((bar) => bar.getBoundingClientRect()).find((box) => box.width);
  const stepping = Boolean(document.querySelector('[data-step]'));
  const shown = (element: Element) => {
    for (let node: Element | null = element; node && node.tagName !== 'svg'; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    }
    return true;
  };
  return [...document.querySelectorAll(wordsQ)].filter(shown).flatMap((word) => {
    const box = word.getBoundingClientRect();
    const outside = box.right <= frame.left || box.left >= frame.right || box.bottom <= frame.top || box.top >= frame.bottom;
    if (outside || !box.width) return [];
    const whole = box.left >= frame.left - 1 && box.right <= frame.right + 1 && box.top >= frame.top - 1 && box.bottom <= frame.bottom + 1;
    if (!whole) return [`${word.textContent?.trim()} (cut)`];
    if (stepping && bars && box.top < bars.bottom + 4 && box.bottom > bars.top) return [`${word.textContent?.trim()} (under the bars)`];
    return [];
  });
}, [frameSelector, wordsSelector, barsSelector] as const);

/**
 * The view on show is in place. The stage takes its measured view once the page has hydrated and the fonts are in, and
 * only then loses its inline `transition: none` (`placed`, useDrawingCamera). A chosen step's camera comes with the commit
 * that says so, and what the view lights follows in frames: with reduced motion every transition runs .01 ms. 9 frames
 * are 150 ms at 60 Hz.
 */
async function viewInPlace(page: Page, stageSelector: string) {
  await expect.poll(() => page.locator(stageSelector).evaluate((stage: HTMLElement) => stage.style.transition)).toBe('');
  await nextFrames(page, 9);
}

const WIDTHS = [[320, 700], [390, 844], [768, 1024], [1024, 1000], [1440, 900]] as const;

test.describe('drawing tours: every view holds its words', () => {
  for (const path of ['/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/zernoskhovyshcha']) {
    test(`${path}: the overview and every step`, async ({ page }) => {
      test.setTimeout(90_000);
      for (const [width, height] of WIDTHS) {
        await open(page, path, width, height);
        await page.locator('.dn-sheet').scrollIntoViewIfNeeded();
        const steps = page.locator('.dn-step');
        const count = await steps.count();
        for (let step = 0; step <= count; step += 1) {
          if (step) {
            await steps.nth(step - 1).click();
            await expect(page.locator('.dn')).toHaveAttribute('data-step', String(step));
          }
          await viewInPlace(page, '.dn-stage');
          expect(await misplaced(page, '.dn-sheet .sheet-image', '.dn-stage .node-drawing text', '.dn-progress'), `${width}px, view ${step}`).toEqual([]);
        }
      }
    });
  }

  test('/pro-nas: the practice\'s overview and every step', async ({ page }) => {
    test.setTimeout(60_000);
    for (const [width, height] of WIDTHS) {
      await open(page, '/pro-nas', width, height);
      await page.locator('.ps-sheet').scrollIntoViewIfNeeded();
      const steps = page.locator('.about-before-step');
      const count = await steps.count();
      for (let step = 0; step <= count; step += 1) {
        if (step) {
          await steps.nth(step - 1).click();
          await expect(page.locator('.ps')).toHaveAttribute('data-step', String(step));
        }
        await viewInPlace(page, '.ps-stage');
        expect(await misplaced(page, '.ps-sheet .sheet-image', '.practice-drawing text, .aqc-step', '.ps-sheet .dn-progress, .ps-progress'), `${width}px, view ${step}`).toEqual([]);
      }
    }
  });

  test('a phone turned from landscape to portrait measures its words again: step 1 still holds «Вигляд з торця»', async ({ page }) => {
    await open(page, '/metalokonstruktsii', 844, 390);
    await page.locator('.dn-sheet').scrollIntoViewIfNeeded();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.dn-sheet').scrollIntoViewIfNeeded();
    await page.locator('.dn-step').first().click();
    await expect(page.locator('.dn')).toHaveAttribute('data-step', '1');
    await expect.poll(() => misplaced(page, '.dn-sheet .sheet-image', '.dn-stage .node-drawing text', '.dn-progress')).toEqual([]);
    await expect(page.locator('.node-drawing .nd-title')).toHaveCSS('font-size', '52px');
  });
});
