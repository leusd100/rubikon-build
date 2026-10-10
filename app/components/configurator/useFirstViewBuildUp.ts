'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { BUILD_STAGE_ORDER, firstViewStageStartsMs, totalSequenceDurationMs } from '../../lib/configurator/buildUpSequence';

// /angary's first view (owner, 03.10): the drawing builds itself — foundation, frame, walls, roof, gates, ≈2.5 s
// (buildUpSequence.ts) — the first time its sheet is at least half in view, once per page load. It arms only after
// hydration and only while the sheet is not in view at all, the DrawingSheet pattern: the server markup, a visitor who
// is already there when the page wakes up and reduced motion all get the complete drawing. Armed, the layers are put
// away at once (`data-build="armed"` on the picture turns their fade off, configurator-sheet.css), so even a fast
// scroller never watches them go. A visitor who reaches for a control, a configuration that is no longer the default or
// a presentation demo gets the whole drawing at once — `data-build="complete"` turns the fades off while the layers
// still on their way settle, or the frame, which staggers columns → rafters → purlins, arrived last, after the walls and
// the roof (03.10). Returns how many stages are requested — all of them unless the first view is armed or playing — for
// the drawing to hold the rest back: HangarPreview through its usual layer lifecycle, /angary's general view
// (HangarGeneralView, 10.10) as its ground, outline, cladding and openings; the 3D view never needs it: switching to it
// is reaching for a control.

const ALL_STAGES = BUILD_STAGE_ORDER.length;
/** The sheet plots its picture in for ~1 s as it arrives (DrawingSheet, from 35 % in view): the foundation, at the
 *  bottom of the picture, fades in as the plotter line passes it */
const SHEET_BEAT_MS = 600;
/** What counts as reaching for a control: a click, a value or focus on one — not a finger that lands on the controls
 *  to scroll the page (no pointerdown) */
const CONTROL = 'button, input, select, textarea, a, label, summary';
const REACH_EVENTS = ['click', 'input', 'focusin'] as const;
/** Once per page load: a return to /angary in the same tab, or a remount, shows the finished drawing */
let shownThisLoad = false;

export function useFirstViewBuildUp(drawingRef: RefObject<HTMLElement | null>, enabled: boolean, untouched: boolean) {
  const [released, setReleased] = useState(ALL_STAGES);
  const untouchedRef = useRef(untouched);
  const finishRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    untouchedRef.current = untouched;
    if (!untouched) finishRef.current();
  }, [untouched]);

  useEffect(() => {
    const drawing = drawingRef.current;
    if (!enabled || !drawing || shownThisLoad || !untouchedRef.current) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    // The whole sheet, not the picture: the picture is clipped while the sheet plots it in, and Chrome's observer
    // counts the clip where others do not
    const sheet = drawing.closest<HTMLElement>('.sheet') ?? drawing;
    const box = sheet.getBoundingClientRect();
    if (box.bottom > 0 && box.top < window.innerHeight) return undefined;

    const section = drawing.closest('.hangar-configurator') ?? drawing;
    const timers: number[] = [];
    let settled = 0;
    const reach = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(CONTROL)) finish();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry || entry.intersectionRatio < 0.5) return;
      observer.disconnect();
      shownThisLoad = true;
      delete drawing.dataset.build;
      firstViewStageStartsMs().forEach((at, index) => {
        timers.push(window.setTimeout(() => {
          setReleased(index + 1);
          if (index + 1 === ALL_STAGES) stop();
        }, SHEET_BEAT_MS + at));
      });
    }, { threshold: 0.5 });
    const stop = () => {
      delete drawing.dataset.build;
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      for (const type of REACH_EVENTS) section.removeEventListener(type, reach, true);
      finishRef.current = () => undefined;
    };
    const finish = () => {
      shownThisLoad = true;
      stop();
      // At once: no fades until the longest stage — the frame's own sequence — would have settled
      drawing.dataset.build = 'complete';
      settled = window.setTimeout(() => delete drawing.dataset.build, totalSequenceDurationMs());
      setReleased(ALL_STAGES);
    };

    finishRef.current = finish;
    drawing.dataset.build = 'armed';
    setReleased(0);
    observer.observe(sheet);
    for (const type of REACH_EVENTS) section.addEventListener(type, reach, true);
    return () => {
      stop();
      window.clearTimeout(settled);
      delete drawing.dataset.build;
      // A remount (React's development double run) arms again from the complete drawing
      setReleased(ALL_STAGES);
    };
  }, [enabled, drawingRef]);

  return released;
}
