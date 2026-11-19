'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import { BUILD_STAGE_ORDER, isStageReleased, type BuildStage } from '../../lib/configurator/buildUpSequence';
import { ridgeHeightM } from '../../lib/configurator/parametricModel';
import { overlaps, type Box } from '../angary/dimetric';
import { generalViewGeometry, type GeneralViewFrame } from './generalViewGeometry';
import { HINT_TEXT, HINT_TEXT_SHORT, placeHint3d, type Hint3dLayout } from './hint3d';
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
// The first view still builds itself (useFirstViewBuildUp), in the drawing's own way: the ground, then the whole frame
// plotted station by station with the outline — columns, the frames' roof members, the members along the building, the
// bracing in copper (owner, 19.11) — then the walls and the roof close over it, then the openings; the sizes are there
// from the start, as they were. The frame and its skins exist only while the first view plays: once it has, the drawing
// is exactly the one the server sent.

const ALL_STAGES = BUILD_STAGE_ORDER.length;
/** How long a changed choice stays copper on the drawing (10.10, owner: «що змінив — те засвітилось»): the 260 ms it
 *  was, with its fade, came and went before the eye got from the control to the picture */
const ANSWER_HOLD_MS = 1100;
/** How long the hangar's lines take to run to a new size, and its cladding to come back after (general-view.css) */
const MORPH_MS = 650;
/** The 3D callout (hint3d.ts, 19.11): it comes this long after the first view's last stage, as the gates settle; it is
 *  gone this long after it came (general-view.css lets it step back from 4.6 s); a phone's drawing has no leader */
const HINT_DELAY_MS = 700;
const HINT_GONE_MS = 5400;
const HINT_LEADER_MIN_PX = 480;
/** Once per page load, as the first view: away to 3D and back, the chip keeps its copper and nothing points again */
let hintedThisLoad = false;
/** What counts as reaching for a control (as useFirstViewBuildUp): the visitor is at the controls, the callout goes */
const HINT_CONTROL = 'button, input, select, textarea, a, label, summary';
const HINT_REACH = ['click', 'input', 'focusin'] as const;

/** The 3D chip's box and the picture's in the drawing's px (its content box, as measureFrame lays the drawing out): the
 *  chip stands in the picture's padding, above the drawing's box */
