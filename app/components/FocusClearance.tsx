'use client';

import { useEffect } from 'react';

/** Air between a focused control and the bar over it */
const GAP = 12;
/** Frames the browser has to begin its own scroll for the focus: it began on the 2nd or 3rd (Chromium, 11.10) */
const START_FRAMES = 4;
/** Frames without a move that end the browser's scroll: it paused up to 2 frames mid-way (Chromium, 11.10) */
const QUIET_FRAMES = 6;
/** The longest the check waits for that scroll: Chromium's smooth scroll for a focus ran 700–745 ms (11.10) */
const SETTLE_MS = 1500;

/** The fixed or sticky box `hit` lies in, unless that box holds `element` itself or is the scroll shield; else null */
function pinnedBox(hit: Element, element: Element) {
  for (let node: Element | null = hit; node && node !== document.body; node = node.parentElement) {
    const { position } = getComputedStyle(node);
    if (position !== 'fixed' && position !== 'sticky') continue;
    return node.contains(element) || node.classList.contains('scroll-shield') ? null : node;
  }
  return null;
}

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
    const bar = pinnedBox(hit, element)?.getBoundingClientRect();
    // pinned at the top: it starts above the control, or at the window's top over a control that begins past it (a bar
    // pinned at the foot, the cookie banner, is not this one's)
    if (bar && bar.top <= Math.max(box.top, 0)) bottom = Math.max(bottom, bar.bottom);
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
 *
 * The end of the browser's scroll is read off the page itself, frame by frame, rather than from `scrollend`: a fixed
 * 700 ms cap ran out before Chromium's own 745 ms scroll did, and a `scrollend` may belong to an earlier scroll, or
 * not come at all where a browser lacks it. One watch at a time: a new focus, or leaving the page, drops the one
 * before; so does the visitor's own wheel or finger, which takes the scroll over.
 * A control left wholly outside the window is not chased: the browser brings a focused control into view itself, so
 * one still out of it was put there by a script that asked for no scroll (`focus({ preventScroll: true })`).
 */
export function FocusClearance() {
  useEffect(() => {
    let frame = 0;
    function onFocusIn(event: FocusEvent) {
      const element = event.target;
      if (!(element instanceof Element) || !element.matches(':focus-visible')) return;
      cancelAnimationFrame(frame);
      const started = performance.now();
      let last = window.scrollY;
      let frames = 0;
      let quiet = 0;
      let moved = false;
      const watch = (now: number) => {
        frames += 1;
        if (window.scrollY === last) quiet += 1;
        else {
          moved = true;
          quiet = 0;
          last = window.scrollY;
        }
        const settled = moved ? quiet >= QUIET_FRAMES : frames >= START_FRAMES;
        if (settled || now - started > SETTLE_MS) clear(element);
        else frame = requestAnimationFrame(watch);
      };
      frame = requestAnimationFrame(watch);
    }
    const drop = () => cancelAnimationFrame(frame);
    document.addEventListener('focusin', onFocusIn);
    window.addEventListener('wheel', drop, { passive: true });
    window.addEventListener('touchstart', drop, { passive: true });
    return () => {
      drop();
      document.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('wheel', drop);
      window.removeEventListener('touchstart', drop);
    };
  }, []);

  return null;
}
