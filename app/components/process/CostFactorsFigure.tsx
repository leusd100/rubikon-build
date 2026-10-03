'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DrawingSheet } from '../DrawingSheet';
import './cost-factors.css';

// /yak-pratsyuiemo «Що враховуємо в розрахунку» (UX pass 2026-10, owner: «цей блок можна поцікавіше обіграти»): the seven
// factors beside one drawing of a hangar on its site, each numbered where it acts — the sizes, the frame under its loads,
// the foundation, the insulated envelope, the equipment inside, the site (access, crane), and the other works it depends
// on. Pointing at a factor (or tapping it) lights its part in copper; the first time the block comes into view the
// drawing walks through all seven once. The drawing is decorative (aria-hidden): the list says everything in words.
//
// On /angary (2026-10) the same drawing is the page's cost block: no tour of its own (one automatic tour per page — the
// frame drawing has it), a heading of the section's own, and `notes` — what the visitor's configuration already says
// about a factor («у вашому брифі: …»), read-only — and `sheet`: the drawing on the «Креслення» sheet, as the page's
// other drawings are, its title block naming the factor on show.

export type CostFactorItem = { key: string; title: string; detail?: string };

type Point = readonly [number, number, number];
/** The scope drawings' projection: span x right, height z up, depth d to the upper left at 45° */
const OX = 176;
const OY = 300;
const p = ([x, d, z]: Point) => `${(OX + x - d * 0.4).toFixed(1)},${(OY - z - d * 0.4).toFixed(1)}`;
const xy = (point: Point) => p(point).split(',').map(Number) as [number, number];
const line = (...points: Point[]) => `M${points.map(p).join('L')}`;

const W = 150;
const EAVE = 78;
const RIDGE = 108;
const DEPTH = 200;
const FRAMES = [0, 50, 100, 150, 200];

