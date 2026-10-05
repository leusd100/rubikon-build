import type { JSX } from 'react';
import './proof-details.css';

// HOME proof, «Каркас»: three typical nodes of a building of this TYPE — light steel trapezoidal trusses (a vertical at
// every panel point) on aerated-concrete perimeter walls, purlins on the top chord's nodes, a central row of steel columns
// on pad footings — each drawn as a schematic construction detail in the «Креслення» language: thin precise lines on the
// dark sheet the panel provides, the members in the sheet's paper colour, the connection itself (plate, bolts, cleat, the
// belt's edge) in copper, hatches by the drafting convention (masonry at 45°, concrete as dots and small triangles).
// Never this building's drawn structure, and never a size, a grade or a mark: the words say what each part is, no more.
// Every drawing is 360 × 240 and decorative (aria-hidden): `spoken` says the node in words. Ids are per drawing, and one
// node is open at a time (ProofContour).

export type DetailId = 'bearing' | 'purlin' | 'base';
export type ProofDetail = { id: DetailId; letter: 'А' | 'Б' | 'В'; title: string; spoken: string; Drawing: () => JSX.Element };

type Pt = readonly [number, number];
const at2 = (value: number) => Math.round(value * 100) / 100;
const add = ([x, y]: Pt, [dx, dy]: Pt, k = 1): Pt => [x + dx * k, y + dy * k];
const line = (...points: readonly Pt[]) => `M${points.map(([x, y]) => `${at2(x)} ${at2(y)}`).join('L')}`;
const rect = (x0: number, y0: number, x1: number, y1: number) => `${line([x0, y0], [x1, y0], [x1, y1], [x0, y1])}Z`;
/** Where the line through p along d meets the line through q along e */
function meet(p: Pt, d: Pt, q: Pt, e: Pt): Pt {
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / (d[0] * e[1] - d[1] * e[0]);
  return add(p, d, t);
}
/** A break line across a member: through `at`, across the member's direction `along` (a unit vector), `half` each side,
 *  with the drafting «Z» in its middle */
function breakLine(at: Pt, along: Pt, half: number) {
  const across: Pt = [-along[1], along[0]];
  const point = (s: number, w: number) => add(add(at, across, s), along, w);
  return line(point(-half, 0), point(-2.6, 0), point(-1, 3.6), point(1, -3.6), point(2.6, 0), point(half, 0));
}

/** Concrete by the drafting convention: aggregate as small triangles and dots, scattered so the tile does not read */
const AGGREGATE = [
  [6, 6, 10], [20, 4, 75], [33, 9, 160], [12, 17, 200], [26, 16, 110], [37, 22, 40], [5, 28, 290], [18, 29, 35], [30, 31, 250], [12, 37, 140],
] as const;
const GRAINS = [[14, 9], [27, 6], [38, 14], [3, 15], [20, 12], [31, 24], [24, 23], [8, 22], [13, 25], [24, 37], [36, 36], [2, 36], [29, 1.5], [9, 32]] as const;
const triangle = ([cx, cy, turn]: readonly [number, number, number]) => {
  const corners = [0, 120, 240].map((step): Pt => {
    const angle = ((turn + step) * Math.PI) / 180;
    return [cx + 2.2 * Math.cos(angle), cy + 2.2 * Math.sin(angle)];
  });
  return `${line(...corners)}Z`;
};
function ConcreteHatch({ id }: Readonly<{ id: string }>) {
  return (
    <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
      <path className="hv2-detail-hatch" d={AGGREGATE.map(triangle).join('')} />
      {GRAINS.map(([cx, cy]) => <circle key={`${cx}-${cy}`} className="hv2-detail-grain" cx={cx} cy={cy} r=".7" />)}
    </pattern>
  );
}
/** Masonry by the drafting convention: thin lines at 45° */
function MasonryHatch({ id }: Readonly<{ id: string }>) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path className="hv2-detail-hatch" d="M3 0V6" />
    </pattern>
  );
}

/** A name on the drawing: its words, and from each part it names a thin leader that starts at a dot on that part — the
 *  last point of every leader is its landing, 4 px clear of the words */
