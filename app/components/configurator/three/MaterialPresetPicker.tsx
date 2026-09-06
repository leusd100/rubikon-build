'use client';

import { useRef } from 'react';
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
  disabled = false,
}: {
  legend: string;
  presets: ReadonlyArray<{ id: Id; label: string; color: string }>;
  selected: Id;
  onSelect: (id: Id) => void;
  disabled?: boolean;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <fieldset className="hc-material-swatch-group" disabled={disabled}>
      <legend>{legend}</legend>
      <div className="hc-material-swatch-row" role="radiogroup" aria-label={legend}>
        {presets.map((preset, index) => (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={preset.id === selected}
            aria-disabled={disabled}
            disabled={disabled}
            tabIndex={preset.id === selected ? 0 : -1}
            ref={(element) => { buttons.current[index] = element; }}
            className={preset.id === selected ? 'is-selected' : undefined}
            title={preset.label}
            onClick={() => onSelect(preset.id)}
            onKeyDown={(event) => {
              let next: number;
              switch (event.key) {
                case 'ArrowRight':
                case 'ArrowDown': next = (index + 1) % presets.length; break;
                case 'ArrowLeft':
                case 'ArrowUp': next = (index - 1 + presets.length) % presets.length; break;
                case 'Home': next = 0; break;
                case 'End': next = presets.length - 1; break;
                default: return;
              }
              event.preventDefault();
              onSelect(presets[next].id);
              buttons.current[next]?.focus();
            }}
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
  wallsInScope = true,
  roofInScope = true,
}: {
  wallPreset: WallPresetId;
  roofPreset: RoofPresetId;
  onWallPresetChange: (id: WallPresetId) => void;
  onRoofPresetChange: (id: RoofPresetId) => void;
  /** "Обсяг заявки" gates these the same way it gates the cladding systems themselves: a colour
   *  for a surface the customer is not asking for is not a choice they can make. Disabled rather
   *  than hidden, and never reset — the selection comes back with the surface. */
  wallsInScope?: boolean;
  roofInScope?: boolean;
}) {
  return (
    <div className="hc-material-presets">
      <SwatchGroup legend="Обшивка" presets={WALL_PRESETS} selected={wallPreset} onSelect={onWallPresetChange} disabled={!wallsInScope} />
      <SwatchGroup legend="Покрівля" presets={ROOF_PRESETS} selected={roofPreset} onSelect={onRoofPresetChange} disabled={!roofInScope} />
    </div>
  );
}

export default MaterialPresetPicker;
