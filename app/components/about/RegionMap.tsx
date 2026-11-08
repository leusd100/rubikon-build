'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { regionMap } from '../../data/regionMap';
import { placedTowns, reachTag, type Point, type Reach } from '../../lib/regionReach';

// /pro-nas and /napryamky: the main region as an engineered plate. Inside the oblast's outline (drawn once as the block
// arrives), even rings step out from Dnipro, cut by the boundary — the rings carry no distances, so they promise no
// service radius. (Scaled copies of the outline were tried first: every notch of the boundary repeated along a ray to
// the city.) On a device with a fine pointer a soft copper light follows the cursor across the region and brings the
// nearest rings up. Without motion everything is simply there, and there is no light. One instance per page (fixed ids);
// the outline ships once and is reused for the fill, the clip and the line.
//
// «Де ваш об’єкт?» (owner, 08.11): a point the visitor chooses gets one ray from Dnipro and a tag with the town and the
// straight-line kilometres — only that point, never the rings, so the map still draws no radius. A pointer hovering the
// map previews its point; a click or a tap chooses it (RegionReach keeps the choice and says it beside the map). The
// ray glides to a chosen point; a previewed one and reduced motion move it at once.
const RING_STEP = 56;
const RINGS = Array.from({ length: 10 }, (_, index) => RING_STEP * (index + 1));
/** How long the ray takes to a newly chosen point, and its curve: the region's own even pen (--ease-plot) */
const GLIDE_MS = 650;
const plot = (k: number) => (1 - Math.cos(Math.PI * k)) / 2;
/** The tag stands centred over its point (beside it, it covered «Дніпро» for every town east of the city), inside the
    drawing's width, and under the point where there is no room above */
const TAG_GAP = 16;
const TAG_PAD = 12;
const TAG_HEIGHT = 36;
const WIDTH = 802;
function tagAt(point: Point, width: number, height: number) {
  const left = Math.min(Math.max(0, point.x - width / 2), WIDTH - width);
  const above = point.y - TAG_GAP - height;
  return `translate(${left.toFixed(1)} ${(above >= 0 ? above : point.y + TAG_GAP).toFixed(1)})`;
}

type Props = Readonly<{
  label: string;
  /** The point the ray goes to: chosen, previewed, or the block's example */
  shown: Reach;
  /** Glide to `shown` (a choice) rather than jump (a preview) */
  glide: boolean;
  onHover: (point: Point | null) => void;
  onPick: (point: Point) => void;
}>;

