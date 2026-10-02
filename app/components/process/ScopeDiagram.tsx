import type { DeliveryFormatId } from '../../types/deliveryModel';

// /yak-pratsyuiemo — how much of one building each format covers, as one oblique line drawing of a portal-frame
// hangar in four layers: foundation, frame, envelope, roof. The same building in all three cards; what changes is which
// layers are RUBIKON's (copper) and what surrounds the object:
//   comprehensive — every layer, one copper boundary: RUBIKON coordinates the agreed scope;
//   work-package  — the frame only, inside the customer's object;
//   subcontract   — the frame only, and the whole object sits inside the general contractor's project.
// The card's text says the same in words, so the drawing is hidden from assistive technology. Motion (drawing, then the
// scope, then the context) lives in delivery.css and runs once (ProcessMotion).

type Point = readonly [number, number, number];

/**
 * Oblique projection: span x to the right, height z up, depth d receding to the upper left at 45°. The depth axis must
 * not run along either roof slope (±0.5 here): the old drawing receded at 0.4 : 0.82 — the left slope's own angle — so
 * that roof plane collapsed into the eave and ridge lines and the frames stopped reading as frames (owner, 02.10). At
 * 45° every portal frame is a clear outline: two posts, two rafters.
 */
const OX = 126;
const OY = 210;
function p([x, d, z]: Point): string {
  return `${(OX + x - d * 0.4).toFixed(1)},${(OY - z - d * 0.4).toFixed(1)}`;
}
const poly = (points: readonly Point[]) => points.map(p).join(' ');
const line = (from: Point, to: Point) => `M${p(from)}L${p(to)}`;

const W = 104; // span
const EAVE = 58;
const RIDGE = 84;
const DEPTH = 168;
const FRAMES = [0, 42, 84, 126, 168];

const FOUNDATION = [
  poly([[0, 0, 0], [W, 0, 0], [W, DEPTH, 0], [0, DEPTH, 0]]),
  poly([[0, 0, 0], [W, 0, 0], [W, 0, -6], [0, 0, -6]]),
  poly([[0, 0, 0], [0, DEPTH, 0], [0, DEPTH, -6], [0, 0, -6]]),
];
const FRAME = [
  // back to front, so a nearer frame is drawn over a farther one
  ...[...FRAMES].reverse().map((d) => `M${p([0, d, 0])}L${p([0, d, EAVE])}L${p([W / 2, d, RIDGE])}L${p([W, d, EAVE])}L${p([W, d, 0])}`),
  line([0, 0, EAVE], [0, DEPTH, EAVE]),
  line([W, 0, EAVE], [W, DEPTH, EAVE]),
  line([W / 2, 0, RIDGE], [W / 2, DEPTH, RIDGE]),
];
// The visible side wall is the left one (x = 0) and the front gable
const ENVELOPE = [
  poly([[0, 0, 0], [0, DEPTH, 0], [0, DEPTH, EAVE], [0, 0, EAVE]]),
  poly([[0, 0, 0], [W, 0, 0], [W, 0, EAVE], [W / 2, 0, RIDGE], [0, 0, EAVE]]),
];
const ROOF = [
  poly([[0, 0, EAVE], [W / 2, 0, RIDGE], [W / 2, DEPTH, RIDGE], [0, DEPTH, EAVE]]),
  poly([[W / 2, 0, RIDGE], [W, 0, EAVE], [W, DEPTH, EAVE], [W / 2, DEPTH, RIDGE]]),
];

type Layer = 'foundation' | 'frame' | 'envelope' | 'roof';
const LAYERS: readonly Layer[] = ['foundation', 'frame', 'envelope', 'roof'];
const SCOPE: Record<DeliveryFormatId, readonly Layer[]> = {
  comprehensive: LAYERS,
  'work-package': ['frame'],
  subcontract: ['frame'],
};
const SHAPES: Record<Layer, { kind: 'polygon' | 'path'; items: readonly string[] }> = {
  foundation: { kind: 'polygon', items: FOUNDATION },
  envelope: { kind: 'polygon', items: ENVELOPE },
  frame: { kind: 'path', items: FRAME },
  roof: { kind: 'polygon', items: ROOF },
};
/** Drawing order: the context layers first, then RUBIKON's — so a shared edge (an eave, the ridge) stays copper. */
const ORDER: readonly Layer[] = ['foundation', 'envelope', 'frame', 'roof'];

/** Where the callout points: the near post of the middle frame (on the visible left wall). */
const [FX, FY] = p([0, 84, 30]).split(',').map(Number) as [number, number];

export function ScopeDiagram({ format }: Readonly<{ format: DeliveryFormatId }>) {
  const scope = SCOPE[format];
  // Scope layers light up in build order: foundation → frame → envelope → roof.
  const cls = (layer: Layer) => {
    const index = scope.indexOf(layer);
    const scoped = index >= 0 ? ` is-scope sd-step-${index}` : '';
    return `sd-layer sd-${layer}${scoped}`;
  };

  return (
    <svg className={`scope-diagram scope-diagram-${format}`} viewBox="0 0 300 236" aria-hidden="true" focusable="false">
      {format === 'subcontract' && (
        <g className="sd-context">
          <rect className="sd-boundary sd-boundary-outer" x="6" y="14" width="288" height="218" rx="4" pathLength={1} />
          <rect className="sd-tab" x="6" y="3" width="172" height="21" rx="2" />
          <text className="sd-tab-label" x="14" y="18">Проєкт генпідрядника</text>
        </g>
      )}
      {format === 'comprehensive' && (
        <g className="sd-context">
          <rect className="sd-boundary sd-boundary-scope" x="20" y="42" width="248" height="182" rx="3" pathLength={1} />
          <text className="sd-label sd-label-scope" x="28" y="34">Обсяг RUBIKON</text>
        </g>
      )}
      {format !== 'comprehensive' && (
        <g className="sd-context">
          <rect className="sd-boundary sd-boundary-object" x="20" y="42" width="248" height="182" rx="3" pathLength={1} />
          <text className="sd-label" x="28" y="36">{format === 'subcontract' ? 'Об’єкт у складі проєкту' : 'Об’єкт замовника'}</text>
        </g>
      )}

      {[...ORDER.filter((layer) => !scope.includes(layer)), ...ORDER.filter((layer) => scope.includes(layer))].map((layer) => (
        <g className={cls(layer)} key={layer}>
          {SHAPES[layer].items.map((shape) => (SHAPES[layer].kind === 'path'
            ? <path key={shape} d={shape} pathLength={1} />
            : <polygon key={shape} points={shape} pathLength={1} />))}
        </g>
      ))}

      {format !== 'comprehensive' && (
        <g className="sd-context sd-callout">
          {/* Leader down-left into the clear corner under the receding wall, so the label never sits on the frame */}
          <path className="sd-leader" d={`M${FX},${FY}L${FX - 30},${FY + 34}L${FX - 36},${FY + 34}`} pathLength={1} />
          <circle className="sd-dot" cx={FX} cy={FY} r="3" />
          <text className="sd-label sd-label-scope" x="26" y={FY + 48}>Обсяг</text>
          <text className="sd-label sd-label-scope" x="26" y={FY + 61}>RUBIKON</text>
        </g>
      )}
    </svg>
  );
}
