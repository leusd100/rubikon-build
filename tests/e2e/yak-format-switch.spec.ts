import { expect, test } from '@playwright/test';

// /yak-pratsyuiemo — the responsibility map's format switcher is one segmented control. On 06.10 a stylesheet cleanup
// took its rules away with the retired scope cards' (they shared a `:is(…)` selector list): the owner found three bare
// radio buttons. These pin the control's look by what makes it a control, not by its colours.

const SWITCH = '.proc-resp-switch';

for (const width of [1440, 390]) {
  test(`at ${width}px the map's switcher is a segmented control, not bare radios`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/yak-pratsyuiemo', { waitUntil: 'load' });
    const control = page.locator(SWITCH);
    await control.scrollIntoViewIfNeeded();
    await expect(control.getByRole('radio')).toHaveCount(3);
    const look = await control.evaluate((root) => {
      const labels = [...root.querySelectorAll('label')];
      const boxes = labels.map((label) => label.getBoundingClientRect());
      const checked = root.querySelector<HTMLInputElement>('input:checked')!;
      const other = root.querySelector<HTMLInputElement>('input:not(:checked)')!;
      const face = (input: HTMLInputElement) => getComputedStyle(input.nextElementSibling!).backgroundColor;
      return {
        // the native radio is there for the keyboard and covers its segment, but is not drawn
        inputOpacity: getComputedStyle(checked).opacity,
        inputCovers: Math.abs(checked.getBoundingClientRect().width - checked.closest('label')!.getBoundingClientRect().width) <= 1,
        heights: boxes.map((box) => Math.round(box.height)),
        widths: boxes.map((box) => Math.round(box.width)),
        oneRow: Math.max(...boxes.map((box) => box.top)) - Math.min(...boxes.map((box) => box.top)) <= 1,
        frame: getComputedStyle(root.querySelector(':scope > div')!).borderTopWidth,
        checkedDiffers: face(checked) !== face(other),
      };
    });
    expect(look.inputOpacity).toBe('0');
    expect(look.inputCovers).toBe(true);
    expect(look.oneRow).toBe(true);
    for (const height of look.heights) expect(height).toBeGreaterThanOrEqual(44);
    expect(new Set(look.widths).size).toBe(1);
    expect(look.frame).toBe('1px');
    expect(look.checkedDiffers).toBe(true);
  });
}
