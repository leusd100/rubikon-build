import { expect, test, type Page } from '@playwright/test';

// The /napryamky route cards put the title in a grid track between the number and the ↗ column.
// A long title («МЕТАЛОКОНСТРУКЦІЇ» is ~246px at 25px) must never push the ↗ off the card or the page,
// and must not be broken mid-word to make room either.
const viewports = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

function cardGeometry(page: Page) {
  return page.locator('#directions-list .route-service').evaluateAll((cards) => cards.map((card) => {
    const box = card.getBoundingClientRect();
    const arrowGlyph = document.createRange();
    arrowGlyph.selectNodeContents(card.querySelector(':scope > b')!);
    const arrow = arrowGlyph.getBoundingClientRect();

    const heading = card.querySelector('h3')!;
    const title = document.createRange();
    title.selectNodeContents(heading);
    const ink = title.getBoundingClientRect();

    // A line break inside a word shows up as two neighbouring letters on different lines.
    const text = heading.firstChild as Text;
    const lineTops = Array.from(text.data, (_, index) => {
      const letter = document.createRange();
      letter.setStart(text, index);
      letter.setEnd(text, index + 1);
      return Math.round(letter.getBoundingClientRect().top);
    });
    const brokenMidWord = lineTops.some((top, index) => index > 0
      && top !== lineTops[index - 1] && text.data[index - 1] !== ' ' && text.data[index] !== ' ');

    return {
      id: card.id,
      left: box.left,
      right: box.right,
      arrowLeft: arrow.left,
      arrowRight: arrow.right,
      titleRight: ink.right,
      titleTouchesArrow: ink.right > arrow.left && ink.left < arrow.right && ink.bottom > arrow.top && ink.top < arrow.bottom,
      brokenMidWord,
    };
  }));
}

function pageOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

for (const viewport of viewports) {
  test(`direction route cards keep their ↗ inside at ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(viewport);
    await page.goto('/napryamky', { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const cards = page.locator('#directions-list .route-service');
    await expect(cards).toHaveCount(5);
    expect(await pageOverflow(page)).toBe(0);

    for (const card of await cardGeometry(page)) {
      expect(card.arrowLeft, card.id).toBeGreaterThanOrEqual(card.left);
      expect(card.arrowRight, card.id).toBeLessThanOrEqual(card.right + 0.5);
      expect(card.titleRight, card.id).toBeLessThanOrEqual(card.right + 0.5);
      expect(card.titleTouchesArrow, card.id).toBe(false);
      expect(card.brokenMidWord, card.id).toBe(false);
    }

    // Keyboard focus widens the card's inline padding; the ↗ still has to stay inside.
    await cards.first().focus();
    await page.keyboard.press('Shift+Tab');
    for (let index = 0; index < 5; index += 1) {
      await page.keyboard.press('Tab');
      await expect(cards.nth(index)).toBeFocused();
      expect(await cards.nth(index).evaluate((card) => card.matches(':focus-visible'))).toBe(true);

      const card = (await cardGeometry(page))[index];
      expect(card.arrowRight, card.id).toBeLessThanOrEqual(card.right + 0.5);
      expect(await pageOverflow(page)).toBe(0);
    }

    expect(errors).toEqual([]);
  });
}
