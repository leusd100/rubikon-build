'use client';

import { useEffect } from 'react';

/** Air between a focused control and the bar over it */
const GAP = 12;
/** How long a smooth scroll the browser started for the focus may run before the check is made anyway */
const SETTLE_MS = 700;

/**
 * The bottom of the lowest bar pinned at the top of the window — the fixed header, a sticky panel such as the
 * configurator's mini preview — that lies over the top of `element`; 0 when nothing does. Found by hit-testing three
 * points along the element's top edge, so only what is really on top counts: the control's own label or icon (which
 * sits over a visually hidden radio) is not a bar, and neither is anything that holds the control itself.
 */
function coverAbove(element: Element, box: DOMRect) {
  let bottom = 0;
  const y = Math.min(Math.max(box.top + 2, 0), window.innerHeight - 1);
  for (const share of [0.2, 0.5, 0.8]) {
    const hit = document.elementFromPoint(box.left + box.width * share, y);
    if (!hit || element.contains(hit) || hit.contains(element)) continue;
    for (let node: Element | null = hit; node && node !== document.body; node = node.parentElement) {
      const { position } = getComputedStyle(node);
      if (position !== 'fixed' && position !== 'sticky') continue;
      if (node.contains(element) || node.classList.contains('scroll-shield')) break;
      const bar = node.getBoundingClientRect();
      // pinned at the top: it starts above the control, or at the window's top over a control that begins past it (a bar
      // pinned at the foot, the cookie banner, is not this one's)
      if (bar.top <= Math.max(box.top, 0)) bottom = Math.max(bottom, bar.bottom);
      break;
    }
  }
  return bottom;
}

function clear(element: Element) {
  if (!element.isConnected || document.activeElement !== element) return;
  const box = element.getBoundingClientRect();
  if (box.width === 0 || box.height === 0 || box.bottom <= 0 || box.top >= window.innerHeight) return;
  const cover = coverAbove(element, box);
  if (cover > 0 && box.top < cover + GAP) window.scrollBy({ top: box.top - cover - GAP, behavior: 'instant' });
}

/**
 * Keeps a control that took the keyboard's focus clear of what is pinned over the top of the window (WCAG 2.2 2.4.11).
 * Moving back (Shift+Tab), the browser does not scroll to a control it counts as already in view — though the fixed
 * header, or the configurator's sticky mini preview on a phone, lies over it — and every `scroll-margin-top` is ignored
 * in that case: FAQ questions, links and node pins stayed under the header for good (review 11.10, sweep 2.1–2.2,
 * reproduced again on the branch with reduced motion too). Where the browser does scroll, smoothly, the control passes
 * under the header for a moment and comes out of it — the short overlap the production check saw (R-UX-08 V01/V02) —
 * so the check waits for that scroll to end. Keyboard focus only (`:focus-visible`): a tap or a click never scrolls the
 * page. Renders nothing.
 */
export function FocusClearance() {
  useEffect(() => {
    let timer = 0;
    function onFocusIn(event: FocusEvent) {
      const element = event.target;
      if (!(element instanceof Element) || !element.matches(':focus-visible')) return;
      window.clearTimeout(timer);
      const before = window.scrollY;
      // two frames: the browser's own scroll for the focus has begun by then, if there is one
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (window.scrollY === before) {
          clear(element);
          return;
        }
        const done = () => {
          window.clearTimeout(timer);
          window.removeEventListener('scrollend', done);
          clear(element);
        };
        window.addEventListener('scrollend', done, { once: true });
        timer = window.setTimeout(done, SETTLE_MS);
      }));
    }
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);

  return null;
}
