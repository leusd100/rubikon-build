'use client';

import { useState, type CSSProperties } from 'react';
import { DrawingSheet } from '../DrawingSheet';

// /napryamky — the five directions as a catalogue. Each row stays the link to its page (the route list's markup, so the
// shared tests keep holding); from 1051 px a sticky preview beside the rows shows the direction pointed at or focused:
// its illustration, its own accent line and the kinds of work its page lists, with the way in. On narrower screens the
// preview is gone and every row carries a small illustration beside its name instead (and its kinds, from 761 px).
// Copy comes from the directions' own data. The images are generated concept illustrations made for this list (not the
// hero's slides). The preview is the site's «Креслення» sheet (DrawingSheet): its title block names the direction and
// says «Ілюстрація», and each new picture is plotted in over the last; the section's intro says it in words for the
// small row images.

export type CatalogItem = {
  id: string;
  number: string;
  href: string;
  title: string;
  routeText: string;
  accent: string;
  kindsLabel: string;
  kinds: readonly string[];
  image: { src: string; srcSet: string; focal: string; width: number; height: number };
};

function Illustration({ item, sizes }: Readonly<{ item: CatalogItem; sizes: string }>) {
  return (
    <picture>
      <source type="image/webp" srcSet={item.image.srcSet} sizes={sizes} />
      <img src={item.image.src} alt="" width={item.image.width} height={item.image.height} loading="lazy" decoding="async" style={{ objectPosition: item.image.focal } as CSSProperties} />
    </picture>
  );
}

export function DirectionsCatalog({ items }: Readonly<{ items: readonly CatalogItem[] }>) {
  const [active, setActive] = useState(0);
  const current = items[active];
  const count = String(items.length).padStart(2, '0');

  return (
    <div className="dcat">
      <div className="route-service-list dcat-list">
        {items.map((item, index) => (
          <a
            className="route-service"
            href={item.href}
            id={item.id}
            key={item.id}
            data-active={index === active || undefined}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
          >
            {/* Narrow screens only: the row's own illustration beside its name */}
            <span className="dcat-thumb" aria-hidden="true">
              <Illustration item={item} sizes="(max-width: 760px) 92px, (max-width: 1050px) 184px, 1px" />
            </span>
            <span>{item.number}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.routeText}</p>
              {/* The kinds repeat the direction page's own list; hidden from the link's name so it stays short */}
              <ul className="dcat-kinds dcat-kinds-row" aria-hidden="true">
                {item.kinds.map((kind) => <li key={kind}>{kind}</li>)}
              </ul>
            </div>
            <b aria-hidden="true">↗</b>
          </a>
        ))}
      </div>
      {/* Decorative echo of the row in focus: the rows themselves carry every word and link */}
      <aside className="dcat-preview" aria-hidden="true">
        <DrawingSheet
          className="dcat-sheet"
          replayKey={current.id}
          cells={[
            { tone: 'number', label: '№', value: <>{current.number}<span> / {count}</span></> },
            { tone: 'main', label: 'Напрям', value: current.title },
            { label: 'Зображення', value: 'Ілюстрація' },
          ]}
        >
          {items.map((item, index) => (
            <span className="dcat-frame" data-active={index === active || undefined} key={item.id}>
              <Illustration item={item} sizes="(max-width: 1050px) 1px, 40vw" />
            </span>
          ))}
        </DrawingSheet>
        <div className="dcat-copy" key={current.id}>
          <p className="dcat-title">{current.title}</p>
          <p className="dcat-accent">{current.accent}</p>
          <p className="dcat-kinds-label">{current.kindsLabel}</p>
          <ul className="dcat-kinds">
            {current.kinds.map((kind) => <li key={kind}>{kind}</li>)}
          </ul>
        </div>
      </aside>
    </div>
  );
}
