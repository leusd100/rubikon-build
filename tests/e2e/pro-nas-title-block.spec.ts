import { expect, test } from '@playwright/test';
import { company } from '../../app/data/company';
import { leadership } from '../../app/data/people';

// /pro-nas «Хто стоїть за RUBIKON» — the title block in the header's empty right (owner, 04.10: use the space «з
// розумом»). It is a drawing's stamp, not a document: two zone → name rows and the company cell, all from data. These
// pin that it costs the header nothing (same height with and without it, standing on the rule), that it shows only
// where there is room, and that it stays out of the accessibility tree because the lead and the cards say it already.

const HEADER = '.team-about .section-header';
const BLOCK = `${HEADER} .ttb`;

test('from 1240 px the title block stands on the header rule and repeats only what the data says', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Geometry is measured at rest: on arrival the block fades up from 6 px lower
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/pro-nas', { waitUntil: 'load' });
  const block = page.locator(BLOCK);
  await expect(block).toBeVisible();
  await expect(page.locator(`${HEADER} .section-header-aside`)).toHaveAttribute('aria-hidden', 'true');

  await expect(block.locator('dt')).toHaveText(leadership.map(({ role }) => role.split(',')[0]));
  await expect(block.locator('dd')).toHaveText(leadership.map(({ name }) => {
    const [first, patronymic, surname] = name.split(' ');
    return `${surname} ${first[0]}. ${patronymic[0]}.`;
  }));
  await expect(block.locator('.ttb-org b')).toHaveText(company.name);

  const geometry = await page.locator(HEADER).evaluate((header) => {
    const aside = header.querySelector<HTMLElement>('.section-header-aside')!;
    const stamp = aside.querySelector('.ttb')!.getBoundingClientRect();
    const lead = header.querySelector('.section-header-support')!.getBoundingClientRect();
    const withBlock = header.getBoundingClientRect();
    aside.style.display = 'none';
    const without = header.getBoundingClientRect().height;
    aside.style.display = '';
    return { withBlock: withBlock.height, without, headerBottom: withBlock.bottom, headerRight: withBlock.right, stampBottom: stamp.bottom, stampRight: stamp.right, gap: stamp.left - lead.right };
  });
  expect(geometry.withBlock).toBeCloseTo(geometry.without, 1);
  expect(Math.abs(geometry.stampBottom - geometry.headerBottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.stampRight - geometry.headerRight)).toBeLessThanOrEqual(1);
  expect(geometry.gap).toBeGreaterThanOrEqual(40);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

for (const width of [1239, 768, 390]) {
  test(`at ${width}px the header is as it was: no title block`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/pro-nas', { waitUntil: 'load' });
    await expect(page.locator(BLOCK)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
