import type { HangarDomainModel } from './domainModel';
import { deriveSummary } from './deriveSummary';
import { CLADDING_SYSTEM_LABELS, envelopeMatchesPreset, type EnvelopeChoice } from './types';

// The /angary cost factors' notes: what the visitor's configuration already says about a factor (03.10), shown once the
// drawn hangar is theirs. Said the way the other notes say it — «У вашій конфігурації: …» — because the values may
// still be defaults: «Ви вказали: холодний, профнастил» credited the visitor with a contour and a cladding nobody had
// touched (04.10).

export type CostFactorNotes = {
  dimensions: string;
  structure: string;
  insulation: string;
  technology?: string;
};

const CONTOUR_PHRASES: Record<EnvelopeChoice, string> = {
  cold: 'холодний контур',
  insulated: 'утеплений контур',
  undecided: 'контур ще не визначено',
};

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function insulationNote(domain: HangarDomainModel, claddingSystemLabel: string): string {
  const { envelope, scope } = domain;
  if (!scope.walls && !scope.roof) return 'Стіни й покрівля поза обсягом заявки';
  // Walls and roof of different systems — the stamp's «Індивідуальна конфігурація» — are named one by one
  if (!envelopeMatchesPreset(envelope.walls, envelope.wallSystem, envelope.roofSystem) && scope.walls && scope.roof) {
    const wall = CLADDING_SYSTEM_LABELS[envelope.wallSystem].toLowerCase();
    const roof = CLADDING_SYSTEM_LABELS[envelope.roofSystem].toLowerCase();
    return `У вашій конфігурації: стіни — ${wall}, покрівля — ${roof}`;
  }
  return `У вашій конфігурації: ${CONTOUR_PHRASES[envelope.walls]}, ${claddingSystemLabel.toLowerCase()}`;
}

export function costFactorNotes(domain: HangarDomainModel): CostFactorNotes {
  const summary = deriveSummary(domain);
  let technology: string | undefined;
  // No walls, no openings in the request (deriveSummary's rule) — and no note about them
  if (summary.gatesLabel !== null) technology = domain.gates ? `Ворота: ${lowerFirst(summary.gatesLabel)}` : summary.gatesLabel;
  return {
    dimensions: `У вашій конфігурації: ${summary.dimensionsLabel}, коник ${summary.ridgeHeightLabel}`,
    structure: `У попередній схемі: ${summary.structuralVisualizationLabel.toLowerCase()}`,
    insulation: insulationNote(domain, summary.claddingSystemLabel),
    technology,
  };
}
