'use client';

import { useState } from 'react';

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
}: {
  widthM: number;
  lengthM: number;
  eaveM: number;
  ridgeM: number;
}) {
  const [visible, setVisible] = useState(true);

  return (
    <>
      {visible && (
        <dl className="hc-three-overlay" aria-hidden="true">
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
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? 'Сховати розміри' : 'Показати розміри'}
      </button>
    </>
  );
}

export default ThreeDimensionOverlay;
