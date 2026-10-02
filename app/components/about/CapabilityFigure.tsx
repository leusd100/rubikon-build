'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CapabilityLedgerColumn } from '../../lib/deliveryModelPresentation';

// /pro-nas «Що робимо самі, а що організовуємо» (UX pass 2026-10, owner: «зробимо цікавіше і живіше» — in the language of
// /yak's cost-factor drawing). One object on its site, the main works of the Delivery Model drawn where they happen, all
// in quiet graphite until one lights: our own team's in copper, what we organise in a strong line, specialist works
// dashed. Pointing at a work (or tapping it) lights its part; pointing at a group lights the group; the first view walks
// the three groups once. (A first version drew every work at once in its colour and read as overloaded — owner, 02.10.)
// The drawing is decorative (aria-hidden): the list beside it says everything, in the model's words.

type Point = readonly [number, number, number];
const OX = 190;
const OY = 300;
const p = ([x, d, z]: Point) => `${(OX + x - d * 0.4).toFixed(1)},${(OY - z - d * 0.4).toFixed(1)}`;
const line = (...points: Point[]) => `M${points.map(p).join('L')}`;
const poly = (...points: Point[]) => `${line(...points)}Z`;

const W = 150;
const EAVE = 78;
const RIDGE = 108;
const DEPTH = 200;
const FRAMES = [0, 50, 100, 150, 200];
const STEPS = [25, 50, 75, 100, 125, 150, 175];

/** Height of a gable wall at x: the eave at the sides, the ridge in the middle */
const gableTop = (x: number) => EAVE + (RIDGE - EAVE) * (1 - Math.abs(x - W / 2) / (W / 2));
const gable = (d: number) => line([0, d, 0], [0, d, EAVE], [W / 2, d, RIDGE], [W, d, EAVE], [W, d, 0]);
/** Panel joints on a gable wall: full height beside the gate, above it over the gate's width (the front only) */
const gableJoints = (d: number, gate: boolean) => [15, 30, 45, 60, 75, 90, 105, 120, 135]
  .map((x) => line([x, d, gate && x > 50 && x < 100 ? 50 : 0], [x, d, gableTop(x)])).join('');
const sideWall = (x: number) => `${poly([x, 0, 0], [x, DEPTH, 0], [x, DEPTH, EAVE], [x, 0, EAVE])}${STEPS.map((d) => line([x, d, 0], [x, d, EAVE])).join('')}`;
const slope = (x: number) => `${poly([x, 0, EAVE], [W / 2, 0, RIDGE], [W / 2, DEPTH, RIDGE], [x, DEPTH, EAVE])}${STEPS.map((d) => line([x, d, EAVE], [W / 2, d, RIDGE])).join('')}`;
/** The pit, cut under the front of the building: sloped sides, the soil hatched round them, its depth, the spoil heap */
const PIT_TICKS = [0.2, 0.45, 0.7, 0.95];
const pit = [
  line([-30, 0, 0], [-6, 0, -34], [156, 0, -34], [180, 0, 0]),
  ...PIT_TICKS.map((t) => line([-30 + 24 * t, 0, -34 * t], [-36 + 24 * t, 0, -6 - 34 * t])),
  ...PIT_TICKS.map((t) => line([180 - 24 * t, 0, -34 * t], [186 - 24 * t, 0, -6 - 34 * t])),
  ...[14, 44, 74, 104, 134].map((x) => line([x, 0, -34], [x - 6, 0, -40])),
  line([-44, 0, 0], [-44, 0, -34]), line([-49, 0, 0], [-39, 0, 0]), line([-49, 0, -34], [-39, 0, -34]),
  line([-110, 0, 0], [-98, 0, 12], [-84, 0, 17], [-70, 0, 12], [-58, 0, 0]),
].join('');

/** Every part of the drawing, keyed by the capability it shows (deliveryModel.capabilities ids). Works the drawing
 *  has no place for (fencing, landscaping, floors, ventilation, other works) light only their row in the list. */
