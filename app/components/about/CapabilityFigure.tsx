'use client';

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from 'react';
import type { CapabilityLedgerColumn } from '../../lib/deliveryModelPresentation';

// /pro-nas «Що робимо самі, а що організовуємо». Owner, 04.10: the see-through hangar on its site read as overloaded
// — the spoil heap and the depth mark had to go, and with them everything that is not a work of the list. Owner, 05.10:
// still too much text — «залишити найнеобхідніший». So the block is now a scheme and its legend: one flat section of
// a building on the left, and beside it the three groups as short name tags — no sentences. A tag wears its group's
// line, the same three lines the scheme is drawn in: copper for what we do ourselves (01), thin graphite for what we
// organise (02), dashed for specialists or the customer (03); so it reads at rest and on a phone. The works' full
// statements stay in the Delivery Model and on the pages the linked tags lead to.
// The first time the scheme comes into view it walks once through the works it draws, in the list's order — each tag
// and its part light together (owner, 05.10: «автоматично перемикатися між елементами», as «Що враховуємо в
// розрахунку» does on /yak-pratsyuiemo) — and then rests; pointing takes over at once. No tour with reduced motion.
// Pointing works both ways with a mouse: at a tag or a group — its part of the scheme stays and the rest goes quiet;
// at a part of the scheme — its tag lights. The keyboard gets the same on a linked tag. The scheme is decorative
// (aria-hidden): the tags say everything, in the Delivery Model's names.
// Styles: capability.css (imported by the page).

type Tier = CapabilityLedgerColumn['id'];

/** The scheme's parts in a 360-wide sheet (viewBox 0 24 360 184): the capability ids a part shows
 *  (deliveryModel.capabilities) and its path. Later parts draw over earlier ones. A part's group comes from the
 *  ledger, never from here. Everything drawn is a row of the list — plus the ground and the axis. */
const PARTS: readonly (readonly [caps: string, d: string])[] = [
  // two local pits, one under each footing; the inner slopes stop at the underside of the floor slab
  ['earthworks', 'M50 158L57 185H99L104.8 162.5M255.2 162.5L261 185H303L310 158'],
  ['industrial-floors', 'M85 158H275M85 162.5H275'], // the floor slab, on the ground between the footings
  ['gates', 'M150 158V112H210V158M150 127.3H210M150 142.7H210'], // the gate in the far wall: its outline, two panel joints
  ['mep', 'M352 198H244V144'], // a service line in from the site's edge, under the footing and up through the floor
  ['foundations', 'M71 158H85V172H95V185H61V172H71ZM275 158H289V172H299V185H265V172H275Z'], // a pedestal on a pad, standing on each pit's bottom
  ['panels', 'M71 81V154M289 81V154'], // the wall panels, at the columns' outer face
  ['roofing panels', 'M66 82.4L180 46.6L294 82.4'], // the roof covering, parallel to the rafters
  ['steel', 'M78 158V86L180 54L282 86V158'], // the frame: two columns, two rafters
];
const DRAWN = new Set(PARTS.flatMap(([caps]) => caps.split(' ')));

/** The groups' numbers on the scheme: the part a number points at (its group, and so its number, come from the ledger),
 *  the leader from a dot on that part, and where the number stands */
const TAGS: readonly { cap: string; leader: string; dot: readonly [number, number]; text: readonly [number, number]; anchor: 'start' | 'end' }[] = [
  { cap: 'roofing', leader: 'M128 62.9L114 40H102', dot: [128, 62.9], text: [98, 40], anchor: 'end' },
  { cap: 'earthworks', leader: 'M53.5 171.5L43.5 196H36.5', dot: [53.5, 171.5], text: [32.5, 196], anchor: 'end' }, // on the left pit's slope
  { cap: 'mep', leader: 'M322 198L330 182H337', dot: [322, 198], text: [341, 182], anchor: 'start' },
];

type Pointed = { tier: Tier; cap?: string; rows?: readonly string[] } | null;

/** One step of the first-view walk, as on «Що враховуємо в розрахунку» (CostFactorsFigure) but a little quicker: the
 *  names are short */
const TOUR_STEP_MS = 1300;

