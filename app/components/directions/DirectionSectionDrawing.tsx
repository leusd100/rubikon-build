import type { DirectionPageConfig } from '../../types/directionPage';

// «Переріз»: a direction page's own drawing fragment under «Що виконуємо», in the place the ghost word (STEEL /
// CONCRETE / ROOF) used to fill. Thin graphite lines with the one detail that matters in copper — the bolted plate of a
// steel joint, the cover and anchors of a footing, the flashing and gutter of a roof edge. Decorative and schematic:
// no sizes, no scale, nothing that could pass for a real project drawing (letters only on the dimension lines).
//
// The three bodies (Steel, Concrete, Roofing) are exported: the /napryamky catalogue draws the same geometry small in
// its phone and tablet rows (CatalogDrawing.tsx). That makes this file part of a client bundle too (DirectionsCatalog
// is a client component), so it must stay free of CSS imports (a stylesheet shared by two entry points becomes an
// empty chunk that 404s under vinext) and of element ids (five sheets share one page).

type DrawingId = Extract<DirectionPageConfig['id'], 'metalokonstruktsii' | 'betonni-roboty' | 'pokrivelni-roboty'>;

const SHEETS: Record<DrawingId, { title: string; detail: string }> = {
  metalokonstruktsii: { title: 'Переріз 1–1', detail: 'Двотавр і болтовий вузол' },
  'betonni-roboty': { title: 'Переріз 2–2', detail: 'Фундамент під колону' },
  'pokrivelni-roboty': { title: 'Переріз 3–3', detail: 'Карниз і примикання' },
};

export function hasSectionDrawing(id: DirectionPageConfig['id']): id is DrawingId {
  return id in SHEETS;
}

export function Steel() {
  return (
    <>
      {/* I-beam section */}
      <path pathLength={1} className="dsd-cut" d="M70 44 H190 V58 H137 V182 H190 V196 H70 V182 H123 V58 H70 Z" />
      <path className="dsd-axis" d="M130 24 V216 M50 120 H210" />
      {/* dimension lines: h and b, letters only */}
      <path pathLength={1} className="dsd-dim" d="M40 44 V196 M34 44 H46 M34 196 H46 M70 222 H190 M70 216 V228 M190 216 V228" />
      <text className="dsd-dim-text" x="28" y="124">h</text>
      <text className="dsd-dim-text" x="126" y="238">b</text>
      {/* the joint: an end plate with four bolts */}
      <path pathLength={1} className="dsd-line" d="M246 54 H316 V186 H246 Z" />
      <path className="dsd-axis" d="M281 40 V200 M232 90 H330 M232 150 H330" />
      <g className="dsd-accent">
        <circle pathLength={1} cx="263" cy="90" r="7" />
        <circle pathLength={1} cx="299" cy="90" r="7" />
        <circle pathLength={1} cx="263" cy="150" r="7" />
        <circle pathLength={1} cx="299" cy="150" r="7" />
      </g>
    </>
  );
}

export function Concrete() {
  const bars = Array.from({ length: 12 }, (_, index) => 66 + index * 21);
  return (
    <>
      {/* ground */}
      <path pathLength={1} className="dsd-line" d="M20 104 H130 M230 104 H340" />
      <path pathLength={1} className="dsd-hatch" d="M28 104 l-8 10 M48 104 l-8 10 M68 104 l-8 10 M88 104 l-8 10 M108 104 l-8 10 M244 104 l-8 10 M264 104 l-8 10 M284 104 l-8 10 M304 104 l-8 10 M324 104 l-8 10" />
      {/* pedestal and footing */}
      <path pathLength={1} className="dsd-cut" d="M150 62 H210 V150 H300 V204 H60 V150 H150 Z" />
      {/* reinforcement: bottom bars, pedestal verticals */}
      <g className="dsd-bars">{bars.map((x) => <circle key={x} cx={x} cy="192" r="2.6" />)}</g>
      <path pathLength={1} className="dsd-line" d="M160 70 V190 H166 M200 70 V190 H194" />
      {/* the copper detail: anchors above the pedestal and the cover under the bars */}
      <g className="dsd-accent">
        <path pathLength={1} d="M168 62 V30 M192 62 V30" />
        <path pathLength={1} d="M162 40 H174 M186 40 H198" />
        <path pathLength={1} d="M322 192 V204 M316 192 H328 M316 204 H328" />
      </g>
      <text className="dsd-dim-text dsd-accent-text" x="334" y="202">a</text>
      <path className="dsd-axis" d="M180 20 V222" />
    </>
  );
}

export function Roofing() {
  // The build-up is drawn flat along the slope and turned to it (17°): sheet, insulation, deck, purlins.
  const ribs = 'h14 l4 -8 h12 l4 8 '.repeat(8);
  const insulation = 'q4 -10 8 0 t8 0 '.repeat(17);
  const masonry = Array.from({ length: 11 }, (_, index) => 54 + index * 15);
  return (
    <>
      <g transform="translate(40 160) rotate(-17)">
        <path pathLength={1} className="dsd-line" d={`M0 0 ${ribs}`} />
        <path pathLength={1} className="dsd-line" d="M0 4 H272 M0 24 H272" />
        <path pathLength={1} className="dsd-insulation" d={`M0 14 ${insulation}`} />
        <path pathLength={1} className="dsd-cut" d="M0 24 H272 V29 H0 Z" />
        <path pathLength={1} className="dsd-cut" d="M44 29 h14 v20 h-14 Z M140 29 h14 v20 h-14 Z M236 29 h14 v20 h-14 Z" />
        {/* slope: the arrow points the way water runs */}
        <path pathLength={1} className="dsd-dim" d="M176 72 H96 M96 72 l9 -4 M96 72 l9 4" />
        <text className="dsd-dim-text" x="132" y="90">i</text>
      </g>
      {/* the wall it meets, in section */}
      <path pathLength={1} className="dsd-cut" d="M300 30 H330 V214 H300 Z" />
      <path pathLength={1} className="dsd-hatch" d={masonry.map((y) => `M300 ${y} L330 ${y - 22}`).join(' ')} />
      {/* copper: the flashing over the junction (into the wall, down its face, out over the sheet) and the gutter */}
      <g className="dsd-accent">
        <path pathLength={1} d="M308 34 L300 40 V66 L262 77.6 V82" />
        <path pathLength={1} d="M16 166 a14 14 0 0 0 28 0" />
        <path pathLength={1} d="M30 180 V218" />
      </g>
    </>
  );
}

export function DirectionSectionDrawing({ id, number }: Readonly<{ id: DrawingId; number: string }>) {
  const sheet = SHEETS[id];
  return (
    <figure className="dsd" aria-hidden="true" data-motion>
      <svg viewBox="0 0 360 248" focusable="false">
        {id === 'metalokonstruktsii' && <Steel />}
        {id === 'betonni-roboty' && <Concrete />}
        {id === 'pokrivelni-roboty' && <Roofing />}
      </svg>
      <figcaption>
        <span>Аркуш {number}</span>
        <b>{sheet.title}</b>
        <span>{sheet.detail}</span>
      </figcaption>
    </figure>
  );
}
