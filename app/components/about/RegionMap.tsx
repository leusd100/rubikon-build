'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { regionMap } from '../../data/regionMap';

// /pro-nas: the main region as an engineered plate. Inside the oblast's outline (drawn once as the block arrives),
// even rings step out from Dnipro, cut by the boundary: the base, and the reach from it — no distances, so they
// promise no service radius. (Scaled copies of the outline were tried first: every notch of the boundary repeated
// along a ray to the city.) On a device with a fine pointer a soft copper light follows the cursor across the region
// and brings the nearest rings up. Without motion everything is simply there, and there is no light. One instance per
// page (fixed ids); the outline ships once and is reused for the fill, the clip and the line.
const RING_STEP = 56;
const RINGS = Array.from({ length: 10 }, (_, index) => RING_STEP * (index + 1));

export function RegionMap({ label }: Readonly<{ label: string }>) {
  const ref = useRef<SVGSVGElement>(null);
  const { x, y } = regionMap.dnipro;

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || calm.matches) return;

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const apply = () => {
      frame = 0;
      const toSvg = svg.getScreenCTM()?.inverse();
      if (!pointer || !toSvg) return;
      const point = new DOMPoint(pointer.x, pointer.y).matrixTransform(toSvg);
      svg.style.setProperty('--mx', `${point.x.toFixed(1)}px`);
      svg.style.setProperty('--my', `${point.y.toFixed(1)}px`);
    };
    const move = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      svg.dataset.light = 'on';
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const leave = () => {
      delete svg.dataset.light;
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', leave);
    return () => {
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerleave', leave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Each ring starts drawing at twelve o'clock
  const rings = RINGS.map((radius, index) => (
    <circle key={radius} className="arm-ring-line" cx={x} cy={y} r={radius} pathLength={1} transform={`rotate(-90 ${x} ${y})`} style={{ '--k': index } as CSSProperties} />
  ));

  return (
    <svg ref={ref} className="arm" viewBox={regionMap.viewBox} role="img" aria-label={label} style={{ '--mx': `${x}px`, '--my': `${y}px` } as CSSProperties}>
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
      <g transform={`translate(${x} ${y})`}>
        <circle className="arm-pulse" r="22" />
        <circle className="arm-ring" r="15" />
        <circle className="arm-dot" r="7" />
      </g>
      <path className="arm-leader" d={`M${x + 20} ${y} H${x + 50}`} />
      <text className="arm-label" x={x + 58} y={y + 9}>Дніпро</text>
    </svg>
  );
}
