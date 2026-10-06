'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FormatPrefillLink } from '../process/FormatPrefillLink';
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
//
// On /yak-pratsyuiemo the block stands in place of the three scope cards (owner, 05.10: «перегружений, втрачається
// фокус уваги»). There `mirror` names the responsibility map's radio group: a format chosen here checks it there and
// one chosen there is shown here, so the page keeps one choice of format; and `prefill` adds «Обговорити цей
// формат», which carries the shown format into the form. With a mirror only a press chooses: pointing at a button or
// tabbing past it would otherwise rewrite the map below on the way to it. The walk is not a choice and is not mirrored.

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
const TOUR_MS = 3600;

export function FormatsScope({ formats, terms, mirror, prefill = false }: Readonly<{
  formats: readonly FormatCard[];
  terms: Readonly<Record<DeliveryFormatId, FormatTerms>>;
  /** The name of another radio group on the page that holds the same choice (/yak-pratsyuiemo: resp-format) */
  mirror?: string;
  /** Add the link that carries the shown format into the inquiry form */
  prefill?: boolean;
}>) {
  const [active, setActive] = useState<DeliveryFormatId>(formats[0].id);
  const [turn, setTurn] = useState(0);
  const [inView, setInView] = useState(false);
  const figureRef = useRef<HTMLElement>(null);
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
    if (!mirror) return;
    const twin = document.querySelector<HTMLInputElement>(`input[name="${mirror}"][value="${id}"]`);
    if (twin && !twin.checked) {
      twin.checked = true;
      twin.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  // …and the other way: a format picked in the mirrored group is the one shown here — from the start, too: a browser
  // may restore the radio's last state on a reload
  useEffect(() => {
    if (!mirror) return undefined;
    // (in the next frame: the restored state is read after the browser has put it back)
    const restore = requestAnimationFrame(() => {
      const restored = document.querySelector<HTMLInputElement>(`input[name="${mirror}"]:checked`)?.value;
      if (!restored || restored === formats[0].id || !formats.some((format) => format.id === restored)) return;
      touched.current = true;
      select(restored as DeliveryFormatId);
    });
    const follow = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.name !== mirror || !input.checked) return;
      if (!formats.some((format) => format.id === input.value)) return;
      touched.current = true;
      select(input.value as DeliveryFormatId);
    };
    document.addEventListener('change', follow);
    return () => { cancelAnimationFrame(restore); document.removeEventListener('change', follow); };
  }, [mirror, formats]);

  // On screen or not; and, the first time half of the drawing is, one walk through the formats. The drawing, not the
  // whole block: stacked on a phone the block is taller than two screens and half of it is never in view.
  useEffect(() => {
    const root = figureRef.current;
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
    <div className="dfmt-grid" data-motion>
      <ol className="dfmt-list">
        {formats.map((format) => (
          <li key={format.id}>
            <button
              type="button"
              className="dfmt-option"
              aria-pressed={format.id === active}
              onClick={() => choose(format.id)}
              onFocus={mirror ? undefined : () => choose(format.id)}
              onMouseEnter={mirror ? undefined : () => choose(format.id)}
            >
              <span className="dfmt-num">{format.number}</span>
              <b className="dfmt-title">{format.title}</b>
              <span className="dfmt-text">{format.text}</span>
              {/* The two facts of every format, for a screen reader and before hydration: under the drawing they are
                  shown for one format at a time, and that copy is out of the accessibility tree */}
              <span className="dfmt-sr"> Договір: {terms[format.id].contractWith} і RUBIKON. Координує об’єкт: {terms[format.id].coordinator}.</span>
            </button>
          </li>
        ))}
      </ol>
      <figure className="dfmt-figure" data-live={inView || undefined} ref={figureRef}>
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
        {/* The words under the drawing repeat what the pressed button says (each button carries its format's two facts
            as hidden text); they change with the format, so this copy is kept out of the accessibility tree */}
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
        {prefill && <FormatPrefillLink label={current.title} />}
      </figure>
    </div>
  );
}
