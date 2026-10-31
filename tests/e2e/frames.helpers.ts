import type { Page } from '@playwright/test';

/**
 * `count` of the page's own frames: a wait on its rendering, never a fixed sleep. For what happens in frames (Lenis steps
 * the page, an observer reports, a commit paints) a span in frames gives it the same number of chances on a busy runner
 * as on a quiet laptop; a span in milliseconds gives it fewer the busier the machine. Not for what is not tied to frames:
 * a timer's or a page reload's span stays in time.
 */
export function nextFrames(page: Page, count = 2) {
  return page.evaluate((frames) => new Promise<void>((resolve) => {
    let left = frames;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), count);
}
