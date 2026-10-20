import type { CSSProperties } from 'react';
import { directions } from '../../data/directions';
import { CatalogDrawing } from '../directions/CatalogDrawing';
// The row's whole stylesheet. One importer only (see CatalogDrawing.tsx).
import './directions-sheets.css';

// HOME «П’ять напрямів» — five small drawing sheets in the header's free right, one per direction (owner, 05.10: the
// key plan that stood here «більше підходить для іншої сторінки» — it now heads the /napryamky catalogue — and the
// five sheets of that catalogue are what belongs over the five cards). Each sheet is the direction's own scheme
// (CatalogDrawing: a frame in section, a silo's base, an I-section with its bolted plate, a footing, a roof slope)
// on an upright sheet with its title block: the direction's name, then «Аркуш NN · Схема».
// The row is set to the header's own lines (owner, 05.10: «вирівняємо їх по висоті»): the sheets' top is the top of
// the title's capitals, their bottom the bottom of the note, so they come out upright, close to a real sheet's
// proportion. The sheets stand in the cards' order; pointing at a card, or reaching it with the keyboard, lifts its
// sheet and frames it in copper, and pointing at a sheet marks its card (directions-sheets.css, CSS only).
//
// Not drawings of any real object: schemes without sizes, and every title block says so.
// A server component. The row comes in once on first view (HOME's one ProcessMotion). SectionHeader renders it inside
// its aria-hidden aside — the cards say everything in words and carry the links for the keyboard and for assistive
// technology; a sheet is a mouse's shortcut to the same page, so it is out of the tab order.

export function DirectionsSheets() {
  return (
    <div className="dsh" data-motion>
      {directions.map((direction, index) => (
        <a className="dsh-sheet" href={direction.href} tabIndex={-1} key={direction.id} style={{ '--i': index } as CSSProperties}>
          <span className="dsh-draw"><CatalogDrawing id={direction.id} /></span>
          <span className="dsh-block">
            <b className="dsh-name">{direction.cardTitle}</b>
            <span className="dsh-strip">
              <span><i>Аркуш </i>{direction.number}</span>
              <span>Схема</span>
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}

// On a phone (≤ 760 px; PDO-42 a, owner 20.10: «мініаркуші-креслення на ≤760 px») the same five sheets are the band
// itself: a list of five link rows in place of the sideways rail of image cards, so every direction is in reach without a
// swipe. A row is the direction's scheme in a small framed sheet, its name, the sheet's strip «Аркуш NN · Схема» and a
// copper arrow; it links where its card does. Unlike the header row above it is in the tab order and the accessibility
// tree — the cards are not shown there — and its accessible name is the direction's name alone (the scheme, the strip
// and the arrow are decoration). Shown up to 760 px only (directions-sheets.css); the drawings stand as drawn, no
// plot-in. A server component. role="list" keeps the list a list for VoiceOver, which drops it under list-style: none.
export function DirectionsSheetList() {
  return (
    <ul className="dsl" role="list">
      {directions.map((direction) => (
        <li key={direction.id}>
          <a className="dsl-row" href={direction.href}>
            <span className="dsl-draw" aria-hidden="true"><CatalogDrawing id={direction.id} /></span>
            <span className="dsl-block">
              <span className="dsl-name">{direction.cardTitle}</span>
              <span className="dsl-strip" aria-hidden="true">
                <span>Аркуш {direction.number}</span>
                <span>Схема</span>
              </span>
            </span>
            <span className="dsl-arrow" aria-hidden="true">↗</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
