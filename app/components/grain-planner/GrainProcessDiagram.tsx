'use client';

import { useId } from 'react';
import { grainDiagramModel, type Answers } from '../../lib/planner/grain';

function DiagramNode({ x, y, w, title, sub, active = false }: { x: number; y: number; w: number; title: string; sub?: string; active?: boolean }) {
  return (
    <g className={active ? 'node is-active' : 'node'}>
      <rect x={x} y={y} width={w} height="66" />
      <text className="node-title" x={x + w / 2} y={y + (sub ? 29 : 38)}>{title}</text>
      {sub ? <text className="node-sub" x={x + w / 2} y={y + 49}>{sub}</text> : null}
    </g>
  );
}

/**
 * The conceptual process diagram. Content comes from grainDiagramModel; the geometry is the
 * prototype's two-row 400 × 330 layout (batch #3), sized so labels stay ≥ 11 px effective on
 * desktop and ≥ 10 px on a 390 px phone. Flow, storage and phase only — no dimensions.
 */
export function GrainProcessDiagram({ answers }: { answers: Answers }) {
  const ids = useId();
  const model = grainDiagramModel(answers);
  const { row } = model;
  const nodeW = 118; const gap = 9; const x0 = 14; const rowY = 46;
  const lastCenter = x0 + (row.length - 1) * (nodeW + gap) + nodeW / 2;
  const storage = { x: 14, y: 148, w: 236, h: 128 };
  const zones = model.zoneLetters.length;
  const zoneTop = storage.y + 42; const zoneH = storage.h - 58; const inner = storage.w - 36;

  return (
    <figure className="planner-diagram">
      <figcaption><span>Концептуальна схема</span><small>не є генеральним планом чи технологічною схемою</small></figcaption>
      <svg viewBox="0 0 400 330" role="img" aria-labelledby={`${ids}-title`}>
        <title id={`${ids}-title`}>Абстрактна схема підтверджених і невідомих етапів комплексу</title>
        <defs>
          <pattern id={`${ids}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path className="grid-line" d="M24 0L0 0 0 24" fill="none" />
          </pattern>
        </defs>
        <rect width="400" height="330" fill={`url(#${ids}-grid)`} />
        <path className="site-boundary" d="M6 6H394V324H6Z" />
        <text className="site-caption" x="16" y="30">{model.siteCaption}</text>
        {row.length > 1 && <path className="flow-line" d={`M${x0 + nodeW / 2} ${rowY + 33}H${lastCenter}`} />}
        <path className="flow-line" d={`M${lastCenter} ${rowY + 66}V${rowY + 84}H${storage.x + storage.w / 2}V${storage.y}`} />
        {row.map((node, index) => <DiagramNode key={node.title} x={x0 + index * (nodeW + gap)} y={rowY} w={nodeW} title={node.title} sub={node.sub} active={node.active} />)}
        <g className="storage">
          <path d={`M${storage.x} ${storage.y + 14}L${storage.x + 14} ${storage.y}H${storage.x + storage.w - 14}L${storage.x + storage.w} ${storage.y + 14}V${storage.y + storage.h - 14}L${storage.x + storage.w - 14} ${storage.y + storage.h}H${storage.x + 14}L${storage.x} ${storage.y + storage.h - 14}Z`} />
          <text x={storage.x + storage.w / 2} y={storage.y + 28}>{model.storageLabel}</text>
          {zones > 0 ? model.zoneLetters.map((letter, index) => {
            const width = inner / zones; const x = storage.x + 18 + index * width;
            return (
              <g key={letter}>
                <rect className="zone" x={x} y={zoneTop} width={width - 6} height={zoneH} />
                <text className="zone-label" x={x + (width - 6) / 2} y={zoneTop + zoneH / 2 + 6}>{letter}</text>
              </g>
            );
          }) : <text className="unknown-mark" x={storage.x + storage.w / 2} y={storage.y + 94}>?</text>}
        </g>
        <path className="flow-line" d={`M${storage.x + storage.w} ${storage.y + storage.h / 2}H280`} />
        <DiagramNode x={280} y={storage.y + storage.h / 2 - 33} w={106} title={model.shipping.title} />
        {model.phases.map((phase) => phase.kind === 'second'
          ? <g className="phase-two" key={phase.kind}><path d="M246 288H386V318H246Z" /><text x="316" y="308">{phase.label}</text></g>
          : <text className="phase-unknown" key={phase.kind} x="316" y="308">{phase.label}</text>)}
      </svg>
    </figure>
  );
}
