import type { HangarDomainModel } from './domainModel';
import { GATE_DIMENSIONS_M } from './parametricModel';
import {
  CLADDING_SYSTEM_LABELS,
  ENVELOPE_LABELS,
  FOUNDATION_TYPE_LABELS,
  GATE_TYPE_LABELS,
  ROOF_STRUCTURE_LABELS,
  SCOPE_LABELS,
  SCOPE_ORDER,
  STRUCTURAL_SCHEME_LABELS,
  envelopeMatchesPreset,
} from './types';

export type ConfiguratorSummary = {
  /** width × length, m² — the one derived number the brief signs off on for the POC. */
  areaSqm: number;
  dimensionsLabel: string;
  envelopeLabel: string;
  /**
   * Phase 3D: cladding system, shown as one combined label when walls and roof agree (the common
   * case, and the only one either control currently produces on its own) — "Профнастил" rather
   * than "Профнастил / Профнастил" — and spelled out per-surface only when they genuinely differ.
   */
  claddingSystemLabel: string;
  foundationTypeLabel: string;
  /**
   * Phase 3E, brief §19: a real business-relevant configuration fact, same status as
   * `foundationTypeLabel` above — not a renderer-only detail (compare: panel count, web pattern,
   * section sizes — none of that belongs in a lead brief).
   *
   * Phase 3E.1: combined into ONE label (was two separate fields, `structuralSchemeLabel` +
   * `roofStructureLabel`) specifically because the brief's own §10 draws a hard line between USER
   * INPUT and DERIVED PRELIMINARY VISUALIZATION — two `dt`/`dd` rows reading "Конструктивна схема"
   * / "Несуча система покрівлі" look exactly like two things the customer picked, which is no
   * longer true for either. One row, headed "Попередня конструктивна схема", makes the derived,
   * preliminary nature of the whole value part of its own label rather than something a reader has
   * to already know.
   */
  structuralVisualizationLabel: string;
  /** Scope items in a fixed, readable order — not the order they were toggled in. */
  scopeLabels: string[];
  scopeSummaryLabel: string;
  gatesLabel: string;
};

function formatMeters(value: number): string {
  // Whole metres print without a decimal (24, not 24.0); half-metre steps keep one.
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatCladdingSystemLabel(envelope: HangarDomainModel['envelope']): string {
  const wall = CLADDING_SYSTEM_LABELS[envelope.wallSystem];
  const roof = CLADDING_SYSTEM_LABELS[envelope.roofSystem];
  return wall === roof ? wall : `Стіни: ${wall}, покрівля: ${roof}`;
}

/**
 * Phase 3E, brief §18 — the high-level "Контур" label, honest about drift from its own preset.
 * `envelope.walls`/`envelope.roof` (the stored intent) still always equal what the customer last
 * clicked in "Контур будівлі" — this function does not change that, it only decides what the
 * SUMMARY calls it: as soon as a manual wall/roof system override means the actual materials no
 * longer match what "Холодний"/"Утеплений" would imply, claiming that simple label would
 * misrepresent a now-mixed configuration (brief's own explicit "must no longer claim a simple
 * preset if that would be semantically misleading") — surfaced as "Індивідуальна конфігурація"
 * instead, with the real systems still fully visible in `claddingSystemLabel` right below it.
 */
function formatEnvelopeLabel(envelope: HangarDomainModel['envelope']): string {
  if (envelopeMatchesPreset(envelope.walls, envelope.wallSystem, envelope.roofSystem)) {
    return ENVELOPE_LABELS[envelope.walls];
  }
  return 'Індивідуальна конфігурація';
}

/**
 * Phase 3F.1, brief §D — includes the gate's own real, fixed size (GATE_DIMENSIONS_M) alongside
 * the count and type, matching the brief's own worked example ("1 × стандартні, 4×4 м"). Gate
 * count and type are customer inputs; the size that comes with a chosen type is a real product
 * fact worth carrying into a lead brief the same way `foundationTypeLabel` already is — not
 * manufacturer/model detail, just the dimension the type itself implies.
 */
function formatGatesLabel(gates: HangarDomainModel['gates'], gateType: HangarDomainModel['gateType']): string {
  if (gates === 0) return 'Без воріт';
  const { widthM, heightM } = GATE_DIMENSIONS_M[gateType];
  return `${gates} × ${GATE_TYPE_LABELS[gateType].toLowerCase()}, ${widthM}×${heightM} м`;
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
    envelopeLabel: formatEnvelopeLabel(domain.envelope),
    claddingSystemLabel: formatCladdingSystemLabel(domain.envelope),
    foundationTypeLabel: FOUNDATION_TYPE_LABELS[domain.foundation.type],
    structuralVisualizationLabel: `${ROOF_STRUCTURE_LABELS[domain.structural.roofStructure]} · ${STRUCTURAL_SCHEME_LABELS[domain.structural.scheme]}`,
    scopeLabels: orderedScope.map((item) => SCOPE_LABELS[item]),
    scopeSummaryLabel: orderedScope.length
      ? orderedScope.map((item) => SCOPE_LABELS[item]).join(' + ')
      : 'Обсяг робіт ще не обрано',
    gatesLabel: formatGatesLabel(domain.gates, domain.gateType),
  };
}
