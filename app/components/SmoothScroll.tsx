'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

// Large desktop/laptop viewports only. Reuses the same tier this codebase already treats
// as "roomy desktop" elsewhere (see the 1181px compact-contact-mode boundary in
// globals.css) rather than inventing a new breakpoint. Tablets — including landscape,
// which would otherwise slip under a narrower cutoff — and cramped laptop widths stay on
// native scroll for this first pass; that's an explicit experiment-scope choice, not an
// oversight.
const DESKTOP_QUERY = '(min-width: 1181px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * A very restrained Lenis smooth-scroll layer, mounted only while the viewport matches
 * DESKTOP_QUERY and the user hasn't asked for reduced motion. Renders nothing and touches
 * no layout: no `wrapper`/`content` options are passed, so Lenis smooths the real
 * window/document scroll in place rather than faking position on a wrapper element —
 * sticky positioning, the native scrollbar, keyboard scrolling, and scroll restoration all
 * keep working. No custom rAF loop either (`autoRaf` lets Lenis drive its own single frame
 * loop) — this component is the smoothing foundation only, nothing scroll-triggered.
 *
 * Scope is entirely up to the caller: mount this wherever smooth-scroll should apply
 * (currently: Home only, see app/page.tsx).
 */
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const desktopQuery = window.matchMedia(DESKTOP_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let lenis: Lenis | undefined;

    const sync = () => {
      const shouldRun = desktopQuery.matches && !reducedMotionQuery.matches;

      if (shouldRun && !lenis) {
        lenis = new Lenis({
          // Subtle: closer to native than Lenis's own default (0.1) lerp, just enough
          // added inertia on a mouse-wheel tick to read as smoothed rather than floaty —
          // roughly the "10-20% on top of native" the experiment asked for.
          lerp: 0.12,
          wheelMultiplier: 1,
          // Never smooth touch input — belt-and-suspenders, since this only ever mounts
          // above DESKTOP_QUERY anyway.
          syncTouch: false,
          // Smooth anchor/CTA scrolls (e.g. "Дивитися напрямки") and cancel any in-flight
          // inertia first so a click never fights residual momentum.
          anchors: true,
          stopInertiaOnNavigate: true,
          // Let Lenis own its single rAF loop instead of hand-rolling one here.
          autoRaf: true,
        });
      } else if (!shouldRun && lenis) {
        lenis.destroy();
        lenis = undefined;
      }
    };

    sync();
    desktopQuery.addEventListener('change', sync);
    reducedMotionQuery.addEventListener('change', sync);

    return () => {
      desktopQuery.removeEventListener('change', sync);
      reducedMotionQuery.removeEventListener('change', sync);
      lenis?.destroy();
    };
  }, []);

  return null;
}
