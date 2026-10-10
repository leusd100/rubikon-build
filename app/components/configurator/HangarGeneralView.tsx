'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import { BUILD_STAGE_ORDER, isStageReleased, type BuildStage } from '../../lib/configurator/buildUpSequence';
import { ridgeHeightM } from '../../lib/configurator/parametricModel';
import { overlaps, type Box } from '../angary/dimetric';
import { generalViewGeometry, type GeneralViewFrame } from './generalViewGeometry';
import { previewDescription } from './sheetLabels';
import { useLayerHighlight } from './useLayerHighlight';
import './general-view.css';

// «Загальний вигляд» on /angary's drawing sheet (10.10): the clad hangar in the frame drawing's language, so it and
// «Каркас» read as one set of drawings — see generalViewGeometry.ts for the drawing itself. The research screen
// (/configurator-preview) keeps the old technical view (HangarPreview).
//
// The drawing is laid out for the box it is shown in: measured here (its content box, whether its sizes are shown —
// the phone's mini drawing hides them — and what lies on the picture: the «Подивитися в 3D» chip, the mini drawing's
// legend glyphs), so its lines and type keep one size on screen. The server's markup is laid out for a typical box and
// settles on the first measure.
//
// It answers every choice: the sizes and the ridge redraw it (and the changed size's value flashes copper a moment, as
// the old view's faces did), a cladding system changes its pattern, the scope takes a surface's cladding off, the gates
// and the door move where the configurator places them. Insulation does not change the outside: the legend beside the
// drawing (CladdingSection) shows it.
//
// The first view still builds itself (useFirstViewBuildUp), in the drawing's own way: the ground, then the outline
// plotted, then the walls' and the roof's cladding, then the openings — the sizes are there from the start, as they
// were.

const ALL_STAGES = BUILD_STAGE_ORDER.length;
/** How long a changed choice stays copper on the drawing (10.10, owner: «що змінив — те засвітилось»): the 260 ms it
 *  was, with its fade, came and went before the eye got from the control to the picture */
const ANSWER_HOLD_MS = 1100;
/** How long the hangar's lines take to run to a new size, and its cladding to come back after (general-view.css) */
const MORPH_MS = 650;
/** Laid out for this until the first measure: a desktop sheet's drawing box */
const FIRST_FRAME: GeneralViewFrame = { width: 640, height: 430, annotated: true, keepClear: [] };

const sameFrame = (a: GeneralViewFrame, b: GeneralViewFrame) => a.width === b.width && a.height === b.height
  && a.annotated === b.annotated && a.keepClear.length === b.keepClear.length
  && a.keepClear.every((box, index) => box.every((value, side) => value === b.keepClear[index][side]));

/** The drawing's box as it is shown, and what lies on it: the chips' and a held legend's boxes, in the box's px */
function measureFrame(svg: SVGSVGElement): GeneralViewFrame | null {
  const style = getComputedStyle(svg);
  const [left, top, right, bottom] = [style.paddingLeft, style.paddingTop, style.paddingRight, style.paddingBottom].map((value) => Number.parseFloat(value) || 0);
  const rect = svg.getBoundingClientRect();
  const width = Math.round(rect.width - left - right);
  const height = Math.round(rect.height - top - bottom);
  if (width < 24 || height < 24) return null;
  const sizes = svg.querySelector('.gv-sizes');
  const annotated = !sizes || getComputedStyle(sizes).display !== 'none';
  const [ox, oy] = [rect.left + left, rect.top + top];
  const keepClear = Array.from(svg.parentElement?.children ?? [])
    .filter((element) => element !== svg && element.matches('.hc-sheet-tools, .hc-section') && getComputedStyle(element).position === 'absolute')
    .map((element) => element.getBoundingClientRect())
    .filter((box) => box.width > 0 && box.height > 0)
    .map((box): Box => [Math.round(box.left - ox), Math.round(box.top - oy), Math.round(box.right - ox), Math.round(box.bottom - oy)])
    .filter((box) => overlaps(box, [0, 0, width, height]));
  return { width, height, annotated, keepClear };
}

/** The frame the drawing is laid out for: measured on every change of its size, and when the 3D chip comes or goes */
function useDrawingFrame(svgRef: RefObject<SVGSVGElement | null>, tools: boolean): GeneralViewFrame {
  const [frame, setFrame] = useState(FIRST_FRAME);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const next = measureFrame(svg);
      if (next) setFrame((current) => (sameFrame(current, next) ? current : next));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    measure();
    return () => observer.disconnect();
  }, [svgRef, tools]);
  return frame;
}

