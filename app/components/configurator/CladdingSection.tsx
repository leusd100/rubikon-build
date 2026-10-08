'use client';

import type { HangarDomainModel } from '../../lib/configurator/domainModel';
import type { CladdingSystem, EnvelopeChoice } from '../../lib/configurator/types';
import { useLayerHighlight } from './useLayerHighlight';

// «Переріз огородження» (07.10): a small section of the wall and the roof in the drawing's corner, the one place the
// insulation shows — from outside a cold and an insulated profiled-sheet building look the same, so «Утеплений» used to
// change nothing on the drawing. Drawn with a drawing's own symbols: the sheet's trapezoidal profile, the insulation's
// wave, a sandwich panel's two skins round its core. A scheme of the layers, never their thicknesses.

type Layers = 'sheet' | 'sheet-insulated' | 'sheet-undecided' | 'sandwich' | 'none';

const W = 72;
const H = 24;

/** The trapezoidal sheet along the top: ribs up, troughs down */
function sheetPath(top: number, depth: number): string {
  const steps: string[] = [`M0 ${top + depth}`];
  for (let x = 0; x < W; x += 12) {
    steps.push(`H${x + 3}`, `L${x + 5} ${top}`, `H${x + 9}`, `L${x + 11} ${top + depth}`);
  }
  steps.push(`H${W}`);
  return steps.join(' ');
}

/** The insulation's wave between two lines */
function wavePath(top: number, bottom: number): string {
  const mid = (top + bottom) / 2;
  const amp = (bottom - top) / 2 - 0.5;
  const parts = [`M0 ${mid}`];
  for (let x = 0; x < W; x += 6) parts.push(`q1.5 ${-amp} 3 0`, `q1.5 ${amp} 3 0`);
  return parts.join(' ');
}

function Glyph({ layers }: Readonly<{ layers: Layers }>) {
  return (
    <svg className="hc-section-glyph" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" focusable="false">
      {layers === 'none' && <line x1="0" y1={H / 2} x2={W} y2={H / 2} className="is-out" />}
      {layers.startsWith('sheet') && <path d={sheetPath(3, 6)} className="is-skin" />}
      {layers === 'sheet-insulated' && (
        <>
          <path d={wavePath(11, 19)} className="is-core" />
          <line x1="0" y1="20.5" x2={W} y2="20.5" className="is-skin" />
        </>
      )}
      {layers === 'sheet-undecided' && (
        <>
          <rect x="0.5" y="11" width={W - 1} height="9" className="is-open" />
          <text x={W / 2} y="18.5" textAnchor="middle">?</text>
        </>
      )}
      {layers === 'sandwich' && (
        <>
          <line x1="0" y1="5" x2={W} y2="5" className="is-skin" />
          <path d={wavePath(6, 18)} className="is-core" />
          <line x1="0" y1="19" x2={W} y2="19" className="is-skin" />
          {/* a joint between two panels */}
          <path d="M36 5 V10 H38 V14 H36 V19" className="is-joint" />
        </>
      )}
    </svg>
  );
}

function layersOf(inScope: boolean, system: CladdingSystem, envelope: EnvelopeChoice): Layers {
  if (!inScope) return 'none';
  if (system === 'sandwich-panel') return 'sandwich';
  if (envelope === 'insulated') return 'sheet-insulated';
  if (envelope === 'undecided') return 'sheet-undecided';
  return 'sheet';
}

const LAYERS_TEXT: Record<Layers, string> = {
  sheet: 'Профнастил, без утеплення',
  'sheet-insulated': 'Профнастил з утеплювачем',
  'sheet-undecided': 'Профнастил · утеплення уточнимо',
  sandwich: 'Сендвіч-панель з утеплювачем',
  none: 'Поза обсягом заявки',
};

function Row({ title, layers }: Readonly<{ title: string; layers: Layers }>) {
  // the row flashes when what it shows changes, as the surfaces on the drawing do (HangarPreview)
  const active = useLayerHighlight(layers);
  return (
    <div className="hc-section-row" data-active={active ? '' : undefined} data-layers={layers}>
      <dt>{title}</dt>
      <dd>
        <Glyph layers={layers} />
        <span key={layers}>{LAYERS_TEXT[layers]}</span>
      </dd>
    </div>
  );
}

export function CladdingSection({ domain }: Readonly<{ domain: HangarDomainModel }>) {
  const { envelope, scope } = domain;
  return (
    <figure className="hc-section">
      <figcaption>Переріз огородження · схема</figcaption>
      <dl>
        <Row title="Стіни" layers={layersOf(scope.walls, envelope.wallSystem, envelope.walls)} />
        <Row title="Покрівля" layers={layersOf(scope.roof, envelope.roofSystem, envelope.roof)} />
      </dl>
    </figure>
  );
}
