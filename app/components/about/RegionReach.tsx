'use client';

import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { placedTowns, reachAt, reachOfTown, reachAnswer, isDnipro, locationLine, type Point, type Reach } from '../../lib/regionReach';
import { Arrow } from '../Arrow';
import { RegionMap } from './RegionMap';

// «Де ваш об’єкт?» (owner, 08.11): the region block's two columns, with what the visitor chooses on the map said under
// the block's own words, and «Вказати в заявці», which carries the place into the form's «Місто або область». Until the
// visitor chooses, the block shows one example (Павлоград) and says it is one. The town list does what a tap does, for a
// keyboard and for a thumb that cannot aim at a town on a phone. Without JavaScript the card keeps its place but its
// controls stay hidden (data-ready), so nothing that cannot work is offered.

const EXAMPLE = 'Павлоград';
/** Hydrated or not, without a render in an effect (as ProjectInquiryForm's jsReady) */
const subscribeToHydration = () => () => undefined;

/**
 * Writes the place into «Місто або область» and unfolds «Додати параметри об’єкта» around it — if the field is empty or
 * still holds what this wrote before; the visitor's own words are never replaced (as PrefillInquiryLink does for
 * «Коротко про завдання»). The link's own #inquiry-location then lands on the field; data-open-inquiry opens the folded
 * form on a phone first (ConversationFormToggle).
 */
function fillLocation(text: string) {
  const field = document.getElementById('inquiry-location');
  if (!(field instanceof HTMLInputElement)) return;
  const current = field.value.trim();
  if (current && current !== field.dataset.prefilled) return;
  const details = field.closest('details');
  if (details) details.open = true;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(field, text);
  field.dataset.prefilled = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

function answerOf(reach: Reach, example: boolean) {
  return example ? `Наприклад, ${reachAnswer(reach)}` : reachAnswer(reach);
}

function noteOf(reach: Reach, example: boolean) {
  if (example) return 'від Дніпра по прямій. Торкніться карти там, де ваш об’єкт, або оберіть місто.';
  if (!reach.inside) return 'Проєкти в інших регіонах розглядаємо окремо.';
  if (isDnipro(reach)) return 'Тут ми базуємося.';
  return 'від Дніпра по прямій; дорогою буде більше.';
}

export function RegionReach({ copy, label, attribution }: Readonly<{ copy: ReactNode; label: string; attribution: string }>) {
  const example = useMemo(() => reachOfTown(EXAMPLE)!, []);
  const [chosen, setChosen] = useState<Reach | null>(null);
  const [previewed, setPreviewed] = useState<Reach | null>(null);
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  const onHover = useCallback((point: Point | null) => setPreviewed(point ? reachAt(point) : null), []);
  const onPick = useCallback((point: Point) => {
    setPreviewed(null);
    setChosen(reachAt(point));
  }, []);

  const shown = previewed ?? chosen ?? example;
  const isExample = !previewed && !chosen;
  const sorted = useMemo(() => [...placedTowns].sort((a, b) => a.name.localeCompare(b.name, 'uk')), []);
  // The button carries only a choice, and only one inside the oblast
  const carry = !previewed && chosen?.inside ? chosen : null;

  return (
    <div className="region-layout">
      <div className="region-copy">
        {copy}
        <div className="region-reach" data-ready={ready || undefined}>
          <p className="region-reach-ask">Де ваш об’єкт?</p>
          <p className="region-reach-answer" aria-live="polite">{answerOf(shown, isExample)}</p>
          <p className="region-reach-note">{noteOf(shown, isExample)}</p>
          <div className="region-reach-actions">
            <select
              className="region-reach-pick"
              aria-label="Оберіть місто області"
              value={chosen?.town?.name ?? ''}
              onChange={(event) => {
                const reach = reachOfTown(event.currentTarget.value);
                if (reach) onPick(reach);
              }}
            >
              <option value="" disabled>Або оберіть місто</option>
              {sorted.map((town) => <option key={town.name} value={town.name}>{town.name}</option>)}
            </select>
            {carry && (
              <a className="link-arrow text-link region-reach-carry" href="#inquiry-location" data-open-inquiry="" onClick={() => fillLocation(locationLine(carry))}>
                Вказати в заявці <Arrow to="down" />
              </a>
            )}
          </div>
        </div>
      </div>
      <figure className="region-figure">
        <RegionMap label={label} shown={shown} glide={!previewed} onHover={onHover} onPick={onPick} />
        <figcaption>{attribution}</figcaption>
      </figure>
    </div>
  );
}
