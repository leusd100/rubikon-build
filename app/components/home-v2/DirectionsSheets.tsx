import type { CSSProperties } from 'react';
import { directions } from '../../data/directions';
import { CatalogDrawing } from '../directions/CatalogDrawing';
// The row's whole stylesheet. One importer only (see CatalogDrawing.tsx).
import './directions-sheets.css';

// HOME «П’ять напрямів» — five small drawing sheets in the header's free right, one per direction (owner, 05.10: the
// key plan that stood here «більше підходить для іншої сторінки» — it now heads the /napryamky catalogue — and the
// five sheets of that catalogue are what belongs over the five cards). Each sheet is the direction's own scheme
// (CatalogDrawing: a frame in section, a silo's base, an I-section with its bolted plate, a footing, a roof slope)
// over a one-line title block, «Аркуш NN · Схема». The sheets stand in the cards' order; pointing at a card, or
// reaching it with the keyboard, lifts its sheet and frames it in copper (directions-sheets.css, CSS only).
//
// Not drawings of any real object: schemes without sizes, and every strip says so.
// A server component. The row comes in once on first view (HOME's one ProcessMotion). SectionHeader renders it inside
// its aria-hidden aside: the cards say everything in words and carry the links.

export function DirectionsSheets() {
  return (
    <div className="dsh" data-motion>
      {directions.map((direction, index) => (
        <span className="dsh-sheet" data-n={index + 1} key={direction.id} style={{ '--i': index } as CSSProperties}>
          <CatalogDrawing id={direction.id} />
          <span className="dsh-strip">
            <span><i>Аркуш </i>{direction.number}</span>
            <span>Схема</span>
          </span>
        </span>
      ))}
    </div>
  );
}
