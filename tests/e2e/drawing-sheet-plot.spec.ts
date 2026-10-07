import { expect, test, type Page } from '@playwright/test';

// The «Креслення» sheet plots its picture in under a paper cover moved by a transform (DrawingSheet.tsx). The picture
// itself never animates: a clip-path transition on it ran as a paint worklet that re-rastered it on every frame, and on a
// phone fling Chrome held the main thread's frames back behind those (07.10: /angary 6.3 % → 2.2 % rAF frames skipped).

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem('rubikon-consent-state', JSON.stringify({ analytics: 'denied', advertising: 'denied' })));
  await page.goto('/angary', { waitUntil: 'load' });
}

const sheets = (page: Page) => page.locator('.sheet:has(> .sheet-body)');

test('armed, each picture lies under the sheet’s own paper; arriving, only the cover moves, by a transform; then the picture is whole', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'the plot is viewport-independent');
  await open(page);
  const count = await sheets(page).count();
  expect(count).toBeGreaterThanOrEqual(4);
  for (let index = 0; index < count; index++) {
    const sheet = sheets(page).nth(index);
    await expect(sheet).toHaveAttribute('data-sheet-state', /.+/);
    if ((await sheet.getAttribute('data-sheet-state')) === 'armed') {
      const armed = await sheet.evaluate((element) => {
        const paper = (node: Element | null): string => {
          for (let at = node; at; at = at.parentElement) {
            const colour = getComputedStyle(at).backgroundColor;
            if (colour !== 'rgba(0, 0, 0, 0)') return colour;
          }
          return '';
        };
        const body = element.querySelector('.sheet-body')!;
        const cover = element.querySelector('.sheet-cover')!;
        const [outer, inner] = [body, cover].map((part) => part.getBoundingClientRect());
        return {
          paper: getComputedStyle(cover).backgroundColor === paper(body),
          covers: Math.abs(outer.top - inner.top) < 0.5 && Math.abs(outer.height - inner.height) < 0.5 && Math.abs(outer.width - inner.width) < 0.5,
          clip: getComputedStyle(element.querySelector('.sheet-image')!).clipPath,
        };
      });
      expect(armed, `sheet ${index}`).toEqual({ paper: true, covers: true, clip: 'none' });
    }
    await sheet.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(sheet).toHaveAttribute('data-sheet-state', 'on');
    const plotting = await sheet.evaluate((element) => ({
      picture: element.querySelector('.sheet-image')!.getAnimations().length,
      cover: element.querySelector('.sheet-cover')!.getAnimations().map((animation) => (animation as CSSTransition).transitionProperty),
    }));
    expect(plotting.picture, `sheet ${index}`).toBe(0);
    expect(plotting.cover.every((property) => property === 'transform'), `sheet ${index}: ${plotting.cover}`).toBe(true);
    await expect.poll(() => sheet.locator('.sheet-cover').evaluate((cover) => cover.getBoundingClientRect().height)).toBe(0);
  }
});

test('with reduced motion the sheets stand complete: no cover at all', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(sheets(page).first()).toBeAttached();
  expect(await sheets(page).evaluateAll((elements) => elements.map((element) => [
    element.getAttribute('data-sheet-state'), getComputedStyle(element.querySelector('.sheet-cover')!).display,
  ]))).toEqual(Array.from({ length: await sheets(page).count() }, () => [null, 'none']));
});
