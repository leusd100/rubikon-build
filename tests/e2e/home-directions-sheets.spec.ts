import { expect, test } from '@playwright/test';
import { directions } from '../../app/data/directions';

// HOME «П’ять напрямів» — five small scheme sheets in the header's free right, one per direction, in the cards' order
// (owner, 05.10: the sheets of the /napryamky catalogue belong here; the key plan went there). These pin what the row
// promises: it costs the header nothing, it shows only where a sheet is large enough to read, the sheets are set to
// the header's own lines (top of the title's capitals, bottom of the note — «вирівняємо їх по висоті») and so stand
// upright, each names its direction, every card lifts and frames its own sheet — walked from the data, because the
// link is by route — and the row stays out of the accessibility tree and the tab order, the cards saying everything.

const HEADER = '#directions .section-header';
const ROW = `${HEADER} .dsh`;

for (const width of [1200, 1440]) {
  test(`at ${width}px five sheets stand on the header's bottom line and cost it no height`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'a wide-screen row');
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'load' });
    const row = page.locator(ROW);
    await expect(row).toBeVisible();
    await expect(page.locator(`${HEADER} .section-header-aside`)).toHaveAttribute('aria-hidden', 'true');
    await expect(row.locator('.dsh-sheet svg')).toHaveCount(directions.length);
    await expect(row.locator('img')).toHaveCount(0);
    // Each strip: the direction's number and «Схема»
    const strips = await row.locator('.dsh-strip').evaluateAll((items) => items.map((item) => (item as HTMLElement).innerText.replace(/\s+/g, ' ').trim().toUpperCase()));
    expect(strips).toEqual(directions.map(({ number }) => (width >= 1360 ? `АРКУШ ${number} СХЕМА` : `${number} СХЕМА`)));
    // …under the direction's own name; the sheet is a mouse's shortcut to its page, out of the tab order
    await expect(row.locator('.dsh-name')).toHaveText(directions.map(({ cardTitle }) => cardTitle));
    expect(await row.locator('a.dsh-sheet').evaluateAll((sheets) => sheets.map((sheet) => `${sheet.getAttribute('href')} ${sheet.getAttribute('tabindex')}`)))
      .toEqual(directions.map(({ href }) => `${href} -1`));

    const geometry = await page.locator(HEADER).evaluate((header) => {
      const aside = header.querySelector<HTMLElement>('.section-header-aside')!;
      const textRight = (selector: string) => {
        const range = document.createRange();
        range.selectNodeContents(header.querySelector(selector)!);
        return Math.max(...[...range.getClientRects()].map((rect) => rect.right));
      };
      const sheets = [...aside.querySelectorAll('.dsh-sheet')].map((sheet) => sheet.getBoundingClientRect());
      const support = header.querySelector('.section-header-support')!.getBoundingClientRect();
      const title = header.querySelector('h2')!;
      const measured = {
        titleTop: title.getBoundingClientRect().top,
        titleSize: parseFloat(getComputedStyle(title).fontSize),
        rowTop: Math.min(...sheets.map((sheet) => sheet.top)),
        rowTops: Math.max(...sheets.map((sheet) => sheet.top)) - Math.min(...sheets.map((sheet) => sheet.top)),
        shortest: Math.min(...sheets.map((sheet) => sheet.height)),
        tallest: Math.max(...sheets.map((sheet) => sheet.height)),
        withRow: header.getBoundingClientRect().height,
        left: aside.getBoundingClientRect().left,
        right: aside.getBoundingClientRect().right,
        headerRight: header.getBoundingClientRect().right,
        words: Math.max(textRight('h2'), textRight('.section-header-support')),
        narrowest: Math.min(...sheets.map((sheet) => sheet.width)),
        rowBottom: Math.max(...sheets.map((sheet) => sheet.bottom)),
        supportBottom: support.bottom,
      };
      aside.style.display = 'none';
      const without = header.getBoundingClientRect().height;
      aside.style.display = '';
      return { ...measured, without };
    });
    expect(geometry.withRow).toBeCloseTo(geometry.without, 1);
    expect(Math.abs(geometry.right - geometry.headerRight)).toBeLessThanOrEqual(1);
    // Set to the header's lines: the note's bottom, and the top of the title's capitals (a little under the top of
    // its line); all five the same height, and upright
    expect(Math.abs(geometry.rowBottom - geometry.supportBottom)).toBeLessThanOrEqual(2);
    expect(geometry.rowTop - geometry.titleTop).toBeGreaterThanOrEqual(geometry.titleSize * 0.08);
    expect(geometry.rowTop - geometry.titleTop).toBeLessThanOrEqual(geometry.titleSize * 0.22);
    expect(geometry.rowTops).toBeLessThanOrEqual(0.5);
    expect(geometry.tallest - geometry.shortest).toBeLessThanOrEqual(0.5);
    expect(geometry.shortest).toBeGreaterThan(geometry.narrowest * 1.25);
    // Clear of the title and the note, and a sheet is never under 110 px
    expect(geometry.left - geometry.words).toBeGreaterThanOrEqual(20);
    expect(geometry.narrowest).toBeGreaterThanOrEqual(110);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}

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

for (const width of [1199, 768, 390]) {
  test(`at ${width}px the header is as it was: no sheets`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator(ROW)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
