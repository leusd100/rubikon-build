'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Phase 3B — minimal technical overlay for the 3D view (brief §27).
//
// Deliberately NOT a copy of the Technical view's own dimension guides (tick marks, extension
// lines, per-edge placement solved by point-in-polygon sampling against the projected surfaces —
// see isometricProjection.ts). That machinery exists because a technical DRAWING's whole job is
// precise measurement. 3D's job is volume and presence (brief §12/§27): "the overlay should
// support orientation, not turn the architectural view back into a drawing." So this is plain
// HTML — a small, fixed-position readout, not WebGL text (brief's explicit preference) and not
// anything anchored to 3D world-space edges.
//
// Four numbers only, matching what the brief names: width, length, eave height, ridge height —
// not gate count, not envelope choice, not scope. Those already have a canonical, accessible home
// in the controls/summary; this overlay's only job is "orient yourself while looking at the
// object," not "restate the whole configuration."
//
// Accessible-but-silent: `.hc-visually-hidden` (HangarPreviewModes.tsx) is the authoritative
// screen-reader description of the 3D view and already states these same four numbers in prose.
// This overlay is a sighted-user convenience duplicating that, not a second source of
// information, so it is `aria-hidden` to avoid announcing the same numbers twice — only the
// toggle button itself needs to stay operable.

function formatMetres(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 }).format(rounded);
}

export function ThreeDimensionOverlay({
  widthM,
  lengthM,
  eaveM,
  ridgeM,
  onBottomInsetChange,
}: {
  widthM: number;
  lengthM: number;
  eaveM: number;
  ridgeM: number;
  /** Reports how much of the canvas's bottom edge this overlay covers, so the camera can frame the
   *  building in what is left instead of behind it. Measured rather than assumed: the readout is
   *  one row on a desktop and two at 390px, and it disappears entirely when the visitor hides it —
   *  at which point the building should get that space back. */
  onBottomInsetChange?: (px: number) => void;
}) {
  const [visible, setVisible] = useState(true);
  const bandRef = useRef<HTMLElement | null>(null);

  // The band the camera must stay clear of is whichever element currently sits on the bottom edge:
  // the readout when it is shown, the toggle on its own when it is not. Both are positioned the
  // same distance from the edge, so the inset is that offset plus the element's own height.
  const measure = useCallback(() => {
    const el = bandRef.current;
    if (!el || !onBottomInsetChange) return;
    const parent = el.offsetParent as HTMLElement | null;
    const parentHeight = parent?.clientHeight ?? el.getBoundingClientRect().height;
    const rect = el.getBoundingClientRect();
    const parentRect = parent?.getBoundingClientRect();
    const fromBottom = parentRect ? parentRect.bottom - rect.top : rect.height;
    onBottomInsetChange(Math.max(0, Math.min(fromBottom, parentHeight)));
  }, [onBottomInsetChange]);

  useEffect(() => {
    measure();
    const el = bandRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.offsetParent instanceof HTMLElement) observer.observe(el.offsetParent);
    return () => observer.disconnect();
  }, [measure, visible, widthM, lengthM, eaveM, ridgeM]);

  return (
    <>
      {visible && (
        <dl className="hc-three-overlay" aria-hidden="true" ref={bandRef as React.RefObject<HTMLDListElement>}>
          <div>
            <dt>Ширина</dt>
            <dd>{formatMetres(widthM)} м</dd>
          </div>
          <div>
            <dt>Довжина</dt>
            <dd>{formatMetres(lengthM)} м</dd>
          </div>
          <div>
            <dt>Висота стін</dt>
            <dd>{formatMetres(eaveM)} м</dd>
          </div>
          <div>
            <dt>Висота в коньку</dt>
            <dd>{formatMetres(ridgeM)} м</dd>
          </div>
        </dl>
      )}
      <button
        type="button"
        className="hc-three-overlay-toggle"
        aria-pressed={visible}
        ref={visible ? undefined : (bandRef as React.RefObject<HTMLButtonElement>)}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? 'Сховати розміри' : 'Показати розміри'}
      </button>
    </>
  );
}

export default ThreeDimensionOverlay;
