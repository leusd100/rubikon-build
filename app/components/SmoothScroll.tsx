'use client';

import { useEffect } from 'react';
import type Lenis from 'lenis';

// Large desktop/laptop viewports only. Reuses the same tier this codebase already treats
// as "roomy desktop" elsewhere (see the 1181px compact-contact-mode boundary in
// globals.css) rather than inventing a new breakpoint. Tablets — including landscape,
// which would otherwise slip under a narrower cutoff — and cramped laptop widths stay on
// native scroll deliberately: touch already has good native momentum scrolling, layering
// this on top of it fights the finger rather than helping (it's also why Lenis's own
// syncTouch default is off, not just this component's choice). Not a "for now" gap to
// close later so much as the intended shape — desktop pointer input benefits from
// smoothing in a way touch input doesn't.
const DESKTOP_QUERY = '(min-width: 1181px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * A very restrained Lenis smooth-scroll layer, mounted sitewide (see app/layout.tsx) but
 * only active while the viewport matches DESKTOP_QUERY and the user hasn't asked for
 * reduced motion. Renders nothing and touches no layout: no `wrapper`/`content` options are
 * passed, so Lenis smooths the real window/document scroll in place rather than faking
 * position on a wrapper element — sticky positioning, the native scrollbar, keyboard
 * scrolling, and scroll restoration all keep working. No custom rAF loop either (`autoRaf`
 * lets Lenis drive its own single frame loop) — this component is the smoothing foundation
 * only, nothing scroll-triggered.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const desktopQuery = window.matchMedia(DESKTOP_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let lenis: Lenis | undefined;
    // True from the moment we start importing 'lenis' until sync() next runs — guards
    // against sync() firing again (a media-query change) while the import is still in
    // flight and starting a second one, and against constructing an instance after the
    // page no longer wants one (viewport/motion preference changed mid-import) or after
    // this effect has already been cleaned up.
    let loading = false;
    let cancelled = false;

    const sync = () => {
      const shouldRun = desktopQuery.matches && !reducedMotionQuery.matches;

      if (shouldRun && !lenis && !loading) {
        loading = true;
        // Dynamically imported, not a static top-level import: this component is mounted
        // sitewide (app/layout.tsx), so a static import would ship and parse Lenis's JS on
        // every page load — including every viewport this never runs on. That parse/eval
        // cost was directly measured pushing /angary's LCP over budget under Lighthouse's
        // throttled mobile audit (Render Delay, the dominant LCP phase there, is exactly
        // where extra main-thread JS work shows up) even though shouldRun is false and
        // Lenis never actually constructs under that narrow emulated viewport — the tax was
        // just from the module existing in the bundle. Importing only once we already know
        // we're going to use it means non-qualifying viewports never pay for it at all.
        import('lenis').then(({ default: Lenis }) => {
          loading = false;
          if (cancelled || !(desktopQuery.matches && !reducedMotionQuery.matches)) return;

          lenis = new Lenis({
            // Tuned live against Lenis's own 0.1 default: 0.12 read as fine on Home alone,
            // but felt too floaty once compared side-by-side against snappier values, so
            // settled here — enough inertia to read as smoothed, not enough to add
            // noticeable lag on a quick scroll. Higher = less smoothing/closer to native.
            lerp: 0.18,
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
      cancelled = true;
      desktopQuery.removeEventListener('change', sync);
      reducedMotionQuery.removeEventListener('change', sync);
      lenis?.destroy();
    };
  }, []);

  return null;
}
