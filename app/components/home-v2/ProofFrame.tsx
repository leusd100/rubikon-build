import type { CSSProperties } from 'react';
import { homeProofContour } from '../../data/homeProofContour';
import { homeProofFrame, type FrameMember } from '../../data/homeProofFrame';
import { homeProofMarks, homeProofMeasures } from '../../data/homeProofMeasures';

// The layers ProofContour lays right of its seam, all in the photo's own pixels on one canvas:
//   ProofFrame — the SCHEME of a frame of this object's type inside its silhouette (app/data/homeProofFrame.ts):
//     illustrative, the gable's own plane in the sheet's paper colour, clipped to the drawn outline; what stands behind
//     that plane solid in copper, fainter with depth (owner, 04.10: «як ми робили» on /angary — no dashes); the walls as
//     aerated-concrete blockwork in perspective, cut in section at both corners; and the snow's way through it, link by link
//     (the «Навантаження» layer): the members it passes lit in that paper colour, the load itself in its own lighter,
//     dotted tint — the legend's «навантаження», never the measured copper (review, 04.10);
//   ProofMarks and ProofLabels — the measured figures' marks on the contour's own lines and their words
//     (app/data/homeProofMeasures.ts), and the scheme's names on its members.
// Which of them shows is the stage's data-layer (home-v2.css). The order they draw in on the first view is set here, as
// a delay per part: the walls, the gable's truss from the ridge outward, then the bays behind it and the names.

const { width: W, height: H } = homeProofContour.photo;
type Pt = readonly [number, number];
const d = (points: readonly Pt[], closed = false) => `M${points.map(([x, y]) => `${x} ${y}`).join('L')}${closed ? 'Z' : ''}`;
const [apexX] = homeProofMarks.height[1];

/** The old generated sketch, for the test mode only (/?xray=sketch). It has its own composition: laid on the photo by
 *  one scale and shift through its ridge and right base corner, it still misses the gates and the left half */
export const SKETCH = {
  src: '/media/home-v2/concepts/hangar-xray-1774w.webp',
  srcSet: '/media/home-v2/concepts/hangar-xray-1100w.webp 1100w, /media/home-v2/concepts/hangar-xray-1774w.webp 1774w',
  width: 1774,
  height: 887,
};

/** When a member draws on the first view, ms after the sheet starts arriving */
function delayOf(member: FrameMember, index: number) {
  const [[x0], [x1]] = [member.points[0], member.points.at(-1)!];
  const fromRidge = Math.abs((x0 + x1) / 2 - apexX) / W;
  switch (member.group) {
    case 'wall': return 2600 + index * 40;
    case 'footing': return 2900;
    case 'column': return member.depth === 0 ? 3050 : 3900 + member.depth * 150;
    case 'truss': return member.depth === 0 ? 3200 : 3900 + member.depth * 150;
    case 'web': return 3350 + fromRidge * 900;
    case 'purlin': return 3900 + member.depth * 180 + fromRidge * 300;
    case 'bracing': return 4200;
    default: return 3200;
  }
}

/** Where (u along the base from the near corner, v up from the base) lands on a wall face: the square-to-quad homography
 *  of its four corners — base near, base far, top far, top near — so courses and joints recede as the photo does */
function faceOf([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]: readonly Pt[]) {
  const [dx1, dx2, dx3] = [x1 - x2, x3 - x2, x0 - x1 + x2 - x3];
  const [dy1, dy2, dy3] = [y1 - y2, y3 - y2, y0 - y1 + y2 - y3];
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  const [a, b, c] = [x1 - x0 + g * x1, x3 - x0 + h * x3, x0];
  const [e, f, k] = [y1 - y0 + g * y1, y3 - y0 + h * y3, y0];
  return (u: number, v: number): Pt => {
    const w = g * u + h * v + 1;
    return [(a * u + b * v + c) / w, (e * u + f * v + k) / w];
  };
}
const at1 = (value: number) => Math.round(value * 10) / 10;
/** Aerated-concrete blockwork on a face: its courses, and the joints of every course, offset by half a block */
function blockwork(face: readonly Pt[], courses: number, blocks: number) {
  const on = faceOf(face);
  const segment = (from: Pt, to: Pt) => `M${at1(from[0])} ${at1(from[1])}L${at1(to[0])} ${at1(to[1])}`;
  let path = '';
  for (let row = 1; row < courses; row += 1) path += segment(on(0, row / courses), on(1, row / courses));
  for (let row = 0; row < courses; row += 1) {
    for (let joint = row % 2 ? 0.5 : 1; joint < blocks; joint += 1) path += segment(on(joint / blocks, row / courses), on(joint / blocks, (row + 1) / courses));
  }
  return path;
}

