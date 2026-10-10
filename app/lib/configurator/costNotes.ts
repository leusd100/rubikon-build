import type { HangarDomainModel } from './domainModel';
import { deriveSummary } from './deriveSummary';
import { anythingChosen, sizesProvenance } from './domainModel';
import type { ConfirmedTopic } from './types';

// The /angary cost factors' notes: what the visitor's configuration already says about a factor (03.10), shown once the
// drawn hangar is theirs. Said the way the other notes say it — «У вашій конфігурації: …» — because the values may
// still be defaults: «Ви вказали: холодний, профнастил» credited the visitor with a contour and a cladding nobody had
// touched (04.10).

export type CostFactorNotes = {
  dimensions?: string;
  structure?: string;
  insulation?: string;
  technology?: string;
};

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * A note only for what the visitor answered (08.10, after the audit): the sizes they set or gave as an orientation, the
 * insulation and cladding they chose (or that their choice brought), the gates they asked for — in the stamp's own words
 * («без утеплення», not the retired «холодний контур»). The example's values say nothing here: the cost factors are
 * general until the visitor's hangar speaks to them.
 */
export function costFactorNotes(domain: HangarDomainModel): CostFactorNotes | undefined {
  if (!anythingChosen(domain)) return undefined;
  const summary = deriveSummary(domain);
  const fromExample = (topic: ConfirmedTopic) => domain.exampleTopics.includes(topic);
  const notes: CostFactorNotes = { structure: `У попередній схемі: ${summary.structuralVisualizationLabel.toLowerCase()}` };
  const sizes = sizesProvenance(domain);
  if (sizes === 'own') notes.dimensions = `У вашій конфігурації: ${summary.dimensionsLabel}, коник ${summary.ridgeHeightLabel}`;
  if (sizes === 'approx') notes.dimensions = `Орієнтовно: ${summary.dimensionsLabel} — розміри уточнюємо`;
  const enclosed = domain.scope.walls || domain.scope.roof;
  // the scope's one name, the step's (10.10, audit F32)
  if (!enclosed) notes.insulation = 'Стіни й покрівля поза обсягом робіт';
  else if (!fromExample('envelope') || !fromExample('cladding')) {
    // the whole cladding line in lower case, as the step header has it: «стіни: профнастил, покрівля: сендвіч-панель»
    notes.insulation = `У вашій конфігурації: ${lowerFirst(summary.envelopeLabel)}, ${summary.claddingSystemLabel.toLowerCase()}`;
  }
  // No walls, no openings in the request (deriveSummary's rule) — and no note about them
  if (summary.gatesLabel !== null && !fromExample('openings')) {
    notes.technology = domain.gates ? `Ворота: ${lowerFirst(summary.gatesLabel)}` : summary.gatesLabel;
  }
  return notes;
}
