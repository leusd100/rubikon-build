'use client';

import { useState } from 'react';
import { ScopeDiagram } from '../process/ScopeDiagram';
import type { FormatCard } from '../../lib/deliveryModelPresentation';
import type { DeliveryFormatId } from '../../types/deliveryModel';

// /napryamky «Формати участі»: one large drawing of the same hangar instead of three small ones. Each format is a
// button (title + the Delivery Model's own summary); pointing at, focusing or pressing one redraws the drawing for it —
// the layers RUBIKON takes turn copper in build order and the context (customer's object, general contractor's
// project) settles around them. The drawing is /yak-pratsyuiemo's ScopeDiagram; the words are all in the buttons.

export function FormatsScope({ formats }: Readonly<{ formats: readonly FormatCard[] }>) {
  const [active, setActive] = useState<DeliveryFormatId>(formats[0].id);
  const current = formats.find((format) => format.id === active) ?? formats[0];

  return (
    <div className="dfmt-grid" data-motion>
      <ol className="dfmt-list">
        {formats.map((format) => (
          <li key={format.id}>
            <button
              type="button"
              className="dfmt-option"
              aria-pressed={format.id === active}
              onClick={() => setActive(format.id)}
              onFocus={() => setActive(format.id)}
              onMouseEnter={() => setActive(format.id)}
            >
              <span className="dfmt-num">{format.number}</span>
              <b className="dfmt-title">{format.title}</b>
              <span className="dfmt-text">{format.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <figure className="dfmt-figure" aria-hidden="true">
        <div className="dfmt-diagram" key={current.id}>
          <ScopeDiagram format={current.id} />
        </div>
        <figcaption className="dfmt-caption"><b>{current.number}</b> {current.title}</figcaption>
      </figure>
    </div>
  );
}
