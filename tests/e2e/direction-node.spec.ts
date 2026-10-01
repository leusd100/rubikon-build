import { expect, test } from '@playwright/test';
import { directionPages } from '../../app/data/directionPages';

// «Вузол напряму»: on metal, concrete and roofing the editorial picture is a three-step tour of one node. It plays
// once in view and can be paused; every step in the list is a button that shows its step; the title block names what
// the camera shows and says «Ілюстрація». Reduced motion: no tour and no control, the steps still switch.
const NODE_PAGES = [
  ['/metalokonstruktsii', directionPages.metalokonstruktsii.editorial.node!],
  ['/betonni-roboty', directionPages['betonni-roboty'].editorial.node!],
  ['/pokrivelni-roboty', directionPages['pokrivelni-roboty'].editorial.node!],
] as const;

test('the node tour plays once in view, pauses, and answers each step', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [path, node] of NODE_PAGES) {
    await page.goto(path, { waitUntil: 'load' });
    const section = page.locator('.dn-section');
    const caption = section.locator('.dn-caption');
    await expect(caption, path).toHaveText(node.overviewCaption);
    await expect(section.locator('.sheet-stamp'), path).toContainText('Ілюстрація');
    await section.locator('.dn-sheet').scrollIntoViewIfNeeded();
    await expect(caption, path).toHaveText(node.steps[0].caption);
    await section.getByRole('button', { name: 'Пауза показу вузла', exact: true }).click();
    await expect(section.getByRole('button', { name: 'Відтворити показ вузла', exact: true }), path).toBeVisible();
    const last = section.getByRole('button', { name: new RegExp(`^${node.steps[2].title}`) });
    await last.click();
    await expect(caption, path).toHaveText(node.steps[2].caption);
    await expect(last, path).toHaveAttribute('aria-pressed', 'true');
    await expect(section.locator('.dn-step[aria-pressed="true"]'), path).toHaveCount(1);
  }
});

test('the node tour without motion: overview, no control, steps still switch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const [path, node] = NODE_PAGES[1];
  await page.goto(path, { waitUntil: 'load' });
  const section = page.locator('.dn-section');
  await section.locator('.dn-sheet').scrollIntoViewIfNeeded();
  await expect(section.locator('.dn-caption')).toHaveText(node.overviewCaption);
  await expect(section.locator('.dn-control')).toHaveCount(0);
  await section.getByRole('button', { name: new RegExp(`^${node.steps[1].title}`) }).click();
  await expect(section.locator('.dn-caption')).toHaveText(node.steps[1].caption);
});
