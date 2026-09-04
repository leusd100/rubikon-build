'use client';

import {
  ROOF_PRESETS,
  WALL_PRESETS,
  type RoofPresetId,
  type WallPresetId,
} from './materialPresets';

// Phase 3C — small, curated colour picker for the 3D view. Deliberately NOT a hex/RAL picker (the
// brief is explicit: no infinite colour picker, no huge catalogue) — a fixed, restrained list per
// surface, rendered as labelled swatch buttons rather than a native <select> so the colour itself
// is visible before choosing, which is the whole point of a swatch.

function SwatchGroup<Id extends string>({
  legend,
  presets,
  selected,
  onSelect,
}: {
  legend: string;
  presets: ReadonlyArray<{ id: Id; label: string; color: string }>;
  selected: Id;
  onSelect: (id: Id) => void;
}) {
  return (
    <fieldset className="hc-material-swatch-group">
      <legend>{legend}</legend>
      <div className="hc-material-swatch-row" role="radiogroup" aria-label={legend}>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={preset.id === selected}
            className={preset.id === selected ? 'is-selected' : undefined}
            title={preset.label}
            onClick={() => onSelect(preset.id)}
          >
            <span className="hc-material-swatch-dot" style={{ backgroundColor: preset.color }} aria-hidden="true" />
            <span className="hc-material-swatch-label">{preset.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function MaterialPresetPicker({
  wallPreset,
  roofPreset,
  onWallPresetChange,
  onRoofPresetChange,
}: {
  wallPreset: WallPresetId;
  roofPreset: RoofPresetId;
  onWallPresetChange: (id: WallPresetId) => void;
  onRoofPresetChange: (id: RoofPresetId) => void;
}) {
  return (
    <div className="hc-material-presets">
      <SwatchGroup legend="Обшивка" presets={WALL_PRESETS} selected={wallPreset} onSelect={onWallPresetChange} />
      <SwatchGroup legend="Покрівля" presets={ROOF_PRESETS} selected={roofPreset} onSelect={onRoofPresetChange} />
    </div>
  );
}

export default MaterialPresetPicker;
