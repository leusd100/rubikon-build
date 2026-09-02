import {
  ENVELOPE_LABELS,
  SCOPE_LABELS,
  SCOPE_ORDER,
  type ConfiguratorState,
} from './types';

export type ConfiguratorSummary = {
  /** width × length, m² — the one derived number the brief signs off on for the POC. */
  areaSqm: number;
  dimensionsLabel: string;
  envelopeLabel: string;
  /** Scope items in a fixed, readable order — not the order they were toggled in. */
  scopeLabels: string[];
  scopeSummaryLabel: string;
  gatesLabel: string;
};

function formatMeters(value: number): string {
  // Whole metres print without a decimal (24, not 24.0); half-metre steps keep one.
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatGatesLabel(gates: ConfiguratorState['gates']): string {
  if (gates === 0) return 'Без воріт';
  if (gates === 1) return '1 ворота';
  return `${gates} воріт`;
}

/**
 * Pure: no DOM, no rounding surprises hidden in a component. `area = width × length` is the
 * only calculation here on purpose — see the brief's "IMPORTANT PRODUCT RULE": no price,
 * tonnage, load, concrete volume, or roof area without construction assumptions this POC
 * hasn't made.
 */
export function deriveSummary(state: ConfiguratorState): ConfiguratorSummary {
  const { width, length, height } = state.dimensions;
  const areaSqm = Math.round(width * length);
  const orderedScope = SCOPE_ORDER.filter((item) => state.scope.includes(item));

  return {
    areaSqm,
    dimensionsLabel: `${formatMeters(width)} × ${formatMeters(length)} × ${formatMeters(height)} м`,
    envelopeLabel: ENVELOPE_LABELS[state.envelope],
    scopeLabels: orderedScope.map((item) => SCOPE_LABELS[item]),
    scopeSummaryLabel: orderedScope.length
      ? orderedScope.map((item) => SCOPE_LABELS[item]).join(' + ')
      : 'Обсяг робіт ще не обрано',
    gatesLabel: formatGatesLabel(state.gates),
  };
}
