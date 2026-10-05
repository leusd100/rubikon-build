import { memo, type CSSProperties } from 'react';
import { homeProofContour } from '../../data/homeProofContour';
import { homeProofDetailSpots, homeProofFrame, homeProofParts, type PointLoad } from '../../data/homeProofFrame';
import { homeProofMarks, homeProofMeasures } from '../../data/homeProofMeasures';

// The layers ProofContour lays right of its seam, all in the photo's own pixels on one canvas:
//   ProofFrame — the SCHEME of a frame of this object's type inside its silhouette (app/data/homeProofFrame.ts):
//     illustrative, the gable's own plane in the sheet's paper colour, clipped to the drawn outline; what stands behind
//     that plane solid in copper, fainter with depth (owner, 04.10: «як ми робили» on /angary — no dashes); the walls as
//     aerated-concrete blockwork in perspective, cut in section at both corners; and the snow's way through it, link by link
//     (the «Сніг» layer; the «Вітер» layer the same in its own cool tint): the members it passes lit in that paper colour, the load itself in its own lighter,
//     dotted tint — the legend's «навантаження», never the measured copper (review, 04.10);
//   ProofMarks and ProofLabels — the measured figures' marks on the contour's own lines and their words
//     (app/data/homeProofMeasures.ts), and the scheme's names on its members.
// Which of them shows is the stage's data-layer (home-v2.css). On the first view nothing draws in on its own: the seam
// sweeps across the gable and uncovers the drawing whole, as a plotter would (ProofContour). Line weights follow a
// drawing's scale (home-v2.css, --lw-*): the measured outline heaviest, then chords and columns, then webs, purlins and
// what stands behind, the blockwork and hatching finest.

const { width: W, height: H } = homeProofContour.photo;
type Pt = readonly [number, number];
const d = (points: readonly Pt[], closed = false) => `M${points.map(([x, y]) => `${x} ${y}`).join('L')}${closed ? 'Z' : ''}`;
/** The section hatch's step in photo pixels per frame width (home-v2.css picks one by the --u steps): a narrower frame
 *  draws it coarser, so on a phone it stays lines, not grey */
const HATCHES = [['hv2-proof-hatch', 6], ['hv2-proof-hatch-m', 9], ['hv2-proof-hatch-l', 13]] as const;

/** The old generated sketch, for the test mode only (/?xray=sketch). It has its own composition: laid on the photo by
 *  one scale and shift through its ridge and right base corner, it still misses the gates and the left half */
