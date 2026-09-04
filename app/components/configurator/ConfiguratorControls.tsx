'use client';

import { useState } from 'react';
import {
  GATE_DIMENSIONS_M,
  RIDGE_HEIGHT_STEP_M,
  clampGateSelection,
  clampRidgeHeightM,
  deriveStructuralVisualization,
  gateHeightFits,
  maxGateCountThatFits,
  ridgeHeightRangeM,
} from '../../lib/configurator/parametricModel';
import {
  CLADDING_SYSTEM_LABELS,
  CLADDING_SYSTEM_ORDER,
  DIMENSION_BOUNDS,
  ENVELOPE_LABELS,
  ENVELOPE_MATERIAL_PRESET,
  FOUNDATION_TYPE_LABELS,
  FOUNDATION_TYPE_ORDER,
  GATES_OPTIONS,
  GATE_TYPE_LABELS,
  GATE_TYPE_ORDER,
  ROOF_STRUCTURE_LABELS,
  SCOPE_LABELS,
  SCOPE_ORDER,
  STRUCTURAL_SCHEME_LABELS,
  clampDimension,
  hasScopeItem,
  toggleScopeItem,
  type CladdingSystem,
  type ConfiguratorState,
  type Dimensions,
  type EnvelopeChoice,
  type FoundationType,
  type GateType,
  type GatesCount,
} from '../../lib/configurator/types';

type Props = {
  state: ConfiguratorState;
  onChange: (next: ConfiguratorState) => void;
};

/**
 * Numbers are shown with the Ukrainian decimal comma so the readout above a field and the value
 * inside it never disagree — a native `type="number"` localises its own display, which is how
 * "7.5 м" ended up sitting over a box reading "7,5".
 */
function formatMetres(value: number): string {
  return value.toLocaleString('uk-UA', { maximumFractionDigits: 2 });
}

/** Accepts either decimal separator, since the field now displays a comma but keyboards and
 *  pasted values commonly supply a dot. Returns null for anything not yet a number — including
 *  an empty field and a lone "-", both of which are legitimate mid-typing states. */
