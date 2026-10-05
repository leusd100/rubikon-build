// The figure's whole stylesheet. One importer only: under vinext a CSS file imported from two modules can end up as an
// empty chunk that 404s.
import './directions-key.css';

// The key plan — one schematic PLAN at the head of the /napryamky catalogue: a framed building on its axes and,
// standing clear of it, the base of a silo. Five position numbers on leaders are the catalogue rows' own 01–05, so
// the drawing is the page's legend — two objects, three works:
//   01 the building (its outline) · 02 the silo's base · 03 the frame's columns · 04 the footings · 05 the roof (ridge
//   and slopes).
// Pointing at a row, or reaching it with the keyboard, lights its part (directions-key.css, CSS only). With the rows'
// own scheme sheets under it this is a drawing set as it is filed: a key plan, then the sheets.
// (Drawn on 05.10 for HOME's «П’ять напрямів» header; the owner moved it: there the five sheets stand now.)
//
// What it is not: a drawing of any real object. No sizes and no scale — «L» and «B» are letters, the corner says
// «Схема · План». End-wall framing is left out on purpose; the gate is an opening between its two jambs, no leaf drawn.
//
// The drawing's grammar (one dictionary for every sheet of this pass): short dash — hidden below (the footings under
// the floor); dash-dot — an axis; long dash with two dots — overhead (the ridge) or someone else's equipment (the
// silo's shell: only its base is ours); thin solid — everything else; copper — the position numbers. The wall line
// runs just off the columns' outer flanges and the footings project past it, as they do on a site.
//
// The plan has no frame and no rule of its own (owner, 05.10: the strip's line under it was one line too many): it
// stands in the header's free space at the header's full height, and its name is two quiet words in its own corner.
//
// A server component. It draws in once on first view (the page's ProcessMotion, see directions-key.css).
// SectionHeader renders it inside its aria-hidden aside: the rows say everything in words.

const FRAMES = [52, 90, 128, 166] as const; // frame axes; their step is the dimension «B», about half the span
const ROWS = [54, 126] as const; // the column rows: axis Б (top) and axis А; between them the span «L»
const RIDGE = 90;
const WALL = { x1: 43.5, y1: 45.5, x2: 174.5, y2: 134.5 } as const; // 8.5 outside the axes: just off the outer flange
const GATE = [76, 104] as const; // the opening in the left end wall, centred on the ridge
const SILO = { cx: 252, cy: 90, base: 33, shell: 26 } as const;

const grid = FRAMES.flatMap((x) => ROWS.map((y) => [x, y] as const));
// A column in plan: flanges along the building, the web in the frame's plane
const columns = grid.map(([x, y]) => `M${x - 5.5} ${y - 6}h11M${x} ${y - 6}v12M${x - 5.5} ${y + 6}h11`).join('');
const footings = grid.map(([x, y]) => `M${x - 10.5} ${y - 10.5}h21v21h-21z`).join('');
const axes = [
  ...FRAMES.map((x) => `M${x} 36V144`),
  ...ROWS.map((y) => `M24.5 ${y}H196`),
  `M${SILO.cx - 41} ${SILO.cy}h82M${SILO.cx} ${SILO.cy - 41}v82`,
].join('');

// A leader: from the part at one angle (8 across for 22 up or down) to a shelf; the number stands on the shelf
const SHELF = 24;
const TOP = 18;
const BOTTOM = 160;
function leader(x: number, y: number, shelfY: number) {
  const kneeX = +(x + Math.abs(shelfY - y) * (8 / 22)).toFixed(1);
  return { x, y, d: `M${x} ${y}L${kneeX} ${shelfY}h${SHELF}`, numberX: kneeX + 3, numberY: shelfY - 5 };
}
const LEADERS = {
  1: leader(71, WALL.y1, TOP), // the long wall, between two frames
  2: leader(268.5, 61.4, TOP), // the silo's base, a point of its ring
  3: leader(128, ROWS[0], TOP), // a column
  4: leader(100.5, 136.5, BOTTOM), // a footing's corner
  5: leader(133.9, RIDGE, BOTTOM), // the ridge; the leader leaves between two footings
} as const;

function Position({ n }: Readonly<{ n: keyof typeof LEADERS }>) {
  const { x, y, d, numberX, numberY } = LEADERS[n];
  return (
    <>
      <path className="dkey-leader" d={d} />
      <circle className="dkey-dot" cx={x} cy={y} r="1.7" />
      <text className="dkey-num" x={numberX} y={numberY}>{`0${n}`}</text>
    </>
  );
}

export function DirectionsKey() {
  return (
    <figure className="dkey" data-motion>
      <svg viewBox="0 0 312 172" preserveAspectRatio="xMaxYMax meet" focusable="false">
        <path className="dkey-axis" d={axes} />
        <g className="dkey-bubbles">
          <circle cx="14" cy={ROWS[0]} r="9.5" />
          <circle cx="14" cy={ROWS[1]} r="9.5" />
          <text x="14" y={ROWS[0] + 3.8}>Б</text>
          <text x="14" y={ROWS[1] + 3.8}>А</text>
        </g>
        <path className="dkey-dim" d={`M188 ${ROWS[0]}V${ROWS[1]}M183 ${ROWS[0]}h10M183 ${ROWS[1]}h10M${FRAMES[0]} 152H${FRAMES[1]}M${FRAMES[0]} 147v10M${FRAMES[1]} 147v10`} />
        <text className="dkey-dim-text" x="197" y={RIDGE + 4}>L</text>
        <text className="dkey-dim-text" x={(FRAMES[0] + FRAMES[1]) / 2} y="168">B</text>

        <g className="dkey-part" data-n="1">
          <rect className="dkey-fill" x={WALL.x1} y={WALL.y1} width={WALL.x2 - WALL.x1} height={WALL.y2 - WALL.y1} />
          <path className="dkey-wall" pathLength={1} d={`M${WALL.x1} ${GATE[0]}V${WALL.y1}H${WALL.x2}V${WALL.y2}H${WALL.x1}V${GATE[1]}M${WALL.x1 - 5} ${GATE[0]}h10M${WALL.x1 - 5} ${GATE[1]}h10`} />
          <Position n={1} />
        </g>
        <g className="dkey-part" data-n="4">
          <path className="dkey-hidden" d={footings} />
          <Position n={4} />
        </g>
        <g className="dkey-part" data-n="5">
          <path className="dkey-over" d={`M${WALL.x1} ${RIDGE}H${WALL.x2}`} />
          <path className="dkey-line" d="M109 83V66M105.6 73L109 66L112.4 73M109 97V114M105.6 107L109 114L112.4 107" />
          <text className="dkey-dim-text" x="117" y="78">i</text>
          <text className="dkey-dim-text" x="117" y="108">i</text>
          <Position n={5} />
        </g>
        <g className="dkey-part" data-n="3">
          <path className="dkey-col" d={columns} />
          <Position n={3} />
        </g>
        <g className="dkey-part" data-n="2">
          <circle className="dkey-base" pathLength={1} cx={SILO.cx} cy={SILO.cy} r={SILO.base} />
          <circle className="dkey-equip" cx={SILO.cx} cy={SILO.cy} r={SILO.shell} />
          <Position n={2} />
        </g>
        {/* The drawing's name, in the free corner under the silo */}
        <text className="dkey-cap" x="312" y="169">Схема · <tspan>План</tspan></text>
      </svg>
    </figure>
  );
}
