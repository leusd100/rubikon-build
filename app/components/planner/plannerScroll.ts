/**
 * Programmatic scrolling for planner steps. The offset under the site header is CSS
 * (`scroll-margin-top` on `[data-planner-anchor]`), never a number here, and reduced motion
 * turns smooth scrolling into a jump.
 */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function scrollToPlannerTarget(target: Element | null | undefined, block: ScrollLogicalPosition = 'start') {
  if (!target) return;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block });
  // Keyboard focus follows the view. The control that moved the consultation on (Продовжити,
  // Змінити, Показати…) has usually just unmounted; left on <body>, the next Tab would restart
  // from the top of the page.
  const heading = target.matches('[data-planner-focus]') ? target : target.querySelector('[data-planner-focus]');
  if (heading instanceof HTMLElement) heading.focus({ preventScroll: true });
}

const RENDER_TICK_MS = 60;
const MAX_WAIT_TICKS = 20;

/**
 * Scroll once React has rendered the next step. A target that is still loading (the result is
 * fetched on demand) gets up to ~1.2 s; after that the scroll goes to `fallback`, if any.
 */
export function scrollAfterRender(
  find: () => Element | null,
  block: ScrollLogicalPosition = 'start',
  fallback?: () => Element | null,
) {
  let ticks = 0;
  const attempt = () => {
    const target = find();
    if (target || ticks >= MAX_WAIT_TICKS) {
      scrollToPlannerTarget(target ?? fallback?.(), block);
      return;
    }
    ticks += 1;
    window.setTimeout(attempt, RENDER_TICK_MS);
  };
  window.setTimeout(attempt, RENDER_TICK_MS);
}
