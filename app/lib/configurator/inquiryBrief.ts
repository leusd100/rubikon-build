import type { HangarDomainModel } from './domainModel';
import { deriveSummary } from './deriveSummary';

export type HangarInquiryBrief = ReturnType<typeof createHangarInquiryBrief>;

export function createHangarInquiryBrief(domain: HangarDomainModel) {
  const summary = deriveSummary(domain);

  return {
    dimensionsLabel: summary.dimensionsLabel,
    areaSqm: summary.areaSqm,
    envelopeLabel: summary.envelopeLabel,
    claddingSystemLabel: summary.claddingSystemLabel,
    structuralVisualizationLabel: summary.structuralVisualizationLabel,
    foundationTypeLabel: summary.foundationTypeLabel,
    scopeSummaryLabel: summary.scopeSummaryLabel,
    gatesLabel: summary.gatesLabel,
    // The door was collected by the configurator, shown in "Ваш об'єкт", and then never reached
    // the request at all — a customer input silently dropped between the screen and the lead.
    doorsLabel: summary.doorsLabel,
  };
}

export function formatHangarInquiryBrief(brief: HangarInquiryBrief): string {
  // Openings are omitted outright when walls are out of scope — `deriveSummary` returns null for
  // them, and null means "not part of this request". Quoting gates for a building with no walls
  // would be quoting work nobody asked for.
  return [
    `Габарити: ${brief.dimensionsLabel}`,
    `Площа забудови: ≈ ${brief.areaSqm.toLocaleString('uk-UA')} м²`,
    `Контур: ${brief.envelopeLabel}`,
    `Огородження: ${brief.claddingSystemLabel}`,
    `Попередня конструктивна схема: ${brief.structuralVisualizationLabel}`,
    `Основа: ${brief.foundationTypeLabel}`,
    `Обсяг: ${brief.scopeSummaryLabel}`,
    brief.gatesLabel === null ? null : `Ворота: ${brief.gatesLabel}`,
    brief.doorsLabel === null ? null : `Двері: ${brief.doorsLabel}`,
  ].filter((line): line is string => line !== null).join('\n');
}
