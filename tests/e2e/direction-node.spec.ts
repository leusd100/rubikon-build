import { expect, test } from '@playwright/test';
import { directionPages } from '../../app/data/directionPages';
import { grainPage } from '../../app/data/grainPage';

// «Вузол напряму»: on metal, concrete and roofing the editorial picture is a three-step tour of one node. It plays
// once in view and can be paused; every step in the list is a button that shows its step; the title block names what
// the camera shows and what the picture is — «Схема» for a node drawn as a technical drawing (NodeDrawing, UX pass 2026-10:
// vector, so the push-in stays sharp), «Ілюстрація» for a picture. Reduced motion: no tour and no control, the steps
// still switch.
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
    await expect(section.locator('.sheet-stamp'), path).toContainText(node.drawing ? 'Схема' : 'Ілюстрація');
    if (node.drawing) await expect(section.locator('svg.node-drawing'), path).toHaveAttribute('aria-label', `Схема: ${node.overviewCaption}`);
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

// The frame beside the text is half as wide as it is tall at 768 px and 1.1–1.4 at 1280–1920; the drawings are 3:2.
// Cover alone cropped the concrete overview's «03» (768–1280), the steel end view's labels (768–1366) and the steps'
// marks — the grain store's third at every width (06.10). Every number and label stays inside its own svg and the
// frame, and so does every mark and every part a step lights in the overview, and each step's mark when it is shown.
const FRAMED_PAGES = [...NODE_PAGES, ['/zernoskhovyshcha', grainPage.complexDirection.editorial.node!]] as const;

test('the node drawings keep every number, label and mark in the frame, from a phone to a laptop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, node] of FRAMED_PAGES) {
      await page.goto(path, { waitUntil: 'load' });
      const section = page.locator('.dn-section');
      // The camera takes its place after load (the stage gets its transition back then) and arrives a frame after a
      // step is shown: reduced motion keeps a near-zero transition, so the same frame still reads the previous view
      const settled = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      await expect.poll(() => section.locator('.dn-stage').evaluate((stage) => (stage as HTMLElement).style.transition), `${path} ${width}`).toBe('');
      await settled();
      const outside = await section.evaluate((root) => {
        const frame = root.querySelector('.dn-visual')!.getBoundingClientRect();
        const past = (box: DOMRect, edge: DOMRect) => Math.max(edge.left - box.left, box.right - edge.right, edge.top - box.top, box.bottom - edge.bottom);
        const found: string[] = [];
        for (const text of root.querySelectorAll<SVGTextElement>('.dn-visual svg text')) {
          const box = text.getBoundingClientRect();
          if (!box.width || !text.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
          const worst = Math.max(past(box, text.ownerSVGElement!.getBoundingClientRect()), past(box, frame));
          if (worst > 1) found.push(`«${text.textContent}» ${Math.round(worst)} px`);
        }
        for (const part of root.querySelectorAll<SVGGraphicsElement>('.dn-overlay .dn-mark, .node-drawing [data-part]')) {
          const worst = past(part.getBoundingClientRect(), frame);
          if (worst > 1) found.push(`${part.dataset.part ? `part ${part.dataset.part}` : part.getAttribute('class')} ${Math.round(worst)} px`);
        }
        return found;
      });
      expect(outside, `${path} ${width}: outside the frame`).toEqual([]);
      for (const [index, item] of node.steps.entries()) {
        await section.getByRole('button', { name: new RegExp(`^${item.title}`) }).click();
        await expect(section.locator('.dn-caption')).toHaveText(item.caption);
        await settled();
        const markPast = await section.evaluate((root, shown) => {
          const frame = root.querySelector('.dn-visual')!.getBoundingClientRect();
          const box = root.querySelector(`.dn-mark-${shown} .dn-line`)!.getBoundingClientRect();
          return Math.max(frame.left - box.left, box.right - frame.right, frame.top - box.top, box.bottom - frame.bottom);
        }, index + 1);
        expect(markPast, `${path} ${width} step ${index + 1}: its mark past the frame, px`).toBeLessThanOrEqual(1);
      }
    }
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
