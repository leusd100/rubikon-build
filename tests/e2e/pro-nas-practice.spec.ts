import { expect, test } from '@playwright/test';

// /pro-nas practice (PracticeSteps): the drawing's frame has the drawing's own 4:5 only on a phone — a tablet caps the
// 4:5 at 640 px (1.04 times as wide as tall at 768, 1.41 at 1024), and from 1051 px it is the column beside the text
// (0.67 at 1180). Cover alone cut the dimension's «L» off the top (11, 40.5 and 128.8 px at 768, 834 and 1024 on main
// de05275), the bracket of 01 in the overview and in step 1 (768–1280) and the frame step 2 lights (1024, 1180). Every
// label stays inside its own svg and the frame, and so does every mark and every part a step lights in the overview;
// each step's mark, circles and parts stay in the frame when it is shown, clear of the step bars.

const STEPS = ['Вихідні дані', 'Послідовність робіт', 'Ключові вузли'] as const;

test('the practice drawing keeps its labels, marks and lit parts in the frame, from a phone to a laptop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [390, 768, 834, 1024, 1180, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/pro-nas', { waitUntil: 'load' });
    const story = page.locator('.about-story-section');
    // The camera takes its place after load (the stage gets its transition back then) and arrives a frame after a step
    // is shown: reduced motion keeps a near-zero transition, so the same frame still reads the previous view
    const settled = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    await expect.poll(() => story.locator('.ps-stage').evaluate((stage) => (stage as HTMLElement).style.transition), `${width}`).toBe('');
    await settled();
    const outside = await story.evaluate((root) => {
      const frame = root.querySelector('.sheet-image')!.getBoundingClientRect();
      const past = (box: DOMRect, edge: DOMRect) => Math.max(edge.left - box.left, box.right - edge.right, edge.top - box.top, box.bottom - edge.bottom);
      const found: string[] = [];
      for (const text of root.querySelectorAll<SVGTextElement>('svg text')) {
        const box = text.getBoundingClientRect();
        if (!box.width || !text.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        const worst = Math.max(past(box, text.ownerSVGElement!.getBoundingClientRect()), past(box, frame));
        if (worst > 1) found.push(`«${text.textContent}» ${Math.round(worst)} px`);
      }
      for (const part of root.querySelectorAll<SVGGraphicsElement>('.aqc-mark, .practice-drawing [data-part]')) {
        const worst = past(part.getBoundingClientRect(), frame);
        if (worst > 1) found.push(`${part.dataset.part ? `part ${part.dataset.part}` : part.getAttribute('class')} ${Math.round(worst)} px`);
      }
      return found;
    });
    expect(outside, `${width}: outside the frame`).toEqual([]);
    for (const [index, title] of STEPS.entries()) {
      const item = story.getByRole('button', { name: new RegExp(`^${title}`) });
      await item.click();
      await expect(item).toHaveAttribute('aria-pressed', 'true');
      await settled();
      const shown = await story.evaluate((root, step) => {
        const frame = root.querySelector('.sheet-image')!.getBoundingClientRect();
        const bars = root.querySelector('.ps-progress')!.getBoundingClientRect();
        const boxes = [...root.querySelectorAll(`.aqc-mark-${step} :is(.aqc-line, .aqc-step), .practice-drawing [data-part="${step}"]`)]
          .map((element) => element.getBoundingClientRect());
        return {
          past: Math.max(...boxes.map((box) => Math.max(frame.left - box.left, box.right - frame.right, frame.top - box.top, box.bottom - frame.bottom))),
          underBars: bars.bottom - Math.min(...boxes.map((box) => box.top)),
        };
      }, index + 1);
      expect(shown.past, `${width} step ${index + 1}: its mark and parts past the frame, px`).toBeLessThanOrEqual(1);
      expect(shown.underBars, `${width} step ${index + 1}: its mark and parts under the step bars, px`).toBeLessThanOrEqual(0);
    }
  }
});