export function HangarGeneralView({
  domain,
  released = ALL_STAGES,
  tools = false,
}: Readonly<{
  domain: HangarDomainModel;
  /** Build stages requested so far by the first view (useFirstViewBuildUp); all of them by default */
  released?: number;
  /** The «Подивитися в 3D» chip is on the picture: the drawing keeps clear of it */
  tools?: boolean;
}>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const frame = useDrawingFrame(svgRef, tools);
  const g = useMemo(() => generalViewGeometry(domain, frame), [domain, frame]);
  const { dimensions, envelope, scope } = domain;
  const ridgeM = ridgeHeightM(dimensions.widthM, dimensions.eaveHeightM, domain.roof.pitchDeg);

  // A new size runs the lines to their new places (10.10, owner: «каркас перетікає, а не стрибає»): marked in the very
  // render that draws them, so the drawing's new lines and their transition land together — a new box to fit (the
  // first measure, a resize) is not a new size and lays out at once
  const sizeKey = `${dimensions.widthM}|${dimensions.lengthM}|${dimensions.eaveHeightM}|${Math.round(ridgeM * 10)}`;
  const [sizes, setSizes] = useState({ key: sizeKey, changes: 0 });
  if (sizes.key !== sizeKey) setSizes({ key: sizeKey, changes: sizes.changes + 1 });
  const [settled, setSettled] = useState(0);
  useEffect(() => {
    if (!sizes.changes) return undefined;
    const timer = window.setTimeout(() => setSettled(sizes.changes), MORPH_MS);
    return () => window.clearTimeout(timer);
  }, [sizes.changes]);
  const morphing = sizes.changes > settled;

  // a changed choice is answered on the drawing a moment in copper: the size's value, the surface's pattern, the openings
  const active = {
    width: useLayerHighlight(dimensions.widthM, ANSWER_HOLD_MS),
    length: useLayerHighlight(dimensions.lengthM, ANSWER_HOLD_MS),
    height: useLayerHighlight(dimensions.eaveHeightM, ANSWER_HOLD_MS),
    ridge: useLayerHighlight(Math.round(ridgeM * 10), ANSWER_HOLD_MS),
  };
  const wallsActive = useLayerHighlight(`${scope.walls}|${envelope.wallSystem}`, ANSWER_HOLD_MS);
  const roofActive = useLayerHighlight(`${scope.roof}|${envelope.roofSystem}`, ANSWER_HOLD_MS);
  const openingsActive = useLayerHighlight(`${domain.gates}|${domain.gateType}|${domain.doors}|${domain.structural.scheme}|${scope.walls}`, ANSWER_HOLD_MS);
  const on = (value: boolean) => (value ? '' : undefined);
  const held = (stage: BuildStage) => on(!isStageReleased(stage, released));

  return (
    <svg
      ref={svgRef}
      className="hc-preview-svg gv"
      viewBox={g.viewBox}
      role="img"
      aria-label={previewDescription('technical', dimensions, ridgeM)}
      data-building={on(released < ALL_STAGES)}
      data-morph={on(morphing)}
    >
      {/* the faces the camera sees, in the field's colour */}
      <path className="gv-plane" d={g.planes} />
      <g className="gv-stage" data-held={held('foundation')}>
        <path className="gv-hatch" d={g.hatch} />
        <path className="gv-ground" d={g.ground} />
      </g>
      {g.walls && (
        <path className="gv-stage gv-cladding" data-system={g.walls.system} data-active={on(wallsActive)} data-held={held('walls')} d={g.walls.d} />
      )}
      {g.roof && (
        <path className="gv-stage gv-cladding" data-system={g.roof.system} data-active={on(roofActive)} data-held={held('roof')} d={g.roof.d} />
      )}
      {/* the gates and the door, cut into the end wall: a darker leaf in the paper's ink */}
      <path className="gv-stage gv-opening" data-active={on(openingsActive)} data-held={held('gates')} d={g.openings} />
      <g className="gv-stage" data-held={held('frame')}>
        {/* a surface out of the request: its outline dashed, and where the frame is in the request, the frame behind it */}
        <path className="gv-out" d={g.out} />
        {g.frame && (
          <>
            <path className="gv-frame-back" d={g.frame.back} />
            <path className="gv-frame-thin" d={g.frame.thin} />
            <path className="gv-frame-brace" d={g.frame.brace} />
            <path className="gv-frame-front" d={g.frame.front} />
          </>
        )}
        <path className="gv-edge" pathLength={1} d={g.edges} />
        <path className="gv-front" pathLength={1} d={g.front} />
      </g>
      <g className="gv-sizes" aria-hidden="true">
        {g.sizes.map(({ key, d, dot, label }) => (
          // the ridge's note points at the apex: it comes with the outline (the others measure the ground's corners)
          <g key={key} className="gv-size" data-size={key} data-active={on(active[key])} data-held={key === 'ridge' ? held('frame') : undefined}>
            <path className="gv-dim" d={d} />
            {dot && <circle className="gv-dot" cx={dot[0].toFixed(1)} cy={dot[1].toFixed(1)} r={2.2} />}
            {/* placed by a transform, so a new size moves it with its line */}
            <text className="gv-value" style={{ fontSize: `${label.size}px`, transform: `translate(${label.x.toFixed(1)}px, ${label.y.toFixed(1)}px)` }}>{label.text}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
