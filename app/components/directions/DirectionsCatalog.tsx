'use client';

import { useState, useSyncExternalStore, type CSSProperties } from 'react';

// /napryamky — the five directions as a catalogue. Each row stays the link to its page (the route list's markup, so the
// shared tests keep holding); from 1051 px a sticky preview beside the rows shows the direction pointed at or focused:
// its illustration, its own accent line and the kinds of work its page lists, with the way in. On narrower screens the
// preview is gone and every row carries a small illustration beside its name instead (and its kinds, from 761 px).
// Copy comes from the directions' own data. The images are generated concept illustrations made for this list (not the
// hero's slides): the preview carries «Ілюстрація», and the section's intro says so in words for the small row images.

// TEMPORARY — frame lab (design/napryamky-v2 only, remove once a frame is chosen): `?frame=a|b|c|d` puts one of four
// photo-frame treatments on the preview (and its narrow-screen echo on the row pictures) and shows a small switcher.
// a «Видошукач» — copper corner marks and a caption bar (the /pro-nas practice and HOME scheme language);
// b «Креслення» — a drawing sheet: paper margin, ruler ticks, a title block; c «Мідний кант» — the HOME cards' rounded
// corner with a copper edge drawn along the bottom and up the side; d «Стос» — the next directions stacked behind.
const FRAMES = ['base', 'a', 'b', 'c', 'd'] as const;
type Frame = (typeof FRAMES)[number];
const FRAME_NAMES: Record<Frame, string> = { base: 'Зараз', a: 'A · Видошукач', b: 'B · Креслення', c: 'C · Мідний кант', d: 'D · Стос' };
const noSubscribe = () => () => {};
const frameFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get('frame');
  return (FRAMES as readonly string[]).includes(value ?? '') ? (value as Frame) : null;
};

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
  const urlFrame = useSyncExternalStore(noSubscribe, frameFromUrl, () => null);
  const [pickedFrame, setPickedFrame] = useState<Frame | null>(null);
  const frame = pickedFrame ?? urlFrame;
  const pickFrame = (value: Frame) => {
    setPickedFrame(value);
    window.history.replaceState(null, '', `?frame=${value}${window.location.hash}`);
  };
  const count = String(items.length).padStart(2, '0');

  return (
    <div className="dcat" data-frame={frame && frame !== 'base' ? frame : undefined}>
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
        <div className="dcat-media">
          {items.map((item, index) => (
            <span
              className="dcat-frame"
              data-active={index === active || undefined}
              data-pos={(index - active + items.length) % items.length}
              key={item.id}
            >
              <Illustration item={item} sizes="(max-width: 1050px) 1px, 40vw" />
            </span>
          ))}
          {/* Frame-lab decorations, keyed by the direction so their small entrance replays on every change */}
          <span className="dcat-deco" key={`deco-${current.id}`}>
            <i className="dcat-corner dcat-corner-tl" />
            <i className="dcat-corner dcat-corner-tr" />
            <i className="dcat-corner dcat-corner-bl" />
            <i className="dcat-corner dcat-corner-br" />
            <i className="dcat-edge dcat-edge-b" />
            <i className="dcat-edge dcat-edge-r" />
            <i className="dcat-ruler dcat-ruler-x" />
            <i className="dcat-ruler dcat-ruler-y" />
          </span>
          <i className="dcat-tag">Ілюстрація</i>
          <span className="dcat-count"><b>{current.number}</b> / {count}</span>
          <span className="dcat-stamp" key={`stamp-${current.id}`}>
            <span className="dcat-stamp-num"><small>№</small><b>{current.number}</b> / {count}</span>
            <span className="dcat-stamp-title"><small>Напрям</small><b>{current.title}</b></span>
            <span className="dcat-stamp-kind"><small>Зображення</small><b>Ілюстрація</b></span>
          </span>
        </div>
        <div className="dcat-copy" key={current.id}>
          <p className="dcat-title">{current.title}</p>
          <p className="dcat-accent">{current.accent}</p>
          <p className="dcat-kinds-label">{current.kindsLabel}</p>
          <ul className="dcat-kinds">
            {current.kinds.map((kind) => <li key={kind}>{kind}</li>)}
          </ul>
        </div>
      </aside>
      {frame && (
        <div className="frame-lab" role="group" aria-label="Тест рамки фото (тимчасово)">
          <span>Рамка</span>
          {FRAMES.map((value) => (
            <button type="button" key={value} aria-pressed={frame === value} onClick={() => pickFrame(value)}>{FRAME_NAMES[value]}</button>
          ))}
        </div>
      )}
    </div>
  );
}
