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
// Snow lies on the whole roof (04.10: not only along the ridge): three arrows down each slope, onto its middle — at
// depths between the frames, where no arrow runs alongside a column of the wall behind
const SLOPE_MID = (EAVE + RIDGE) / 2;
const loads = [W / 4, (W * 3) / 4].flatMap((x) => [35, 85, 135].map((d) => {
  const [ax, ay] = xy([x, d, SLOPE_MID]);
  return `M${ax},${ay - 28}V${ay - 5}M${ax - 3.5},${ay - 10}L${ax},${ay - 5}L${ax + 3.5},${ay - 10}`;
})).join('');
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
// The site: ground beside the building (never through it — 03.10) up to the access road, the road to the front (with its
// centre line), and the crane. A light frame goes up with a mobile crane (04.10: the tower crane read as stock imagery):
// an автокран on its four outriggers on a hard-standing beside the road (dashed), working over its rear, the boom
// raised toward the building with the next truss on the hook.
const [g1, g2] = [xy([W + 8, 0, 0]), xy([W + 66, 0, 0])];
// The truck stands along the span, so its side is drawn true: u from its rear (0, toward the road) to the cab (80), v up
const TRUCK = { x: W + 89, d: 44 } as const;
const [tx, ty] = xy([TRUCK.x, TRUCK.d, 0]);
const tv = (u: number, v: number) => `${(tx + u).toFixed(1)},${(ty - v).toFixed(1)}`;
const wheel = (u: number) => `M${tv(u - 4.5, 4.5)}a4.5,4.5 0 1,0 9,0a4.5,4.5 0 1,0 -9,0`;
// the slewing superstructure over the rear axles with the boom's foot on it, and the cab
const house = `M${tv(4, 9.5)}L${tv(4, 18)}L${tv(40, 18)}L${tv(40, 9.5)}ZM${tv(10, 18)}L${tv(14, 21)}L${tv(18, 18)}Z`;
const cab = `M${tv(62, 9.5)}L${tv(62, 27)}L${tv(75, 27)}L${tv(80, 20)}L${tv(80, 9.5)}Z`;
const truck = [
  `M${tv(0, 5)}L${tv(80, 5)}L${tv(80, 9.5)}L${tv(0, 9.5)}Z`,
  // the counterweight: the house's block toward the cab
  house, `M${tv(30, 9.5)}L${tv(30, 18)}`,
  cab, `M${tv(65, 16)}L${tv(65, 24)}L${tv(73.5, 24)}L${tv(77, 18.5)}L${tv(77, 16)}Z`,
  wheel(28), wheel(40), wheel(74),
].join('');
/** Outriggers at the rear and behind the cab, out to both sides and down onto their pads: the near pair in front of the
 * truck, the far pair seen above its chassis (the rear one beside it, the front one between the house and the cab) */
const OUTRIGGER = { u: [2, 60], reach: 30, z: 8 } as const;
const outrigger = (u: number, side: -1 | 1) => {
  const [x, d] = [TRUCK.x + u, TRUCK.d + side * OUTRIGGER.reach];
  return `${line([x, TRUCK.d, OUTRIGGER.z], [x, d, OUTRIGGER.z], [x, d, 2])}M${[p([x - 5, d - 4, 0]), p([x + 5, d - 4, 0]), p([x + 5, d + 4, 0]), p([x - 5, d + 4, 0])].join('L')}Z`;
};
/** The hard-standing: its left edge the road's; wide enough in front that badge 6 on the near rear outrigger keeps clear
 * of its edges, its far edge high enough to pass over the far outriggers and the house (behind the cab and the boom);
 * its far corner clear of the height dimension, its near one inside the drawing */