export function RegionMap({ label, shown, glide, onHover, onPick }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const rayRef = useRef<SVGLineElement>(null);
  const targetRef = useRef<SVGCircleElement>(null);
  const tagRef = useRef<SVGGElement>(null);
  const { x, y } = regionMap.dnipro;
  // The server's markup draws the first point; after that only the effect below moves the ray, so React never resets it
  const [first] = useState(shown);
  const end = useRef<Point>({ x: first.x, y: first.y });

  // The light (unchanged), the preview and the choice
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const light = finePointer.matches && !calm.matches;

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const toDrawing = (clientX: number, clientY: number) => {
      const toSvg = svg.getScreenCTM()?.inverse();
      return toSvg ? new DOMPoint(clientX, clientY).matrixTransform(toSvg) : null;
    };
    const apply = () => {
      frame = 0;
      const point = pointer && toDrawing(pointer.x, pointer.y);
      if (!point) return;
      if (light) {
        svg.style.setProperty('--mx', `${point.x.toFixed(1)}px`);
        svg.style.setProperty('--my', `${point.y.toFixed(1)}px`);
      }
      onHover({ x: point.x, y: point.y });
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !finePointer.matches) return;
      // A move of no distance is the browser re-sending the pointer after the scroll shield (SmoothScroll) dropped, not
      // the visitor: it would preview again mid-scroll, and the ray would flicker past
      if (pointer && pointer.x === event.clientX && pointer.y === event.clientY) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (light) svg.dataset.light = 'on';
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const leave = () => {
      pointer = null;
      delete svg.dataset.light;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      onHover(null);
    };
    const click = (event: MouseEvent) => {
      const point = toDrawing(event.clientX, event.clientY);
      if (point) onPick({ x: point.x, y: point.y });
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', leave);
    svg.addEventListener('click', click);
    return () => {
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerleave', leave);
      svg.removeEventListener('click', click);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [onHover, onPick]);

  // The ray, its end and the tag: written straight to the drawing, a frame at a time while it glides. Before paint, so a
  // new point never shows a frame of the old tag
  const placeRef = useRef<((point: Point, arrived: boolean) => void) | null>(null);
  useLayoutEffect(() => {
    const ray = rayRef.current, target = targetRef.current, tag = tagRef.current, svg = ref.current;
    if (!ray || !target || !tag || !svg) return;
    const text = tag.querySelector('text'), box = tag.querySelector('rect');
    const place = (point: Point, arrived: boolean) => {
      ray.setAttribute('x2', point.x.toFixed(1));
      ray.setAttribute('y2', point.y.toFixed(1));
      target.setAttribute('cx', point.x.toFixed(1));
      target.setAttribute('cy', point.y.toFixed(1));
      if (arrived && text && box) {
        // The tag is sized from its own font (region.css makes it larger on a phone, where the drawing is small)
        const size = Number.parseFloat(getComputedStyle(text).fontSize) || 21;
        const pad = size * .55, height = size * 1.7;
        const width = text.getComputedTextLength() + pad * 2;
        text.setAttribute('x', pad.toFixed(1));
        text.setAttribute('y', (height * .7).toFixed(1));
        box.setAttribute('width', width.toFixed(1));
        box.setAttribute('height', height.toFixed(1));
        tag.setAttribute('transform', tagAt(point, width, height));
      }
      if (arrived) delete svg.dataset.gliding;
      else svg.dataset.gliding = '';
    };
    placeRef.current = place;
    const from = end.current;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = glide && !calm && (from.x !== shown.x || from.y !== shown.y) ? GLIDE_MS : 0;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const k = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = plot(k);
      end.current = { x: from.x + (shown.x - from.x) * eased, y: from.y + (shown.y - from.y) * eased };
      place(end.current, k === 1);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    step(start);
    return () => cancelAnimationFrame(frame);
  }, [shown, glide]);

  // The tag's size follows the font, which follows the screen: measure it again when the drawing is resized
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const resized = new ResizeObserver(() => placeRef.current?.(end.current, !svg.hasAttribute('data-gliding')));
    resized.observe(svg);
    return () => resized.disconnect();
  }, []);

  // Each ring starts drawing at twelve o'clock
  const rings = RINGS.map((radius, index) => (
    <circle key={radius} className="arm-ring-line" cx={x} cy={y} r={radius} pathLength={1} transform={`rotate(-90 ${x} ${y})`} style={{ '--k': index } as CSSProperties} />
  ));
  // The server's tag, before it is measured on the client: about a condensed glyph's width a letter. From the first point
  // only, so React never writes the tag's box again after the effect has placed it
  const guessWidth = reachTag(first).length * 11 + TAG_PAD * 2;

  return (
    <svg ref={ref} className="arm" viewBox={regionMap.viewBox} role="img" aria-label={label} data-reach={shown.inside ? 'in' : 'out'} style={{ '--mx': `${x}px`, '--my': `${y}px` } as CSSProperties}>
      <defs>
        <path id="arm-shape" className="arm-shape" d={regionMap.outline} pathLength={1} />
        <clipPath id="arm-clip"><use href="#arm-shape" /></clipPath>
        <radialGradient id="arm-fill" gradientUnits="userSpaceOnUse" cx={x} cy={y} r="460">
          <stop offset="0" className="arm-fill-core" />
          <stop offset="1" className="arm-fill-edge" />
        </radialGradient>
        <radialGradient id="arm-spot">
          <stop offset="0" className="arm-spot-core" />
          <stop offset="1" className="arm-spot-edge" />
        </radialGradient>
        <radialGradient id="arm-spot-mask">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="arm-lit" maskUnits="userSpaceOnUse">
          <circle className="arm-light" r="190" fill="url(#arm-spot-mask)" />
        </mask>
      </defs>
      <use href="#arm-shape" className="arm-area" />
      <g clipPath="url(#arm-clip)">
        <g className="arm-rings">{rings}</g>
        <g className="arm-rings arm-rings-lit" mask="url(#arm-lit)">{rings}</g>
        <circle className="arm-light arm-glow" r="190" fill="url(#arm-spot)" />
      </g>
      <use href="#arm-shape" className="arm-outline" />
      {placedTowns.slice(1).map((town) => <circle key={town.name} className="arm-town" cx={town.x.toFixed(1)} cy={town.y.toFixed(1)} r="3.5" />)}
      <line ref={rayRef} className="arm-ray" x1={x} y1={y} x2={first.x.toFixed(1)} y2={first.y.toFixed(1)} pathLength={1} />
      <g transform={`translate(${x} ${y})`}>
        <circle className="arm-pulse" r="22" />
        <circle className="arm-ring" r="15" />
        <circle className="arm-dot" r="7" />
      </g>
      <path className="arm-leader" d={`M${x + 20} ${y} H${x + 50}`} />
      <text className="arm-label" x={x + 58} y={y + 9}>Дніпро</text>
      <circle ref={targetRef} className="arm-target" cx={first.x.toFixed(1)} cy={first.y.toFixed(1)} r="9" />
      <g ref={tagRef} className="arm-tag" transform={tagAt(first, guessWidth, TAG_HEIGHT)}>
        <rect height={TAG_HEIGHT} width={guessWidth} />
        <text x={TAG_PAD} y="25">{reachTag(shown)}</text>
      </g>
    </svg>
  );
}
