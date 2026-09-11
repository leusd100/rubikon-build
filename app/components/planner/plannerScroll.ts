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

/** Scroll once React has rendered the next step (the target may not exist yet). */
export function scrollAfterRender(find: () => Element | null, block: ScrollLogicalPosition = 'start') {
  window.setTimeout(() => scrollToPlannerTarget(find(), block), 60);
}
