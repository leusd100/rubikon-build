import { expect, test } from '@playwright/test';
import { directions } from '../../app/data/directions';

// HOME «П’ять напрямів» — five small scheme sheets in the header's free right, one per direction, in the cards' order
// (owner, 05.10: the sheets of the /napryamky catalogue belong here; the key plan went there). These pin what the row
// promises: it costs the header nothing, it shows only where a sheet is large enough to read, the sheets are set to
// the header's own lines (top of the title's capitals, bottom of the note — «вирівняємо їх по висоті») and so stand
// upright, each names its direction, every card frames its own sheet — walked from the data, because the
// link is by route — and the row stays out of the accessibility tree and the tab order, the cards saying everything.

const HEADER = '#directions .section-header';
const ROW = `${HEADER} .dsh`;

test('every card frames its own sheet in copper, by keyboard as well as by pointer', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a wide-screen row');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'load' });
  const row = page.locator(ROW);
  const accent = await row.evaluate((root) => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--color-accent)';
    root.appendChild(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  const frames = () => row.locator('.dsh-sheet').evaluateAll((sheets) => sheets.map((sheet) => getComputedStyle(sheet).borderTopColor));
  expect(await frames()).not.toContain(accent);
  for (const [index, { href, number }] of directions.entries()) {
    await page.locator(`#directions a.direction-card[href="${href}"]`).focus();
    await expect.poll(async () => (await frames())[index], { message: `card ${number} frames sheet ${number}` }).toBe(accent);
    expect((await frames()).filter((frame) => frame === accent), `card ${number} frames only its own sheet`).toHaveLength(1);
  }
  await page.locator('#directions a.direction-card').first().hover();
  await expect.poll(async () => (await frames())[0]).toBe(accent);
});

// The copper's job per sheet, shape by shape (catalog-drawing.css). Its rules name the shapes by .dsd-mark, not by tag
// (MT-01, 27.10): this pins that each one still gets its own animation and delay — the bolts one by one, the third anchor
// and the gutter last.
test('a focused card gives each copper shape of its sheet its own job', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a wide-screen row');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/', { waitUntil: 'load' });
  const jobs: Record<string, string[]> = {
    '/angary': ['cdw-trace 0s'],
    '/zernoskhovyshcha': ['cdw-click 0.76s'],
    '/metalokonstruktsii': ['cdw-bolt 0s', 'cdw-bolt 0.15s', 'cdw-bolt 0.3s', 'cdw-bolt 0.45s'],
    '/betonni-roboty': ['cdw-set 0s', 'cdw-set 0s', 'cdw-click 0.65s'],
    '/pokrivelni-roboty': ['none 0s', 'cdw-click 1.1s', 'none 0s'],
  };
  const copper = (href: string) => page.locator(`${ROW} .dsh-sheet[href="${href}"] .dsd-accent > *`)
    .evaluateAll((shapes) => shapes.map((shape) => `${getComputedStyle(shape).animationName} ${getComputedStyle(shape).animationDelay}`));
  expect(directions.map(({ href }) => href)).toEqual(Object.keys(jobs));
  for (const [href, job] of Object.entries(jobs)) {
    expect(await copper(href), `${href} at rest`).toEqual(job.map(() => 'none 0s'));
    await page.locator(`#directions a.direction-card[href="${href}"]`).focus();
    await expect.poll(() => copper(href), href).toEqual(job);
  }
});

// The header row is not shown at any width since 02.11 (on a computer the row of cards stands alone). On a phone the band is one scheme sheet over an index of the five directions,
// under the header (B, owner 21.10) — home-phone-directions.spec.ts; the header itself stays as it was.
for (const width of [1199, 768, 390, 1200, 1440]) {
  test(`at ${width}px the header is as it was: no sheets`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator(ROW)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
