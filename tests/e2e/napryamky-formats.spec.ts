import { expect, test } from '@playwright/test';
import { participationChoices } from '../../app/lib/deliveryModelPresentation';

// /napryamky «Формати участі» — one flat section of a building, redrawn for the format in focus (owner, 05.10: the
// oblique wireframe did not explain enough). These pin what the drawing promises: the whole building is RUBIKON's in
// the first format and exactly one package at a time in the other two; a general contractor's project gets its outer
// frame; the two facts under the drawing are the Delivery Model's; and the block walks through the formats once on
// first view, which any pointing ends.

const GRID = '.dfmt-grid';

test('each format redraws the section: the whole complex, one package, one package inside a general contractor’s project', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/napryamky', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  const drawing = grid.locator('svg.fs');
  const options = grid.locator('.dfmt-option');
  const choices = participationChoices();
  await expect(options).toHaveCount(choices.length);
  await expect(grid.locator('.dfmt-figure img')).toHaveCount(0);
  await expect(grid.locator('.dfmt-caption')).toContainText('Схема');

  for (const [index, choice] of choices.entries()) {
    await options.nth(index).click();
    await expect(options.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect(drawing).toHaveAttribute('data-format', choice.id);
    // RUBIKON's scope on the drawing and in the tags under it
    const whole = choice.id === 'comprehensive';
    await expect(drawing.locator('.fs-layer[data-scope]')).toHaveCount(whole ? 4 : 1);
    await expect(grid.locator('.dfmt-packages li[data-scope]')).toHaveCount(whole ? 3 : 1);
    // The two facts, in the model's words
    await expect(grid.locator('.dfmt-terms dd').first()).toHaveText(`${choice.contractWith} — RUBIKON`);
    await expect(grid.locator('.dfmt-terms dd').nth(1)).toHaveText(choice.coordinator);
    // The outer frame is a general contractor's project and nothing else
    await expect(drawing.locator('.fs-outer')).toHaveCSS('opacity', choice.id === 'subcontract' ? '1' : '0');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test('the block walks through the formats once on first view and comes back to the first; in «one package» the packages take turns', async ({ page }) => {
  await page.clock.install();
  await page.goto('/napryamky', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  const drawing = grid.locator('svg.fs');
  await grid.scrollIntoViewIfNeeded();
  await expect(drawing).toHaveAttribute('data-format', 'comprehensive');
  // (the observer that arms the walk is not on the clock, so its first step is polled for)
  await expect.poll(async () => { await page.clock.runFor(400); return drawing.getAttribute('data-format'); }).toBe('work-package');
  const scoped = () => drawing.locator('.fs-layer[data-scope]').getAttribute('data-layer');
  const first = await scoped();
  await page.clock.runFor(1200);
  expect(await scoped()).not.toBe(first);
  await page.clock.runFor(20_000);
  await expect(drawing).toHaveAttribute('data-format', 'comprehensive');
});

test('pointing ends the walk', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a pointer affordance');
  await page.clock.install();
  await page.goto('/napryamky', { waitUntil: 'load' });
  const grid = page.locator(GRID);
  await grid.scrollIntoViewIfNeeded();
  await grid.locator('.dfmt-option').nth(2).hover();
  await page.clock.runFor(20_000);
  await expect(grid.locator('svg.fs')).toHaveAttribute('data-format', 'subcontract');
});
