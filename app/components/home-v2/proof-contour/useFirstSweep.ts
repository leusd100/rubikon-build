import { useEffect, useRef, type RefObject } from 'react';
import { DEFAULT_SPLIT } from './useSeam';

/** The first view's one move (R-UX-06 §07, Phase 5: «один повільний прохід шва»): the seam passes once, slowly, to its
 *  rest — one way, no turn. Nothing else plays in the arrival: no rings from the handle or the brief, no names one by one
 *  (they come in with the rest of the drawing, at once, as the seam rests). It used to sweep out to 38 % and back over
 *  1.8 s, then ring the handle and the brief, bring the names in one by one and call a letter: five events in a row, and
 *  only the first explained anything */
/** «Спершу рентген» (owner, 06.11, variant H of the X-Ray review): the sheet plots in as the X-ray of the whole building —
 *  the seam held at the LEFT edge (home-v2.css, data-sweep="wait"), the long wall, the purlins and the footings in view,
 *  which at rest only a drag ever showed — and when the X-ray has plotted in, the seam passes from the left to its rest
 *  and what it has passed is the real photo. It used to run the other way, the photo first and the drawing behind the
 *  seam, and read as «the photo went dark» (06.11: at rest the scheme's half is 23 % of a 1440 × 900 window).
 *  SWEEP_AT: the X-ray stands whole for a beat first (DrawingSheet's plot, 120 + 900 ms, ends ~70 ms into the move; the
 *  seam's ease-in barely moves it then). The owner chose this beat on 06.11 over the earlier start (350 ms, 13.10:
 *  «починає рухатися запізно»), which moved the seam while the X-ray was still plotting in, so it was never seen whole:
 *  the plot itself is the motion the visitor sees first now */
const SWEEP_AT = 950;
const SWEEP_MS = 1400;
/** …and once the drawing's names are in (their fade, 240 ms), the arrival's last word: node Г is lit and one line says
 *  what it does (DEC-42 (a), owner 13.10 — ProofContour's NODE_HINT). Nothing opens by itself: the node opened over the
 *  photo on a laptop (owner, 09.10), 35–60 % of the photo's half on 1440 × 900 and 1250 × 613, and on a phone the letter
 *  В called instead */
const HINT_AT = 300;

type Carriers = Readonly<{
  paneRef: RefObject<HTMLDivElement | null>;
  innerRef: RefObject<HTMLDivElement | null>;
  railRef: RefObject<HTMLSpanElement | null>;
  handleRef: RefObject<HTMLSpanElement | null>;
}>;

// The first view (see SWEEP_AT): the seam waits at the left edge — the X-ray whole — as the sheet plots in, then sweeps
// on the four's --split (a registered custom property, home-v2.css), so the range's value and what it says never move. It starts once the stage is a third in view, scrolling or not. The visitor's own move in the sheet
// first, or reduced motion: no sweep, the seam at rest.
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
      const carriers = [paneRef.current, innerRef.current, railRef.current, handleRef.current].filter((element) => element !== null);
      // where the hold has the seam (home-v2.css: 4 %, a phone's 1 %), read before the hold is let go
      const from = getComputedStyle(carriers[0]).getPropertyValue('--split');
      // In one task: the hold at the edge gives way to the sweep's first frame, at the same edge
      stage.dataset.gliding = '';
      stage.dataset.sweep = 'run';
      // one way, eased in and out: no turn to read as a second move
      const keyframes = [
        { '--split': from, easing: 'cubic-bezier(.45, 0, .25, 1)' },
        { '--split': `${DEFAULT_SPLIT}%` },
      ];
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
    // The newest entry: one call can hold several (DrawingSheet), and the first of them may be a stale «out of view»
    const seen = new IntersectionObserver((entries) => {
      visible = entries.at(-1)!.isIntersecting;
      run();
    // a third of the frame in view, as the sheet's own plot (DrawingSheet): seen arriving, not only once it is there
    }, { threshold: 0.35 });
    seen.observe(stage);
    const arrived = new MutationObserver(() => {
      if (sheet.dataset.sheetState !== 'on') return;
      arrived.disconnect();
      timer = window.setTimeout(() => {
        due = true;
        run();
      }, SWEEP_AT);
    });
    arrived.observe(sheet, { attributes: true, attributeFilter: ['data-sheet-state'] });
    return () => {
      live = false;
      unlisten();
      seen.disconnect();
      arrived.disconnect();
      window.clearTimeout(timer);
      for (const animation of sweep) animation.cancel();
      delete stage.dataset.sweep;
    };
  }, [stageRef, paneRef, innerRef, railRef, handleRef]);
}
