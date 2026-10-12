import { expect, test, type Page } from '@playwright/test';
import { deliveryModel } from '../../app/data/deliveryModel';
import { DEFAULT_JOURNEY, JOURNEY_TITLES } from '../../app/data/conversation';
import { responsibilityByFormat } from '../../app/lib/deliveryModelPresentation';
import { RESPONSIBILITY_GROUPS, worksCount } from '../../app/lib/responsibilityTable';

// Phase 3 «Коротші сторінки» (R-UX-06 §17, R-UX-07 §11; DEC-45 PROPOSED — a proposal for the owner's review, not an
// approved design). What it may change and what it must keep:
// - /napryamky no longer repeats /yak-pratsyuiemo: the formats drawing and the eight-stage start track give way to one
//   short band (the three formats in the model's words, «what you already have», two links to /yak-pratsyuiemo), and
//   the closing block shows the four after-contact steps every page shows.
// - On a phone the responsibility table's three groups fold under their titles, the first open; every row is still in
//   the server HTML, nothing folds without JavaScript, and a wide screen shows the whole table as before.
// - On a phone each «Ви · Ми» step puts its drawing beside its title instead of on a row of its own; every word stays.

const yak = '/yak-pratsyuiemo';

test.describe('/napryamky leaves formats, stages and responsibility to /yak-pratsyuiemo', () => {
  test('one short band with the model’s formats and the way to /yak-pratsyuiemo, and the four after-contact steps', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/napryamky', { waitUntil: 'load' });
    await expect(page.locator('.dfmt-grid, .dstart-track')).toHaveCount(0);
    const band = page.locator('section.dhow');
    await expect(band.getByRole('heading', { level: 2 })).toHaveText('Який обсяг робіт можемо взяти на себе');
    await expect(band.locator('.dhow-formats h3')).toHaveText(deliveryModel.formats.map((format) => format.label));
    await expect(band.locator('.dhow-formats p')).toHaveText(deliveryModel.formats.map((format) => format.summary));
    await expect(band.locator('.dhow-start')).toContainText('Звертайтеся і з початковою ідеєю, і з готовим проєктом.');
    expect(await band.locator('.dhow-links a').evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
      .toEqual([`${yak}#obsiah`, `${yak}#vidpovidalnist`]);
    await expect(page.locator('#inquiry .conversation-journey h3')).toHaveText([...JOURNEY_TITLES]);
    await expect(page.locator('#inquiry .conversation-journey p')).toHaveText([...DEFAULT_JOURNEY]);
  });

  test('both links land on their section of /yak-pratsyuiemo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [index, target] of ['#obsiah', '#vidpovidalnist'].entries()) {
      await page.goto('/napryamky', { waitUntil: 'load' });
      await page.locator('.dhow-links a').nth(index).click();
      await expect(page).toHaveURL(new RegExp(`${yak}${target}$`));
      await expect(page.locator(target)).toBeInViewport();
    }
  });

  for (const width of [360, 390, 768, 1440]) {
    test(`at ${width}px the page is shorter than before Phase 3 and does not scroll sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/napryamky', { waitUntil: 'load' });
      const { height, overflow } = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      expect(overflow).toBeLessThanOrEqual(1);
      // main 2797e9e measured 7736 px at 390 and 7047 px at 1440 (light, reduced motion); Phase 3: 5927 and 5531
      expect(height).toBeLessThan(width < 768 ? 6600 : 6200);
    });
  }
});

async function openTable(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(yak, { waitUntil: 'load' });
  await page.locator('#vidpovidalnist').scrollIntoViewIfNeeded();
}

const groups = RESPONSIBILITY_GROUPS.map((group) => ({
  ...group,
  count: responsibilityByFormat().items.filter((item) => group.rows.includes(item.rows[0])).length,
}));

test.describe('/yak-pratsyuiemo responsibility table on a phone', () => {
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 390, height: 844 }); });

  test('folds its three groups under their titles, the first open', async ({ page }) => {
    await openTable(page);
    const toggles = page.locator('.rm-group-toggle');
    await expect(toggles).toHaveCount(groups.length);
    for (const [index, group] of groups.entries()) {
      await expect(toggles.nth(index)).toBeVisible();
      await expect(toggles.nth(index)).toHaveAccessibleName(`${group.title} ${worksCount(group.count)}`);
      await expect(toggles.nth(index)).toHaveAttribute('aria-expanded', index === 0 ? 'true' : 'false');
      expect(await toggles.nth(index).evaluate((button) => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('.rm-row:visible')).toHaveCount(groups[0].count);
    // every row is still in the page, so the folded ones are one tap away and in the server HTML
    await expect(page.locator('.rm-row')).toHaveCount(groups.reduce((sum, group) => sum + group.count, 0));
    await expect(page.locator('.rm-group-name:visible')).toHaveCount(0);
  });

  test('a tap or Enter opens and closes a group; its rows follow, named by aria-controls', async ({ page }) => {
    await openTable(page);
    const build = page.locator('.rm-group-toggle[data-group="construction"]');
    const controlled = (await build.getAttribute('aria-controls'))!.split(' ');
    expect(controlled).toHaveLength(groups[1].count);
    await build.click();
    await expect(build).toHaveAttribute('aria-expanded', 'true');
    for (const id of controlled) await expect(page.locator(`#${id}`)).toBeVisible();
    await build.click();
    await expect(build).toHaveAttribute('aria-expanded', 'false');
    for (const id of controlled) await expect(page.locator(`#${id}`)).toBeHidden();
    const handover = page.locator('.rm-group-toggle[data-group="handover"]');
    await handover.focus();
    await page.keyboard.press('Enter');
    await expect(handover).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.rm-row[data-group="handover"]:visible')).toHaveCount(groups[2].count);
  });

  test('after a switch a folded group holding moved rows shows a dot until the next switch', async ({ page }) => {
    await openTable(page);
    await page.locator('.proc-resp-switch').getByRole('radio', { name: 'Субпідряд', exact: true }).check();
    const moved = await page.locator('.rm-row[data-fresh]').evaluateAll((rows) => [...new Set(rows.map((row) => (row as HTMLElement).dataset.group))]);
    expect(moved.length).toBeGreaterThan(0);
    for (const group of moved) {
      await expect(page.locator(`.rm-group-toggle[data-group="${group}"]`)).toHaveAttribute('data-fresh', '');
    }
    const folded = page.locator('.rm-group-toggle[data-fresh][aria-expanded="false"] .rm-group-count').first();
    expect(await folded.evaluate((count) => getComputedStyle(count, '::before').content)).not.toBe('none');
  });
});

