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
  // Unfolded first, whatever the field holds: the link lands on it, and a folded field is a box of no size (review 08.11)
  const details = field.closest('details');
  if (details) details.open = true;
  const current = field.value.trim();
  if (current && current !== field.dataset.prefilled) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(field, text);
  field.dataset.prefilled = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  // The field's pulse, again for every place carried (region.css): off, a layout, on
  delete field.dataset.carried;
  void field.offsetWidth;
  field.dataset.carried = '';
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

  // A preview moves only the map: the words beside it (and what a screen reader hears) follow choices, not the mouse.
  // The same place again (a town the pointer is still near) keeps its object, so the map is not redrawn for nothing.
  const onHover = useCallback((point: Point | null) => setPreviewed((before) => {
    const next = point ? reachAt(point) : null;
    return before && next && before.x === next.x && before.y === next.y ? before : next;
  }), []);
  const onPick = useCallback((point: Point) => {
    setPreviewed(null);
    setChosen(reachAt(point));
  }, []);

  const said = chosen ?? example;
  const isExample = !chosen;
  const sorted = useMemo(() => [...placedTowns].sort((a, b) => a.name.localeCompare(b.name, 'uk')), []);
  // The button carries only a choice, and only one inside the oblast — a hover after the click does not take it away
  const carry = chosen?.inside ? chosen : null;

  return (
    <div className="region-layout">
      <div className="region-copy">
        {copy}
        <div className="region-reach" data-ready={ready || undefined}>
          <p className="region-reach-ask">Де ваш об’єкт?</p>
          <div className="region-reach-said" aria-live="polite">
            <p className="region-reach-answer">{answerOf(said, isExample)}</p>
            <p className="region-reach-note">{noteOf(said, isExample)}</p>
          </div>
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
        <RegionMap label={label} shown={previewed ?? said} glide={!previewed} onHover={onHover} onPick={onPick} />
        <figcaption>{attribution}</figcaption>
      </figure>
    </div>
  );
}
