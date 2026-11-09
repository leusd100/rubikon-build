'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FormatPrefillLink } from '../process/FormatPrefillLink';
import type { FormatCard } from '../../lib/deliveryModelPresentation';
import type { DeliveryFormatId } from '../../types/deliveryModel';

// «Формати участі» (/yak-pratsyuiemo, «Наш обсяг») — the three formats side by side, compared row by row («Спільне й
// різне», owner 09.11, variant 02 · B of the mockups). Until then one drawing was redrawn for the format in focus, and
// the two formats that differ only in the contract (separate package and subcontract) looked almost the same on it
// (a second thin frame); every answer to «and in the other format?» was behind a press.
//
// What the block says, in the Delivery Model's words (deliveryModel.ts, verbatim):
//   a drawing per format   — the same flat section of a building: RUBIKON's parts in copper, the others' in thin
//                            graphite, a dashed frame for whose object it is (as before, one drawing per column now);
//   the summary            — each format's own;
//   RUBIKON's scope        — the whole agreed complex, or one package at a time (the foundation, the frame, the roof take
//                            one turn each when the block comes into view and rest on the first: rule 7);
//   the contract           — the other party: the customer or the general contractor;
//   who coordinates        — RUBIKON in the agreed scope, the customer or their general contractor, the general contractor.
// A value that several formats share is said once, across their columns (the contract with the customer is the same
// in the first two); a value that sets a format apart carries a copper mark. That is the block's one rule: what is the
// same is written once.
//
// Markup: a table in ARIA roles on divs, as the responsibility map below it (the page has no <table>: tests/e2e/pr-critical
// «speaks to the client»), so the shared cells keep aria-colspan and every cell its column's format at any width. The
// drawings are decorative (aria-hidden): the rows carry every word. At ≤ 1050 px the rows stack: the three titles and
// drawings stay side by side, each row below lists its values with their formats' numbers (formats-scope.css).
// No format is chosen here: the responsibility map below keeps its own switcher (until 09.11 the two held one choice).

export type FormatTerms = { contractWith: string; coordinator: string; rubikonCoordinates: boolean };

type Layer = 'foundation' | 'frame' | 'envelope' | 'roof';
/** The building's parts, in build order: what a package may be, and its path in the 460 × 284 sheet */
const LAYERS: readonly (readonly [Layer, string])[] = [
  ['foundation', 'M136 222h16v14h10v12h-36v-12h10zM308 222h16v14h10v12h-36v-12h10z'], // a pedestal on a pad under each column
  ['frame', 'M144 222V130L230 92L316 130V222'], // two columns, two rafters
  ['envelope', 'M135 218V125M325 218V125'], // the walls, at the columns' outer face
  ['roof', 'M126 126L230 80L334 126'], // the covering, parallel to the rafters
];
/** The packages that take turns as «one package»: the model's summary names the foundation, the frame, the roof */
const PACKAGES: readonly (readonly [Layer, string])[] = [['foundation', 'Фундамент'], ['frame', 'Каркас'], ['roof', 'Покрівля']];
const STEP_MS = 1150;

/** What the dashed frame is, under each drawing where the drawings are a third of a phone wide and their own names
 *  would be too small (PDO-20: the frames' names must be readable on a phone) */
const FRAME_NAME: Readonly<Record<DeliveryFormatId, string>> = {
  comprehensive: 'Обсяг RUBIKON',
  'work-package': 'Об’єкт замовника',
  subcontract: 'Об’єкт у проєкті генпідрядника',
};

/** Neighbouring formats with the same value, as one cell across their columns */
type Run = { formats: FormatCard[]; key: string };
function runs(formats: readonly FormatCard[], keyOf: (format: FormatCard) => string): Run[] {
  const out: Run[] = [];
  for (const format of formats) {
    const key = keyOf(format);
    const last = out.at(-1);
    if (last?.key === key) last.formats.push(format);
    else out.push({ formats: [format], key });
  }
  return out;
}

/** One flat section of the building for a format; `scoped` names the parts that are RUBIKON's */
function Section({ format, scoped }: Readonly<{ format: DeliveryFormatId; scoped: (layer: Layer) => boolean }>) {
  return (
    <svg className="fs" viewBox="28 8 404 272" data-format={format} aria-hidden="true" focusable="false">
      {/* whose object it is: the outer frame only for a general contractor's project */}
      {format === 'subcontract' && (
        <>
          <rect className="fs-frame fs-outer" x="34" y="30" width="392" height="246" />
          <text className="fs-label" x="34" y="21">Проєкт генпідрядника</text>
        </>
      )}
      <rect className="fs-frame fs-inner" x="88" y="66" width="284" height="196" />
      <text className={format === 'comprehensive' ? 'fs-label fs-label-scope' : 'fs-label'} x="88" y="57">
        {{ comprehensive: 'Обсяг RUBIKON', 'work-package': 'Об’єкт замовника', subcontract: 'Об’єкт у складі проєкту' }[format]}
      </text>
      {/* the ground outside, the floor inside, the axis */}
      <path className="fs-ground" d="M98 222H136M324 222H362M152 222H308" />
      <path className="fs-axis" d="M230 74V256" />
      {LAYERS.map(([layer, d], index) => (
        <path className="fs-layer" data-layer={layer} data-scope={scoped(layer) ? '' : undefined} style={{ '--i': index } as CSSProperties} d={d} key={layer} />
      ))}
    </svg>
  );
}