/** `shown`: false while another layer is on the right (the scheme fades out, and its name must not be read).
 *  `ready`: after hydration — the blockwork's thousand short strokes are drawn on the client only, to keep the page's HTML
 *  light; without them the scheme is whole */
export function ProofFrame({ loadRun, shown, ready }: Readonly<{ loadRun: number; shown: boolean; ready: boolean }>) {
  const { silhouette, walls, members, nodes, load, label } = homeProofFrame;
  const inside = members.filter((member) => member.group !== 'footing');
  const footings = members.filter((member) => member.group === 'footing');
  return (
    <svg className="hv2-proof-frame" data-layer="scheme" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} aria-hidden={shown ? undefined : true}>
      <defs>
        <clipPath id="hv2-proof-silhouette">
          {silhouette.map((outline, index) => <path key={index} d={d(outline, true)} />)}
        </clipPath>
        {/* The gable's face less its gates: the blockwork stops at the openings */}
        <clipPath id="hv2-proof-face">
          <path d={d(walls.gable, true) + walls.holes.map((hole) => d(hole, true)).join('')} clipRule="evenodd" />
        </clipPath>
        {/* A section's hatch: what the scheme's plane cuts — the long walls, the footings */}
        <pattern id="hv2-proof-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" />
          <path d="M0 0V6" />
        </pattern>
        <marker id="hv2-proof-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" />
        </marker>
        {/* The legs' heads: their lines are three times as heavy as the snow's */}
        <marker id="hv2-proof-foot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.2" markerHeight="2.2" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" />
        </marker>
      </defs>
      <g className="hv2-proof-scheme">
        <g clipPath="url(#hv2-proof-silhouette)">
          {ready && (
            <>
              <path className="hv2-proof-blocks" d={blockwork(walls.gable, 24, 44)} clipPath="url(#hv2-proof-face)" />
              <path className="hv2-proof-blocks" data-depth="1" d={blockwork(walls.long, 24, 22)} />
            </>
          )}
          {walls.cuts.map((cut, index) => <path key={index} className="hv2-proof-cut" d={d(cut, true)} />)}
          {inside.map((member, index) => (
            <path
              key={index}
              d={d(member.points, member.closed)}
              // A member in the gable's plane draws in along its length; a hidden one (dashed) only fades in
              pathLength={member.hidden ? undefined : 1}
              data-group={member.group}
              data-depth={member.depth}
              data-hidden={member.hidden ? '' : undefined}
              style={{ '--d': `${Math.round(delayOf(member, index))}ms` } as CSSProperties}
            />
          ))}
          {/* Where the purlins bear: a block on every top-chord node of the gable's truss */}
          <g className="hv2-proof-nodes">
            {nodes.map(([x, y]) => <rect key={x} x={x - 3.2} y={y - 6} width="6.4" height="5.2" />)}
          </g>
        </g>
        {/* Under the ground, «умовно»: in section under the cut walls and the column, the long wall's strip going back */}
        {footings.map((member, index) => (
          <path key={index} className="hv2-proof-footing" d={d(member.points, member.closed)} data-depth={member.depth} data-cut={member.closed ? '' : undefined} />
        ))}
      </g>
      {/* The snow's way, link by link — replayed on every press of «Навантаження» (a new key restarts it) */}
      <g className="hv2-proof-load" key={loadRun}>
        <g className="hv2-proof-snow" style={{ '--n': 0 } as CSSProperties}>
          {load.arrows.map(([from, to], index) => (
            <path key={index} d={d([from, to])} markerEnd="url(#hv2-proof-head)" style={{ '--k': index } as CSSProperties} />
          ))}
        </g>
        <path className="hv2-proof-roof" d={d(load.roof, true)} style={{ '--n': 1 } as CSSProperties} />
        <g className="hv2-proof-bearing" style={{ '--n': 2 } as CSSProperties}>
          {nodes.map(([x, y]) => <rect key={x} x={x - 3.2} y={y - 6} width="6.4" height="5.2" />)}
        </g>
        <g className="hv2-proof-lit-truss" style={{ '--n': 3 } as CSSProperties}>
          {members.filter((member) => member.depth === 0 && (member.group === 'truss' || member.group === 'web')).map((member, index) => (
            <path key={index} d={d(member.points)} />
          ))}
        </g>
        {load.links.map(({ link, points }, index) => (
          <path key={index} className="hv2-proof-link" d={d(points)} data-link={link} style={{ '--n': link } as CSSProperties} />
        ))}
        {load.legs.map((leg, index) => (
          <path key={index} className="hv2-proof-flow" d={d(leg)} markerEnd="url(#hv2-proof-foot)" style={{ '--n': 3 } as CSSProperties} />
        ))}
        <g className="hv2-proof-ground" style={{ '--n': 6 } as CSSProperties}>
          {load.ground.map((tick, index) => <path key={index} d={d(tick)} />)}
        </g>
      </g>
    </svg>
  );
}