const PAD = { x: [W + 66, W + 158], d: [-32, 104] } as const;
const cranePad = `M${[p([PAD.x[0], PAD.d[0], 0]), p([PAD.x[1], PAD.d[0], 0]), p([PAD.x[1], PAD.d[1], 0]), p([PAD.x[0], PAD.d[1], 0])].join('L')}Z`;
// The telescopic boom in three sections, from its foot on the house to a head over the building's eave — low enough that
// the truss on the hook hangs clear of it
const boomFoot = [tx + 14, ty - 21] as const;
const boomHead = xy([W - 18, TRUCK.d, 178]);
const boomLength = Math.hypot(boomHead[0] - boomFoot[0], boomHead[1] - boomFoot[1]);
const [ex, ey] = [(boomHead[0] - boomFoot[0]) / boomLength, (boomHead[1] - boomFoot[1]) / boomLength];
const onBoom = (t: number, across: number) => `${(boomFoot[0] + ex * boomLength * t - ey * across).toFixed(1)},${(boomFoot[1] + ey * boomLength * t + ex * across).toFixed(1)}`;
const boomSection = (from: number, to: number, half: number) => `M${onBoom(from, -half)}L${onBoom(to, -half)}L${onBoom(to, half)}L${onBoom(from, half)}Z`;
const boom = [
  boomSection(0, 0.42, 3.2), boomSection(0.38, 0.72, 2.4), boomSection(0.68, 1, 1.6),
  // the luffing cylinder under it
  `M${tv(24, 18)}L${onBoom(0.24, 3.2)}`,
].join('');
// Rope, hook and the truss on its slings: the frames' pitched outline with its web
const [hx, hy] = [boomHead[0], boomHead[1] + 22];
const TRUSS_HALF = 24;
const trussTop = (s: number) => hy + 10 + (Math.abs(s) * 8) / TRUSS_HALF;
const truss = [
  `M${hx},${boomHead[1]}V${hy}M${hx - 3},${hy}h6l-3,4z`,
  `M${hx},${hy}L${hx - TRUSS_HALF},${trussTop(TRUSS_HALF)}M${hx},${hy}L${hx + TRUSS_HALF},${trussTop(TRUSS_HALF)}`,
  `M${hx - TRUSS_HALF},${hy + 24}H${hx + TRUSS_HALF}V${trussTop(TRUSS_HALF)}L${hx},${trussTop(0)}L${hx - TRUSS_HALF},${trussTop(TRUSS_HALF)}Z`,
  `M${hx - TRUSS_HALF},${hy + 24}L${hx - TRUSS_HALF / 2},${trussTop(TRUSS_HALF / 2)}L${hx},${hy + 24}L${hx + TRUSS_HALF / 2},${trussTop(TRUSS_HALF / 2)}L${hx + TRUSS_HALF},${hy + 24}M${hx},${trussTop(0)}V${hy + 24}`,
].join('');
const site = [
  `M${g1[0]},${g1[1] + 2}H${g2[0]}`,
  `M${xy([W + 26, 0, 0]).join(',')}L${xy([W + 26, -70, 0]).join(',')}M${xy([W + 66, 0, 0]).join(',')}L${xy([W + 66, -70, 0]).join(',')}`,
  truck,
  OUTRIGGER.u.map((u) => outrigger(u, -1)).join(''),
  boom,
  truss,
].join('');
const road = [
  `M${xy([W + 46, 0, 0]).join(',')}L${xy([W + 46, -70, 0]).join(',')}`,
];
const outriggersFar = OUTRIGGER.u.map((u) => outrigger(u, 1)).join('');
/** The far outriggers and the pad's far edge are hidden where the truck (down to the ground) and the boom's foot section
 * stand in front of them: this outline is the mask's black */
const craneOutline = [`M${tv(0, 0)}L${tv(80, 0)}L${tv(80, 9.5)}L${tv(0, 9.5)}Z`, house, cab, boomSection(0, 0.42, 3.2)].join('');
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

/** Where each number sits on the drawing — on its part, clear of the other lines. The foundation's stands a little up
 *  and out from the slab's corner: at a phone's radius (15) it touched the schedule's 7 (04.10). */
const [fx, fy] = xy([0, 60, -7]);
const BADGES: Record<string, readonly [number, number]> = {
  dimensions: [(s1[0] + s2[0]) / 2, s1[1] + 18],
  structure: xy([W / 2, 160, RIDGE + 44]),
  foundation: [fx - 22, fy + 18],
  insulation: xy([0, 120, EAVE / 2]),
  technology: xy([W - 12, 95, 20]),
  logistics: xy([TRUCK.x + OUTRIGGER.u[0], TRUCK.d - OUTRIGGER.reach, 0]),
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
  // 306 tall: room under the sizes' badge 1 for a phone's larger badge, which the edge cut flat (04.10)
  const drawing = (
    <svg viewBox="8 62 492 306" focusable="false" aria-hidden="true">
      <defs>
        <mask id="cf-behind-crane" maskUnits="userSpaceOnUse" x="8" y="62" width="492" height="306">
          <rect x="8" y="62" width="492" height="306" fill="#fff" />
          <path d={craneOutline} fill="#000" />
        </mask>
      </defs>
      <g className="cf-part" data-part="logistics">
        <g mask="url(#cf-behind-crane)"><path className="cf-pad" d={cranePad} /><path d={outriggersFar} /></g>
        <path d={site} />
        <path className="cf-road-centre" d={road.join('')} />
      </g>
      <path className="cf-part cf-slab" data-part="foundation" d={slab} />
      <path className="cf-part cf-envelope" data-part="insulation" d={envelope} />
      <path className="cf-part cf-equipment" data-part="technology" d={equipment} />
      <g className="cf-part cf-frame" data-part="structure"><path d={`${frames}${purlins}`} /><path className="cf-loads" d={loads} /></g>
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
