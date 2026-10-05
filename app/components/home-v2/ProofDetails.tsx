import type { CSSProperties, JSX, ReactNode } from 'react';
import './proof-details.css';

// HOME proof, «Каркас»: five typical nodes of a building of this TYPE — light trusses of thin-walled cold-formed steel
// (chords and webs of C-profiles with lips, a vertical at every panel point, joined on steel gusset plates with
// self-drilling screws and bolts) on aerated-concrete perimeter walls, Z-profile purlins on the top chord's nodes, a
// central row of steel columns on pad footings — each drawn as a schematic construction detail in the «Креслення»
// language: thin precise lines on the dark sheet the panel provides, the members in the sheet's paper colour (a C-profile
// in elevation: its two edges and, a little in from each, the line of its lip), the connection itself (gusset, cleat,
// plate, screws as dots, bolts as a diamond) in copper, hatches by the drafting convention (masonry at 45°, concrete as
// dots and small triangles), break lines where a member runs on. How such nodes LOOK was read from working drawings of
// this type the owner keeps privately (05.10); nothing is traced or taken from them: the geometry is drawn here in its own
// coordinates, and there is never a size, a count, a grade, a profile's designation or a mark — the words say what each
// part is, no more. Every node is «вузол такого типу, схема без розмірів», never this building's drawing.
// Every drawing is 360 × 240 and decorative (aria-hidden): `spoken` says the node in words, `flow` the load's way through
// it. Ids are per drawing, and one node is open at a time (ProofContour). Opened, a node is put together before the eye
// (owner, 05.10: «як наче виїжджає»): its parts come in one by one — what it stands on first, then the plates, then the
// members, the fasteners last — each from where it would be fitted from (Part, proof-details.css), and the names come in
// last. With the panel's [data-flow] the load's way lights up over it (Flow), along the members' axes.

export type DetailId = 'bearing' | 'purlin' | 'base' | 'ridge' | 'chord';
export type ProofDetail = {
  id: DetailId;
  letter: 'А' | 'Б' | 'В' | 'Г' | 'Д';
  title: string;
  spoken: string;
  /** The load's way through the node, as a short chain in words */
  flow: string;
  Drawing: () => JSX.Element;
};

type Pt = readonly [number, number];
const at2 = (value: number) => Math.round(value * 100) / 100;
const add = ([x, y]: Pt, [dx, dy]: Pt, k = 1): Pt => [x + dx * k, y + dy * k];
const sub = ([x, y]: Pt, [dx, dy]: Pt): Pt => [x - dx, y - dy];
const dot = ([x, y]: Pt, [dx, dy]: Pt) => x * dx + y * dy;
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** A unit vector at `degrees` from the drawing's x, turning down (the sheet's y runs down) */
const heading = (degrees: number): Pt => [Math.cos((degrees * Math.PI) / 180), Math.sin((degrees * Math.PI) / 180)];
/** Square to d, a quarter turn to its left on the sheet */
const leftOf = ([x, y]: Pt): Pt => [y, -x];
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

/** A half-plane: a point on its edge and the normal towards the side kept */
type Plane = readonly [Pt, Pt];
const sideOf = ([p, n]: Plane, q: Pt) => dot(sub(q, p), n);
/** A convex outline kept on the inner side of every plane (Sutherland–Hodgman) */
function clip(points: readonly Pt[], planes: readonly Plane[]) {
  let outline: Pt[] = [...points];
  for (const plane of planes) {
    const kept: Pt[] = [];
    outline.forEach((q, index) => {
      const r = outline[(index + 1) % outline.length];
      const [sq, sr] = [sideOf(plane, q), sideOf(plane, r)];
      if (sq >= 0) kept.push(q);
      if (sq >= 0 !== sr >= 0) kept.push(lerp(q, r, sq / (sq - sr)));
    });
    outline = kept;
  }
  return outline;
}
/** The part of a segment on the inner side of every plane */
function clipSegment(a: Pt, b: Pt, planes: readonly Plane[]): readonly [Pt, Pt] | null {
  let [t0, t1] = [0, 1];
  for (const plane of planes) {
    const [sa, sb] = [sideOf(plane, a), sideOf(plane, b)];
    if (sa < 0 && sb < 0) return null;
    if (sa < 0) t0 = Math.max(t0, sa / (sa - sb));
    else if (sb < 0) t1 = Math.min(t1, sa / (sa - sb));
  }
  return t0 < t1 ? [lerp(a, b, t0), lerp(a, b, t1)] : null;
}

/** A member of thin-walled C-profile in elevation, along its axis from `from` to `to`, `half` its depth each side: its
 *  `from` end cut to fit (by `cuts`, or square), its `to` end — and its `from` end too when `broken` — broken off */
type Member = { from: Pt; to: Pt; half: number; lip?: number; cuts?: readonly Plane[]; broken?: boolean };
function profileOf({ from, to, half, lip = 2.6, cuts = [], broken = false }: Member) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const along: Pt = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
  const across = leftOf(along);
  const at = (s: number, r: number) => add(add(from, along, s), across, r);
  // The outline from the far break round the fitted end and back to it: its closing edge is the break's, not drawn
  const outline = clip([at(length, half), at(0, half), at(0, -half), at(length, -half)], cuts);
  const ends: Plane[] = [[from, along], [to, [-along[0], -along[1]]]];
  const edges = broken
    ? [clipSegment(at(0, half), at(length, half), cuts), clipSegment(at(0, -half), at(length, -half), cuts)]
    : [outline];
  const lips = [half - lip, lip - half].map((r) => clipSegment(at(0, r), at(length, r), [...cuts, ...ends]));
  const breakAt = (s: number) => breakLine(at(s, 0), along, half + 5);
  return {
    at,
    fill: `${line(...outline)}Z`,
    edge: edges.filter((points) => points !== null).map((points) => line(...points!)).join(''),
    lips: lips.filter((points) => points !== null).map((points) => line(...points!)).join(''),
    breaks: (broken ? breakAt(0) : '') + breakAt(length),
  };
}
/** The member drawn: filled with the sheet so what stands behind it (a gusset) is hidden, its edges, its lips, its breaks */
function Profile({ shape }: Readonly<{ shape: ReturnType<typeof profileOf> }>) {
  return (
    <>
      <path className="hv2-detail-member" d={shape.fill} />
      <path className="hv2-detail-lip" d={shape.lips} />
      <path className="hv2-detail-strong" d={shape.edge} />
      <path className="hv2-detail-thin" d={shape.breaks} />
    </>
  );
}
/** How far along a member its square-cut end must stand for both its corners to clear every plane */
function squareCut(from: Pt, along: Pt, half: number, planes: readonly Plane[]) {
  const across = leftOf(along);
  let s = 0;
  while (s < 200 && [half, -half].some((r) => planes.some((plane) => sideOf(plane, add(add(from, along, s), across, r)) < 0))) s += 0.25;
  return s;
}