type Callout = { text: string; at: Pt; anchor?: 'start' | 'end' | 'middle'; leaders: readonly (readonly Pt[])[] };
function Callouts({ items }: Readonly<{ items: readonly Callout[] }>) {
  return (
    <g>
      {items.map(({ text, at: [x, y], anchor = 'start', leaders }) => (
        <g key={text}>
          {leaders.map((points) => (
            <g key={points.join()}>
              <path className="hv2-detail-leader" d={line(...points)} />
              <circle className="hv2-detail-dot" cx={points[0][0]} cy={points[0][1]} r="1.6" />
            </g>
          ))}
          <text className="hv2-detail-label" x={x} y={y} textAnchor={anchor}>{text}</text>
        </g>
      ))}
    </g>
  );
}

// --- А · The truss's end on the wall: the wall in section, the belt on it, the support plate on its anchors, the truss
// end seated on the plate — its end post, the bottom chord into it, the top chord starting up the slope, and the first
// panel (a diagonal down from the post's head, a vertical at the next panel point). Outside is on the left.
const A = {
  wall: [170, 246] as const,
  belt: [118, 158] as const,
  wallBreak: 226,
  /** The block courses' joints across the wall */
  courses: [186, 214] as const,
  plate: [179, 237, 112, 118] as const,
  bolts: [187, 229] as const,
  post: [200, 216] as const,
  /** The top chord's upper edge at the post, and the slope it rises at (the drawing's, schematic) */
  chordTop: 36,
  slope: 0.12,
  chordDepth: 10,
  bottomChord: [84, 94] as const,
  /** The first panel point's vertical; half the diagonal's width */
  vertical: [264, 273] as const,
  diagonalHalf: 4.5,
  end: 344,
};
const aTop = (x: number, offset = 0) => A.chordTop + offset - A.slope * (x - A.post[0]);
const aAlong: Pt = [1 / Math.hypot(1, A.slope), -A.slope / Math.hypot(1, A.slope)];

