'use client';

import { ArrowRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export type DirectionsIndexItem = Readonly<{ id: string; number: string; href: string; name: string }>;

/**
 * HOME «П’ять напрямів» on a phone (≤ 760 px; owner 21.10, B «Один аркуш + індекс»): one large scheme sheet over an index
 * of the five directions. One action per control: a row only picks the direction — its sheet takes the scheme, number and
 * name, nothing scrolls and nothing moves (every drawing and every name stand in one grid cell, so the sheet is always as
 * tall as its tallest state) — and the sheet is the one link to the picked direction's page, «Про напрям». A row says it
 * is the picked one by its state (aria-pressed), a copper bar beside its number and its copper words, never by colour
 * alone; the change is read out in one polite sentence. The first direction is picked from the first paint, so without
 * JavaScript the sheet still links to it and the five names are still on the page.
 *
 * The drawings come from the server (DirectionsSheetIndex), one per direction in the items' order; this component only
 * marks the picked one (data-active, directions-sheets.css), so none of the scheme geometry is in the client bundle.
 */
export function DirectionsIndex({ items, children }: Readonly<{ items: readonly DirectionsIndexItem[]; children: ReactNode }>) {
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const current = items[active];

  const pick = (index: number) => {
    if (index === active) return;
    setActive(index);
    setAnnouncement(`Показано схему: ${items[index].name}`);
  };

  return (
    <div className="dxi" data-active={current.id}>
      <a className="dxi-sheet" href={current.href} aria-label={`Про напрям: ${current.name}`}>
        <span className="dxi-strip" aria-hidden="true">
          <span>Аркуш {current.number}</span>
          <b>Умовна схема</b>
        </span>
        <span className="dxi-draw" aria-hidden="true">{children}</span>
        <span className="dxi-foot">
          <span className="dxi-names" aria-hidden="true">
            {items.map((item) => (
              <span className={item.id === current.id ? 'dxi-name is-active' : 'dxi-name'} key={item.id}>{item.name}</span>
            ))}
          </span>
          <span className="dxi-more" aria-hidden="true">Про напрям <ArrowRight /></span>
        </span>
      </a>
      <ul className="dxi-list" role="list">
        {items.map((item, index) => (
          <li key={item.id}>
            <button className="dxi-row" type="button" aria-pressed={index === active} onClick={() => pick(index)}>
              <span className="dxi-num" aria-hidden="true">{item.number}</span>
              <span className="dxi-row-name">{item.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </div>
  );
}