export const SKETCH = {
  src: '/media/home-v2/concepts/hangar-xray-1774w.webp',
  srcSet: '/media/home-v2/concepts/hangar-xray-1100w.webp 1100w, /media/home-v2/concepts/hangar-xray-1774w.webp 1774w',
  width: 1774,
  height: 887,
};

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
/** `wind`: the «Вітер» layer is on — the scheme's name says the wind's way too */
/** `buildRun`: «Як це будується» — a new key on the scheme restarts its assembly (home-v2.css, data-building) */
export const ProofFrame = memo(function ProofFrame({ buildRun, loadRun, windRun, shown, wind: windOn, ready }: Readonly<{ buildRun: number; loadRun: number; windRun: number; shown: boolean; wind: boolean; ready: boolean }>) {
  const { silhouette, walls, members, nodes, load, wind, label, windLabel } = homeProofFrame;
  const inside = members.filter((member) => member.group !== 'footing');
  const footings = members.filter((member) => member.group === 'footing');
  return (
    <svg className="hv2-proof-frame" data-layer="scheme" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={windOn ? `${label} ${windLabel}` : label} aria-hidden={shown ? undefined : true}>
      <defs>
        <clipPath id="hv2-proof-silhouette">
          {silhouette.map((outline, index) => <path key={index} d={d(outline, true)} />)}
        </clipPath>
        {/* The gable's face less its gates: the blockwork stops at the openings */}
        <clipPath id="hv2-proof-face">
          <path d={d(walls.gable, true) + walls.holes.map((hole) => d(hole, true)).join('')} clipRule="evenodd" />
        </clipPath>
        {/* The cladding's ribs, lit with «Стінові панелі» */}
        <pattern id="hv2-proof-ribs" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" />
          <path d="M3 0V14M10 0V14" />
        </pattern>
        {/* A section's hatch: what the scheme's plane cuts — the long walls, the footings */}
        {HATCHES.map(([id, step]) => (
          <pattern key={id} id={id} className="hv2-proof-hatch" width={step} height={step} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={step} height={step} />
            <path d={`M0 0V${step}`} />
          </pattern>
        ))}
        <marker id="hv2-proof-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" />
        </marker>
        {/* The legs' heads: their lines are three times as heavy as the snow's */}
        <marker id="hv2-proof-foot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.3" markerHeight="2.3" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" />
        </marker>
        {/* …and the wind's, in its own colour */}
        <marker id="hv2-proof-head-wind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" />
        </marker>
        <marker id="hv2-proof-foot-wind" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.3" markerHeight="2.3" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" />
        </marker>
      </defs>
      <g className="hv2-proof-scheme" key={`build-${buildRun}`}>
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
              data-group={member.group}
              data-depth={member.depth}
              data-hidden={member.hidden ? '' : undefined}
            />
          ))}
          {/* The parts the scope's cells light (ScopeCells): the roof's planes and the cladding on the walls' faces, drawn
              only while their cell is pointed at (home-v2.css, the stage's data-focus) */}
          <path className="hv2-proof-part" data-part="roof" d={d(homeProofParts.roof, true)} />
          <path className="hv2-proof-part" data-part="walls" d={homeProofParts.walls.map((face) => d(face, true)).join('')} fillRule="evenodd" />
          {/* Where the purlins bear: an open node on every top-chord panel point of the gable's truss */}
          <g className="hv2-proof-nodes">
            {nodes.map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.4" />)}
          </g>
        </g>
        {/* The nodes drawn as details (ProofContour's А, Б, В): a dashed ring round each */}
        <g className="hv2-proof-detail-rings">
          {homeProofDetailSpots.map(({ id, ring: [x, y], radius }) => <circle key={id} data-detail={id} cx={x} cy={y} r={radius} />)}
        </g>
        {/* Under the ground, «умовно»: in section under the cut walls and the column, the long wall's strip going back */}
        {footings.map((member, index) => (
          <path key={index} className="hv2-proof-footing" d={d(member.points, member.closed)} data-depth={member.depth} data-cut={member.closed ? '' : undefined} />
        ))}
      </g>
      {/* The snow's way, link by link — replayed on every press of «Сніг» (a new key restarts it) */}
      <g className="hv2-proof-load" key={loadRun}>
        {/* A load spread over the roof, as a drawing writes it: one line, an even comb of arrows down from it */}
        <g className="hv2-proof-snow" style={{ '--n': 0 } as CSSProperties}>
          <path className="hv2-proof-comb" d={d(load.comb)} />
          {load.arrows.map(([from, to], index) => (
            <path key={index} d={d([from, to])} markerEnd="url(#hv2-proof-head)" style={{ '--k': index } as CSSProperties} />
          ))}
        </g>
        {/* The strip one truss carries: the snow settles on it */}
        <g className="hv2-proof-roof" style={{ '--n': 1 } as CSSProperties}>
          <path d={d(load.roof, true)} />
          <path className="hv2-proof-roof-edge" d={d(load.roof.slice(0, 3))} />
        </g>
        <g className="hv2-proof-bearing" style={{ '--n': 2 } as CSSProperties}>
          {nodes.map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.4" />)}
        </g>
        <g className="hv2-proof-lit-truss" style={{ '--n': 3 } as CSSProperties}>
          {members.filter((member) => member.depth === 0 && (member.group === 'truss' || member.group === 'web')).map((member, index) => (
            <path key={index} d={d(member.points)} />
          ))}
        </g>
        {/* Each lit link: a clean light line on a dark casing, as the measured lines are kept legible — no glow */}
        {load.links.map(({ link, points }, index) => (
          <g key={index} className="hv2-proof-link" data-link={link} style={{ '--n': link } as CSSProperties}>
            <path className="hv2-proof-link-casing" d={d(points)} />
            <path d={d(points)} />
          </g>
        ))}
        {load.legs.map((leg, index) => (
          <path key={index} className="hv2-proof-flow" d={d(leg)} markerEnd="url(#hv2-proof-foot)" style={{ '--n': 3 } as CSSProperties} />
        ))}
        <g className="hv2-proof-ground" style={{ '--n': 6 } as CSSProperties}>
          {load.ground.map((tick, index) => <path key={index} d={d(tick)} />)}
        </g>
      </g>
      {/* The wind's way — replayed on every press of «Вітер»: the gusts and the lift, then link by link to the ground */}
      <g className="hv2-proof-wind" key={`wind-${windRun}`}>
        {/* the long gusts where the frame has room for them, the short ones in a phone's close-up (home-v2.css) */}
        {([['wide', wind.gustsWide], ['narrow', wind.gusts]] as const).map(([size, set]) => (
          <g key={size} className="hv2-proof-gusts" data-size={size} style={{ '--n': 0 } as CSSProperties}>
            {set.map(([from, to], index) => (
              <path key={index} d={d([from, to])} markerEnd="url(#hv2-proof-head-wind)" style={{ '--k': index } as CSSProperties} />
            ))}
          </g>
        ))}
        <g className="hv2-proof-lift" style={{ '--n': 1 } as CSSProperties}>
          {wind.lift.map(([from, to], index) => (
            <path key={index} d={d([from, to])} markerEnd="url(#hv2-proof-head-wind)" style={{ '--k': index } as CSSProperties} />
          ))}
        </g>
        {wind.links.map(({ link, points }, index) => (
          <g key={index} className="hv2-proof-link" data-link={link} style={{ '--n': link } as CSSProperties}>
            <path className="hv2-proof-link-casing" d={d(points)} />
            <path d={d(points)} />
          </g>
        ))}
        {wind.legs.map((leg, index) => (
          <path key={index} className="hv2-proof-flow" d={d(leg)} markerEnd="url(#hv2-proof-foot-wind)" style={{ '--n': 3 } as CSSProperties} />
        ))}
        <g className="hv2-proof-reactions" style={{ '--n': 6 } as CSSProperties}>
          {wind.reactions.map(([from, to], index) => <path key={index} d={d([from, to])} markerEnd="url(#hv2-proof-head-wind)" />)}
        </g>
      </g>
    </svg>
  );
});