/** Self-drilling screws as the drawings show them face-on: a dot each */
function Screws({ at }: Readonly<{ at: readonly Pt[] }>) {
  return <>{at.map(([x, y]) => <circle key={`${at2(x)}-${at2(y)}`} className="hv2-detail-screw" cx={at2(x)} cy={at2(y)} r="1.25" />)}</>;
}
/** Bolts face-on, by the drawings' symbol: a diamond with its centre */
function Bolts({ at }: Readonly<{ at: readonly Pt[] }>) {
  return (
    <>
      {at.map(([x, y]) => (
        <g key={`${at2(x)}-${at2(y)}`}>
          <path className="hv2-detail-bolt" d={`${line([x, y - 3.6], [x + 3.6, y], [x, y + 3.6], [x - 3.6, y])}Z`} />
          <circle className="hv2-detail-screw" cx={at2(x)} cy={at2(y)} r=".9" />
        </g>
      ))}
    </>
  );
}
/** A screw seen side-on through the plates it joins: its head on the near face, its shank along `into` */
const screwSide = (head: Pt, into: Pt, length = 8.5) => {
  const across = leftOf(into);
  return line(add(head, across, 2.4), add(head, across, -2.4)) + line(head, add(head, into, length));
};

/** A part of the node as it is put together: the n-th to come in, from (dx, dy) off its place — in its own frame */
function Part({ n, dx = 0, dy = 0, children }: Readonly<{ n: number; dx?: number; dy?: number; children: ReactNode }>) {
  return <g className="hv2-detail-part" style={{ '--n': n, '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties}>{children}</g>;
}

/** The load's way through the node, over the drawing: each way runs along the members' axes, its last point is where its
 *  arrowhead's tip stands */
function Flow({ ways }: Readonly<{ ways: readonly (readonly Pt[])[] }>) {
  return (
    <g className="hv2-detail-flow">
      {ways.map((points) => {
        const tip = points.at(-1)!;
        const before = points.at(-2)!;
        const length = Math.hypot(tip[0] - before[0], tip[1] - before[1]);
        const along: Pt = [(tip[0] - before[0]) / length, (tip[1] - before[1]) / length];
        const base = add(tip, along, -8);
        const across = leftOf(along);
        return (
          <g key={points.join()}>
            <path className="hv2-detail-flow-way" d={line(...points.slice(0, -1), base)} />
            <path className="hv2-detail-flow-head" d={`${line(tip, add(base, across, 4), add(base, across, -4))}Z`} />
          </g>
        );
      })}
    </g>
  );
}

/** A name on the drawing: its words (a second line under the first when given two), and from each part it names a thin
 *  leader that starts at a dot on that part — the last point of every leader is its landing, 4 px clear of the words */
type Callout = { text: string | readonly [string, string]; at: Pt; anchor?: 'start' | 'end' | 'middle'; leaders: readonly (readonly Pt[])[] };
/** A name with its leaders brought to the words' first line: from a dot out on the words' own side, by a short shelf;
 *  from a dot above or below them, straight to the landing */
function name(text: Callout['text'], at: Pt, anchor: 'start' | 'end', ...dots: readonly Pt[]): Callout {
  const [x, y] = at;
  const side = anchor === 'end' ? 1 : -1;
  const landing: Pt = [x + 4 * side, y - 4];
  const shelf: Pt = [x + 12 * side, y - 4];
  return { text, at, anchor, leaders: dots.map((from) => ((from[0] - shelf[0]) * side >= 0 ? [from, shelf, landing] : [from, landing])) };
}
function Callouts({ items }: Readonly<{ items: readonly Callout[] }>) {
  return (
    <g className="hv2-detail-callouts">
      {items.map(({ text, at: [x, y], anchor = 'start', leaders }) => (
        <g key={String(text)}>
          {leaders.map((points) => (
            <g key={points.join()}>
              <path className="hv2-detail-callout-line" d={line(...points)} />
              <circle className="hv2-detail-dot" cx={at2(points[0][0])} cy={at2(points[0][1])} r="1.6" />
            </g>
          ))}
          <text className="hv2-detail-label" x={x} y={y} textAnchor={anchor}>
            {typeof text === 'string' ? text : text.map((words, index) => <tspan key={words} x={x} dy={index ? 13 : 0}>{words}</tspan>)}
          </text>
        </g>
      ))}
    </g>
  );
}

/** The drawing's own sheet: the node's parts (one group, so the load's way can quiet them as one), the load's way over
 *  them, the names last — and how many parts come in before the names */
function Sheet({ parts, flow, names, children }: Readonly<{ parts: number; flow: readonly (readonly Pt[])[]; names: readonly Callout[]; children: ReactNode }>) {
  return (
    <svg className="hv2-detail-drawing" viewBox="0 0 360 240" aria-hidden="true" focusable="false" style={{ '--parts': parts } as CSSProperties}>
      <g className="hv2-detail-assembly">{children}</g>
      <Flow ways={flow} />
      <Callouts items={names} />
    </svg>
  );
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

/** The roof's slope on every drawing that has one: the scheme's own, fitted to the rakes measured on the photo */
const SLOPE = 10.5;
/** The clear gap a member's cut end keeps from what it stops at */
const GAP = 3;

// --- А · The truss's end on the wall: the wall in section, the belt on it, the support plate on its anchors with an
// upstand welded on, and the truss's heel seated on the plate — its end post, the bottom chord coming in at the post's
// foot, the top chord rising from its head, the first diagonal down from the head towards the middle (broken off before
// it reaches the bottom chord) — all on one heel gusset, on screws and bolts, the post's foot bolted to the upstand.
// Outside is on the left; the truss rises to the right.
const A = {
  wall: [92, 168] as const,
  belt: [154, 188] as const,
  wallBreak: 230,
  /** A block course's joint across the wall */
  courses: [212] as const,
  plate: [98, 162, 148, 154] as const,
  anchors: [106, 154] as const,
  /** The upstand welded on the plate: its sides and top */
  upstand: [119, 141, 126] as const,
  /** The end post's axis and half its width; the bottom chord's axis; how far the top chord's axis stands above it at the post */
  post: 130,
  postHalf: 8,
  bottom: 114,
  depth: 60,
  chordHalf: 9,
  /** The first diagonal: its axis falls to the next panel point's foot, this far along the bottom chord; its half-width;
   *  how far along it the break stands */
  panel: 96,
  diagonalHalf: 7,
  diagonalReach: 68,
  /** The heel gusset's right edge */
  gussetRight: 174,
  /** Where the chords are broken off */
  topEnd: 306,
  bottomEnd: 344,
};

function BearingDrawing() {
  const [w0, w1] = A.wall;
  const [b0, b1] = A.belt;
  const [p0, p1, pTop, pBottom] = A.plate;
  const [u0, u1, uTop] = A.upstand;
  const rise = heading(-SLOPE);
  const up = leftOf(rise);
  const head: Pt = [A.post, A.bottom - A.depth];
  const [s0, s1] = [A.post - A.postHalf, A.post + A.postHalf];
  const bars: readonly Pt[] = [[w0 + 7, b0 + 7.5], [w1 - 7, b0 + 7.5], [w0 + 7, b1 - 7.5], [w1 - 7, b1 - 7.5]];
  // Anchors: cast in the belt with a head at the foot, up through the plate, a washer and a nut on it
  const anchors = A.anchors.map((x) => `M${x} ${pBottom}V178M${x - 3.5} 178H${x + 3.5}`).join('');
  const nuts = A.anchors.map((x) => rect(x - 5.5, pTop - 2, x + 5.5, pTop) + rect(x - 3.6, pTop - 8, x + 3.6, pTop - 2) + `M${x} ${pTop - 11.5}V${pTop - 8}`).join('');
  // The members: the top chord from the post's outer face up the slope; the post from the plate to under the chord; the
  // bottom chord from the post's inner face; the diagonal from the post's head, square-cut clear of post and chord
  const chordUnder: Plane = [add(head, up, -(A.chordHalf + GAP)), [-up[0], -up[1]]];
  const top = profileOf({ from: add(head, rise, -A.postHalf / rise[0] - 2), to: add(head, rise, (A.topEnd - A.post) / rise[0]), half: A.chordHalf, cuts: [[[s0, 0], [1, 0]]] });
  const post = profileOf({ from: [A.post, pTop], to: head, half: A.postHalf, lip: 2.2, cuts: [chordUnder] });
  const bottom = profileOf({ from: [s1 + GAP, A.bottom], to: [A.bottomEnd, A.bottom], half: A.chordHalf });
  const foot: Pt = [A.post + A.panel, A.bottom];
  const length = Math.hypot(foot[0] - head[0], foot[1] - head[1]);
  const down: Pt = [(foot[0] - head[0]) / length, (foot[1] - head[1]) / length];
  const cut = squareCut(head, down, A.diagonalHalf, [chordUnder, [[s1 + GAP, 0], [1, 0]]]);
  const diagonal = profileOf({ from: add(head, down, cut), to: add(head, down, A.diagonalReach), half: A.diagonalHalf, lip: 2.2 });
  // The heel gusset: from behind the post to its right edge, from inside the top chord to the bottom chord's lower face,
  // its lower right corner cut back
  const gx = A.gussetRight;
  const inTop = (x: number): Pt => add(meet(head, rise, [x, 0], [0, 1]), up, A.chordHalf - 3);
  const gy = A.bottom + A.chordHalf;
  const gusset = `${line(inTop(A.post), inTop(gx), [gx, gy - 7], [gx - 7, gy], [A.post, gy])}Z`;
  // Fasteners: pairs across each member on the gusset, a bolt on the diagonal, two through the post's foot and the upstand
  const screws = [
    ...[16, 24].flatMap((y) => [[A.post - 3.4, head[1] + y] as Pt, [A.post + 3.4, head[1] + y] as Pt]),
    ...[48, 56].flatMap((y) => [[A.post - 3.4, head[1] + y] as Pt, [A.post + 3.4, head[1] + y] as Pt]),
    ...[8, 16, 24].flatMap((x) => [bottom.at(x, 3.8), bottom.at(x, -3.8)]),
    ...[16, 24, 32].flatMap((x) => [top.at(x + 8, 3.8), top.at(x + 8, -3.8)]),
    ...[3, 10].flatMap((s) => [diagonal.at(s, 2.8), diagonal.at(s, -2.8)]),
  ];
  const bolts = [diagonal.at(21, 0), [A.post, uTop + 7] as Pt, [A.post, pTop - 8] as Pt];
  const flow: Pt[][] = [[add(head, rise, (A.topEnd - 16 - A.post) / rise[0]), head, [A.post, b1 + 4], [A.post, A.wallBreak - 6]]];
  return (
    <Sheet
      parts={7}
      flow={flow}
      names={[
        name('Ферма з С-профілів', [114, 92], 'end', [s0 + 2.2, 88]),
        name(['Фасонка,', 'саморізи й болти'], [200, 70], 'start', [gx - 5, 76], diagonal.at(21, -3.4)),
        name('Опорна пластина й анкери', [184, 148], 'start', [p1 - 3, pTop + 3]),
        name('Армопояс', [184, 176], 'start', [w1 - 3, 172]),
        name('Газобетонна стіна', [184, 212], 'start', [w1 - 4, 208]),
      ]}
    >
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
      {/* The wall in section, its block courses faint across it, broken off below — up from below */}
      <Part n={0} dy={30}>
        <rect x={w0} y={b1} width={w1 - w0} height={A.wallBreak - b1} fill="url(#hv2-detail-bearing-masonry)" />
        <path className="hv2-detail-course" d={A.courses.map((y) => line([w0, y], [w1, y])).join('')} />
        <path className="hv2-detail-thin" d={line([w0, b1], [w0, A.wallBreak]) + line([w1, b1], [w1, A.wallBreak])} />
        <path className="hv2-detail-thin" d={breakLine([(w0 + w1) / 2, A.wallBreak], [0, 1], (w1 - w0) / 2 + 6)} />
      </Part>
      {/* The monolithic reinforced belt: concrete, its bars, its edge in copper, the anchors cast in it — down onto the wall */}
      <Part n={1} dy={-18}>
        <rect x={w0} y={b0} width={w1 - w0} height={b1 - b0} fill="url(#hv2-detail-bearing-concrete)" mask="url(#hv2-detail-bearing-clear)" />
        {bars.map(([cx, cy]) => <circle key={`${cx}-${cy}`} className="hv2-detail-thin" cx={cx} cy={cy} r="2" />)}
        <path className="hv2-detail-key" d={rect(w0, b0, w1, b1)} />
        <path className="hv2-detail-key" d={anchors} />
      </Part>
      {/* The support plate with its upstand, down onto the anchors */}
      <Part n={2} dy={-30}>
        <path className="hv2-detail-plate" d={rect(p0, pTop, p1, pBottom)} />
        <path className="hv2-detail-plate" d={rect(u0, uTop, u1, pTop)} />
      </Part>
      {/* The heel gusset, then the truss's end let down onto it: post, chords, the diagonal */}
      <Part n={3} dy={-44}>
        <path className="hv2-detail-plate" d={gusset} />
      </Part>
      <Part n={4} dy={-64}>
        <Profile shape={post} />
        <Profile shape={bottom} />
        <Profile shape={top} />
        <Profile shape={diagonal} />
      </Part>
      {/* The anchors' nuts, then the screws and bolts */}
      <Part n={5} dy={-14}>
        <path className="hv2-detail-key" d={nuts} />
      </Part>
      <Part n={6}>
        <Screws at={screws} />
        <Bolts at={bolts} />
      </Part>
    </Sheet>
  );
}

// --- Б · A purlin on a top-chord node: the sloping top chord, the vertical and the diagonal meeting it at the node on a
// gusset, square-cut clear of the chord and of each other, screws in pairs across each member on the gusset and a bolt
// on each web; the purlin, a Z-profile in section, sitting on the chord right over the node, held by a short angle cleat
// on screws on its downhill side. The chord falls to the right, the diagonal falls to the truss's middle on the left.
const B = {
  node: [176, 104] as Pt,
  chordHalf: 11,
  reach: 166,
  postHalf: 9,
  postEnd: 228,
  /** The diagonal: its angle below the horizontal, to the left; half its width; its length to the break */
  diagonal: 48,
  diagonalHalf: 8,
  diagonalLength: 176,
  /** The gusset: its right edge past the post; how far along the diagonal its square end stands; its bottom edge */
  gussetRight: 22,
  gussetAlong: 78,
  /** The purlin's section: its height, its flanges' width, its lips; the cleat's upstand and leg */
  purlin: [46, 17, 6] as const,
  cleat: [27, 21] as const,
};

function PurlinDrawing() {
  const fall = heading(SLOPE);
  const up = leftOf(fall);
  const N = B.node;
  const chord = profileOf({ from: add(N, fall, -B.reach), to: add(N, fall, B.reach), half: B.chordHalf, broken: true });
  const chordUnder: Plane = [add(N, up, -(B.chordHalf + GAP)), [-up[0], -up[1]]];
  const post = profileOf({ from: N, to: [N[0], B.postEnd], half: B.postHalf, lip: 2.4, cuts: [chordUnder] });
  const down = heading(180 - B.diagonal);
  const clearOf: Plane[] = [chordUnder, [[N[0] - B.postHalf - GAP, 0], [-1, 0]]];
  const cut = squareCut(N, down, B.diagonalHalf, clearOf);
  const diagonal = profileOf({ from: add(N, down, cut), to: add(N, down, B.diagonalLength), half: B.diagonalHalf, lip: 2.2 });
  // The gusset behind the node: its top edge inside the chord, its left edge along the diagonal, square across it at its
  // end, then level to the right edge past the post
  const outer = leftOf(down);
  const gEnd = add(add(N, down, B.gussetAlong), outer, -(B.diagonalHalf + 12));
  const gTurn = add(gEnd, outer, 2 * B.diagonalHalf + 24);
  const gx = N[0] + B.postHalf + B.gussetRight;
  const inChord = (p: Pt, d: Pt) => meet(p, d, add(N, up, B.chordHalf - 3), fall);
  const gusset = `${line(inChord(gEnd, down), gEnd, gTurn, [gx - 7, gTurn[1]], [gx, gTurn[1] - 7], inChord([gx, 0], [0, 1]))}Z`;
  // The purlin and its cleat, square to the chord: x along it (downhill), y up from its top face, over the node
  const seat = add(N, up, B.chordHalf);
  const local = ([x, y]: Pt): Pt => add(add(seat, fall, x), up, y);
  const [height, flange, lipLength] = B.purlin;
  const [upstand, leg] = B.cleat;
  const zed = line(...([[-flange, lipLength + 1.2], [-flange, 1.2], [0, 1.2], [0, height], [flange, height], [flange, height - lipLength]] as const).map(local));
  const cleat = line(...([[2.3, upstand], [2.3, 2.6], [leg, 2.6]] as const).map(local));
  const cleatScrews = [10, 20].map((y) => screwSide(local([7.5, y]), [-fall[0], -fall[1]], 11)).join('')
    + [10, 17].map((x) => screwSide(local([x, 7]), [-up[0], -up[1]], 11)).join('');
  // Fasteners on the gusset: pairs across the chord either side of the webs, across each web, a bolt on each web
  const screws = [
    ...[-36, -28, 18, 26].flatMap((t) => [chord.at(B.reach + t, 4.2), chord.at(B.reach + t, -4.2)]),
    ...[16, 23].flatMap((s) => [post.at(s + 14, 3.6), post.at(s + 14, -3.6)]),
    ...[6, 13].flatMap((s) => [diagonal.at(s, 3.2), diagonal.at(s, -3.2)]),
  ];
  const bolts = [post.at(52, 0), diagonal.at(26, 0)];
  // The way: down through the purlin to the node, then down the post and down the diagonal
  const top = local([0, height - 4]);
  const flow: Pt[][] = [[top, N, [N[0], B.postEnd - 8]], [top, N, add(N, down, B.diagonalLength - 10)]];
  return (
    <Sheet
      parts={7}
      flow={flow}
      names={[
        name('Прогін', [226, 30], 'start', local([flange - 5, height])),
        name('Кріплення прогону', [230, 66], 'start', local([leg - 4, 2.6])),
        name('Верхній пояс ферми', [128, 44], 'end', chord.at(B.reach - 70, B.chordHalf - 1.4)),
        name(['Фасонка,', 'саморізи й болти'], [224, 166], 'start', [gx - 4, gTurn[1] - 12], post.at(30, 3.6)),
        name(['Стійка й розкіс', 'з С-профілю'], [224, 208], 'start', post.at(100, -B.postHalf + 2.4)),
      ]}
    >
      {/* The gusset behind the node, there first */}
      <Part n={1}>
        <path className="hv2-detail-plate" d={gusset} />
      </Part>
      {/* The top chord, broken off both ways — along its own line */}
      <Part n={0} dx={-28} dy={-5}>
        <Profile shape={chord} />
      </Part>
      {/* The vertical, up from below, and the diagonal, up along its own line */}
      <Part n={2} dy={46}>
        <Profile shape={post} />
      </Part>
      <Part n={3} dx={-30} dy={34}>
        <Profile shape={diagonal} />
      </Part>
      {/* The cleat slid along the chord from downhill; the purlin let down onto the chord against it */}
      <Part n={4} dx={26} dy={5}>
        <path className="hv2-detail-cut hv2-detail-key" d={cleat} />
      </Part>
      <Part n={5} dy={-46}>
        <path className="hv2-detail-cut hv2-detail-strong" d={zed} />
      </Part>
      {/* Screws and bolts, last */}
      <Part n={6}>
        <path className="hv2-detail-key hv2-detail-fix" d={cleatScrews} />
        <Screws at={screws} />
        <Bolts at={bolts} />
      </Part>
    </Sheet>
  );
}

// --- В · A column's base: the column in elevation (its two flanges and the web between), the base plate on a thin bed
// of grout, ribs welded between the plate and the column's flanges, the anchor bolts with their nuts and washers on the
// plate and their shanks hooked in the concrete below, the pad footing with its neck in section — its type the
// designer's, so drawn as a convention — and the ground's level.
const C = {
  axis: 140,
  /** Half the column's width over the flanges; the flanges' thickness */
  half: 18,
  flange: 3.5,
  top: 18,
  plate: [92, 188, 112, 118] as const,
  grout: 123,
  anchors: [100, 180] as const,
  /** The ribs: how far out from the flange, how high, the chamfer at their top */
  rib: [15, 28, 6] as const,
  neck: [84, 196, 180] as const,
  pad: [56, 224, 214] as const,
  ground: 136,
};

function BaseDrawing() {
  const [p0, p1, pTop, pBottom] = C.plate;
  const [n0, n1, nBottom] = C.neck;
  const [f0, f1, fBottom] = C.pad;
  const [l, r] = [C.axis - C.half, C.axis + C.half];
  const footing = `${line([n0, C.grout], [n1, C.grout], [n1, nBottom], [f1, nBottom], [f1, fBottom], [f0, fBottom], [f0, nBottom], [n0, nBottom])}Z`;
  // The anchors below the plate: hidden in the concrete, hooked outwards at their ends
  const shanks = C.anchors.map((x, index) => {
    const hook = index === 0 ? -1 : 1;
    return `M${x} ${pBottom}V190Q${x} 196 ${x + 6 * hook} 196H${x + 10 * hook}`;
  }).join('');
  const nuts = C.anchors.map((x) => rect(x - 6, pTop - 2, x + 6, pTop) + rect(x - 4, pTop - 8, x + 4, pTop - 2) + `M${x} ${pTop - 12}V${pTop - 8}`).join('');
  // The ribs, welded square to the plate against each flange: a plate seen on its face, its top cut back
  const [out, high, chamfer] = C.rib;
  const ribs = [-1, 1].map((side) => {
    const face = side < 0 ? l : r;
    return `${line([face, pTop], [face, pTop - high], [face + side * (out - chamfer), pTop - high], [face + side * out, pTop - high + chamfer], [face + side * out, pTop])}Z`;
  }).join('');
  const ticks = [
    ...Array.from({ length: 8 }, (_, index) => 22 + index * 8),
    ...Array.from({ length: 17 }, (_, index) => 214 + index * 8),
  ].map((x) => line([x, C.ground], [x - 5, C.ground + 5])).join('');
  const flow: Pt[][] = [
    [[C.axis, C.top + 10], [C.axis, nBottom], [C.axis, fBottom + 14]],
    [[C.axis, nBottom - 10], [f0 + 26, fBottom - 2], [f0 + 20, fBottom + 12]],
    [[C.axis, nBottom - 10], [f1 - 26, fBottom - 2], [f1 - 20, fBottom + 12]],
  ];
  return (
    <Sheet
      parts={6}
      flow={flow}
      names={[
        name('Колона', [96, 40], 'end', [l + 1.75, 56]),
        name('Ребра жорсткості', [212, 64], 'start', [r + 8, pTop - 16]),
        name('Анкерні болти', [76, 92], 'end', [C.anchors[0], pTop - 12]),
        name('Опорна плита', [208, 100], 'start', [p1 - 3, pTop + 3]),
        name('Фундамент — умовно', [236, 212], 'start', [f1 - 3, 204]),
      ]}
    >
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
      {/* The ground's level, ticked on the soil's side, broken by the footing's neck: there before anything */}
      <path className="hv2-detail-thin" d={line([16, C.ground], [n0, C.ground]) + line([n1, C.ground], [344, C.ground])} />
      <path className="hv2-detail-hatch" d={ticks} />
      {/* The pad footing and its neck, in section, by convention, the anchors' shanks cast in it — up from below */}
      <Part n={0} dy={36}>
        <path d={footing} fill="url(#hv2-detail-base-concrete)" mask="url(#hv2-detail-base-clear)" />
        <path className="hv2-detail-thin" d={footing} />
        <path className="hv2-detail-key hv2-detail-hidden" d={shanks} />
      </Part>
      {/* The grout under the plate */}
      <Part n={1} dy={-14}>
        <path d={`${line([p0 - 4, C.grout], [p0, pBottom], [p1, pBottom], [p1 + 4, C.grout])}Z`} fill="url(#hv2-detail-base-grout)" />
        <path className="hv2-detail-thin" d={line([p0 - 4, C.grout], [p0, pBottom]) + line([p1, pBottom], [p1 + 4, C.grout])} />
      </Part>
      {/* The plate down onto the anchors */}
      <Part n={2} dy={-34}>
        <path className="hv2-detail-plate" d={rect(p0, pTop, p1, pBottom)} />
      </Part>
      {/* The column, let down onto the plate: its flanges' faces, broken off above */}
      <Part n={3} dy={-96}>
        <path className="hv2-detail-member" d={rect(l, C.top, r, pTop)} />
        <path className="hv2-detail-strong" d={line([l, C.top], [l, pTop]) + line([r, C.top], [r, pTop])} />
        <path className="hv2-detail-thin" d={line([l + C.flange, C.top], [l + C.flange, pTop]) + line([r - C.flange, C.top], [r - C.flange, pTop])} />
        <path className="hv2-detail-thin" d={breakLine([C.axis, C.top], [0, 1], C.half + 6)} />
      </Part>
      {/* The ribs, in from both sides */}
      <Part n={4} dy={-20}>
        <path className="hv2-detail-plate" d={ribs} />
      </Part>
      {/* The nuts and washers, down onto the anchors last */}
      <Part n={5} dy={-30}>
        <path className="hv2-detail-key" d={nuts} />
      </Part>
    </Sheet>
  );
}

// --- Г · The ridge: the two top chords meeting over the ridge post at the slope, each cut on the ridge's axis, the
// post's head cut under both, one gusset across the joint, screws in pairs along each chord and a column of bolts down
// the post; a short piece of the roof over it — a Z-profile purlin either side of the ridge, the profiled sheet on them
// and the ridge flashing over the apex.
const D = {
  apex: [180, 82] as Pt,
  chordHalf: 11,
  reach: 158,
  postHalf: 9,
  postEnd: 228,
  /** The gusset: half its width, its bottom edge, its corners' chamfer */
  gusset: [56, 168, 9] as const,
  /** The purlins: how far along each chord from the apex; the section's height, flange and lip */
  purlinAt: 76,
  purlin: [30, 11, 4] as const,
  /** The roof sheet's depth over the purlins */
  sheet: 5,
};

function RidgeDrawing() {
  const [right, left] = [heading(SLOPE), heading(180 - SLOPE)];
  const P = D.apex;
  const half = D.chordHalf;
  const axisCut = (side: number): Plane => [[P[0] + (side * GAP) / 3, 0], [side, 0]];
  const [chordL, chordR] = [left, right].map((d, index) => profileOf({ from: P, to: add(P, d, D.reach), half, broken: false, cuts: [axisCut(index ? 1 : -1)] }));
  const unders: Plane[] = [left, right].map((d) => {
    const up = d === left ? leftOf([-d[0], -d[1]]) : leftOf(d);
    return [add(P, up, -(half + GAP)), [-up[0], -up[1]]];
  });
  const post = profileOf({ from: P, to: [P[0], D.postEnd], half: D.postHalf, lip: 2.4, cuts: unders });
  // The gusset: its top edges inside the chords, its sides square down, its foot chamfered
  const [gw, gy, gc] = D.gusset;
  const inChord = (x: number): Pt => [x, P[1] - (half - 3) / Math.cos((SLOPE * Math.PI) / 180) + Math.abs(x - P[0]) * Math.tan((SLOPE * Math.PI) / 180)];
  const gusset = `${line(inChord(P[0] - gw), inChord(P[0]), inChord(P[0] + gw), [P[0] + gw, gy - gc], [P[0] + gw - gc, gy], [P[0] - gw + gc, gy], [P[0] - gw, gy - gc])}Z`;
  // The roof: a purlin on each chord over its node, square to it (x down the slope, y up from the chord's top face) — its
  // bottom flange to the ridge, as on Б; the profiled sheet on both, seen along its ribs (its depth a band); the ridge
  // flashing bent over the apex
  const [height, flange, lipLength] = D.purlin;
  const cos = Math.cos((SLOPE * Math.PI) / 180);
  const roof = [left, right].map((d) => {
    const up = d === left ? leftOf([-d[0], -d[1]]) : leftOf(d);
    const seat = add(add(P, d, D.purlinAt), up, half);
    const local = ([x, y]: Pt): Pt => add(add(seat, d, x), up, y);
    const zed = line(...([[-flange, lipLength + 1.2], [-flange, 1.2], [0, 1.2], [0, height], [flange, height], [flange, height - lipLength]] as const).map(local));
    const run = D.purlinAt + flange + 30;
    const face = (k: number) => line(add(add(P, d, run), up, half + height + 2 + k), [P[0], P[1] - (half + height + 2 + k) / cos]);
    return { zed, local, sheet: face(0) + face(D.sheet), ends: breakLine(add(add(P, d, run), up, half + height + 2 + D.sheet / 2), d, D.sheet / 2 + 4) };
  });
  const crest = P[1] - (half + height + 2 + D.sheet) / cos;
  const flashing = line(
    add([P[0] - 30, crest + 30 * Math.tan((SLOPE * Math.PI) / 180)], [0, -1.6]),
    [P[0], crest - 1.6 - 3],
    add([P[0] + 30, crest + 30 * Math.tan((SLOPE * Math.PI) / 180)], [0, -1.6]),
  );
  // Fasteners: pairs across each chord on the gusset, a column of bolts on the post, pairs across the post's foot
  const screws = [
    ...[chordL, chordR].flatMap((chord) => [16, 24, 40, 48].flatMap((s) => [chord.at(s, 4.2), chord.at(s, -4.2)])),
    ...[58, 66].flatMap((y) => [[P[0] - 3.6, P[1] + y] as Pt, [P[0] + 3.6, P[1] + y] as Pt]),
  ];
  const bolts = [[P[0], P[1] + 26] as Pt, [P[0], P[1] + 42] as Pt];
  const flow: Pt[][] = [
    [add(P, left, D.reach - 12), P, [P[0], D.postEnd - 8]],
    [add(P, right, D.reach - 12), P, [P[0], D.postEnd - 8]],
  ];
  return (
    <Sheet
      parts={6}
      flow={flow}
      names={[
        name('Верхні пояси ферми', [126, 130], 'end', chordL.at(110, -half + 1.4)),
        name('Прогони й покрівля', [236, 22], 'start', roof[1].local([0, height * 0.6])),
        name('Стійка', [192, 212], 'start', [P[0] + D.postHalf - 2.4, 206]),
        name('Фасонка', [248, 150], 'start', [P[0] + gw - 6, 150]),
        name('Болти й саморізи', [124, 192], 'end', [P[0] - 3.6, P[1] + 66], [P[0] - 3.6, P[1] + 42]),
      ]}
    >
      <Part n={1}>
        <path className="hv2-detail-plate" d={gusset} />
      </Part>
      {/* The post, up from below */}
      <Part n={0} dy={40}>
        <Profile shape={post} />
      </Part>
      {/* The chords, each down its own slope to the apex */}
      <Part n={2} dx={-30} dy={6}>
        <Profile shape={chordL} />
      </Part>
      <Part n={3} dx={30} dy={6}>
        <Profile shape={chordR} />
      </Part>
      {/* The purlins and the roof sheet over them, from above */}
      <Part n={4} dy={-30}>
        {roof.map(({ zed, sheet, ends }) => (
          <g key={zed}>
            <path className="hv2-detail-cut hv2-detail-strong" d={zed} />
            <path className="hv2-detail-thin" d={sheet + ends} />
          </g>
        ))}
        <path className="hv2-detail-thin" d={flashing} />
      </Part>
      <Part n={5}>
        <Screws at={screws} />
        <Bolts at={bolts} />
      </Part>
    </Sheet>
  );
}

// --- Д · A bottom-chord node: the bottom chord running through, the vertical and the two diagonals meeting it on one
// gusset, each web square-cut clear of the chord and of each other, screws in pairs along the chord and across each web,
// a bolt on each web.
const E = {
  node: [180, 150] as Pt,
  chordHalf: 11,
  reach: 166,
  postHalf: 9,
  postEnd: 12,
  /** The diagonals: their angle above the horizontal, half their width, their length to the break */
  diagonal: 50,
  diagonalHalf: 8,
  diagonalLength: 156,
  /** The gusset: how far along each diagonal its square edge stands; how far it shows under the chord */
  gussetAlong: 62,
  under: 4,
};

function ChordDrawing() {
  const N = E.node;
  const chord = profileOf({ from: [N[0] - E.reach, N[1]], to: [N[0] + E.reach, N[1]], half: E.chordHalf, broken: true });
  const chordTop: Plane = [[0, N[1] - E.chordHalf - GAP], [0, -1]];
  const post = profileOf({ from: N, to: [N[0], E.postEnd], half: E.postHalf, lip: 2.4, cuts: [chordTop] });
  const diagonals = [-1, 1].map((side) => {
    const up = heading(side < 0 ? 180 + E.diagonal : -E.diagonal);
    const clearOf: Plane[] = [chordTop, [[N[0] + side * (E.postHalf + GAP), 0], [side, 0]]];
    const cut = squareCut(N, up, E.diagonalHalf, clearOf);
    return { up, shape: profileOf({ from: add(N, up, cut), to: add(N, up, E.diagonalLength), half: E.diagonalHalf, lip: 2.2 }) };
  });
  // The gusset: its foot a little under the chord, its sides up past the chord, square across each diagonal, level over the post
  const yb = N[1] + E.chordHalf + E.under;
  const corners = diagonals.map(({ up }) => {
    const across = leftOf(up);
    const middle = add(N, up, E.gussetAlong);
    const outerSide = add(middle, across, up[0] < 0 ? -(E.diagonalHalf + 12) : E.diagonalHalf + 12);
    const innerSide = add(middle, across, up[0] < 0 ? E.diagonalHalf + 12 : -(E.diagonalHalf + 12));
    return { outerSide, innerSide };
  });
  const top = Math.min(corners[0].innerSide[1], corners[1].innerSide[1]);
  const [L, R] = corners;
  const gusset = `${line(
    [L.outerSide[0], yb - 6], [L.outerSide[0] + 6, yb], [R.outerSide[0] - 6, yb], [R.outerSide[0], yb - 6],
    R.outerSide, R.innerSide, [R.innerSide[0], top], [L.innerSide[0], top], L.innerSide, L.outerSide,
  )}Z`;
  const screws = [
    ...[-56, -48, -40, 40, 48, 56].flatMap((x) => [[N[0] + x, N[1] - 4.2] as Pt, [N[0] + x, N[1] + 4.2] as Pt]),
    ...[-28, -20, 20, 28].flatMap((x) => [[N[0] + x, N[1] + 4.2] as Pt]),
    ...[22, 29].flatMap((s) => [post.at(s, 3.6), post.at(s, -3.6)]),
    ...diagonals.flatMap(({ shape }) => [5, 12].flatMap((s) => [shape.at(s, 3.2), shape.at(s, -3.2)])),
  ];
  const bolts = [post.at(46, 0), ...diagonals.map(({ shape }) => shape.at(26, 0))];
  const [dl, dr] = diagonals;
  const flow: Pt[][] = [
    [add(N, dl.up, E.diagonalLength - 10), N, [N[0] + E.reach - 8, N[1]]],
    [add(N, dr.up, E.diagonalLength - 10), N, [N[0] - E.reach + 8, N[1]]],
    [[N[0], E.postEnd + 10], [N[0], N[1] - E.chordHalf]],
  ];
  return (
    <Sheet
      parts={6}
      flow={flow}
      names={[
        name('Розкоси', [84, 112], 'end', dl.shape.at(70, E.diagonalHalf - 1)),
        name('Стійка', [204, 26], 'start', post.at(124, -E.postHalf + 2.4)),
        name('Фасонка', [282, 112], 'start', [R.outerSide[0] - 4, 130]),
        name('Нижній пояс ферми', [24, 204], 'start', chord.at(46, -E.chordHalf + 1.4)),
        name('Саморізи й болти', [228, 204], 'start', [N[0] + 48, N[1] + 4.2], [N[0] + 28, N[1] + 4.2]),
      ]}
    >
      <Part n={1}>
        <path className="hv2-detail-plate" d={gusset} />
      </Part>
      {/* The chord, there first, along its own line */}
      <Part n={0} dx={-30}>
        <Profile shape={chord} />
      </Part>
      {/* The vertical, down from above; the diagonals, each down its own line */}
      <Part n={2} dy={-44}>
        <Profile shape={post} />
      </Part>
      {diagonals.map(({ up, shape }, index) => (
        <Part key={up.join()} n={3 + index} dx={up[0] * 34} dy={up[1] * 34}>
          <Profile shape={shape} />
        </Part>
      ))}
      <Part n={5}>
        <Screws at={screws} />
        <Bolts at={bolts} />
      </Part>
    </Sheet>
  );
}

export const PROOF_DETAILS: readonly ProofDetail[] = [
  {
    id: 'bearing',
    letter: 'А',
    title: 'Опора ферми на стіну',
    spoken: 'Кінець легкої сталевої ферми — опорна стійка з поясами й першим розкосом із С-профілів на спільній фасонці, на саморізах і болтах — стоїть на сталевій пластині з ребром, закріпленій анкерами в монолітному армопоясі поверх газобетонної стіни.',
    flow: 'Пояси → стійка → опорна пластина й анкери → армопояс → стіна',
    Drawing: BearingDrawing,
  },
  {
    id: 'purlin',
    letter: 'Б',
    title: 'Прогін на вузлі ферми',
    spoken: 'Прогін із Z-профілю лежить на верхньому поясі ферми просто над вузлом і тримається коротким кутиком на саморізах; під поясом стійка й розкіс із С-профілів сходяться на сталевій фасонці, скріплені саморізами й болтами.',
    flow: 'Прогін → верхній пояс → фасонка → стійка й розкіс',
    Drawing: PurlinDrawing,
  },
  {
    id: 'base',
    letter: 'В',
    title: 'База колони',
    spoken: 'Сталева колона з ребрами жорсткості стоїть на опорній плиті з підливкою під нею, анкерні болти з гайками заходять у бетонний фундамент із підколонником нижче рівня землі, а сам фундамент показано умовно.',
    flow: 'Колона → опорна плита → фундамент → ґрунт',
    Drawing: BaseDrawing,
  },
  {
    id: 'ridge',
    letter: 'Г',
    title: 'Коньковий вузол',
    spoken: 'У коньку два верхні пояси ферми з С-профілів сходяться над стійкою, і всі три з’єднані спільною сталевою фасонкою на болтах і саморізах; над ними по прогону з кожного боку, профільований лист і коньковий елемент.',
    flow: 'Верхні пояси → фасонка → стійка',
    Drawing: RidgeDrawing,
  },
  {
    id: 'chord',
    letter: 'Д',
    title: 'Вузол нижнього поясу',
    spoken: 'Нижній пояс ферми проходить вузол суцільно, а стійка й два розкоси з С-профілів сходяться на ньому на спільній сталевій фасонці, скріплені саморізами й болтами.',
    flow: 'Розкоси й стійка → фасонка → нижній пояс в обидва боки',
    Drawing: ChordDrawing,
  },
];
