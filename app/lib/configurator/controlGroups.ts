import type { HangarDomainModel } from './domainModel';
import { OUT_OF_SCOPE_LABEL, deriveSummary, doorsCountPhrase, gatesCountPhrase } from './deriveSummary';
import { objectProfileLine } from './objectProfile';
import { FOUNDATION_TYPE_LABELS, INTERNAL_SUPPORTS_LABELS, SCOPE_MODE_LABELS, SCOPE_ORDER } from './types';

// The configurator's control groups in their order, and the one-line value each group's phone header shows (03.10): on
// a phone the groups fold into an accordion, and a folded group still says what is set in it — «24 × 60 × 8 м»,
// «одні ворота · без дверей» — so the visitor does not have to open it to know.

// 07.10: «Об’єкт» is split by where each answer matters — what the hangar is for and where, first («Задача»); the
// lifting equipment with the columns inside («Простір усередині», on «Каркас»); the project with the scope, last.
export type ControlGroupId = 'need' | 'dimensions' | 'envelope' | 'cladding' | 'foundation' | 'openings' | 'space' | 'scope' | 'project';

export const CONTROL_GROUP_TITLES: Record<ControlGroupId, string> = {
  need: 'Задача',
  dimensions: 'Розміри',
  envelope: 'Чи потрібне утеплення?',
  cladding: 'Матеріали',
  foundation: 'Основа / фундамент',
  openings: 'Ворота й двері',
  space: 'Простір усередині',
  scope: 'Обсяг робіт',
  project: 'Проєкт',
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
  const profile = domain.objectProfile;
  return {
    need: objectProfileLine({ ...profile, project: 'unknown', lifting: 'unknown' }),
    dimensions: domain.sizesUnknown ? `уточнюємо · ${summary.dimensionsLabel}` : summary.dimensionsLabel,
    envelope: enclosed ? `${summary.envelopeLabel} · ${summary.claddingSystemLabel.toLowerCase()}` : OUT_OF_SCOPE_LABEL,
    cladding: summary.claddingSystemLabel,
    foundation: FOUNDATION_TYPE_LABELS[domain.foundation.type],
    scope: domain.scopeMode === 'partial' ? `${chosenScope} з ${SCOPE_ORDER.length} робіт` : SCOPE_MODE_LABELS[domain.scopeMode],
    openings: openingsLine(domain),
    space: INTERNAL_SUPPORTS_LABELS[domain.internalSupports],
    project: objectProfileLine({ ...profile, purpose: null, region: 'unknown', lifting: 'unknown' }),
  };
}

// ── Steps (07.10) ────────────────────────────────────────────────────────────────────────────────────────────────────
// The groups are walked as steps, one open at a time on every width. After the GPT review (07.10): the need first —
// what the hangar is for and where, two answers that can be skipped — then the sizes, the shell and its openings, the
// frame (whether columns may stand inside, the lifting equipment, and how the frame works on the drawing), and last the
// scope and the project, with the stamp to check. The drawing follows the step: the frame on «Каркас».

export type ControlStepId = 'task' | 'size' | 'shell' | 'frame' | 'check';

export type ControlStep = { id: ControlStepId; title: string; groups: ControlGroupId[] };

export const CONTROL_STEPS: ControlStep[] = [
  { id: 'task', title: 'Задача', groups: ['need'] },
  { id: 'size', title: 'Габарити', groups: ['dimensions'] },
  { id: 'shell', title: 'Стіни й ворота', groups: ['envelope', 'cladding', 'foundation', 'openings'] },
  // its own questions, then what to show of the frame (ConfiguratorFrameView, through a portal into the step)
  { id: 'frame', title: 'Каркас', groups: ['space'] },
  { id: 'check', title: 'Обсяг', groups: ['scope', 'project'] },
];

export function stepOfGroup(group: ControlGroupId): number {
  return Math.max(0, CONTROL_STEPS.findIndex((step) => step.groups.includes(group)));
}
