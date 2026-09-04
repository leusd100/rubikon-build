'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { deriveDomainModel } from '../../lib/configurator/domainModel';
import { buildParametricModel } from '../../lib/configurator/parametricModel';
import { DIMENSION_BOUNDS, clampDimension, type ConfiguratorState } from '../../lib/configurator/types';
import { HangarSpikeScene } from './HangarSpikeScene';

// Deliberately minimal: only the 3 dimensions are interactive, matching this batch's explicit
// scope (foundation/columns/trusses/fixed camera — no envelope, scope toggles or gates in the
// R3F spike). Scope is fixed to foundation+frame so there's always something to render; envelope
// and gates are fixed to values the scene never visualises here.
const SPIKE_BASE_STATE: ConfiguratorState = {
  dimensions: { width: 24, length: 60, height: 8 },
  // Re-clamped per dimension change below; this is just the span rule's default for 24 x 8.
  ridgeHeightM: 10.6,
  envelope: 'cold',
  // Fixed, same as envelope/gates above — this spike never visualises cladding system or
  // foundation type either.
  wallSystem: 'profiled-sheet',
  roofSystem: 'profiled-sheet',
  foundationType: 'slab',
  // Fixed too — this spike predates Phase 3E and never visualises structural scheme/roof system.
  structuralScheme: 'clearSpan',
  roofStructure: 'portalRafter',
  scope: ['foundation', 'frame'],
  gates: 0,
  gateType: 'standard',
};

function DimensionSlider({
  fieldKey,
  label,
  value,
  onChange,
}: {
  fieldKey: keyof ConfiguratorState['dimensions'];
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const bounds = DIMENSION_BOUNDS[fieldKey];
  return (
    <label className="r3f-field">
      <span className="r3f-field-label">{label} — <b>{value} м</b></span>
      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        value={value}
        onChange={(event) => onChange(clampDimension(fieldKey, Number(event.target.value)))}
      />
    </label>
  );
}

export function R3fHangarSpike() {
  const [state, setState] = useState<ConfiguratorState>(SPIKE_BASE_STATE);
  const [lastRebuildMs, setLastRebuildMs] = useState<number | null>(null);
  // Timing lives in a ref (set only from the event handler, read only in the effect below) so
  // the render/useMemo path stays pure — no ref access, no impure calls, during render itself.
  const changeStartedAt = useRef<number | null>(null);

  const domain = useMemo(() => deriveDomainModel(state), [state]);
  const building = useMemo(() => buildParametricModel(domain), [domain]);

  useEffect(() => {
    if (changeStartedAt.current === null) return;
    // Measured end-to-end: state commit → this effect, after React has re-rendered and the
    // Canvas has committed the new meshes — closer to "does this feel responsive" than timing
    // buildParametricModel() alone would be. See docs/renderer-foundation-spike.md for the numbers.
    setLastRebuildMs(performance.now() - changeStartedAt.current);
    changeStartedAt.current = null;
  }, [building]);

  function setDimension(key: keyof ConfiguratorState['dimensions'], value: number) {
    changeStartedAt.current = performance.now();
    setState((prev) => ({ ...prev, dimensions: { ...prev.dimensions, [key]: value } }));
  }

  return (
    <div className="r3f-spike">
      <header className="r3f-hero">
        <p className="r3f-eyebrow">Renderer spike · dev-only, isolated</p>
        <h1>R3F/Three.js hangar spike</h1>
        <p className="r3f-lede">
          Той самий SceneModel, що й SVG-конфігуратор — інший renderer. Лише foundation/columns/
          trusses, фіксована ізометрична камера, базові стилізовані матеріали.
        </p>
        <p className="r3f-disclaimer" role="note">
          Порівняльний спайк для architecture go/no-go — не production UI.
        </p>
      </header>

      <div className="r3f-layout">
        <div className="r3f-controls">
          <DimensionSlider fieldKey="width" label="Ширина" value={state.dimensions.width} onChange={(v) => setDimension('width', v)} />
          <DimensionSlider fieldKey="length" label="Довжина" value={state.dimensions.length} onChange={(v) => setDimension('length', v)} />
          <DimensionSlider fieldKey="height" label="Висота" value={state.dimensions.height} onChange={(v) => setDimension('height', v)} />
          {lastRebuildMs !== null && (
            <p className="r3f-metric">buildParametricModel → paint: {lastRebuildMs.toFixed(1)}ms</p>
          )}
        </div>
        <div className="r3f-canvas-surface">
          <HangarSpikeScene building={building} showFoundation={domain.scope.foundation} showFrame={domain.scope.frame} />
        </div>
      </div>
    </div>
  );
}
