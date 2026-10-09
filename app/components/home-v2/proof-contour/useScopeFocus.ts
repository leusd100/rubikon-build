import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { ScopePart } from '../../../data/homeProofFrame';
import { SCOPE_FOCUS_EVENT, type ScopeFocus } from '../ScopeCells';
import { phoneNow } from './useSeam';

/** A scope's cell lighting its part (ScopeCells): the seam glides here, so the whole gable shows, and back on letting go */
export const FOCUS_SPLIT = 15;
export const FOCUS_SPLIT_PHONE = 1;

/** The whole frame in view, or near enough (a part lit may be its roof, at the top): a press below it — a scope's cell, «Як
 *  це будується» on a phone — must not play to an empty screen */
export function bringIntoView(stage: HTMLElement) {
  const box = stage.getBoundingClientRect();
  // the site's fixed header covers the window's top (audit 08.10, F11: a node's panel head and its «×» went under it)
  const top = Math.max(0, document.querySelector('header')?.getBoundingClientRect().bottom ?? 0);
  const shown = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, top);
  if (shown >= box.height * 0.92 && box.top >= top - 1) return false;
  const room = window.innerHeight - top;
  const by = box.top - top - Math.max(8, (room - box.height) / 2);
  window.scrollBy({ top: by, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return true;
}

type Seam = Readonly<{
  liveRef: RefObject<number>;
  setSplit: Dispatch<SetStateAction<number>>;
  /** What a lit part clears on the sheet: the held line, the weight on the roof, the node open */
  onFocus: () => void;
}>;

// A scope's cell below lights its part here (ScopeCells): the scheme on and the seam glides left so the whole gable
// shows; letting go brings the seam back, unless the visitor has moved it meanwhile. A pressed cell (a tap on a phone)
// brings the sheet into view first. Returns the part lit (the stage's data-focus)
export function useScopeFocus(stageRef: RefObject<HTMLDivElement | null>, { liveRef, setSplit, onFocus }: Seam) {
  const [focusPart, setFocusPart] = useState<ScopePart | null>(null);
  // where the seam was before it (restored on letting go)
  const focusFrom = useRef<{ split: number } | null>(null);
  // the listener is set up once: it reaches this render's own functions through this
  const actionsRef = useRef({ setSplit, onFocus });
  useEffect(() => {
    actionsRef.current = { setSplit, onFocus };
  });
  useEffect(() => {
    // Letting go waits a moment: the pointer passing from one cell to the next must not send the seam back and forth
    let release: number | undefined;
    const onScope = (event: Event) => {
      const { part, sticky } = (event as CustomEvent<ScopeFocus>).detail;
      const stage = stageRef.current;
      if (!stage) return;
      const to = phoneNow() ? FOCUS_SPLIT_PHONE : FOCUS_SPLIT;
      window.clearTimeout(release);
      if (part) {
        focusFrom.current ??= { split: liveRef.current };
        setFocusPart(part);
        actionsRef.current.onFocus();
        if (liveRef.current > to) actionsRef.current.setSplit(to);
        if (sticky) bringIntoView(stage);
        return;
      }
      release = window.setTimeout(() => {
        const from = focusFrom.current;
        focusFrom.current = null;
        setFocusPart(null);
        if (!from) return;
        if (Math.abs(liveRef.current - to) < 0.5) actionsRef.current.setSplit(from.split);
      }, sticky ? 0 : 160);
    };
    window.addEventListener(SCOPE_FOCUS_EVENT, onScope);
    return () => {
      window.clearTimeout(release);
      window.removeEventListener(SCOPE_FOCUS_EVENT, onScope);
    };
  }, [stageRef, liveRef]);
  return focusPart;
}
