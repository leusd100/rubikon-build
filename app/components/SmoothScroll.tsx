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
// A mouse or a trackpad: the pointers that hover
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';
/** How long after the page's last scroll step the pointer counts again */
const SCROLL_REST_MS = 120;
/** A scroll this soon after a wheel event is the wheel's; a mouse that moved this recently is not at rest */
const WHEEL_SCROLL_MS = 150;
/** What a press caught by the scroll shield is passed on to */
const CONTROLS = 'a[href], button, summary, label, input, select, textarea, [role="button"]';

/**
 * A very restrained Lenis smooth-scroll layer, mounted sitewide (see app/layout.tsx) but
 * only active while the viewport matches DESKTOP_QUERY and the user hasn't asked for
 * reduced motion. Renders nothing and touches no layout: no `wrapper`/`content` options are
 * passed, so Lenis smooths the real window/document scroll in place rather than faking
 * position on a wrapper element — sticky positioning, the native scrollbar, keyboard
 * scrolling, and scroll restoration all keep working. No custom rAF loop either (`autoRaf`
 * lets Lenis drive its own single frame loop) — this component is the smoothing foundation
 * only, nothing scroll-triggered. It also keeps a resting mouse from hovering what scrolls under it (second effect).
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
        }).catch(() => {
          // The chunk failed to load: native scrolling stays, and the next viewport or motion change may try again.
          loading = false;
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

  // While the page scrolls under a resting mouse, nothing under the pointer takes :hover. The browser re-hit-tests a
  // resting pointer as the page moves, so the rows, cards and sheets passing under it lit up one after another (and a
  // lit factor retitled its drawing) all the way down a page (07.10). A transparent shield over the page (not the
  // header) takes the pointer for the scroll's duration — one fixed box shown and hidden, nothing under it restyled.
  // Only a wheel or a trackpad raises it, and only while the mouse rests: a scroll from a link, a key or a script, or
  // one with the mouse on the move, leaves the pointer alone. It goes the moment the mouse really moves, a button goes
  // down, or SCROLL_REST_MS after the page's last scroll step; with a button held (a drag selecting text) it never
  // shows. A click that lands on it (the page had only just stopped under a pointer that never moved) is passed on to
  // the link or button under the pointer.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hoverQuery = window.matchMedia(HOVER_QUERY);
    const root = document.documentElement;
    const shield = document.createElement('div');
    shield.className = 'scroll-shield';
    shield.setAttribute('aria-hidden', 'true');
    document.body.appendChild(shield);
    let timer = 0;
    let pressed = false;
    let lastWheel = -Infinity;
    let lastMove = -Infinity;
    let caught: { control: HTMLElement | null; x: number; y: number; id: number } | null = null;

    const release = () => {
      window.clearTimeout(timer);
      timer = 0;
      if ('scrollStill' in root.dataset) delete root.dataset.scrollStill;
    };
    const onWheel = (event: WheelEvent) => {
      // (ctrl + wheel is a zoom, not a scroll)
      if (!event.ctrlKey) lastWheel = performance.now();
    };
    const onScroll = () => {
      const up = 'scrollStill' in root.dataset;
      const now = performance.now();
      if (!up && (pressed || !hoverQuery.matches || now - lastWheel > WHEEL_SCROLL_MS || now - lastMove < WHEEL_SCROLL_MS)) return;
      if (!up) root.dataset.scrollStill = '';
      window.clearTimeout(timer);
      timer = window.setTimeout(release, SCROLL_REST_MS);
    };
    // The browser's own re-hit-test after a scroll comes as a move that went nowhere: only a real one counts
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || (event.movementX === 0 && event.movementY === 0)) return;
      lastMove = performance.now();
      release();
    };
    const onDown = (event: PointerEvent) => {
      pressed = true;
      const onShield = event.target === shield;
      release();
      if (!onShield || event.button !== 0) return;
      const under = document.elementFromPoint(event.clientX, event.clientY);
      caught = { control: under?.closest<HTMLElement>(CONTROLS) ?? null, x: event.clientX, y: event.clientY, id: event.pointerId };
    };
    const onUp = (event: PointerEvent) => {
      pressed = false;
      const press = caught;
      caught = null;
      if (!press?.control || event.type !== 'pointerup' || event.pointerId !== press.id) return;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) return;
      press.control.focus({ preventScroll: true });
      press.control.click();
    };

    window.addEventListener('wheel', onWheel, { passive: true, capture: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      release();
      shield.remove();
    };
  }, []);

  return null;
}
