'use client';

import {
  DIMENSION_BOUNDS,
  ENVELOPE_LABELS,
  GATES_OPTIONS,
  SCOPE_LABELS,
  SCOPE_ORDER,
  clampDimension,
  hasScopeItem,
  toggleScopeItem,
  type ConfiguratorState,
  type Dimensions,
  type EnvelopeChoice,
  type GatesCount,
} from '../../lib/configurator/types';

type Props = {
  state: ConfiguratorState;
  onChange: (next: ConfiguratorState) => void;
};

function DimensionField({
  fieldKey,
  label,
  value,
  onChange,
}: {
  fieldKey: keyof Dimensions;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const bounds = DIMENSION_BOUNDS[fieldKey];
  const inputId = `hc-dimension-${fieldKey}`;

  return (
    <div className="hc-field">
      <div className="hc-field-head">
        <label htmlFor={inputId}>{label}</label>
        <span className="hc-field-value">{value} м</span>
      </div>
      <div className="hc-field-controls">
        <input
          type="range"
          aria-label={`${label}, слайдер`}
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          value={value}
          onChange={(event) => onChange(clampDimension(fieldKey, Number(event.target.value)))}
        />
        <input
          id={inputId}
          type="number"
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          value={value}
          onChange={(event) => onChange(clampDimension(fieldKey, Number(event.target.value)))}
        />
      </div>
    </div>
  );
}

export function ConfiguratorControls({ state, onChange }: Props) {
  function setDimension(key: keyof Dimensions, value: number) {
    onChange({ ...state, dimensions: { ...state.dimensions, [key]: value } });
  }

  function setEnvelope(envelope: EnvelopeChoice) {
    onChange({ ...state, envelope });
  }

  function setGates(gates: GatesCount) {
    onChange({ ...state, gates });
  }

  function setScope(item: (typeof SCOPE_ORDER)[number]) {
    onChange({ ...state, scope: toggleScopeItem(state.scope, item) });
  }

  return (
    <div className="hc-controls">
      <section className="hc-control-group" aria-labelledby="hc-dimensions-heading">
        <h2 id="hc-dimensions-heading">Розміри</h2>
        <DimensionField fieldKey="width" label="Ширина" value={state.dimensions.width} onChange={(v) => setDimension('width', v)} />
        <DimensionField fieldKey="length" label="Довжина" value={state.dimensions.length} onChange={(v) => setDimension('length', v)} />
        <DimensionField fieldKey="height" label="Висота стін" value={state.dimensions.height} onChange={(v) => setDimension('height', v)} />
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
          {GATES_OPTIONS.map((option) => (
            <label key={option} className="hc-option-card">
              <input type="radio" name="hc-gates" checked={state.gates === option} onChange={() => setGates(option)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
