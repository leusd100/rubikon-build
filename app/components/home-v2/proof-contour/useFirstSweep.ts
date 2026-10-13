import { useEffect, useRef, type RefObject } from 'react';
import { sheetNow } from './useNodeDetail';
import { DEFAULT_SPLIT } from './useSeam';

/** The first view's one move (R-UX-06 §07, Phase 5: «один повільний прохід шва»): once the photo has plotted in
 *  (DrawingSheet: 120 + 900 ms), the seam passes once, slowly, from the right edge to its rest — one way, no turn — and
 *  what it has passed is the drawing. Nothing else plays in the arrival: no rings from the handle or the brief, no names
 *  one by one (they come in with the rest of the drawing, at once, as the seam rests). It used to sweep out to 38 % and
 *  back over 1.8 s, then ring the handle and the brief, bring the names in one by one and call a letter: five events in
 *  a row, and only the first explained anything */
const SWEEP_AT = 1050;
const SWEEP_MS = 1400;
/** The page must have stopped scrolling this long before the sweep: the eye is on the way, not on the seam */
const SWEEP_QUIET = 250;
/** …and after it, a moment later, the arrival's last word (owner, 09.10; useTour's AUTO_NODE): a laptop or a tablet opens
 *  a node by itself, a phone's letter В calls once — the names have come in by then (their fade, 240 ms) */
const TEASE_AT = 1200;
const TEASE_MS = 2400;
const AUTO_NODE_AT = 2000;
export const AUTO_NODE_EVENT = 'hv2:auto-node';

/** Settles when the sheet's picture has finished plotting in (the transition of DrawingSheet's cover), or at once */
function plottedIn(sheet: Element) {
  const plotting = sheet.querySelector('.sheet-cover')?.getAnimations() ?? [];
  return Promise.all(plotting.map((animation) => animation.finished.catch(() => undefined)));
}

type Carriers = Readonly<{
  paneRef: RefObject<HTMLDivElement | null>;
  innerRef: RefObject<HTMLDivElement | null>;
  railRef: RefObject<HTMLSpanElement | null>;
  handleRef: RefObject<HTMLSpanElement | null>;
}>;

// The first view (see SWEEP_AT): the seam waits at the right edge — the photo whole — while the sheet plots in, then
// sweeps on the four's --split (a registered custom property, home-v2.css), so the range's value and what it says
// never move. It waits until the stage is in view and the page has stopped scrolling. The visitor's own move in the
// sheet first, or reduced motion: no sweep, the seam at rest.
// Returns whether the visitor has made a move of their own in the sheet (the arrival's own node asks)
export function useFirstSweep(stageRef: RefObject<HTMLDivElement | null>, { paneRef, innerRef, railRef, handleRef }: Carriers) {
  const touchedRef = useRef(false);
  useEffect(() => {
    const stage = stageRef.current;
    const sheet = stage?.closest<HTMLElement>('figure');
    if (!stage || !sheet || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let sweep: Animation[] = [];
    let timer: number | undefined;
    let due = false;
    let visible = false;
    let scrolled = 0;
    let live = true;
    const after: number[] = [];
    const release = () => {
      delete stage.dataset.nodesTease;
      for (const id of after) window.clearTimeout(id);
    };
    stage.dataset.sweep = 'wait';
    const stop = () => {
      touchedRef.current = true;
      release();
      window.clearTimeout(timer);
      for (const animation of sweep) animation.cancel();
      delete stage.dataset.gliding;
      delete stage.dataset.sweep;
    };
    const run = () => {
      if (touchedRef.current || !due || !visible || sweep.length) return;
      const quiet = performance.now() - scrolled;
      if (quiet < SWEEP_QUIET) {
        window.clearTimeout(timer);
        timer = window.setTimeout(run, SWEEP_QUIET - quiet);
        return;
      }
      // In one task: the hold at the edge gives way to the sweep's first frame, at the same edge
      stage.dataset.gliding = '';
      stage.dataset.sweep = 'run';
      // one way, eased in and out: no turn to read as a second move
      const keyframes = [
        { '--split': '100%', easing: 'cubic-bezier(.45, 0, .25, 1)' },
        { '--split': `${DEFAULT_SPLIT}%` },
      ];
      const carriers = [paneRef.current, innerRef.current, railRef.current, handleRef.current].filter((element) => element !== null);
      sweep = carriers.map((element) => element.animate(keyframes, { duration: SWEEP_MS }));
      sweep[0].onfinish = () => {
        // at rest: the drawing's names, figures and letters come in together (home-v2.css: their fade under data-sweep)
        delete stage.dataset.gliding;
        delete stage.dataset.sweep;
        // …then a node opens by itself — Г, the ridge — so nobody passes the block without seeing that the scheme opens
        // (owner, 09.10); a phone's node is a sheet over the page, so there one letter only calls
        if (sheetNow()) {
          after.push(
            window.setTimeout(() => { stage.dataset.nodesTease = ''; }, TEASE_AT),
            window.setTimeout(() => delete stage.dataset.nodesTease, TEASE_AT + TEASE_MS),
          );
        } else after.push(window.setTimeout(() => stage.dispatchEvent(new Event(AUTO_NODE_EVENT)), AUTO_NODE_AT));
      };
    };
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run();
    // most of the frame in view, not its top edge: the arrival plays where it is seen (audit 08.10)
    }, { threshold: 0.6 });
    seen.observe(stage);
    const arrived = new MutationObserver(() => {
      if (sheet.dataset.sheetState !== 'on') return;
      arrived.disconnect();
      timer = window.setTimeout(() => {
        // …and only once the picture has plotted in: the plot's transition starts a frame after data-sheet-state, so on a
        // busy page SWEEP_AT alone could start the sweep with the plot's last frames still running
        void plottedIn(sheet).then(() => {
          if (!live) return;
          due = true;
          run();
        });
      }, SWEEP_AT);
    });
    arrived.observe(sheet, { attributes: true, attributeFilter: ['data-sheet-state'] });
    const onScroll = () => { scrolled = performance.now(); };
    // A mouse or a pen pressed anywhere in the sheet is the visitor's own move; a finger only on what it can move (the
    // handle, a button): elsewhere it scrolls the page. Keys reach the sheet only on its range and buttons
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && !(event.target as Element).closest('.hv2-contour-handle, button')) return;
      stop();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    sheet.addEventListener('pointerdown', onPointer, { passive: true });
    sheet.addEventListener('keydown', stop);
    return () => {
      live = false;
      release();
      seen.disconnect();
      arrived.disconnect();
      window.clearTimeout(timer);
      for (const animation of sweep) animation.cancel();
      delete stage.dataset.sweep;
      window.removeEventListener('scroll', onScroll);
      sheet.removeEventListener('pointerdown', onPointer);
      sheet.removeEventListener('keydown', stop);
    };
  }, [stageRef, paneRef, innerRef, railRef, handleRef]);
  return touchedRef;
}