export const ProofMarks = memo(function ProofMarks() {
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
        {tags.map(({ id, anchor, at: to, atNarrow, wideOnly }) => (
          <g key={id} data-tag={id} data-wide-only={wideOnly ? '' : undefined}>
            <path d={d([anchor, to])} data-wide={atNarrow ? '' : undefined} />
            {atNarrow && <path d={d([anchor, atNarrow])} data-narrow="" />}
            <circle cx={anchor[0]} cy={anchor[1]} r="2.6" />
          </g>
        ))}
      </g>
    </svg>
  );
});

const place = ([x, y]: Pt, [cx, cy]: Pt = [x, y], [nx, ny]: Pt = [x, y]): CSSProperties =>
  ({
    '--x': `${(x / W) * 100}%`, '--y': `${(y / H) * 100}%`, '--cx': `${(cx / W) * 100}%`, '--cy': `${(cy / H) * 100}%`,
    '--nx': `${(nx / W) * 100}%`, '--ny': `${(ny / H) * 100}%`,
  }) as CSSProperties;

export const ProofLabels = memo(function ProofLabels() {
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
        <span key={tag.id} className="hv2-proof-tag" data-tag={tag.id} data-align={tag.align} data-wide-only={tag.wideOnly ? '' : undefined} style={place(tag.at, tag.at, tag.atNarrow)}>{tag.text}</span>
      ))}
    </div>
  );
});

/** A phone's names: numbers on the members they name (homeProofFrame's tags, in the same order as ProofContour's key) */
export const ProofKeyPins = memo(function ProofKeyPins() {
  return (
    <div className="hv2-proof-keypins" aria-hidden="true">
      {homeProofFrame.tags.map((tag, index) => (
        <span key={tag.id} data-tag={tag.id} style={place(tag.keyAt ?? tag.anchor)}>{index + 1}</span>
      ))}
    </div>
  );
});

/** «Точка навантаження» (homeProofFrame's pointLoadAt): the weight over the roof, its landing on the nearest purlin, and
 *  its way through the truss to the supports either side and down — each way drawn as heavy as its share. Its own layer,
 *  so a pointer moving over the roof redraws these few paths, not the scheme */
export const ProofPoint = memo(function ProofPoint({ point }: Readonly<{ point: PointLoad | null }>) {
  return (
    <svg className="hv2-proof-point" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" data-on={point ? '' : undefined}>
      <defs>
        <marker id="hv2-proof-point-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" />
        </marker>
        <marker id="hv2-proof-point-foot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2" markerHeight="2" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" />
        </marker>
      </defs>
      {point && (
        <g key={`${point.node[0]}`}>
          {point.legs.map(({ points, share }, index) => (
            <g key={index} className="hv2-proof-point-leg" style={{ '--share': share.toFixed(3) } as CSSProperties}>
              <path className="hv2-proof-link-casing" d={d(points)} />
              <path className="hv2-proof-point-way" d={d(points)} />
              <path className="hv2-proof-flow" d={d(points)} markerEnd="url(#hv2-proof-point-foot)" />
            </g>
          ))}
          <path className="hv2-proof-point-landing" d={d([point.roof, point.node])} />
          <circle className="hv2-proof-point-node" cx={point.node[0]} cy={point.node[1]} r="4.2" />
          <rect className="hv2-proof-point-weight" x={point.arrow[0][0] - 9} y={point.arrow[0][1] - 16} width="18" height="14" />
          <path className="hv2-proof-point-arrow" d={d(point.arrow)} markerEnd="url(#hv2-proof-point-head)" />
        </g>
      )}
    </svg>
  );
});
