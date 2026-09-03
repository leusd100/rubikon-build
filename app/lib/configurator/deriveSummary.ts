import type { HangarDomainModel } from './domainModel';
import { ENVELOPE_LABELS, SCOPE_LABELS, SCOPE_ORDER } from './types';

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

function formatGatesLabel(gates: HangarDomainModel['gates']): string {
  if (gates === 0) return 'Без воріт';
  if (gates === 1) return '1 ворота';
  return `${gates} воріт`;
}

/**
 * Pure: no DOM, no rounding surprises hidden in a component. Reads the already-resolved
 * `HangarDomainModel` (not raw ConfiguratorState) — the same domain object the scene model is
 * built from, so Summary and Scene never disagree about what "walls present" means. `areaSqm`
 * is computed once in deriveDomainModel(); this only formats it. See the brief's "IMPORTANT
 * PRODUCT RULE": no price, tonnage, load, concrete volume, or roof area without construction
 * assumptions this POC hasn't made.
 */
export function deriveSummary(domain: HangarDomainModel): ConfiguratorSummary {
  const { widthM, lengthM, eaveHeightM } = domain.dimensions;
  const orderedScope = SCOPE_ORDER.filter((item) => domain.scope[item]);

  return {
    areaSqm: domain.areaSqm,
    dimensionsLabel: `${formatMeters(widthM)} × ${formatMeters(lengthM)} × ${formatMeters(eaveHeightM)} м`,
    envelopeLabel: ENVELOPE_LABELS[domain.envelope.walls],
    scopeLabels: orderedScope.map((item) => SCOPE_LABELS[item]),
    scopeSummaryLabel: orderedScope.length
      ? orderedScope.map((item) => SCOPE_LABELS[item]).join(' + ')
      : 'Обсяг робіт ще не обрано',
    gatesLabel: formatGatesLabel(domain.gates),
  };
}