const PARTS: Record<string, string> = {
  foundations: `${poly([0, 0, 0], [W, 0, 0], [W, DEPTH, 0], [0, DEPTH, 0])}${line([0, 0, 0], [0, 0, -8], [W, 0, -8], [W, 0, 0])}${line([0, 0, -8], [0, DEPTH, -8], [0, DEPTH, 0])}`,
  steel: [...FRAMES].reverse().map((d) => line([0, d, 0], [0, d, EAVE], [W / 2, d, RIDGE], [W, d, EAVE], [W, d, 0])).join('')
    + line([0, 0, EAVE], [0, DEPTH, EAVE]) + line([W, 0, EAVE], [W, DEPTH, EAVE]) + line([W / 2, 0, RIDGE], [W / 2, DEPTH, RIDGE]),
  // both slopes, with their sheets' ribs
  roofing: `${slope(0)}${slope(W)}`,
  // every wall: both sides, both gables (the front's joints stop over the gate)
  panels: `${sideWall(0)}${sideWall(W)}${gable(0)}${gableJoints(0, true)}${gable(DEPTH)}${gableJoints(DEPTH, false)}`,
  gates: `${poly([50, 0, 0], [100, 0, 0], [100, 0, 50], [50, 0, 50])}${[12.5, 25, 37.5].map((z) => line([50, 0, z], [100, 0, z])).join('')}`,
  // a compact stack of beams, delivered for erection
  'steel-fabrication': [0, 7, 14].map((z) => `${line([W + 34, -10, z], [W + 34, 46, z])}${line([W + 62, -10, z], [W + 62, 46, z])}${line([W + 34, -10, z], [W + 62, -10, z])}`).join(''),
  earthworks: pit,
  mep: `${line([W + 120, 150, -10], [W, 150, -10])}${line([W + 120, 120, -16], [W, 120, -16])}${line([W + 120, 150, -10], [W + 120, 150, 70])}`,
};

const TOUR_STEP_MS = 1700;

export function CapabilityFigure({ columns }: Readonly<{ columns: readonly CapabilityLedgerColumn[] }>) {
  const [pointed, setPointed] = useState<{ tier?: string; cap?: string } | null>(null);
  const [tour, setTour] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tierOf = (cap: string) => columns.find((column) => column.items.some((item) => item.id === cap))?.id;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let timer = 0;
    let index = -1;
    const step = () => {
      index += 1;
      if (index >= columns.length) { setTour(null); return; }
      setTour(columns[index].id);
      timer = window.setTimeout(step, TOUR_STEP_MS);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.35) return;
      observer.disconnect();
      timer = window.setTimeout(step, 400);
    }, { threshold: [0, 0.35] });
    observer.observe(root);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [columns]);

  const activeTier = pointed?.tier ?? (pointed?.cap ? undefined : tour ?? undefined);
  const activeCap = pointed?.cap;
  // A work the drawing has no part for tints its row and leaves the drawing as it is
  const drawnCap = activeCap && PARTS[activeCap] ? activeCap : undefined;
  const point = (next: { tier?: string; cap?: string } | null) => { setTour(null); setPointed(next); };

  return (
    <div className="about-cap" ref={rootRef} data-tier={activeTier} data-cap={drawnCap} data-row={activeCap}>
      <figure className="about-cap-figure" aria-hidden="true">
        <svg viewBox="70 96 380 256" focusable="false">
          <path className="cap-ground" d={`M${p([-120, 0, 0])}L${p([260, 0, 0])}`} />
          {Object.entries(PARTS).map(([cap, d]) => (
            <path key={cap} className="cap-part" data-cap={cap} data-tier={tierOf(cap)} d={d} pathLength={cap === 'earthworks' ? 1 : undefined} />
          ))}
        </svg>
      </figure>
      <div className="about-ledger" data-motion>
        {columns.map((column, index) => (
          <section
            className={`about-ledger-col is-${column.id}`}
            aria-labelledby={`about-ledger-${column.id}`}
            key={column.id}
            style={{ '--i': index } as CSSProperties}
            onMouseEnter={() => point({ tier: column.id })}
            onMouseLeave={() => point(null)}
          >
            <h3 id={`about-ledger-${column.id}`}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              {column.title}
            </h3>
            {column.note && <p className="about-ledger-note">{column.note}</p>}
            <ul>
              {column.items.map((item) => (
                <li
                  key={item.id}
                  data-cap={item.id}
                  onMouseEnter={() => point({ cap: item.id })}
                  onMouseLeave={() => point({ tier: column.id })}
                  onClick={() => point(activeCap === item.id ? null : { cap: item.id })}
                >
                  <b>{item.href ? <a href={item.href}>{item.label} <span aria-hidden="true">↗</span></a> : item.label}</b>
                  {item.statement && <span>{item.statement}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
