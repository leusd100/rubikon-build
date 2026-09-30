import type { DeliveryFormatId } from '../../types/deliveryModel';

// /yak-pratsyuiemo — how much of one building each format covers, as one axonometric line drawing of a portal-frame
// hangar in four layers: foundation, frame, envelope, roof. The same building in all three cards; what changes is which
// layers are RUBIKON's (copper) and what surrounds the object:
//   comprehensive — every layer, one copper boundary: RUBIKON coordinates the agreed scope;
//   work-package  — the frame only, inside the customer's object;
//   subcontract   — the frame only, and the whole object sits inside the general contractor's project.
// The card's text says the same in words, so the drawing is hidden from assistive technology. Motion (drawing, then the
// scope, then the context) lives in delivery.css and runs once (ProcessMotion).

type Point = readonly [number, number, number];

/** Oblique projection: width x to the right, depth d receding up-right, height z up. */
function p([x, d, z]: Point): string {
  return `${(34 + x + d * 0.82).toFixed(1)},${(206 - z - d * 0.4).toFixed(1)}`;
}
const poly = (points: readonly Point[]) => points.map(p).join(' ');
const line = (from: Point, to: Point) => `M${p(from)}L${p(to)}`;

const W = 90; // span
const EAVE = 54;
const RIDGE = 78;
const DEPTH = 144;
const FRAMES = [0, 36, 72, 108, 144];

const FOUNDATION = [
  poly([[0, 0, 0], [W, 0, 0], [W, DEPTH, 0], [0, DEPTH, 0]]),
  poly([[0, 0, 0], [W, 0, 0], [W, 0, -6], [0, 0, -6]]),
  poly([[W, 0, 0], [W, DEPTH, 0], [W, DEPTH, -6], [W, 0, -6]]),
];
const FRAME = [
  ...FRAMES.map((d) => `M${p([0, d, 0])}L${p([0, d, EAVE])}L${p([W / 2, d, RIDGE])}L${p([W, d, EAVE])}L${p([W, d, 0])}`),
  line([0, 0, EAVE], [0, DEPTH, EAVE]),
  line([W, 0, EAVE], [W, DEPTH, EAVE]),
  line([W / 2, 0, RIDGE], [W / 2, DEPTH, RIDGE]),
];
const ENVELOPE = [
  poly([[W, 0, 0], [W, DEPTH, 0], [W, DEPTH, EAVE], [W, 0, EAVE]]),
  poly([[0, 0, 0], [W, 0, 0], [W, 0, EAVE], [W / 2, 0, RIDGE], [0, 0, EAVE]]),
];
const ROOF = [
  poly([[W / 2, 0, RIDGE], [W, 0, EAVE], [W, DEPTH, EAVE], [W / 2, DEPTH, RIDGE]]),
  poly([[0, 0, EAVE], [W / 2, 0, RIDGE], [W / 2, DEPTH, RIDGE], [0, DEPTH, EAVE]]),
];

type Layer = 'foundation' | 'frame' | 'envelope' | 'roof';
const LAYERS: readonly Layer[] = ['foundation', 'frame', 'envelope', 'roof'];
const SCOPE: Record<DeliveryFormatId, readonly Layer[]> = {
  comprehensive: LAYERS,
  'work-package': ['frame'],
  subcontract: ['frame'],
};

/** Where the callout points: a column of the middle frame. */
const [FX, FY] = p([W, 72, 36]).split(',').map(Number) as [number, number];

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

      <g className={cls('foundation')}>{FOUNDATION.map((points) => <polygon key={points} points={points} pathLength={1} />)}</g>
      <g className={cls('envelope')}>{ENVELOPE.map((points) => <polygon key={points} points={points} pathLength={1} />)}</g>
      <g className={cls('frame')}>{FRAME.map((d) => <path key={d} d={d} pathLength={1} />)}</g>
      <g className={cls('roof')}>{ROOF.map((points) => <polygon key={points} points={points} pathLength={1} />)}</g>

      {format !== 'comprehensive' && (
        <g className="sd-context sd-callout">
          {/* Leader down into the clear corner under the side wall, so the label never sits on the roof lines */}
          <path className="sd-leader" d={`M${FX},${FY}L${FX + 20},${FY + 42}L${FX + 26},${FY + 42}`} pathLength={1} />
          <circle className="sd-dot" cx={FX} cy={FY} r="3" />
          <text className="sd-label sd-label-scope" x={FX + 29} y={FY + 46}>Обсяг</text>
          <text className="sd-label sd-label-scope" x={FX + 29} y={FY + 59}>RUBIKON</text>
        </g>
      )}
    </svg>
  );
}