export function CapabilityFigure({ columns }: Readonly<{ columns: readonly CapabilityLedgerColumn[] }>) {
  const [byPointer, setByPointer] = useState<Pointed>(null);
  const [tour, setTour] = useState<Pointed>(null);
  const figureRef = useRef<HTMLElement>(null);
  const toured = useRef(false);
  const pointed = byPointer ?? tour;
  // Pointing ends the walk for good
  const setPointed = (next: Pointed) => { toured.current = true; setTour(null); setByPointer(next); };

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    // The works the scheme has a part for, in the list's order
    const steps = columns.flatMap((column) => column.items.filter((item) => DRAWN.has(item.id)).map((item) => ({ tier: column.id, cap: item.id, rows: [item.id] })));
    let timer = 0;
    let index = -1;
    const step = () => {
      index += 1;
      if (toured.current || index >= steps.length) { setTour(null); return; }
      setTour(steps[index]);
      timer = window.setTimeout(step, TOUR_STEP_MS);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.5) return;
      observer.disconnect();
      timer = window.setTimeout(step, 1200); // after the scheme has drawn itself
    }, { threshold: [0, 0.5] });
    observer.observe(figure);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [columns]);

  const columnOf = (cap: string) => columns.findIndex((column) => column.items.some((item) => item.id === cap));
  const number = (index: number) => String(index + 1).padStart(2, '0');
  const row = (tier: Tier, id: string): Pointed => ({ tier, rows: [id], cap: DRAWN.has(id) ? id : undefined });
  // Only a real mouse points: a tap emulates hover and never leaves, which would keep a tag lit on a phone — where the
  // scheme is a legend between the groups, not beside the tag
  const mouse = (next: Pointed) => (event: PointerEvent) => { if (event.pointerType === 'mouse') setPointed(next); };

  const ledgerColumn = (column: CapabilityLedgerColumn, index: number) => (
    <section
      className={`about-ledger-col is-${column.id}`}
      aria-labelledby={`about-ledger-${column.id}`}
      key={column.id}
      style={{ '--i': index } as CSSProperties}
      onPointerEnter={mouse({ tier: column.id })}
      onPointerLeave={mouse(null)}
    >
      <h3 id={`about-ledger-${column.id}`}>
        <span aria-hidden="true">{number(index)}</span>
        {column.title}
      </h3>
      <ul>
        {column.items.map((item) => (
          <li
            key={item.id}
            data-cap={item.id}
            data-on={pointed?.rows?.includes(item.id) ? '' : undefined}
            onPointerEnter={mouse(row(column.id, item.id))}
            onPointerLeave={mouse({ tier: column.id })}
            // The keyboard gets the same on a linked work (focus bubbles from its link) — the keyboard only: a tap
            // focuses the link too, and would light a scheme that is off the screen
            onFocus={(event: FocusEvent<HTMLLIElement>) => { if (event.target.matches(':focus-visible')) setPointed(row(column.id, item.id)); }}
            onBlur={() => setPointed(null)}
          >
            {item.href
              ? <b><a href={item.href}>{item.short} <span aria-hidden="true">↗</span></a></b>
              : <b className="is-plain">{item.short}</b>}
          </li>
        ))}
      </ul>
    </section>
  );

  // The ledger's first group is the heading's first half («самі»); in the markup the scheme follows it, which is the
  // phone's order (01, the scheme as a legend, 02, 03). On a wide screen the scheme stands beside all three.
  const [own, ...organised] = columns;

  return (
    // One element is both the block's grid and the ledger (.about-ledger holds all three columns, in the model's order)
    <div className="about-cap about-ledger" data-motion data-tier={pointed?.tier} data-cap={pointed?.cap}>
      {ledgerColumn(own, 0)}
      <figure className="cap-fig" aria-hidden="true" data-motion ref={figureRef}>
        <svg viewBox="0 24 360 184" focusable="false">
          <path className="cap-ground" d="M8 158H50M310 158H352" />
          <path className="cap-axis" d="M180 28V204" />
          {PARTS.map(([caps, d]) => {
            const ids = caps.split(' ');
            const tier = columns[columnOf(ids[0])]?.id;
            // Lit: the pointed work's own part, or — for a group, or a work the scheme has no place for — the group's
            const lit = pointed && (pointed.cap ? ids.includes(pointed.cap) : pointed.tier === tier);
            // pathLength lets the first view draw a solid line; a dashed one would lose its dashes, so it fades in
            return <path key={caps} className="cap-part" data-tier={tier} data-caps={caps} data-on={lit ? '' : undefined} d={d} pathLength={tier === 'partner' ? undefined : 1} />;
          })}
          {TAGS.map((tag) => {
            const index = columnOf(tag.cap);
            if (index < 0) return null;
            const tier = columns[index].id;
            return (
              <g className="cap-tag" data-tier={tier} data-on={pointed?.tier === tier ? '' : undefined} key={tag.cap}>
                <path d={tag.leader} />
                <circle cx={tag.dot[0]} cy={tag.dot[1]} r="1.6" />
                <text x={tag.text[0]} y={tag.text[1]} textAnchor={tag.anchor}>{number(index)}</text>
              </g>
            );
          })}
          {/* The other way round: a wide invisible stroke over each part, so pointing at the scheme lights its tag */}
          {PARTS.map(([caps, d]) => {
            const ids = caps.split(' ');
            const tier = columns[columnOf(ids[0])]?.id;
            if (!tier) return null;
            return <path key={caps} className="cap-hit" data-caps={caps} d={d} onPointerEnter={mouse({ tier, cap: ids[0], rows: ids })} onPointerLeave={mouse(null)} />;
          })}
        </svg>
        <figcaption>
          <span>Схема</span>
          <b>Переріз будівлі</b>
          <span>Хто виконує кожну частину</span>
        </figcaption>
      </figure>
      {organised.map((column, index) => ledgerColumn(column, index + 1))}
    </div>
  );
}