export function FormatsScope({ formats, terms, prefill = false }: Readonly<{
  formats: readonly FormatCard[];
  terms: Readonly<Record<DeliveryFormatId, FormatTerms>>;
  /** Add, under each format, the link that carries it into the inquiry form */
  prefill?: boolean;
}>) {
  const [turn, setTurn] = useState(0);
  const [inView, setInView] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // On screen or not: the packages below walk only in view, and the copper frame runs round only in view
  useEffect(() => {
    const root = gridRef.current;
    if (!root) return undefined;
    // The newest entry: one call can hold several, and the first of them may be a stale «out of view» (DrawingSheet)
    const observer = new IntersectionObserver((entries) => setInView(Boolean(entries.at(-1)?.isIntersecting)));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // «One package»: the packages take one turn each and rest on the first (rule 7: nothing loops while the block is on
  // screen). The block coming back into view walks them again.
  useEffect(() => {
    if (!inView || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let left = PACKAGES.length;
    let timer = 0;
    const next = () => {
      left -= 1;
      setTurn((value) => (left > 0 ? (value + 1) % PACKAGES.length : 0));
      if (left > 0) timer = window.setTimeout(next, STEP_MS);
    };
    timer = window.setTimeout(next, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [inView]);

  const whole = (format: FormatCard) => format.id === 'comprehensive';
  const scopedIn = (format: FormatCard) => (layer: Layer) => whole(format) || PACKAGES[turn][0] === layer;

  const packages = (format: FormatCard) => (
    <>
      <ul className="dfmt-packages">
        {PACKAGES.map(([layer, name]) => <li key={layer} data-scope={scopedIn(format)(layer) ? '' : undefined}>{name}</li>)}
      </ul>
      <span className="dfmt-note">{whole(format) ? 'увесь погоджений комплекс' : 'або інший погоджений обсяг'}</span>
    </>
  );

  /** The rows under the drawings: label, how to tell the formats' values apart, the value; `facts` rows mark the values
   *  that set a format apart (the summaries are prose, each its own) */
  const rows: readonly { id: string; label: string; facts: boolean; key: (format: FormatCard) => string; value: (format: FormatCard) => ReactNode }[] = [
    { id: 'text', label: 'Суть', facts: false, key: (format) => format.text, value: (format) => format.text },
    { id: 'scope', label: 'Обсяг RUBIKON', facts: true, key: (format) => (whole(format) ? 'whole' : 'package'), value: packages },
    { id: 'contract', label: 'Договір', facts: true, key: (format) => terms[format.id].contractWith, value: (format) => <>{terms[format.id].contractWith} — <b>RUBIKON</b></> },
    {
      id: 'coordinator',
      label: 'Координує об’єкт',
      facts: true,
      key: (format) => terms[format.id].coordinator,
      value: (format) => (terms[format.id].rubikonCoordinates ? <b className="dfmt-ours">{terms[format.id].coordinator}</b> : terms[format.id].coordinator),
    },
  ];

  return (
    <div className="dfmt-grid" data-motion data-live={inView || undefined} ref={gridRef}>
      <p className="dfmt-key" aria-hidden="true">
        <span className="dfmt-key-shared"><i>01 · 02</i>Однаково для кількох форматів</span>
        <span className="dfmt-key-differs"><i>03</i>Відрізняє формат</span>
      </p>
      <div className="dfmt-table" role="table" aria-label="Формати участі">
        <div className="dfmt-row dfmt-row-head" role="row" style={{ '--i': 0 } as CSSProperties}>
          <span className="dfmt-corner" role="columnheader"><span className="dfmt-sr">Що порівнюємо</span></span>
          {formats.map((format) => (
            <span className="dfmt-head" role="columnheader" key={format.id}>
              <span className="dfmt-num">{format.number}</span> <span className="dfmt-title">{format.title}</span>
            </span>
          ))}
        </div>
        <div className="dfmt-row dfmt-row-draw" aria-hidden="true" style={{ '--i': 1 } as CSSProperties}>
          <span className="dfmt-corner" />
          {formats.map((format) => (
            <figure className="dfmt-fig" key={format.id}>
              <Section format={format.id} scoped={scopedIn(format)} />
              <figcaption className="dfmt-frame-name" data-ours={whole(format) || undefined}>{FRAME_NAME[format.id]}</figcaption>
            </figure>
          ))}
        </div>
        {rows.map((row, index) => {
          const cells = runs(formats, row.key);
          return (
            <div className="dfmt-row" role="row" data-row={row.id} key={row.id} style={{ '--i': index + 2 } as CSSProperties}>
              <span className="dfmt-label" role="rowheader">{row.label}</span>
              {cells.map((cell) => {
                const span = cell.formats.length;
                return (
                  <div
                    className="dfmt-cell"
                    role="cell"
                    aria-colspan={span > 1 ? span : undefined}
                    data-shared={span > 1 || undefined}
                    data-differs={(row.facts && span === 1 && cells.length > 1) || undefined}
                    style={{ '--span': span } as CSSProperties}
                    key={cell.formats[0].id}
                  >
                    <span className="dfmt-tag" aria-hidden="true">{cell.formats.map((format) => format.number).join(' · ')}</span>
                    <div className="dfmt-value">{row.value(cell.formats[0])}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {prefill && (
        <div className="dfmt-row dfmt-ctas" style={{ '--i': rows.length + 2 } as CSSProperties}>
          <span className="dfmt-corner" aria-hidden="true" />
          {formats.map((format) => (
            <div className="dfmt-cta" key={format.id}>
              <span className="dfmt-tag" aria-hidden="true">{format.number}</span>
              <FormatPrefillLink label={format.title} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