export function ProofMarks() {
  const { slope, gates, width, widthTicks, height, heightTicks } = homeProofMarks;
  const { tags } = homeProofFrame;
  const at = (id: string) => homeProofMeasures.find((measure) => measure.id === id)!.at;
  return (
    <svg className="hv2-proof-marks" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <g data-mark="slope" data-on-frame="">
        <path d={d(slope.arc)} />
        <path className="hv2-proof-mark-level" d={d(slope.level)} />
        {/* to the label over the roof in «Каркас», a short one down to it in «Контур» */}
        <path className="hv2-proof-leader" data-for="frame" d={d([slope.anchor, at('slope')])} />
        <path className="hv2-proof-leader" data-for="contour" d={d([slope.arc[0], [slope.arc[0][0] - 3, slope.arc[0][1] + 18]])} />
      </g>
      <g data-mark="gates">
        {gates.map((tick, index) => <path key={index} d={d(tick)} />)}
      </g>
      <g data-mark="proportion">
        <path d={d(width)} />
        <path d={d(height)} />
        {[...widthTicks, ...heightTicks].map((tick, index) => <path key={index} d={d(tick)} />)}
      </g>
      <g className="hv2-proof-tag-leaders">
        {tags.map(({ id, anchor, at: to }) => (
          <g key={id} data-tag={id}>
            <path d={d([anchor, to])} />
            <circle cx={anchor[0]} cy={anchor[1]} r="2.6" />
          </g>
        ))}
      </g>
    </svg>
  );
}

const place = ([x, y]: Pt, [cx, cy]: Pt = [x, y]): CSSProperties =>
  ({ '--x': `${(x / W) * 100}%`, '--y': `${(y / H) * 100}%`, '--cx': `${(cx / W) * 100}%`, '--cy': `${(cy / H) * 100}%` }) as CSSProperties;

export function ProofLabels() {
  return (
    <div className="hv2-proof-labels" aria-hidden="true">
      {homeProofMeasures.map((measure) => (
        <span
          key={measure.id}
          className="hv2-proof-measure"
          data-measure={measure.id}
          data-align={measure.align}
          data-align-contour={measure.alignContour ?? measure.align}
          data-on-frame={measure.onFrame ? '' : undefined}
          style={place(measure.at, measure.atContour)}
        >
          {measure.title}
          <small>{measure.detail}</small>
        </span>
      ))}
      {homeProofFrame.tags.map((tag) => (
        <span key={tag.id} className="hv2-proof-tag" data-tag={tag.id} data-align={tag.align} style={place(tag.at)}>{tag.text}</span>
      ))}
    </div>
  );
}
