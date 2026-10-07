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

// ── Three steps (07.10) ──────────────────────────────────────────────────────────────────────────────────────────────
// The groups are walked as steps, one open at a time on every width: the sizes first — the drawing answers them at once —
// then the shell and its openings, then the frame inside it (07.10: the drawing turns to the frame on this step, so the
// steps are the one way round the block — there is no view switch beside them), then what the request covers and the
// questions that only go into the brief (purpose, project, region, lifting equipment: nothing on the drawing changes
// with them). It replaces the phone accordion, which opened on «Об’єкт» and left the sizes folded.

export type ControlStepId = 'size' | 'shell' | 'frame' | 'task';

export type ControlStep = { id: ControlStepId; title: string; groups: ControlGroupId[] };

export const CONTROL_STEPS: ControlStep[] = [
  { id: 'size', title: 'Габарити', groups: ['dimensions'] },
  { id: 'shell', title: 'Стіни й ворота', groups: ['envelope', 'cladding', 'foundation', 'openings'] },
  // no controls of its own: what to show of the frame (ConfiguratorFrameView, through a portal into the step)
  { id: 'frame', title: 'Каркас', groups: [] },
  { id: 'task', title: 'Обсяг і задача', groups: ['scope', 'object'] },
];

export function stepOfGroup(group: ControlGroupId): number {
  return Math.max(0, CONTROL_STEPS.findIndex((step) => step.groups.includes(group)));
}