const frames = [...FRAMES].reverse().map((d) => line([0, d, 0], [0, d, EAVE], [W / 2, d, RIDGE], [W, d, EAVE], [W, d, 0])).join('');
const purlins = [line([0, 0, EAVE], [0, DEPTH, EAVE]), line([W, 0, EAVE], [W, DEPTH, EAVE]), line([W / 2, 0, RIDGE], [W / 2, DEPTH, RIDGE])].join('');
const loads = [40, 100, 160].map((d) => {
  const [x, y] = xy([W / 2, d, RIDGE]);
  return `M${x},${y - 34}V${y - 6}M${x - 4},${y - 12}L${x},${y - 6}L${x + 4},${y - 12}`;
}).join('');
const slab = `M${[p([0, 0, 0]), p([W, 0, 0]), p([W, DEPTH, 0]), p([0, DEPTH, 0])].join('L')}Z${line([0, 0, 0], [0, 0, -7], [W, 0, -7], [W, 0, 0])}${line([0, 0, -7], [0, DEPTH, -7], [0, DEPTH, 0])}`;
const wallPanels = [25, 50, 75, 100, 125, 150, 175].map((d) => line([0, d, 0], [0, d, EAVE])).join('');
const roofPanels = [25, 50, 75, 100, 125, 150, 175].map((d) => line([0, d, EAVE], [W / 2, d, RIDGE])).join('');
const envelope = `M${[p([0, 0, 0]), p([0, DEPTH, 0]), p([0, DEPTH, EAVE]), p([0, 0, EAVE])].join('L')}Z${wallPanels}M${[p([0, 0, EAVE]), p([W / 2, 0, RIDGE]), p([W / 2, DEPTH, RIDGE]), p([0, DEPTH, EAVE])].join('L')}Z${roofPanels}`;
// A process unit inside: a box on the slab, with a pipe up to it
const equipment = [
  `M${[p([82, 70, 0]), p([124, 70, 0]), p([124, 70, 34]), p([82, 70, 34])].join('L')}Z`,
  `M${[p([82, 70, 34]), p([82, 120, 34]), p([124, 120, 34]), p([124, 70, 34])].join('L')}`,
  `M${[p([124, 70, 0]), p([124, 120, 0]), p([124, 120, 34])].join('L')}`,
  line([103, 95, 34], [103, 95, 58], [60, 95, 58]),
].join('');
// Sizes: the span under the front and the height at its corner — ticks only, no numbers
const [s1, s2] = [xy([0, 0, -30]), xy([W, 0, -30])];
const [h1, h2] = [xy([W + 16, 0, 0]), xy([W + 16, 0, EAVE])];
const dimensions = [
  `M${s1[0]},${s1[1]}H${s2[0]}M${s1[0]},${s1[1] - 6}v12M${s2[0]},${s2[1] - 6}v12`,
  `M${h1[0]},${h1[1]}V${h2[1]}M${h1[0] - 6},${h1[1]}h12M${h2[0] - 6},${h2[1]}h12`,
].join('');
// The site: ground beside the building (never through it — 03.10), the access road to the front (with its centre line),
// a tower crane standing on its own base beside the building
const [g1, g2] = [xy([W + 8, 0, 0]), xy([W + 120, 0, 0])];
const MAST = W + 74;
const [m0, mTop] = [xy([MAST, 80, 0]), xy([MAST, 80, 168])];
const mastLattice = Array.from({ length: 8 }, (_, index) => {
  const y = m0[1] - index * ((m0[1] - mTop[1]) / 8);
  const next = y - (m0[1] - mTop[1]) / 8;
  return `M${m0[0] - 4},${y}L${m0[0] + 4},${next}`;
}).join('');
const jibY = mTop[1];
const site = [
  `M${g1[0]},${g1[1] + 2}H${g2[0]}`,
  // the crane's ground and base, clear of the height dimension beside it
  `M${m0[0] - 16},${m0[1] + 2}h46M${m0[0] - 8},${m0[1] + 2}v-5h16v5`,
  `M${xy([W + 26, 0, 0]).join(',')}L${xy([W + 26, -70, 0]).join(',')}M${xy([W + 66, 0, 0]).join(',')}L${xy([W + 66, -70, 0]).join(',')}`,
  // the tower: two chords and a lattice
  `M${m0[0] - 4},${m0[1]}V${jibY}M${m0[0] + 4},${m0[1]}V${jibY}${mastLattice}`,
  // the jib to the right, the counter-jib with its weight to the left, the peak and its ties
  `M${m0[0] - 30},${jibY}H${m0[0] + 120}M${m0[0] - 30},${jibY}v8h14v-8`,
  `M${m0[0]},${jibY}V${jibY - 20}L${m0[0] + 120},${jibY}M${m0[0]},${jibY - 20}L${m0[0] - 30},${jibY}`,
  // trolley, rope and hook
  `M${m0[0] + 84},${jibY}V${jibY + 46}M${m0[0] + 80},${jibY + 46}h8l-4,6z`,
].join('');
const road = [
  `M${xy([W + 46, 0, 0]).join(',')}L${xy([W + 46, -70, 0]).join(',')}`,
];
// Other works it depends on: a network run in from outside (dashed) — from the left, so it crosses neither the crane
// nor the dimensions — and three overlapping bars of a schedule
const [n1, n2] = [xy([-70, 150, -4]), xy([0, 150, -4])];
const schedule = { x: 20, y: 334 };
const timeline = [
  `M${n1[0]},${n1[1]}L${n2[0]},${n2[1]}`,
].join('');
// …and the schedule they meet in: three overlapping works over a time axis with its ticks
const scheduleAxis = `M${schedule.x},${schedule.y + 20}h126${Array.from({ length: 7 }, (_, index) => `M${schedule.x + index * 21},${schedule.y + 20}v-4`).join('')}`;
const pad2 = (value: number) => String(value).padStart(2, '0');

/** Where each number sits on the drawing — on its part, clear of the other lines */
const [fx, fy] = xy([0, 60, -7]);
const BADGES: Record<string, readonly [number, number]> = {
  dimensions: [(s1[0] + s2[0]) / 2, s1[1] + 18],
  structure: xy([W / 2, 160, RIDGE + 44]),
  foundation: [fx - 16, fy + 24],
  insulation: xy([0, 120, EAVE / 2]),
  technology: xy([W - 12, 95, 20]),
  logistics: [m0[0] + 120, jibY + 26],
  timeline: [schedule.x + 132, schedule.y + 2],
};

const TOUR_STEP_MS = 1500;

