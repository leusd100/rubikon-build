'use client';

import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { classNames } from '../lib/classNames';
import './drawing-sheet.css';

// «Креслення» — the site's frame for a standalone image (chosen in the /napryamky frame lab): the picture laid on a
// drawing sheet with ruler ticks along two edges and a title block under it that says what the image is («Ілюстрація»,
// «Схема», «Фото об’єкта») — the provenance label lives in the frame instead of a chip over the picture.
//
// Arriving in view (35 %), the picture is plotted in from the top under a copper line, the rulers draw and the title
// block fills — once. The plot is a paper cover drawn back down under the line (`.sheet-cover`, a transform the
// compositor runs alone), not a clip-path on the picture: Chrome runs a clip-path transition as a paint worklet that
// re-rasters the picture every frame, and while a finger flings the page that held back the main thread's frames.
// The sheet arms itself only after hydration and only with motion allowed, so without JavaScript or with reduced
// motion it stands complete. `replayKey` (the /napryamky catalogue) replays the line and the title block whenever the
// picture changes. `trace` (the built hangar on /angary, owner 20.11: «так само застосуємо»): before the plot, the photo's
// own lines draw on the paper (scripts/generate-direction-hero-traces.py), and the plot turns the drawing into the photo.
// The drawing is asked for only when the sheet comes into view; not in within .7 s, the sheet plots without it.
// Styles: app/components/drawing-sheet.css.

export type SheetCell = {
  /** The small caption above the value («Напрям», «Зображення»…) */
  label?: string;
  value: ReactNode;
  /** number: a large copper figure; main: the cell that takes the free width; note: a main cell holding a sentence
   *  (normal case, wraps) */
  tone?: 'number' | 'main' | 'note';
  className?: string;
};

export function DrawingSheet({
  cells,
  action,
  className,
  imageClassName,
  imageRef,
  replayKey,
  trace,
  children,
}: Readonly<{
  cells: readonly SheetCell[];
  /** A control placed at the end of the title block (the /pro-nas practice tour's pause) */
  action?: ReactNode;
  className?: string;
  imageClassName?: string;
  imageRef?: Ref<HTMLDivElement>;
  replayKey?: string;
  /** A line drawing of the picture, in the picture's own frame, drawn on the paper before the plot */
  trace?: { src: string; width: number; height: number };
  children: ReactNode;
}>) {
  const sheetRef = useRef<HTMLElement>(null);
  const traceRef = useRef<HTMLImageElement>(null);
  const traceSrc = trace?.src;

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Set on the node, not through state: nothing re-renders, and the server markup stays the complete sheet
    sheet.dataset.sheetState = 'armed';
    // Every entry, not the first: a busy page can get "out of view, in view" in one call, and the observer reports no more
    // until the sheet leaves, so reading the first left the picture under its cover (Main Regression 41027903583, 30.10)
    let timer = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const drawing = traceRef.current;
      if (!drawing || !traceSrc) {
        sheet.dataset.sheetState = 'on';
        return;
      }
      // the plot waits for the drawing, briefly: with it once it is in, without it after .7 s
      let plotted = false;
      const plot = (drawn: boolean) => {
        if (plotted) return;
        plotted = true;
        if (drawn) sheet.dataset.sheetTrace = '';
        sheet.dataset.sheetState = 'on';
      };
      timer = window.setTimeout(() => plot(false), 700);
      drawing.onload = () => plot(true);
      drawing.onerror = () => plot(false);
      drawing.src = traceSrc;
    }, { threshold: 0.35 });
    observer.observe(sheet);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [traceSrc]);

  return (
    <figure ref={sheetRef} className={classNames('sheet', className)}>
      <div className="sheet-body">
        <span className="sheet-ruler sheet-ruler-x" aria-hidden="true" />
        <span className="sheet-ruler sheet-ruler-y" aria-hidden="true" />
        <div className={classNames('sheet-image', imageClassName)} ref={imageRef}>
          {children}
        </div>
        <i className="sheet-cover" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- an 8 KB SVG drawing, set when the sheet comes into view */}
        {trace && <img ref={traceRef} className="sheet-trace" alt="" aria-hidden="true" width={trace.width} height={trace.height} />}
        <i className="sheet-scan" aria-hidden="true" key={replayKey} data-replay={replayKey ? '' : undefined} />
      </div>
      <figcaption className="sheet-stamp" key={replayKey} data-replay={replayKey ? '' : undefined}>
        {cells.map((cell, index) => (
          <span
            // The cells are a fixed layout per sheet: their order never changes
            key={`${index}-${cell.label ?? ''}`}
            className={classNames('sheet-cell', cell.tone && `sheet-cell-${cell.tone}`, cell.className)}
          >
            {cell.label && <small>{cell.label}</small>}
            <b>{cell.value}</b>
          </span>
        ))}
        {action && <span className="sheet-action">{action}</span>}
      </figcaption>
    </figure>
  );
}
