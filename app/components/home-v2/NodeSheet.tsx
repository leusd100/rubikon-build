import type { CSSProperties } from 'react';
// The sheet's whole stylesheet. One importer only: under vinext a CSS file imported from two modules can end up as an
// empty chunk that 404s. (The «Як працюємо» link under the sheet is styled there too.)
import './node-sheet.css';

// HOME's explanation sheet «Вузол 1» (owner's review, 04.10) — it replaces the two cards «Вузол у деталях» and «Як
// працює конструкція». One drawing read left to right, the way a drawing set works: a small generic portal frame as a
// KEY (the roof load in graphite, the load's way down the frame as the one copper thread), a callout round a column's
// base, and that base opened in a lens as a node in section — column, stiffeners, base plate, anchors, grout, the
// concrete under it — with the same thread running on into the foundation. The two existing texts stand beside it as
// notes 01 and 02, whole first, detail second.
//
// What it is not: a drawing of any real object. No sizes, no scale, no level marks; the strip says «Схема · без
// розмірів». The generated raster the first card showed is gone from the markup (the files stay until the owner
// decides).
//
// The drawing's grammar (one dictionary for every sheet of this pass): short dash — hidden below (the footings under
// the ground); dash-dot — an axis; thin solid — everything else; copper — only the load's way. Concrete in section is
// a faint cut fill with a row of bar dots, as on the direction pages' «Переріз» (.dsd), never a 45° hatch — the site
// keeps that hatch for masonry. Nodes take digits; letters belong to axes.
//
// A server component, no client code. It draws in once on first view: app/page.tsx mounts the page's one ProcessMotion
// on <main data-home="v2">, which flips the figure's [data-motion] when it comes into view (node-sheet.css). After
// that the load is alive while the sheet is on screen (owner, 05.10: «динамічним, але не тільки при наведенні»): the
// copper thread runs down its way, the roof load presses, the pressure under the plate breathes — the controller
// keeps [data-motion-live] "on" only in view. Without JavaScript or with reduced motion nothing is armed: the complete
// drawing stands still. Pointing at a note, at its half of the drawing or at a part's name lights it — CSS only
// (:has), emphasis only: nothing is hidden without it.

type Point = readonly [number, number];
type Part = 'rib' | 'plate' | 'anchor' | 'base';

const round = (value: number) => +value.toFixed(1);
const pair = ([x, y]: Point) => `${round(x)} ${round(y)}`;
const open = (points: readonly Point[]) => `M${points.map(pair).join('L')}`;
const closed = (points: readonly Point[]) => `${open(points)}Z`;

// ---------- the key: a generic portal frame and the load's way through it ----------
// xl / xr — the columns' outer faces, yg — the ground, ye — the eave, yr — the ridge, t — the section's depth as drawn,
// r — the callout's radius. The other fields scale the small things for the phone's key plan.
type KeyConfig = Readonly<{
  xl: number; xr: number; yg: number; ye: number; yr: number; t: number; r: number;
  /** Which column's base the callout circles; the mark's shelf runs to the other side */
  callout: 'left' | 'right';
  /** The roof load's comb: the line's height above the roof and the arrows' length */
  loadGap: number; loadLen: number;
  /** How far the ground line runs past the columns, and where its hatch ticks stand, counted from its ends */
  ge: number; ticks: readonly number[];
  /** Scales: footings, haunches, arrowheads and ticks */
  fk: number; hk: number; head: number;
  axUp: number; axDown: number;
  /** The mark's shelf: its diagonal run, then its total reach from the circle */
  shelf: Point;
}>;