function parseMetres(raw: string): number | null {
  const normalised = raw.replace(',', '.').trim();
  if (normalised === '' || normalised === '-' || normalised === '.') return null;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * A dimension entry: slider plus a typed value.
 *
 * The typed field is `type="text"` with `inputMode="decimal"`, not `type="number"`, and it keeps a
 * local draft while focused. Both choices fix the same reported bug: the field used to clamp on
 * every keystroke, so clearing it produced `Number('') === 0`, which clamped to the minimum and
 * overwrote the entry — typing "37" into a field with a minimum of 10 was impossible, because the
 * intermediate "3" was rewritten to "10" before the "7" arrived.
 *
 * Now a partially-typed value is simply held: it is committed the moment it becomes legal, and
 * clamped once on blur. Nothing rewrites the box while the caret is in it.
 */
function NumericField({
  inputId,
  label,
  value,
  min,
  max,
  step,
  hint,
  clamp,
  onCommit,
}: {
  inputId: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  clamp: (value: number) => number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function handleTyped(raw: string) {
    setDraft(raw);
    const parsed = parseMetres(raw);
    // Commit live only once the entry is already within range, so the preview keeps up with
    // typing without the field ever being rewritten underneath the caret.
    if (parsed !== null && parsed >= min && parsed <= max) onCommit(clamp(parsed));
  }

  function handleBlur() {
    const parsed = parseMetres(draft ?? '');
    // An abandoned or nonsensical entry falls back to the last good value rather than to the
    // minimum — clearing the field and clicking away should not silently reset the object.
    onCommit(parsed === null ? value : clamp(parsed));
    setDraft(null);
  }

  return (
    <div className="hc-field">
      <div className="hc-field-head">
        <label htmlFor={inputId}>{label}</label>
        <span className="hc-field-value">{formatMetres(value)} м</span>
      </div>
      <div className="hc-field-controls">
        <input
          type="range"
          aria-label={`${label}, слайдер`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onCommit(clamp(Number(event.target.value)))}
        />
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          value={draft ?? formatMetres(value)}
          onChange={(event) => handleTyped(event.target.value)}
          onBlur={handleBlur}
        />
      </div>
      {hint && (
        <p className="hc-field-hint" id={`${inputId}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

const DIMENSION_FIELD_LABELS: Record<keyof Dimensions, string> = {
  width: 'Ширина',
  length: 'Довжина',
  height: 'Висота стін',
};

export function ConfiguratorControls({ state, onChange }: Props) {
  // The ridge's legal range depends on the CURRENT width and eave height, so it is recomputed on
  // every render rather than read from a static table, and the stored value is re-clamped with it:
  // widening the building can make a previously-legal ridge too shallow.
  const ridgeRange = ridgeHeightRangeM(state.dimensions.width, state.dimensions.height);
  const ridgeValue = clampRidgeHeightM(state.ridgeHeightM, state.dimensions.width, state.dimensions.height);
  // Phase 3E.1: read-only, derived straight from width — see deriveStructuralVisualization's own
  // doc comment. Nothing here is a stored choice any more; there is no setter for this value.
  const structural = deriveStructuralVisualization(state.dimensions.width);

  function setDimension(key: keyof Dimensions, value: number) {
    const dimensions = { ...state.dimensions, [key]: value };
    onChange({
      ...state,
      dimensions,
      // Keep the ridge legal for the new footprint in the same update, so the two can never be
      // committed out of step with each other.
      ridgeHeightM: clampRidgeHeightM(state.ridgeHeightM, dimensions.width, dimensions.height),
      // Phase 3F.1: same reasoning — a fixed-size gate selection legal at the OLD footprint may
      // not be at the new one (see clampGateSelection's own doc comment in parametricModel.ts).
      // The control panel below also disables an option before it can be picked in the first
      // place; this is the reactive fallback for a selection the customer already made.
      ...clampGateSelection(state.gates, state.gateType, dimensions.width, dimensions.height),
    });
  }

  function setRidge(ridgeHeightM: number) {
    onChange({ ...state, ridgeHeightM });
  }

  function setEnvelope(envelope: EnvelopeChoice) {
    // brief §18: cold/insulated set a sensible STARTING wall/roof system, not a locked rule — a
    // later independent override of either still sticks (see ENVELOPE_MATERIAL_PRESET's own doc
    // comment). `undecided` applies nothing: "independent material choices remain available" is
    // the brief's own wording for that specific option.
    const preset = envelope === 'undecided' ? null : ENVELOPE_MATERIAL_PRESET[envelope];
    onChange({
      ...state,
      envelope,
      ...(preset ? { wallSystem: preset.wallSystem, roofSystem: preset.roofSystem } : {}),
    });
  }

  function setWallSystem(wallSystem: CladdingSystem) {
    onChange({ ...state, wallSystem });
  }

  function setRoofSystem(roofSystem: CladdingSystem) {
    onChange({ ...state, roofSystem });
  }

  function setFoundationType(foundationType: FoundationType) {
    onChange({ ...state, foundationType });
  }

  function setGates(gates: GatesCount) {
    onChange({ ...state, gates });
  }

  function setGateType(gateType: GateType) {
    onChange({ ...state, gateType });
  }

  function setScope(item: (typeof SCOPE_ORDER)[number]) {
    onChange({ ...state, scope: toggleScopeItem(state.scope, item) });
  }

  return (
    <div className="hc-controls">
      <section className="hc-control-group" aria-labelledby="hc-dimensions-heading">
        <h2 id="hc-dimensions-heading">Розміри</h2>
        {(['width', 'length', 'height'] as const).map((key) => (
          <NumericField
            key={key}
            inputId={`hc-dimension-${key}`}
            label={DIMENSION_FIELD_LABELS[key]}
            value={state.dimensions[key]}
            min={DIMENSION_BOUNDS[key].min}
            max={DIMENSION_BOUNDS[key].max}
            step={DIMENSION_BOUNDS[key].step}
            clamp={(v) => clampDimension(key, v)}
            onCommit={(v) => setDimension(key, v)}
          />
        ))}
        <NumericField
          inputId="hc-dimension-ridge"
          label="Висота в коньку"
          value={ridgeValue}
          min={ridgeRange.min}
          max={ridgeRange.max}
          step={RIDGE_HEIGHT_STEP_M}
          hint={`Від ${formatMetres(ridgeRange.min)} до ${formatMetres(ridgeRange.max)} м для цієї ширини — межі рухаються разом із шириною та висотою стін.`}
          clamp={(v) => clampRidgeHeightM(v, state.dimensions.width, state.dimensions.height)}
          onCommit={setRidge}
        />
        <p className="hc-field-note">Орієнтовні межі для зручності — не будівельні нормативи.</p>
      </section>

      <section className="hc-control-group" aria-labelledby="hc-envelope-heading">
        <h2 id="hc-envelope-heading">Контур будівлі</h2>
        <div className="hc-option-cards" role="radiogroup" aria-labelledby="hc-envelope-heading">
          {(Object.keys(ENVELOPE_LABELS) as EnvelopeChoice[]).map((option) => (
            <label key={option} className="hc-option-card">
              <input
                type="radio"
                name="hc-envelope"
                checked={state.envelope === option}
                onChange={() => setEnvelope(option)}
              />
              <span>{ENVELOPE_LABELS[option]}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="hc-control-group" aria-labelledby="hc-cladding-heading">
        <h2 id="hc-cladding-heading">Огороджувальні конструкції</h2>
        <div className="hc-field">
          <div className="hc-field-head">
            <span id="hc-wall-system-label">Стіни</span>
          </div>
          <div className="hc-option-cards" role="radiogroup" aria-labelledby="hc-wall-system-label">
            {CLADDING_SYSTEM_ORDER.map((option) => (
              <label key={option} className="hc-option-card">
                <input
                  type="radio"
                  name="hc-wall-system"
                  checked={state.wallSystem === option}
                  onChange={() => setWallSystem(option)}
                />
                <span>{CLADDING_SYSTEM_LABELS[option]}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="hc-field">
          <div className="hc-field-head">
            <span id="hc-roof-system-label">Покрівля</span>
          </div>
          <div className="hc-option-cards" role="radiogroup" aria-labelledby="hc-roof-system-label">
            {CLADDING_SYSTEM_ORDER.map((option) => (
              <label key={option} className="hc-option-card">
                <input
                  type="radio"
                  name="hc-roof-system"
                  checked={state.roofSystem === option}
                  onChange={() => setRoofSystem(option)}
                />
                <span>{CLADDING_SYSTEM_LABELS[option]}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Phase 3E.1: the two manual radiogroups this section used to hold (Конструктивна схема,
          Несуча система покрівлі) were removed per the follow-up brief — the customer no longer
          chooses these directly. What is left is informational only: no radiogroup role, no
          inputs, nothing to select — see deriveStructuralVisualization's own doc comment for where
          this value actually comes from. */}
      <section className="hc-control-group" aria-labelledby="hc-structural-info-heading">
        <h2 id="hc-structural-info-heading">Попередня конструктивна схема</h2>
        <p className="hc-structural-summary">
          {ROOF_STRUCTURE_LABELS[structural.roofStructure]} · {STRUCTURAL_SCHEME_LABELS[structural.scheme]}
        </p>
        <p className="hc-field-note">
          Схема формується автоматично для попередньої візуалізації та уточнюється після
          конструктивного розрахунку.
        </p>
      </section>

      <section className="hc-control-group" aria-labelledby="hc-foundation-heading">
        <h2 id="hc-foundation-heading">Основа / фундамент</h2>
        <div className="hc-option-cards" role="radiogroup" aria-labelledby="hc-foundation-heading">
          {FOUNDATION_TYPE_ORDER.map((option) => (
            <label key={option} className="hc-option-card">
              <input
                type="radio"
                name="hc-foundation-type"
                checked={state.foundationType === option}
                onChange={() => setFoundationType(option)}
              />
              <span>{FOUNDATION_TYPE_LABELS[option]}</span>
            </label>
          ))}
        </div>
        <p className="hc-field-note">
          Сайт не виконує розрахунок фундаменту. Показані варіанти — це схематичне уявлення для
          попереднього брифу, а не проєктне рішення.
        </p>
      </section>

      <section className="hc-control-group" aria-labelledby="hc-scope-heading">
        <h2 id="hc-scope-heading">Обсяг заявки</h2>
        <div className="hc-option-list">
          {SCOPE_ORDER.map((item) => {
            const checked = hasScopeItem(state.scope, item);
            return (
              <label key={item} className="hc-checkbox-row">
                <input type="checkbox" checked={checked} onChange={() => setScope(item)} />
                <span>{SCOPE_LABELS[item]}</span>
              </label>
            );
          })}
        </div>
        <p className="hc-field-note">Це перелік бажаного обсягу заявки, а не твердження про незалежність кожного елемента.</p>
      </section>

      <section className="hc-control-group" aria-labelledby="hc-gates-heading">
        <h2 id="hc-gates-heading">Ворота</h2>
        <div className="hc-option-cards hc-option-cards-compact" role="radiogroup" aria-labelledby="hc-gates-heading">
          {GATES_OPTIONS.map((option) => {
            // Phase 3F.1, brief §B2-B3: a gate count is only offered if the CURRENTLY selected
            // gate type actually fits that many times at the current width/eave height — real,
            // fixed-size gates (GATE_DIMENSIONS_M), not scaled to fit. 0 is always available.
            const disabled = option > 0 && (!gateHeightFits(state.gateType, state.dimensions.height)
              || option > maxGateCountThatFits(state.gateType, state.dimensions.width));
            return (
              <label key={option} className="hc-option-card" aria-disabled={disabled}>
                <input
                  type="radio"
                  name="hc-gates"
                  checked={state.gates === option}
                  disabled={disabled}
                  onChange={() => setGates(option)}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
        {/* Only meaningful once there is a gate to size, so it is hidden at zero rather than
            shown disabled — a control that cannot do anything is noise. */}
        {state.gates > 0 && (
          <div
            className="hc-option-cards hc-gate-types"
            role="radiogroup"
            aria-label="Тип воріт"
          >
            {GATE_TYPE_ORDER.map((option) => {
              // Phase 3F.1: a type is only offered if it clears the eave line at the CURRENT
              // count already selected — switching type never silently rescales anything.
              const disabled = !gateHeightFits(option, state.dimensions.height)
                || state.gates > maxGateCountThatFits(option, state.dimensions.width);
              return (
                <label key={option} className="hc-option-card" aria-disabled={disabled}>
                  <input
                    type="radio"
                    name="hc-gate-type"
                    checked={state.gateType === option}
                    disabled={disabled}
                    onChange={() => setGateType(option)}
                  />
                  <span>{GATE_TYPE_LABELS[option]}</span>
                </label>
              );
            })}
          </div>
        )}
        {state.gates > 0 && (
          <p className="hc-field-note">
            Стандартні ворота — {GATE_DIMENSIONS_M.standard.widthM}×{GATE_DIMENSIONS_M.standard.heightM} м,
            для заїзду техніки — {GATE_DIMENSIONS_M.double.widthM}×{GATE_DIMENSIONS_M.double.heightM} м.
            Це конфігураційні розміри RUBIKON BUILD, а не будівельний стандарт.
          </p>
        )}
        {state.gates > 0 && (!gateHeightFits(state.gateType, state.dimensions.height)
          || state.gates > maxGateCountThatFits(state.gateType, state.dimensions.width)) && (
          <p className="hc-field-note hc-field-note-warning">
            Обрані ворота не поміщаються за поточних розмірів будівлі — оберіть менший тип або
            кількість воріт, або збільште ширину чи висоту стін.
          </p>
        )}
      </section>
    </div>
  );
}
