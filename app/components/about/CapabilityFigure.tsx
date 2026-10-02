'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CapabilityLedgerColumn } from '../../lib/deliveryModelPresentation';

// /pro-nas «Що робимо самі, а що організовуємо» (UX pass 2026-10, owner: «зробимо цікавіше і живіше» — in the language of
// /yak's cost-factor drawing). One object on its site, each work of the Delivery Model drawn where it happens: what our
// own team does in copper, what we organise for the project in graphite, specialist works dashed. Pointing at a work
// (or tapping it) lights its part; pointing at a group lights the group; the first view walks the three groups once.
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

/** Every part of the drawing, keyed by the capability it shows (deliveryModel.capabilities ids) */
const PARTS: Record<string, string> = {
  foundations: `${poly([0, 0, 0], [W, 0, 0], [W, DEPTH, 0], [0, DEPTH, 0])}${line([0, 0, 0], [0, 0, -8], [W, 0, -8], [W, 0, 0])}${line([0, 0, -8], [0, DEPTH, -8], [0, DEPTH, 0])}`,
  steel: [...FRAMES].reverse().map((d) => line([0, d, 0], [0, d, EAVE], [W / 2, d, RIDGE], [W, d, EAVE], [W, d, 0])).join('')
    + line([0, 0, EAVE], [0, DEPTH, EAVE]) + line([W, 0, EAVE], [W, DEPTH, EAVE]) + line([W / 2, 0, RIDGE], [W / 2, DEPTH, RIDGE]),
  roofing: `${poly([0, 0, EAVE], [W / 2, 0, RIDGE], [W / 2, DEPTH, RIDGE], [0, DEPTH, EAVE])}${STEPS.map((d) => line([0, d, EAVE], [W / 2, d, RIDGE])).join('')}`,
  panels: `${poly([0, 0, 0], [0, DEPTH, 0], [0, DEPTH, EAVE], [0, 0, EAVE])}${STEPS.map((d) => line([0, d, 0], [0, d, EAVE])).join('')}${[30, 120].map((x) => line([x, 0, 0], [x, 0, EAVE + (x < W / 2 ? x : W - x) * 0.4])).join('')}`,
  gates: `${poly([50, 0, 0], [100, 0, 0], [100, 0, 50], [50, 0, 50])}${[12.5, 25, 37.5].map((z) => line([50, 0, z], [100, 0, z])).join('')}`,
  // the floor: a short hatch over the front of the slab
  'industrial-floors': [12, 26, 40, 54, 68, 82, 96, 110, 124, 138].map((x) => line([x, 70, 0], [x - 6, 100, 0])).join(''),
  // a compact stack of beams, delivered for erection
  'steel-fabrication': [0, 7, 14].map((z) => `${line([W + 34, -10, z], [W + 34, 46, z])}${line([W + 62, -10, z], [W + 62, 46, z])}${line([W + 34, -10, z], [W + 62, -10, z])}`).join(''),
  // a trench cut in front, its sloped sides hatched
  earthworks: `${line([-62, -36, 0], [-44, -36, -22], [-6, -36, -22], [12, -36, 0])}${[-56, -48, -40].map((x) => line([x, -36, -6 - (x + 56)], [x + 5, -36, -2 - (x + 56)])).join('')}${[0, 6].map((x) => line([x, -36, -16 + x * 2], [x + 5, -36, -12 + x * 2])).join('')}`,
  // the site's fence along its side
  envelope: [-60, -30, 0, 30, 60, 90, 120, 150, 180, 210, 240].map((d) => line([-104, d, 0], [-104, d, 18])).join('') + line([-104, -60, 15], [-104, 240, 15]) + line([-104, -60, 5], [-104, 240, 5]),
  landscaping: [[-60, 120], [-72, 200]].map(([x, d]) => {
    const [cx, cy] = p([x, d, 32]).split(',').map(Number);
    return `${line([x, d, 0], [x, d, 20])}M${cx - 12},${cy}a12 12 0 1 0 24 0a12 12 0 1 0 -24 0`;
  }).join('') + line([-36, 60, 0], [-36, 230, 0]) + line([-48, 60, 0], [-48, 230, 0]),
  mep: `${line([W + 120, 150, -10], [W, 150, -10])}${line([W + 120, 120, -16], [W, 120, -16])}${line([W + 120, 150, -10], [W + 120, 150, 70])}`,
  ventilation: [60, 140].map((d) => `${poly([W / 2 - 8, d, RIDGE], [W / 2 + 8, d, RIDGE], [W / 2 + 8, d, RIDGE + 14], [W / 2 - 8, d, RIDGE + 14])}${line([W / 2, d, RIDGE + 14], [W / 2, d, RIDGE + 22])}`).join(''),
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
  const point = (next: { tier?: string; cap?: string } | null) => { setTour(null); setPointed(next); };

  return (
    <div className="about-cap" ref={rootRef} data-tier={activeTier} data-cap={activeCap}>
      <figure className="about-cap-figure" aria-hidden="true">
        <svg viewBox="28 104 452 252" focusable="false">
          <path className="cap-ground" d={`M${p([-120, 0, 0])}L${p([300, 0, 0])}`} />
          {Object.entries(PARTS).map(([cap, d]) => (
            <path key={cap} className="cap-part" data-cap={cap} data-tier={tierOf(cap)} d={d} />
          ))}
        </svg>
        <figcaption className="about-cap-legend">
          {columns.map((column) => <span key={column.id} data-tier={column.id}><i />{column.title}</span>)}
        </figcaption>
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