function BearingDrawing() {
  const [w0, w1] = A.wall;
  const [b0, b1] = A.belt;
  const [p0, p1, pTop, pBottom] = A.plate;
  const [s0, s1] = A.post;
  const [c0, c1] = A.bottomChord;
  const [v0, v1] = A.vertical;
  const bars: readonly Pt[] = [[w0 + 7, b0 + 7.5], [w1 - 7, b0 + 7.5], [w0 + 7, b1 - 7.5], [w1 - 7, b1 - 7.5]];
  // Anchors: a nut on the plate, the shank down into the belt with a head at its foot
  const anchors = A.bolts.map((x) => `M${x} ${pBottom}V146M${x - 3.5} 146H${x + 3.5}`).join('');
  const nuts = A.bolts.map((x) => rect(x - 4, pTop - 6, x + 4, pTop) + `M${x} ${pTop - 9.5}V${pTop - 6}`).join('');
  const chordEnd = (offset: number): Pt => [A.end, aTop(A.end, offset)];
  // The first panel: the diagonal from the post's head (where the axes of post and top chord meet) down to the bottom
  // chord at the vertical, its edges cut by the faces they run into
  const head: Pt = [(s0 + s1) / 2, aTop((s0 + s1) / 2, A.chordDepth / 2)];
  const foot: Pt = [(v0 + v1) / 2, (c0 + c1) / 2];
  const length = Math.hypot(foot[0] - head[0], foot[1] - head[1]);
  const down: Pt = [(foot[0] - head[0]) / length, (foot[1] - head[1]) / length];
  const side: Pt = [-down[1], down[0]];
  const upperEdge = add(head, side, -A.diagonalHalf);
  const lowerEdge = add(head, side, A.diagonalHalf);
  const underChord = (x: number): Pt => [x, aTop(x, A.chordDepth)];
  const diagonal = line(meet(upperEdge, down, underChord(s1), aAlong), meet(upperEdge, down, [v0, 0], [0, 1]))
    + line(meet(lowerEdge, down, [s1, 0], [0, 1]), meet(lowerEdge, down, [0, c0], [1, 0]));
  return (
    <svg className="hv2-detail-drawing" viewBox="0 0 360 240" aria-hidden="true" focusable="false">
      <defs>
        <MasonryHatch id="hv2-detail-bearing-masonry" />
        <ConcreteHatch id="hv2-detail-bearing-concrete" />
        {/* the belt's hatch stops short of the anchors and the bars */}
        <mask id="hv2-detail-bearing-clear" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="240">
          <rect width="360" height="240" fill="#fff" />
          <path d={anchors} fill="none" stroke="#000" strokeWidth="5" />
          {bars.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.8" fill="#000" />)}
        </mask>
      </defs>
      {/* The wall in section, its block courses faint across it, broken off below */}
      <rect x={w0} y={b1} width={w1 - w0} height={A.wallBreak - b1} fill="url(#hv2-detail-bearing-masonry)" />
      <path className="hv2-detail-course" d={A.courses.map((y) => line([w0, y], [w1, y])).join('')} />
      <path className="hv2-detail-thin" d={line([w0, b1], [w0, A.wallBreak]) + line([w1, b1], [w1, A.wallBreak])} />
      <path className="hv2-detail-thin" d={breakLine([(w0 + w1) / 2, A.wallBreak], [0, 1], (w1 - w0) / 2 + 6)} />
      {/* The monolithic reinforced belt: concrete, its bars, its edge in copper */}
      <rect x={w0} y={b0} width={w1 - w0} height={b1 - b0} fill="url(#hv2-detail-bearing-concrete)" mask="url(#hv2-detail-bearing-clear)" />
      {bars.map(([cx, cy]) => <circle key={`${cx}-${cy}`} className="hv2-detail-thin" cx={cx} cy={cy} r="2" />)}
      <path className="hv2-detail-key" d={rect(w0, b0, w1, b1)} />
      {/* The support plate on two anchors */}
      <path className="hv2-detail-key" d={anchors} />
      <path className="hv2-detail-key" d={rect(p0, pTop, p1, pBottom) + nuts} />
      {/* The truss's end: the end post seated on the plate, the bottom chord into it, the top chord from its head */}
      <path
        className="hv2-detail-strong"
        d={
          line([s0, pTop], [s0, aTop(s0)], chordEnd(0))
          + line([s1, pTop], [s1, c1], [A.end, c1])
          + line([s1, c0], [s1, aTop(s1, A.chordDepth)], [v0, aTop(v0, A.chordDepth)], [v0, c0], [s1, c0])
          + line([v1, c0], [v1, aTop(v1, A.chordDepth)], chordEnd(A.chordDepth))
          + line([v1, c0], [A.end, c0])
          + line([s0, pTop], [s1, pTop])
        }
      />
      <path className="hv2-detail-strong" d={diagonal} />
      <path
        className="hv2-detail-thin"
        d={breakLine([A.end, (c0 + c1) / 2], [1, 0], (c1 - c0) / 2 + 5) + breakLine(add(chordEnd(0), [0, A.chordDepth / 2]), aAlong, A.chordDepth / 2 + 5)}
      />
      <Callouts
        items={[
          { text: 'Стійка й пояси ферми', at: [176, 50], anchor: 'end', leaders: [[[208, 66], [188, 46], [180, 46]]] },
          { text: 'Опорна пластина й анкери', at: [156, 104], anchor: 'end', leaders: [[[180.6, 115], [168, 100], [160, 100]]] },
          { text: 'Армопояс', at: [268, 154], leaders: [[[238, 138], [256, 150], [264, 150]]] },
          { text: 'Газобетонна стіна', at: [152, 208], anchor: 'end', leaders: [[[190, 198], [164, 204], [156, 204]]] },
        ]}
      />
    </svg>
  );
}

// --- Б · A purlin on a top-chord node: the sloping top chord, the vertical and the diagonal meeting it at the node on a
// gusset, the purlin in section sitting on the chord right over the node, held by a short angle cleat on two bolts (on
// the side down the slope).
const B = {
  node: [184, 112] as Pt,
  slope: 0.12,
  /** Half the chord's depth */
  half: 12,
  /** The chord drawn from / to, along it from the node */
  reach: [-166, 158] as const,
  post: [175, 193] as const,
  postEnd: 226,
  /** The diagonal: its angle below the horizontal, to the left; half its width; its length to the break */
  diagonal: 37,
  diagonalHalf: 7,
  diagonalLength: 186,
  /** The gusset's lower edge, and how far it reaches past the diagonal and the post */
  gusset: 150,
  gussetReach: 16,
  /** The purlin: half its width, its height, its wall; the cleat's upstand, its height and thickness, its leg's reach */
  purlin: [18, 44, 3] as const,
  cleat: [30, 4, 26] as const,
  bolts: [-9.5, -21.5] as const,
};
const bAngle = Math.atan(B.slope);
const bAlong: Pt = [Math.cos(bAngle), -Math.sin(bAngle)];
const bUp: Pt = [-Math.sin(bAngle), -Math.cos(bAngle)];
const bChord = (t: number, offset: number) => add(add(B.node, bAlong, t), bUp, offset);
/** Where a vertical through x meets the chord's face at `offset` from its axis */
const bChordAtX = (x: number, offset: number) => meet(bChord(0, offset), bAlong, [x, 0], [0, 1]);
const bDown: Pt = [-Math.cos((B.diagonal * Math.PI) / 180), Math.sin((B.diagonal * Math.PI) / 180)];
const bAcross: Pt = [-bDown[1], bDown[0]];

function PurlinDrawing() {
  const [t0, t1] = B.reach;
  const [s0, s1] = B.post;
  const sx = (s0 + s1) / 2;
  // The diagonal's edges: the upper one stops at the chord, the lower one at the post
  const upper = add(B.node, bAcross, B.diagonalHalf);
  const lower = add(B.node, bAcross, -B.diagonalHalf);
  const upperStart = meet(upper, bDown, bChord(0, -B.half), bAlong);
  const lowerStart = meet(lower, bDown, [s0, 0], [0, 1]);
  const diagonalEnd = add(B.node, bDown, B.diagonalLength);
  const upperEnd = add(upper, bDown, B.diagonalLength);
  const lowerEnd = add(lower, bDown, B.diagonalLength);
  // The gusset behind the node: a plate with a level lower edge — only what shows between the members is drawn
  const across = (edge: Pt, y: number) => meet(edge, bDown, [0, y], [1, 0]);
  const gy = B.gusset;
  const gl = across(upper, gy)[0] - B.gussetReach;
  const gr = s1 + B.gussetReach;
  const gusset = line(bChordAtX(gl, -B.half), [gl, gy], across(upper, gy)) + line(across(lower, gy), [s0, gy]) + line([s1, gy], [gr, gy], bChordAtX(gr, -B.half));
  // The purlin and its cleat, drawn square to the chord: x along it, y down from its top face, on the node
  const seat = bChord(0, B.half);
  const turn = (-bAngle * 180) / Math.PI;
  const local = ([x, y]: Pt): Pt => [seat[0] + x * Math.cos(bAngle) + y * Math.sin(bAngle), seat[1] - x * Math.sin(bAngle) + y * Math.cos(bAngle)];
  const [ph, height, wall] = B.purlin;
  const [upstand, thick, reach] = B.cleat;
  const cx = -ph - thick;
  // The wedge's name sits in the middle of the room between the diagonal and the post, a leader to each
  const nameY = 212;
  const onDiagonal = meet(B.node, bDown, [0, nameY], [1, 0]);
  const nameX = (across(lower, nameY)[0] + s0) / 2;
  const nameHalf = 41;
  return (
    <svg className="hv2-detail-drawing" viewBox="0 0 360 240" aria-hidden="true" focusable="false">
      {/* The gusset, a hint behind the members */}
      <path className="hv2-detail-thin" d={gusset} />
      {/* The top chord, broken off both ways */}
      <path className="hv2-detail-strong" d={line(bChord(t0, B.half), bChord(t1, B.half)) + line(bChord(t0, -B.half), bChord(t1, -B.half))} />
      <path className="hv2-detail-thin" d={breakLine(bChord(t0, 0), bAlong, B.half + 5) + breakLine(bChord(t1, 0), bAlong, B.half + 5)} />
      {/* The vertical under the node, and the diagonal into it */}
      <path className="hv2-detail-strong" d={line(bChordAtX(s0, -B.half), [s0, B.postEnd]) + line(bChordAtX(s1, -B.half), [s1, B.postEnd])} />
      <path className="hv2-detail-thin" d={breakLine([sx, B.postEnd], [0, 1], (s1 - s0) / 2 + 5)} />
      <path className="hv2-detail-strong" d={line(upperStart, upperEnd) + line(lowerStart, lowerEnd)} />
      <path className="hv2-detail-thin" d={breakLine(diagonalEnd, bDown, B.diagonalHalf + 5)} />
      {/* The purlin in section, a hollow profile, square to the chord on its top face */}
      <g transform={`translate(${at2(seat[0])} ${at2(seat[1])}) rotate(${at2(turn)})`}>
        <path className="hv2-detail-strong" d={rect(-ph, -height, ph, 0)} />
        <path className="hv2-detail-thin" d={rect(-ph + wall, -height + wall, ph - wall, -wall)} />
        {/* The cleat: an angle on the chord, its upstand against the purlin, two bolts through both */}
        <path className="hv2-detail-key" d={`${line([-ph, 0], [-ph - reach, 0], [-ph - reach, -thick], [cx, -thick], [cx, -upstand], [-ph, -upstand])}Z`} />
        <path
          className="hv2-detail-key"
          d={B.bolts.map((y) => rect(cx - 6, y - 4, cx, y + 4) + line([cx, y], [ph, y]) + rect(ph, y - 3.5, ph + 4, y + 3.5)).join('')}
        />
      </g>
      <Callouts
        items={[
          { text: 'Прогін', at: [226, 48], leaders: [[local([ph - wall / 2, -34]), [214, 44], [222, 44]]] },
          { text: 'Кріплення до вузла', at: [132, 66], anchor: 'end', leaders: [[local([cx - 3, B.bolts[1]]), [144, 62], [136, 62]]] },
          { text: 'Верхній пояс ферми', at: [241, 150], leaders: [[bChordAtX(222, 0), [229, 146], [237, 146]]] },
          {
            text: 'Стійка й розкіс',
            at: [nameX, nameY + 4],
            anchor: 'middle',
            leaders: [[onDiagonal, [nameX - nameHalf - 4, nameY]], [[sx, nameY], [nameX + nameHalf + 4, nameY]]],
          },
        ]}
      />
    </svg>
  );
}

// --- В · A column's base: the column in elevation (its two flanges and the web between), the base plate on a thin bed
// of grout, the anchor bolts with their nuts on the plate and their shanks hooked in the concrete below, the pad footing
// with its neck in section — its type the designer's, so drawn as a convention — and the ground's level.
const C = {
  axis: 140,
  /** Half the column's width over the flanges; the flanges' thickness */
  half: 18,
  flange: 3.5,
  top: 18,
  plate: [102, 178, 112, 118] as const,
  grout: 123,
  bolts: [112, 168] as const,
  neck: [90, 190, 180] as const,
  pad: [60, 220, 214] as const,
  ground: 136,
};

function BaseDrawing() {
  const [p0, p1, pTop, pBottom] = C.plate;
  const [n0, n1, nBottom] = C.neck;
  const [f0, f1, fBottom] = C.pad;
  const [l, r] = [C.axis - C.half, C.axis + C.half];
  const footing = `${line([n0, C.grout], [n1, C.grout], [n1, nBottom], [f1, nBottom], [f1, fBottom], [f0, fBottom], [f0, nBottom], [n0, nBottom])}Z`;
  // The anchors below the plate: hidden in the concrete, hooked outwards at their ends
  const shanks = C.bolts.map((x, index) => {
    const hook = index === 0 ? -1 : 1;
    return `M${x} ${pBottom}V190Q${x} 196 ${x + 6 * hook} 196H${x + 10 * hook}`;
  }).join('');
  const nuts = C.bolts.map((x) => rect(x - 3.5, 103.5, x + 3.5, 109.5) + rect(x - 6, 109.5, x + 6, pTop) + `M${x} 99.5V103.5`).join('');
  const ticks = [
    ...Array.from({ length: 9 }, (_, index) => 22 + index * 8),
    ...Array.from({ length: 19 }, (_, index) => 198 + index * 8),
  ].map((x) => line([x, C.ground], [x - 5, C.ground + 5])).join('');
  return (
    <svg className="hv2-detail-drawing" viewBox="0 0 360 240" aria-hidden="true" focusable="false">
      <defs>
        <ConcreteHatch id="hv2-detail-base-concrete" />
        <pattern id="hv2-detail-base-grout" width="6" height="5" patternUnits="userSpaceOnUse">
          <circle className="hv2-detail-grain" cx="1.5" cy="1.5" r=".55" />
          <circle className="hv2-detail-grain" cx="4.5" cy="3.5" r=".55" />
        </pattern>
        <mask id="hv2-detail-base-clear" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="240">
          <rect width="360" height="240" fill="#fff" />
          <path d={shanks} fill="none" stroke="#000" strokeWidth="5" />
        </mask>
      </defs>
      {/* The ground's level, ticked on the soil's side, broken by the footing's neck */}
      <path className="hv2-detail-thin" d={line([16, C.ground], [n0, C.ground]) + line([n1, C.ground], [344, C.ground])} />
      <path className="hv2-detail-hatch" d={ticks} />
      {/* The pad footing and its neck, in section, by convention */}
      <path d={footing} fill="url(#hv2-detail-base-concrete)" mask="url(#hv2-detail-base-clear)" />
      <path className="hv2-detail-thin" d={footing} />
      {/* The grout under the plate */}
      <path d={`${line([p0 - 4, C.grout], [p0, pBottom], [p1, pBottom], [p1 + 4, C.grout])}Z`} fill="url(#hv2-detail-base-grout)" />
      <path className="hv2-detail-thin" d={line([p0 - 4, C.grout], [p0, pBottom]) + line([p1, pBottom], [p1 + 4, C.grout])} />
      {/* The anchors: nut and washer on the plate, the shank hidden in the concrete */}
      <path className="hv2-detail-key hv2-detail-hidden" d={shanks} />
      <path className="hv2-detail-key" d={rect(p0, pTop, p1, pBottom) + nuts} />
      {/* The column: its flanges' faces, broken off above */}
      <path className="hv2-detail-strong" d={line([l, C.top], [l, pTop]) + line([r, C.top], [r, pTop])} />
      <path className="hv2-detail-thin" d={line([l + C.flange, C.top], [l + C.flange, pTop]) + line([r - C.flange, C.top], [r - C.flange, pTop])} />
      <path className="hv2-detail-thin" d={breakLine([C.axis, C.top], [0, 1], C.half + 6)} />
      <Callouts
        items={[
          { text: 'Колона', at: [96, 40], anchor: 'end', leaders: [[[131, 56], [108, 36], [100, 36]]] },
          { text: 'Анкерні болти', at: [88, 94], anchor: 'end', leaders: [[[C.bolts[0], 106.5], [100, 90], [92, 90]]] },
          { text: 'Опорна плита', at: [208, 96], leaders: [[[176, 115], [196, 92], [204, 92]]] },
          { text: 'Рівень землі', at: [238, 124], leaders: [[[214, C.ground], [226, 120], [234, 120]]] },
          { text: 'Фундамент — умовно', at: [232, 212], leaders: [[[206, 198], [220, 208], [228, 208]]] },
        ]}
      />
    </svg>
  );
}

export const PROOF_DETAILS: readonly ProofDetail[] = [
  {
    id: 'bearing',
    letter: 'А',
    title: 'Опора ферми на стіну',
    spoken: 'Кінець ферми, її опорна стійка разом із поясами, стоїть на сталевій пластині, закріпленій анкерами в монолітному армопоясі поверх газобетонної стіни.',
    Drawing: BearingDrawing,
  },
  {
    id: 'purlin',
    letter: 'Б',
    title: 'Прогін на вузлі ферми',
    spoken: 'Прогін лежить на верхньому поясі ферми просто над вузлом, де до поясу сходяться стійка й розкіс, і тримається на ньому коротким кутиком на болтах.',
    Drawing: PurlinDrawing,
  },
  {
    id: 'base',
    letter: 'В',
    title: 'База колони',
    spoken: 'Сталева колона стоїть на опорній плиті з підливкою під нею, анкерні болти з гайками заходять у бетонний фундамент із підколонником нижче рівня землі, а сам фундамент показано умовно.',
    Drawing: BaseDrawing,
  },
];