export function CostFactorsFigure({
  factors,
  title = 'Що враховуємо в розрахунку',
  tour: tourEnabled = true,
  notes,
  sheet = false,
}: Readonly<{
  factors: readonly CostFactorItem[];
  /** null when the section's own heading says it */
  title?: string | null;
  tour?: boolean;
  /** Per factor key: a short read-only note, shown under the factor */
  notes?: Readonly<Record<string, string | undefined>>;
  /** Lay the drawing on the «Креслення» sheet with a title block (/angary) */
  sheet?: boolean;
}>) {
  const [pointed, setPointed] = useState<string | null>(null);
  const [tour, setTour] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = pointed ?? tour;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !tourEnabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let timer = 0;
    let index = -1;
    const step = () => {
      index += 1;
      if (index >= factors.length) { setTour(null); return; }
      setTour(factors[index].key);
      timer = window.setTimeout(step, TOUR_STEP_MS);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.5) return;
      observer.disconnect();
      timer = window.setTimeout(step, 400);
    }, { threshold: [0, 0.5] });
    observer.observe(root);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [factors, tourEnabled]);

  const point = (key: string | null) => {
    setTour(null);
    setPointed(key);
  };

  const activeIndex = factors.findIndex((factor) => factor.key === active);
  const drawing = (
    <svg viewBox="8 62 492 300" focusable="false" aria-hidden="true">
      <g className="cf-part" data-part="logistics"><path d={site} /><path className="cf-road-centre" d={road.join('')} /></g>
      <path className="cf-part cf-slab" data-part="foundation" d={slab} />
      <path className="cf-part cf-envelope" data-part="insulation" d={envelope} />
      <path className="cf-part cf-equipment" data-part="technology" d={equipment} />
      <path className="cf-part cf-frame" data-part="structure" d={`${frames}${purlins}${loads}`} />
      <path className="cf-part cf-dim" data-part="dimensions" d={dimensions} />
      <g className="cf-part" data-part="timeline">
        <path className="cf-network" d={timeline} />
        <path className="cf-axis" d={scheduleAxis} />
        <rect x={schedule.x} y={schedule.y - 14} width="78" height="7" rx="1" />
        <rect x={schedule.x + 40} y={schedule.y - 3} width="64" height="7" rx="1" />
        <rect x={schedule.x + 70} y={schedule.y + 8} width="50" height="7" rx="1" />
      </g>
      {factors.map((factor, index) => {
        const [x, y] = BADGES[factor.key] ?? [0, 0];
        return (
          <g className="cf-badge" data-part={factor.key} key={factor.key} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <circle r="11" />
            <text y="4.5">{index + 1}</text>
          </g>
        );
      })}
    </svg>
  );

  return (
    <div className="proc-factors" ref={rootRef} data-active={active ?? undefined}>
      {title && <p className="proc-factors-title">{title}</p>}
      <div className="cf-layout">
        {sheet ? (
          <DrawingSheet
            className="cf-sheet"
            imageClassName="cf-sheet-image"
            cells={[
              activeIndex >= 0
                ? { tone: 'number', label: 'Фактор', value: <>{pad2(activeIndex + 1)}<span> / {pad2(factors.length)}</span></> }
                : { label: 'Факторів', value: String(factors.length) },
              { tone: 'main', label: 'Що показано', value: activeIndex >= 0 ? factors[activeIndex].title : 'Що впливає на вартість' },
            ]}
          >
            {drawing}
          </DrawingSheet>
        ) : (
          <figure className="cf-figure" aria-hidden="true">{drawing}</figure>
        )}
        <ul>
          {factors.map((factor, index) => (
            <li
              key={factor.key}
              data-factor={factor.key}
              style={{ '--i': index } as CSSProperties}
              onMouseEnter={() => point(factor.key)}
              onMouseLeave={() => point(null)}
              // A tap lights the factor's part (the mouse already does on hover); the drawing is decorative
              onPointerUp={(event) => { if (event.pointerType !== 'mouse') point(pointed === factor.key ? null : factor.key); }}
            >
              <span className="cf-number" aria-hidden="true">{index + 1}</span>
              <b>{factor.title}</b>
              {factor.detail && <span className="cf-detail">{factor.detail}</span>}
              {notes?.[factor.key] && <span className="cf-note">{notes[factor.key]}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