test('/yak-pratsyuiemo on a wide screen shows the whole table with plain group titles', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout');
  await page.setViewportSize({ width: 1440, height: 900 });
  await openTable(page);
  await expect(page.locator('.rm-group-toggle:visible')).toHaveCount(0);
  await expect(page.locator('.rm-group-name:visible')).toHaveText(groups.map((group) => group.title));
  await expect(page.locator('.rm-row:visible')).toHaveCount(groups.reduce((sum, group) => sum + group.count, 0));
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('a phone shows every row of the table', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(yak, { waitUntil: 'load' });
    await expect(page.locator('.rm-group-toggle:visible')).toHaveCount(0);
    await expect(page.locator('.rm-row:visible')).toHaveCount(groups.reduce((sum, group) => sum + group.count, 0));
  });
});

test.describe('«Ви · Ми» on a phone', () => {
  for (const path of ['/metalokonstruktsii', '/betonni-roboty', '/pokrivelni-roboty', '/zernoskhovyshcha', yak]) {
    test(`${path}: each step's drawing stands beside its title, and every word stays`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path, { waitUntil: 'load' });
      const steps = page.locator('.process-split:not(.angary-route) > li');
      await expect(steps).toHaveCount(4);
      const layout = await steps.evaluateAll((items) => items.map((item) => {
        const box = (selector: string) => item.querySelector(selector)!.getBoundingClientRect();
        const [title, node, you, we, result] = ['h3', '.ps-node', '.ps-you', '.ps-we', '.ps-result'].map(box);
        const shell = item.closest('.shell')!.getBoundingClientRect();
        return {
          beside: node.left >= title.right - 1 && node.top < title.bottom,
          texts: [you, we, result].every((rect) => rect.height > 0 && rect.width > 0),
          inside: node.right <= shell.right + 0.5,
        };
      }));
      for (const step of layout) expect(step).toEqual({ beside: true, texts: true, inside: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    });
  }
});
