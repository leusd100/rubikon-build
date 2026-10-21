import type { CSSProperties } from 'react';
import { directions } from '../../data/directions';
import { CatalogDrawing } from '../directions/CatalogDrawing';
import { DirectionsIndex } from './DirectionsIndex';
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

// On a phone (≤ 760 px; owner 21.10: B «Один аркуш + індекс», one action per row) the band is one large scheme sheet over
// an index of the five directions (DirectionsIndex, a client component): a row picks the direction and the sheet shows its
// scheme, number and name; the sheet is the one link to the picked page («Про напрям»). It replaces the image cards there,
// which are not shown (home-v2.css). The five drawings are drawn here, on the server, and handed over in the directions'
// order, so the client chunk carries the picking only. Shown up to 760 px only (directions-sheets.css).
export function DirectionsSheetIndex() {
  return (
    <DirectionsIndex items={directions.map(({ id, number, href, cardTitle }) => ({ id, number, href, name: cardTitle }))}>
      {directions.map((direction) => (
        <span className="dxi-drawing" data-id={direction.id} key={direction.id}><CatalogDrawing id={direction.id} /></span>
      ))}
    </DirectionsIndex>
  );
}