function keyFrame({ xl, xr, yg, ye, yr, t, r, callout, loadGap, loadLen, ge, ticks, fk, hk, head, axUp, axDown, shelf }: KeyConfig) {
  const xm = (xl + xr) / 2;
  const slope = (ye - yr) / (xm - xl);
  const k = Math.sqrt(1 + slope * slope);
  const innerEave = ye - slope * t + t * k;
  const innerRidge = yr + t * k;
  const roofY = (x: number) => (x <= xm ? ye - (x - xl) * slope : yr + (x - xm) * slope);
  const innerY = (x: number) => (x <= xm ? innerEave - (x - (xl + t)) * slope : innerRidge + (x - xm) * slope);
  const haunchX = 34 * hk;
  const haunchY = 30 * hk;
  const c = t / 2;
  const axes = [xl + c, xr - c];

  // Five arrows under one line — a drawing's way to write a load spread over the roof (the proof sheet above shows the
  // same comb large; here it is a key, so it stays sparse)
  const ARROWS = 5;
  const step = (xr - xl - 36 * head) / (ARROWS - 1);
  const arrowX = Array.from({ length: ARROWS }, (_, index) => xl + 18 * head + index * step);
  const combY = (x: number) => roofY(x) - loadGap - loadLen;
  const tipY = (x: number) => roofY(x) - loadGap * 0.32;

  // The load's way on the section's centre line: ridge → rafter → column → footing, one run per side
  const way = (x: number) => open([[xm, yr + c * k], [x, ye + c * k - slope * c], [x, yg + 3 * head]]);

  const cx = callout === 'left' ? xl + c : xr - c;
  const cy = yg + 2 * head;
  const side = callout === 'left' ? 1 : -1;
  const d = r * Math.SQRT1_2;
  const [run, reach] = shelf;

  return {
    ground: open([[xl - ge, yg], [xr + ge, yg]]),
    groundTicks: [...ticks.map((offset) => xl - ge + offset), ...ticks.map((offset) => xr + ge - offset)]
      .map((x) => open([[x, yg], [x - 6 * head, yg + 8 * head]])).join(''),
    // Footings — a pedestal on a pad — dashed: the ground hides them
    footings: axes.map((x) => open([
      [x - 11 * fk, yg], [x - 11 * fk, yg + 11 * fk], [x - 24 * fk, yg + 11 * fk], [x - 24 * fk, yg + 25 * fk],
      [x + 24 * fk, yg + 25 * fk], [x + 24 * fk, yg + 11 * fk], [x + 11 * fk, yg + 11 * fk], [x + 11 * fk, yg],
    ])).join(''),
    axes: axes.map((x) => open([[x, ye - axUp], [x, yg + axDown]])).join(''),
    load: open(arrowX.map((x) => [x, combY(x)]))
      + arrowX.map((x) => open([[x, combY(x)], [x, tipY(x)]]) + open([[x - 3 * head, tipY(x) - 6 * head], [x, tipY(x)], [x + 3 * head, tipY(x) - 6 * head]])).join(''),
    frame: open([[xl, yg], [xl, ye], [xm, yr], [xr, ye], [xr, yg]]),
    frameInner: open([
      [xl + t, yg], [xl + t, innerEave + haunchY], [xl + t + haunchX, innerY(xl + t + haunchX)], [xm, innerRidge],
      [xr - t - haunchX, innerY(xr - t - haunchX)], [xr - t, innerEave + haunchY], [xr - t, yg],
    ]),
    bases: open([[xl - 5 * head, yg], [xl + t + 5 * head, yg]]) + open([[xr - t - 5 * head, yg], [xr + 5 * head, yg]]),
    way: axes.map(way).join(''),
    wayHeads: axes.map((x) => closed([[x - 4.2 * head, yg + 1], [x + 4.2 * head, yg + 1], [x, yg + 10 * head]])),
    circle: [cx, cy, r] as const,
    markShelf: open([[cx + side * d, cy + d], [cx + side * (d + run), cy + d + run], [cx + side * (d + reach), cy + d + run]]),
    markAt: [cx + side * (d + (run + reach) / 2), cy + d + run - 5] as Point,
  };
}

// ---------- the node: a steel column on its base plate, anchors into the concrete ----------
// Local units: the column's axis is x = 0, the plate's top is y = 0, up is negative; drawn at `scale` round (cx, cy).
const COLUMN_TOP = -260;
const CONCRETE_TOP = 22;
const CONCRETE_DEPTH = 230;
const CONCRETE_HALF = 260;
const ANCHOR_X = 118;
const ANCHOR_DEPTH = 104;
// The bars and the arrows share one pitch: every arrow, and every anchor, passes midway between two bars
const BAR_PITCH = 23.6;
const BAR_Y = 37;
const BARS = [-13, -11, -9, -7, -5, -3, -1, 1, 3, 5, 7, 9, 11, 13].map((n) => (n * BAR_PITCH) / 2);
const SPREAD = [-4, -2, 0, 2, 4].map((n) => n * BAR_PITCH);

