import type { DeliveryFormatId } from '../../types/deliveryModel';

// /yak-pratsyuiemo — how much of an object each format covers, drawn as the object's four layers. The card's text says
// the same in words, so the drawing is hidden from assistive technology.
const LAYERS = ['Покрівля', 'Огородження', 'Каркас', 'Фундамент'] as const;

const TAKEN: Record<DeliveryFormatId, readonly number[]> = {
  comprehensive: [0, 1, 2, 3],
  'work-package': [2],
  subcontract: [2],
};

const FRAME: Record<DeliveryFormatId, { label: string; dashed: boolean }> = {
  comprehensive: { label: 'координує RUBIKON', dashed: false },
  'work-package': { label: 'координує замовник або генпідрядник', dashed: true },
  subcontract: { label: 'координує генпідрядник', dashed: true },
};

export function ScopeDiagram({ format }: Readonly<{ format: DeliveryFormatId }>) {
  const taken = TAKEN[format];
  const frame = FRAME[format];
  return (
    <svg className={`scope-diagram scope-diagram-${format}`} viewBox="0 0 260 176" aria-hidden="true" focusable="false">
      <rect className={`scope-frame${frame.dashed ? ' is-dashed' : ''}`} x="6" y="18" width="248" height="152" rx="3" />
      <text className="scope-frame-label" x="14" y="12">{frame.label}</text>
      {LAYERS.map((layer, index) => {
        const y = 32 + index * 33;
        const isTaken = taken.includes(index);
        return (
          <g className={isTaken ? 'scope-layer is-taken' : 'scope-layer'} key={layer}>
            <rect x="20" y={y} width="220" height="25" rx="2" />
            <text x="32" y={y + 17}>{layer}</text>
          </g>
        );
      })}
    </svg>
  );
}