function chipAndBounds(svg: SVGSVGElement): { chip: Box; bounds: Box } | null {
  const chip = svg.parentElement?.querySelector<HTMLElement>('.hc-sheet-three');
  if (!chip) return null;
  const style = getComputedStyle(svg);
  const rect = svg.getBoundingClientRect();
  const [ox, oy] = [rect.left + (Number.parseFloat(style.paddingLeft) || 0), rect.top + (Number.parseFloat(style.paddingTop) || 0)];
  const box = chip.getBoundingClientRect();
  if (!box.width) return null;
  return {
    chip: [box.left - ox, box.top - oy, box.right - ox, box.bottom - oy],
    bounds: [rect.left - ox, rect.top - oy, rect.right - ox, rect.bottom - oy],
  };
}

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
  hint3d = false,
}: Readonly<{
  domain: HangarDomainModel;
  /** Build stages requested so far by the first view (useFirstViewBuildUp); all of them by default */
  released?: number;
  /** The «Подивитися в 3D» chip is on the picture: the drawing keeps clear of it */
  tools?: boolean;
  /** The first view played through: point at the 3D chip once (hint3d.ts) */
  hint3d?: boolean;
}>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const frame = useDrawingFrame(svgRef, tools);
  const building = released < ALL_STAGES;
  const g = useMemo(() => generalViewGeometry(domain, frame, building), [domain, frame, building]);

  // The 3D callout: placed when it comes, in the drawing as it stands then, and only where it lies on nothing
  // placed for one drawing: `frame` and `domain` as they were — a new box (a resize, a phone's mini drawing) or a new
  // configuration is another drawing, and the callout is not drawn on it (third review, 19.11)
  const [hint, setHint] = useState<(Hint3dLayout & { text: string; frame: GeneralViewFrame; domain: HangarDomainModel }) | null>(null);
  const shownHint = hint && hint.frame === frame && hint.domain === domain ? hint : null;
  const [hinted, setHinted] = useState(hintedThisLoad);
  const placing = useRef({ g, frame });
  const domainRef = useRef(domain);
  useEffect(() => {
    placing.current = { g, frame };
    domainRef.current = domain;
  });
  useEffect(() => {
    const svg = svgRef.current;
    if (!hint3d || hintedThisLoad || !svg) return undefined;
    let gone = 0;
    const section = svg.closest('.hangar-configurator') ?? svg;
    const drop = () => {
      window.clearTimeout(come);
      window.clearTimeout(gone);
      setHint(null);
    };
    // a reach for a control before it comes or while it shows: the visitor is at the controls already
    const reach = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(HINT_CONTROL)) drop();
    };
    for (const type of HINT_REACH) section.addEventListener(type, reach, true);
    const come = window.setTimeout(() => {
      // spent here, not before the delay: React's development double run would otherwise spend it on the first run
      hintedThisLoad = true;
      setHinted(true);
      const shown = svg.getBoundingClientRect();
      // a sheet already scrolled away is not pointed at: nobody would see it
      if (shown.bottom < shown.height / 2 || shown.top > window.innerHeight - shown.height / 2) return;
      const measured = chipAndBounds(svg);
      if (!measured) return;
      const { g: view, frame: box } = placing.current;
      const wide = box.width >= HINT_LEADER_MIN_PX;
      const text = wide ? HINT_TEXT : HINT_TEXT_SHORT;
      // the name's size as it renders, in its own type
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      probe.setAttribute('class', 'gv-hint-tag');
      probe.textContent = text;
      svg.appendChild(probe);
      const size = { width: probe.getComputedTextLength(), height: (Number.parseFloat(getComputedStyle(probe).fontSize) || 11) * 1.2 };
      probe.remove();
      const layout = placeHint3d({
        ...measured, size, keepClear: box.keepClear, meets: view.meets, sizeBoxes: view.sizeBoxes, sizeLines: view.sizeLines,
        anchor: view.hintAnchor, withLeader: wide,
      });
      if (!layout) return;
      setHint({ ...layout, text, frame: box, domain: domainRef.current });
      gone = window.setTimeout(() => setHint(null), HINT_GONE_MS);
    }, HINT_DELAY_MS);
    return () => {
      window.clearTimeout(come);
      window.clearTimeout(gone);
      for (const type of HINT_REACH) section.removeEventListener(type, reach, true);
    };
  }, [hint3d]);
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
      data-building={on(building)}
      data-hinted={on(hinted)}
      data-hinting={on(shownHint !== null)}
      data-morph={on(morphing)}
    >
      {/* the faces the camera sees, in the field's colour */}
      <path className="gv-plane" d={g.planes} />
      <g className="gv-stage" data-held={held('foundation')}>
        <path className="gv-hatch" d={g.hatch} />
        <path className="gv-ground" d={g.ground} />
      </g>
      {/* the first view's frame, mounted as its stage is released: each member plotted from its start, at its own time */}
      {g.build && isStageReleased('frame', released) && (
        <g className="gv-build" aria-hidden="true">
          {g.build.members.map((member) => (
            <path key={member.id} className={`gv-build-${member.kind}`} pathLength={1} d={member.d} style={{ '--gv-at': `${member.at}ms`, '--gv-dur': `${member.dur}ms` } as CSSProperties} />
          ))}
        </g>
      )}
      {/* …and the faces that close over it with the walls' and the roof's stages, in the field's colour */}
      {g.build && (
        <>
          {g.build.walls && <path className="gv-stage gv-skin" data-held={held('walls')} d={g.build.walls} />}
          {g.build.roof && <path className="gv-stage gv-skin" data-held={held('roof')} d={g.build.roof} />}
        </>
      )}
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
        {g.sizes.map(({ key, d, dot, label, plate }) => (
          // the ridge's note points at the apex: it comes with the outline (the others measure the ground's corners)
          <g key={key} className="gv-size" data-size={key} data-active={on(active[key])} data-held={key === 'ridge' ? held('frame') : undefined}>
            <path className="gv-dim" d={d} />
            {dot && <circle className="gv-dot" cx={dot[0].toFixed(1)} cy={dot[1].toFixed(1)} r={2.2} />}
            {plate && <rect className="gv-plate" x={plate[0].toFixed(1)} y={plate[1].toFixed(1)} width={(plate[2] - plate[0]).toFixed(1)} height={(plate[3] - plate[1]).toFixed(1)} />}
            {/* placed by a transform, so a new size moves it with its line */}
            <text className="gv-value" style={{ fontSize: `${label.size}px`, transform: `translate(${label.x.toFixed(1)}px, ${label.y.toFixed(1)}px)` }}>{label.text}</text>
          </g>
        ))}
      </g>
      {shownHint && (
        <g className="gv-hint" aria-hidden="true">
          {shownHint.leader && (
            <>
              <circle className="gv-hint-mark" cx={shownHint.leader.from[0].toFixed(1)} cy={shownHint.leader.from[1].toFixed(1)} r={2.6} />
              <path className="gv-hint-lead" pathLength={1} d={`M${shownHint.leader.from.map((v) => v.toFixed(1)).join(',')}L${shownHint.leader.to.map((v) => v.toFixed(1)).join(',')}`} />
            </>
          )}
          {shownHint.connector && (
            <path className="gv-hint-arrow" d={`M${shownHint.connector.from.map((v) => v.toFixed(1)).join(',')}L${shownHint.connector.to.map((v) => v.toFixed(1)).join(',')}m-4,-3l4,3l-4,3`} />
          )}
          <text className="gv-hint-tag" x={shownHint.tag.x.toFixed(1)} y={shownHint.tag.y.toFixed(1)} textAnchor={shownHint.tag.anchor}>{shownHint.text}</text>
        </g>
      )}
    </svg>
  );
}