function baseNode({ cx, cy, scale }: Readonly<{ cx: number; cy: number; scale: number }>) {
  const at = ([x, y]: Point): Point => [cx + x * scale, cy + y * scale];
  const line = (points: readonly Point[]) => open(points.map(at));
  const shape = (points: readonly Point[]) => closed(points.map(at));
  const rect = (x0: number, y0: number, x1: number, y1: number) => shape([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const anchors = [-ANCHOR_X, ANCHOR_X];

  return {
    at,
    concrete: rect(-CONCRETE_HALF, CONCRETE_TOP, CONCRETE_HALF, CONCRETE_DEPTH),
    edge: line([[-CONCRETE_HALF, CONCRETE_TOP], [CONCRETE_HALF, CONCRETE_TOP]]),
    // A mesh under the plate, its bars seen end-on
    bars: BARS.map((x) => at([x, BAR_Y])),
    barRadius: 2.4 * scale,
    grout: shape([[-136, 12], [-148, CONCRETE_TOP], [148, CONCRETE_TOP], [136, 12]]),
    // The column: the web face-on between its two flanges
    web: rect(-49, COLUMN_TOP, 49, 0),
    flanges: rect(-58, COLUMN_TOP, -49, 0) + rect(49, COLUMN_TOP, 58, 0),
    anchorAxes: anchors.map((x) => line([[x, -52], [x, ANCHOR_DEPTH + 24]])).join(''),
    // An anchor: its shank, the plate at its end in the concrete, and above the base plate a nut on a washer
    anchors: anchors.map((x) => rect(x - 4, -32, x + 4, ANCHOR_DEPTH) + rect(x - 12, ANCHOR_DEPTH, x + 12, ANCHOR_DEPTH + 7)
      + rect(x - 10, -18, x + 10, -6) + rect(x - 15, -6, x + 15, 0)).join(''),
    plate: rect(-138, 0, 138, 12),
    ribs: shape([[-58, -98], [-58, 0], [-102, 0], [-102, -16]]) + shape([[58, -98], [58, 0], [102, 0], [102, -16]]),
    // The load: down the column, through the plate, into the concrete
    way: line([[0, COLUMN_TOP], [0, -12]]),
    wayHead: shape([[-5, -13], [5, -13], [0, -2]]),
    spread: SPREAD.map((x) => line([[x, 32], [x, 58]]) + line([[x - 3.6, 51], [x, 58], [x + 3.6, 51]])).join(''),
  };
}

type Circle = readonly [number, number, number];

/** The two outer tangents between two circles: the callout opening into the lens */
function tangents([x1, y1, r1]: Circle, [x2, y2, r2]: Circle): Point[][] {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const heading = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.acos((r1 - r2) / distance);
  return [1, -1].map((sign) => {
    const angle = heading + sign * spread;
    return [[x1 + r1 * Math.cos(angle), y1 + r1 * Math.sin(angle)], [x2 + r2 * Math.cos(angle), y2 + r2 * Math.sin(angle)]];
  });
}

// ---------- the two compositions ----------
// Names: the three the first card's pins carried and the scheme's «Фундамент»; `at` is the point on the part, in the
// node's units.
const NAMES: readonly { part: Part; name: string; at: Point }[] = [
  { part: 'rib', name: 'Ребро жорсткості', at: [84, -44] },
  { part: 'plate', name: 'Опорна плита', at: [134, 6] },
  { part: 'anchor', name: 'Анкерне кріплення', at: [122, 64] },
  { part: 'base', name: 'Фундамент', at: [40, 122] },
];

type SheetConfig = Readonly<{
  id: string; className: string; width: number; height: number;
  key: KeyConfig;
  lens: Circle;
  node: { cx: number; cy: number; scale: number };
  /** The names' shelves: where each stands, where its text starts, how far before it the leader bends, and whether a
   *  name of two words takes two lines */
  shelves: readonly number[]; textX: number; knee: number; twoLine: boolean; linePitch: number;
  /** The key's hover area */
  hit: readonly [number, number, number, number];
  /** One short link from the callout to the lens instead of the two tangents (the phone: tangents would cross the names) */
  link: boolean;
}>;

// From 761 px: the key on the left, the node in a lens, the names on shelves right of it
const WIDE: SheetConfig = {
  id: 'hv2-sheet-w', className: 'sig-wide', width: 920, height: 404,
  key: { xl: 62, xr: 286, yg: 300, ye: 176, yr: 122, t: 8, r: 24, callout: 'right', loadGap: 30, loadLen: 20, ge: 40, ticks: [4, 14], fk: 1, hk: 1, head: 1, axUp: 30, axDown: 44, shelf: [16, 40] },
  lens: [556, 204, 168], node: { cx: 556, cy: 226, scale: 0.9 },
  shelves: [96, 190, 284, 356], textX: 752, knee: 718, twoLine: false, linePitch: 0,
  hit: [14, 56, 340, 320], link: false,
};
// Up to 760 px: the key is a key plan in the sheet's top right corner — where one sits on a real sheet — and the lens
// stands under it on the left
const TALL: SheetConfig = {
  id: 'hv2-sheet-t', className: 'sig-tall', width: 360, height: 288,
  key: { xl: 234, xr: 336, yg: 104, ye: 60, yr: 38, t: 5, r: 11, callout: 'left', loadGap: 11, loadLen: 7, ge: 12, ticks: [3, 9], fk: 0.55, hk: 0.5, head: 0.8, axUp: 12, axDown: 24, shelf: [10, 34] },
  lens: [116, 166, 108], node: { cx: 116, cy: 180, scale: 0.6 },
  shelves: [160, 198, 236, 270], textX: 262, knee: 238, twoLine: true, linePitch: 16,
  hit: [212, 10, 140, 124], link: true,
};

function SheetDrawing({ config }: Readonly<{ config: SheetConfig }>) {
  const { id, className, width, height, lens, shelves, textX, knee, twoLine, linePitch, hit, link } = config;
  const key = keyFrame(config.key);
  const node = baseNode(config.node);
  const [lx, ly, lr] = lens;
  const [kx, ky, kr] = key.circle;

  // The lens's rim starts at the point nearest the callout and runs both ways round, so the lines that open the callout
  // into the lens never end in nothing while the sheet draws in
  const ux = (kx - lx) / Math.hypot(kx - lx, ky - ly);
  const uy = (ky - ly) / Math.hypot(kx - lx, ky - ly);
  const near: Point = [lx + ux * lr, ly + uy * lr];
  const far: Point = [lx - ux * lr, ly - uy * lr];
  const rim = (sweep: 0 | 1) => `M${round(near[0])} ${round(near[1])}A${lr} ${lr} 0 0 ${sweep} ${round(far[0])} ${round(far[1])}`;
  const fan = link ? [[[kx - ux * kr, ky - uy * kr], near] as Point[]] : tangents(key.circle, lens);

  return (
    <svg className={`sig-svg ${className}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${id}-lens`}><circle cx={lx} cy={ly} r={lr} /></clipPath>
      </defs>

      <g className="sig-key">
        <path className="sig-line" d={key.ground} />
        <path className="sig-hatch" d={key.groundTicks} />
        <path className="sig-hidden" d={key.footings} />
        <path className="sig-axis" d={key.axes} />
        {/* The roof load presses, as a group: the path itself keeps its place in the draw-in */}
        <g className="sig-press"><path className="sig-load" d={key.load} /></g>
        <path className="sig-frame" pathLength={1} d={key.frame} />
        <path className="sig-frame-inner" pathLength={1} d={key.frameInner} />
        <path className="sig-line" d={key.bases} />
        {/* The thread is dashed, so it cannot draw itself by its dash offset: it fades in, as a group, and the path
            stays free for its flow */}
        <g className="sig-way">
          <path className="sig-thread" d={key.way} />
          {key.wayHeads.map((head) => <path key={head} className="sig-thread-head" d={head} />)}
        </g>
        {/* Turned so the circle draws from its top, where the column comes down into it */}
        <circle className="sig-callout sig-ring" pathLength={1} cx={round(kx)} cy={round(ky)} r={kr} transform={`rotate(-90 ${round(kx)} ${round(ky)})`} />
        <g className="sig-mark-group">
          <path className="sig-callout" d={key.markShelf} />
          <text className="sig-mark" x={round(key.markAt[0])} y={round(key.markAt[1])} textAnchor="middle">1</text>
        </g>
      </g>

      {fan.map((segment) => <path key={open(segment)} className="sig-fan" pathLength={1} d={open(segment)} />)}

      <circle className="sig-lens" cx={lx} cy={ly} r={lr} />
      {/* Paint order matters: the parts are filled, each covers what stands behind it */}
      <g className="sig-node" clipPath={`url(#${id}-lens)`}>
        <path className="sig-concrete" d={node.concrete} />
        <g className="sig-bars">{node.bars.map(([x, y]) => <circle key={x} cx={round(x)} cy={round(y)} r={round(node.barRadius)} />)}</g>
        <path className="sig-edge" d={node.edge} />
        <path className="sig-grout" d={node.grout} />
        <path className="sig-web" d={node.web} />
        <path className="sig-cut" pathLength={1} d={node.flanges} />
        <path className="sig-axis" d={node.anchorAxes} />
        <g className="sig-part" data-part="anchor"><path pathLength={1} d={node.anchors} /></g>
        <g className="sig-part" data-part="plate"><path pathLength={1} d={node.plate} /></g>
        <g className="sig-part" data-part="rib"><path pathLength={1} d={node.ribs} /></g>
        <g className="sig-way">
          <path className="sig-thread" d={node.way} />
          <path className="sig-thread-head" d={node.wayHead} />
        </g>
        <g className="sig-breathe"><path className="sig-spread" d={node.spread} /></g>
      </g>
      <path className="sig-callout sig-rim" pathLength={1} d={rim(1)} />
      <path className="sig-callout sig-rim" pathLength={1} d={rim(0)} />

      {/* What a pointer lights: the key (the load's way) and the lens (the node) */}
      <rect className="sig-hit" data-hit="load" x={hit[0]} y={hit[1]} width={hit[2]} height={hit[3]} />
      <circle className="sig-hit" data-hit="node" cx={lx} cy={ly} r={lr} />

      {NAMES.map(({ part, name, at }, index) => {
        const lines = twoLine ? name.split(' ') : [name];
        const y = shelves[index] ?? 0;
        const point = node.at(at);
        const reach = Math.max(...lines.map((line) => line.length)) * (twoLine ? 8.4 : 9.4) + 20;
        return (
          <g className="sig-name" data-part={part} style={{ '--i': index } as CSSProperties} key={part}>
            <rect className="sig-hit" x={textX - 16} y={round(y - 9 - lines.length * 8)} width={round(reach)} height={18 + lines.length * 16} />
            <path className="sig-leader" d={open([point, [knee, y], [textX - 8, y]])} />
            <circle className="sig-dot" cx={round(point[0])} cy={round(point[1])} r="2.4" />
            {lines.map((line, row) => <text key={line} x={textX} y={round(y + 4.5 + (row - (lines.length - 1) / 2) * linePitch)}>{line}</text>)}
          </g>
        );
      })}
    </svg>
  );
}

// The two texts are the retired cards' own, word for word; only their order changed — the whole first, then the detail.
const NOTES = [
  {
    id: 'load',
    number: '01',
    title: 'Як працює конструкція',
    text: 'Простою схемою пояснюємо логіку основних елементів: як навантаження з покрівлі передається через каркас на фундамент.',
  },
  {
    id: 'node',
    number: '02',
    title: 'Вузол у деталях',
    text: 'Окремо розбираємо важливі з’єднання, примикання й деталі виконання — те, чого після монтажу вже не видно.',
  },
] as const;

export function NodeSheet() {
  return (
    // «hv2-cards» stays on the root: the page's order test (pr-critical) and the visual suite find the block by it
    <div className="hv2-cards hv2-sheet">
      <figure className="sig-figure" data-motion data-motion-live="">
        {/* One picture for a screen reader, named with the words the two cards already used; the two SVGs (one per
            layout) are its drawing */}
        <div
          className="sig-stage"
          role="img"
          aria-label="Схема: навантаження з покрівлі передається через раму на фундаменти. Вузол 1 — опорний вузол сталевої колони на бетонній основі: ребро жорсткості, опорна плита, анкерне кріплення, фундамент."
        >
          <SheetDrawing config={WIDE} />
          <SheetDrawing config={TALL} />
        </div>
        {/* The title strip: provenance first, the view's name in bold, the subject last */}
        <figcaption className="sig-strip">
          <span>Схема · без розмірів</span>
          <b>Вузол 1</b>
          <span>Сталева колона на бетонній основі</span>
        </figcaption>
      </figure>

      <div className="sig-notes">
        {NOTES.map(({ id, number, title, text }) => (
          <article className="sig-note" data-note={id} key={id}>
            {/* The number carries its note's key from the drawing: the copper thread, the callout */}
            <span className="sig-note-number">
              {number}
              <svg viewBox="0 0 34 12" aria-hidden="true" focusable="false">
                {id === 'load'
                  ? <><path className="sig-thread" d="M1 6H26" /><path className="sig-thread-head" d="M25 2L33 6L25 10Z" /></>
                  : <><circle className="sig-callout" cx="7" cy="6" r="5.4" /><path className="sig-callout" d="M12.4 6H30" /></>}
              </svg>
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
