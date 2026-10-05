'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { FormatCard } from '../../lib/deliveryModelPresentation';
import type { DeliveryFormatId } from '../../types/deliveryModel';

// /napryamky «Формати участі» — one flat section of a building that is redrawn for the format in focus (owner,
// 05.10: the oblique wireframe was not clear enough — «більш зрозумілішим, з вау ефектом, ближче до мінімалізму»; the
// idea is the three-section scheme first mocked for HOME, which the owner liked but did not want there).
// What the drawing says, in the site's three lines:
//   copper          — RUBIKON's scope: every part in «Комплексна реалізація»; one package at a time in the other two
//                     (the foundation, the frame, the roof — the packages the model's own summary names — taking turns);
//   thin graphite   — the works of the other participants;
//   a dashed frame  — who the object belongs to: copper and moving when RUBIKON coordinates it, graphite when it is
//                     the customer's, and a second, outer frame when the object sits inside a general contractor's project.
// Under the drawing the two facts that tell the formats apart — the other party of the contract and who coordinates
// the object — in the Delivery Model's words, and the three packages as tags that light with the drawing.
//
// Each format is a button (title + the model's summary); pointing at, focusing or pressing one selects it. The first
// time the block comes into view it walks through the three formats once and returns to the first; any pointing ends
// the walk. Nothing moves with reduced motion or out of sight. The drawing is decorative (aria-hidden): the buttons
// and the two facts carry every word.

export type FormatTerms = { contractWith: string; coordinator: string; rubikonCoordinates: boolean };

type Layer = 'foundation' | 'frame' | 'envelope' | 'roof';
/** The building's parts, in build order: what a package may be, and its path in the 460 × 300 sheet */
const LAYERS: readonly (readonly [Layer, string])[] = [
  ['foundation', 'M136 222h16v14h10v12h-36v-12h10zM308 222h16v14h10v12h-36v-12h10z'], // a pedestal on a pad under each column
  ['frame', 'M144 222V130L230 92L316 130V222'], // two columns, two rafters
  ['envelope', 'M135 218V125M325 218V125'], // the walls, at the columns' outer face
  ['roof', 'M126 126L230 80L334 126'], // the covering, parallel to the rafters
];
/** The packages that take turns as «one package»: the model's summary names the foundation, the frame, the roof */
const PACKAGES: readonly (readonly [Layer, string])[] = [['foundation', 'Фундамент'], ['frame', 'Каркас'], ['roof', 'Покрівля']];
const STEP_MS = 1150;
const TOUR_MS = 3600;

export function FormatsScope({ formats, terms }: Readonly<{ formats: readonly FormatCard[]; terms: Readonly<Record<DeliveryFormatId, FormatTerms>> }>) {
  const [active, setActive] = useState<DeliveryFormatId>(formats[0].id);
  const [turn, setTurn] = useState(0);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const current = formats.find((format) => format.id === active) ?? formats[0];
  const whole = active === 'comprehensive';

  const select = (id: DeliveryFormatId) => {
    setTurn(0);
    setActive(id);
  };
  const choose = (id: DeliveryFormatId) => {
    touched.current = true;
    if (id !== active) select(id);
  };

  // On screen or not; and, the first time half of it is, one walk through the formats
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timers: number[] = [];
    let walked = still;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(Boolean(entry?.isIntersecting));
      if (walked || !entry?.isIntersecting || entry.intersectionRatio < 0.5) return;
      walked = true;
      const order = [...formats.slice(1), formats[0]];
      timers = order.map((format, index) => window.setTimeout(() => { if (!touched.current) select(format.id); }, 1600 + index * TOUR_MS));
    }, { threshold: [0, 0.5] });
    observer.observe(root);
    return () => { observer.disconnect(); timers.forEach((timer) => window.clearTimeout(timer)); };
  }, [formats]);

  // «One package»: the packages take turns while such a format is shown and the block is on screen
  useEffect(() => {
    if (whole || !inView || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setTurn((value) => (value + 1) % PACKAGES.length), STEP_MS);
    return () => window.clearInterval(timer);
  }, [whole, inView]);

  const scoped = (layer: Layer) => whole || PACKAGES[turn][0] === layer;
  const term = terms[active];

  return (
    <div className="dfmt-grid" data-motion ref={rootRef}>
      <ol className="dfmt-list">
        {formats.map((format) => (
          <li key={format.id}>
            <button
              type="button"
              className="dfmt-option"
              aria-pressed={format.id === active}
              onClick={() => choose(format.id)}
              onFocus={() => choose(format.id)}
              onMouseEnter={() => choose(format.id)}
            >
              <span className="dfmt-num">{format.number}</span>
              <b className="dfmt-title">{format.title}</b>
              <span className="dfmt-text">{format.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <figure className="dfmt-figure" data-live={inView || undefined}>
        <svg className="fs" viewBox="0 0 460 284" data-format={active} aria-hidden="true" focusable="false">
          {/* whose object it is: the outer frame only for a general contractor's project */}
          <rect className="fs-frame fs-outer" x="34" y="30" width="392" height="246" />
          <rect className="fs-frame fs-inner" x="88" y="66" width="284" height="196" />
          <text className="fs-label fs-label-outer" x="34" y="21">Проєкт генпідрядника</text>
          <text className="fs-label fs-label-scope" x="88" y="57">Обсяг RUBIKON</text>
          <text className="fs-label fs-label-client" x="88" y="57">Об’єкт замовника</text>
          <text className="fs-label fs-label-part" x="88" y="57">Об’єкт у складі проєкту</text>
          {/* the ground outside, the floor inside, the axis */}
          <path className="fs-ground" d="M98 222H136M324 222H362M152 222H308" />
          <path className="fs-axis" d="M230 74V256" />
          {LAYERS.map(([layer, d], index) => (
            <path className="fs-layer" data-layer={layer} data-scope={scoped(layer) ? '' : undefined} style={{ '--i': index } as CSSProperties} d={d} key={layer} />
          ))}
        </svg>
        <figcaption className="dfmt-caption">
          <span>Схема</span>
          <b>Переріз</b>
          <span><i>{current.number}</i> {current.title}</span>
        </figcaption>
        {/* The words under the drawing repeat what the pressed button and the drawing say; they change with the format,
            so they are kept out of the accessibility tree's way: the buttons carry the state (aria-pressed) */}
        <div className="dfmt-facts" aria-hidden="true">
          <ul className="dfmt-packages">
            {PACKAGES.map(([layer, name]) => <li key={layer} data-scope={scoped(layer) ? '' : undefined}>{name}</li>)}
            <li className="dfmt-packages-note">{whole ? 'увесь погоджений комплекс' : 'або інший погоджений обсяг'}</li>
          </ul>
          <dl className="dfmt-terms">
            <div>
              <dt>Договір</dt>
              <dd>{term.contractWith} — <b>RUBIKON</b></dd>
            </div>
            <div>
              <dt>Координує об’єкт</dt>
              <dd>{term.rubikonCoordinates ? <b>{term.coordinator}</b> : term.coordinator}</dd>
            </div>
          </dl>
        </div>
      </figure>
    </div>
  );
}
