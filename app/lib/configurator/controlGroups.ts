import type { HangarDomainModel } from './domainModel';
import { OUT_OF_SCOPE_LABEL, deriveSummary, doorsCountPhrase, gatesCountPhrase } from './deriveSummary';
import { objectProfileLine } from './objectProfile';
import { FOUNDATION_TYPE_LABELS, SCOPE_ORDER } from './types';

// The configurator's control groups in their order, and the one-line value each group's phone header shows (03.10): on
// a phone the groups fold into an accordion, and a folded group still says what is set in it — «24 × 60 × 8 м»,
// «одні ворота · без дверей» — so the visitor does not have to open it to know.

export type ControlGroupId = 'object' | 'dimensions' | 'envelope' | 'cladding' | 'foundation' | 'scope' | 'openings';

export const CONTROL_GROUP_TITLES: Record<ControlGroupId, string> = {
  object: 'Об’єкт',
  dimensions: 'Розміри',
  envelope: 'Контур будівлі',
  cladding: 'Огороджувальні конструкції',
  foundation: 'Основа / фундамент',
  scope: 'Обсяг заявки',
  openings: 'Прорізи',
};

function openingsLine(domain: HangarDomainModel): string {
  // Openings are cut into walls: without walls in the request there are none, the same rule as the summary's
  if (!domain.scope.walls) return OUT_OF_SCOPE_LABEL;
  // «двоє воріт», not «2 ворота» (04.10)
  return `${gatesCountPhrase(domain.gates)} · ${doorsCountPhrase(domain.doors)}`;
}

/** Reads the resolved domain model, like the summary, so a header never says something the stamp does not. */
export function describeControlGroups(domain: HangarDomainModel): Record<ControlGroupId, string> {
  const summary = deriveSummary(domain);
  const enclosed = domain.scope.walls || domain.scope.roof;
  const chosenScope = SCOPE_ORDER.filter((item) => domain.scope[item]).length;
  return {
    object: objectProfileLine(domain.objectProfile),
    dimensions: summary.dimensionsLabel,
    envelope: enclosed ? `${summary.envelopeLabel} · ${summary.claddingSystemLabel.toLowerCase()}` : OUT_OF_SCOPE_LABEL,
    cladding: summary.claddingSystemLabel,
    foundation: FOUNDATION_TYPE_LABELS[domain.foundation.type],
    scope: `${chosenScope} з ${SCOPE_ORDER.length} робіт`,
    openings: openingsLine(domain),
  };
}
