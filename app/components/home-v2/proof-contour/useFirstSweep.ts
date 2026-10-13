import { useEffect, useRef, type RefObject } from 'react';
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
/** …and once the drawing's names are in (their fade, 240 ms), the arrival's last word: node Г is lit and one line says
 *  what it does (DEC-42 (a), owner 13.10 — ProofContour's NODE_HINT). Nothing opens by itself: the node opened over the
 *  photo on a laptop (owner, 09.10), 35–60 % of the photo's half on 1440 × 900 and 1250 × 613, and on a phone the letter
 *  В called instead */
const HINT_AT = 300;

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
// `hint` is told when the node's hint is due (true: the seam has come to rest, or at once with reduced motion — the hint
// stands still) and when it is over (false: the visitor's own first press or key in the sheet); a visitor who moved
// first never gets it
export function useFirstSweep(stageRef: RefObject<HTMLDivElement | null>, { paneRef, innerRef, railRef, handleRef }: Carriers, hint: (on: boolean) => void) {
  const touchedRef = useRef(false);
  const hintRef = useRef(hint);
  useEffect(() => {
    hintRef.current = hint;
  });
  useEffect(() => {
    const stage = stageRef.current;
    const sheet = stage?.closest<HTMLElement>('figure');
    if (!stage || !sheet) return;
    let sweep: Animation[] = [];
    let timer: number | undefined;
    let due = false;
    let visible = false;
    let scrolled = 0;
    let live = true;
    const stop = () => {
      touchedRef.current = true;
      hintRef.current(false);
      window.clearTimeout(timer);
      for (const animation of sweep) animation.cancel();
      delete stage.dataset.gliding;
      delete stage.dataset.sweep;
    };
    // A mouse or a pen pressed anywhere in the sheet is the visitor's own move; a finger only on what it can move (the
    // handle, a button): elsewhere it scrolls the page. Keys reach the sheet only on its range and buttons
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && !(event.target as Element).closest('.hv2-contour-handle, button')) return;
      stop();
    };
    sheet.addEventListener('pointerdown', onPointer, { passive: true });
    sheet.addEventListener('keydown', stop);
    const unlisten = () => {
      sheet.removeEventListener('pointerdown', onPointer);
      sheet.removeEventListener('keydown', stop);
    };
    // Reduced motion: no move — the sheet stands complete at rest — and the hint is simply there
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hintRef.current(true);
      return unlisten;
    }
    stage.dataset.sweep = 'wait';
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
        // …then node Г's hint (see HINT_AT)
        timer = window.setTimeout(() => {
          if (live && !touchedRef.current) hintRef.current(true);
        }, HINT_AT);
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
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      live = false;
      unlisten();
      seen.disconnect();
      arrived.disconnect();
      window.clearTimeout(timer);
      for (const animation of sweep) animation.cancel();
      delete stage.dataset.sweep;
      window.removeEventListener('scroll', onScroll);
    };
  }, [stageRef, paneRef, innerRef, railRef, handleRef]);
}
