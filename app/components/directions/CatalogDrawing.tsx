import type { ReactNode } from 'react';
import type { DirectionId } from '../../data/directions';
import { Concrete, Roofing, Steel } from './DirectionSectionDrawing';
// The drawings' whole stylesheet («.cdw»). One importer only: under vinext a CSS file imported from two modules can end
// up as an empty chunk that 404s.
import './catalog-drawing.css';

// The directions' scheme sheets — the /napryamky catalogue rows (every width since 05.10) and the five sheets in HOME's
// «П’ять напрямів» header: one small line scheme per direction in the «Переріз» language — thin graphite, one copper
// detail, dash-dot axes, letters only on the dimension lines. Schematic and static: no sizes, no scale, nothing that
// could pass for a real project drawing, and each sheet's strip says «Схема».
// 03–05 are the direction pages' own bodies (one source of geometry); 01 and 02 are drawn here.
//
// A server component (both its users are), with no element ids. Every body is drawn in the 360 × 248 reference space
// and shown at half size; the letters are set outside the scaled group so they stay readable on a 120 px sheet (the
// reused bodies' own 14-unit letters are hidden by CSS).

/** 01 — a portal frame in cross-section. The frame is seen in elevation (stroke only), the envelope is a thin line
 *  just outside it, the footings are cut (a pedestal on a pad). Copper: the clear space the frame is built around —
 *  «h» is measured to its top, the height a customer asks for; «L» runs between the column axes. */
function HangarFrame() {
  return (
    <>
      {/* ground outside, floor inside */}
      <path className="dsd-line" d="M16 196 H60 M84 196 H276 M300 196 H344" />
      <path className="dsd-hatch" d="M26 196 l-8 10 M42 196 l-8 10 M326 196 l-8 10 M342 196 l-8 10" />
      {/* footings in section: a pedestal on a pad */}
      <path className="dsd-cut" d="M60 196 H84 V204 H92 V214 H52 V204 H60 Z" />
      <path className="dsd-cut" d="M276 196 H300 V204 H308 V214 H268 V204 H276 Z" />
      {/* envelope: half a column depth outside the frame, landing on the pedestals */}
      <path className="dsd-line" d="M60 196 V88.9 L180 42.6 L300 88.9 V196" />
      {/* the frame with its haunches, in elevation */}
      <path className="cdw-seen" d="M66 196 V92 L180 48 L294 92 V196 H282 V126 L248 85 L180 58.7 L112 85 L78 126 V196 Z" />
      <path className="dsd-axis" d="M72 70 V238 M288 70 V238 M180 26 V214" />
      {/* span between the axes; clear height */}
      <path className="dsd-dim" d="M72 230 H288 M72 224 V236 M288 224 V236 M328 196 V124 M322 196 H334 M322 124 H334" />
      <g className="dsd-accent">
        <path className="dsd-dashed" d="M98 196 V124 H262 V196" />
      </g>
    </>
  );
}

/** 02 — the base under a silo, in section: a plain slab outline, nothing claimed about what is inside it. The silo is
 *  someone else's equipment, so it is drawn in the equipment line type (long dash, two dots). Copper: the two places
 *  where the base has to meet it; «D» is the distance between them. */
function SiloBase() {
  return (
    <>
      <path className="dsd-line" d="M16 186 H84 M276 186 H344" />
      <path className="dsd-hatch" d="M28 186 l-8 10 M46 186 l-8 10 M64 186 l-8 10 M300 186 l-8 10 M318 186 l-8 10 M336 186 l-8 10" />
      {/* each half runs from its foot to the ridge, so the dash pattern is the same on both sides; then the eave */}
      <path className="cdw-equip" d="M113 174 V72 L180 40 M247 174 V72 L180 40 M113 72 H247" />
      <path className="dsd-cut" d="M84 174 H276 V194 H84 Z" />
      <path className="dsd-axis" d="M180 22 V238" />
      <path className="dsd-dim" d="M113 228 H247 M113 222 V234 M247 222 V234" />
      <g className="dsd-accent">
        <path d="M101 174 H125 M113 174 V158 M235 174 H259 M247 174 V158" />
      </g>
    </>
  );
}

/** Body and letters per direction. Letters are in the sheet's own 180 × 126 space. */
const SCHEMES: Record<DirectionId, { body: () => ReactNode; letters: ReactNode }> = {
  angary: {
    body: HangarFrame,
    letters: (
      <>
        <text className="cdw-letter" x="95" y="125">L</text>
        <text className="cdw-letter" x="170" y="82">h</text>
      </>
    ),
  },
  zernoskhovyshcha: {
    body: SiloBase,
    letters: <text className="cdw-letter" x="95" y="125">D</text>,
  },
  metalokonstruktsii: {
    body: Steel,
    letters: (
      <>
        <text className="cdw-letter" x="7" y="64">h</text>
        <text className="cdw-letter" x="62" y="124">b</text>
      </>
    ),
  },
  'betonni-roboty': {
    body: Concrete,
    letters: <text className="cdw-letter cdw-letter-accent" x="168" y="103">a</text>,
  },
  'pokrivelni-roboty': {
    body: Roofing,
    // along the slope, like the arrow it names
    letters: <g transform="translate(20 80) rotate(-17)"><text className="cdw-letter" x="65" y="48">i</text></g>,
  },
};

export function CatalogDrawing({ id }: Readonly<{ id: DirectionId }>) {
  const { body: Body, letters } = SCHEMES[id];
  return (
    <svg className="cdw" viewBox="0 0 180 126" focusable="false" aria-hidden="true">
      <g transform="scale(.5)"><Body /></g>
      {letters}
    </svg>
  );
}
