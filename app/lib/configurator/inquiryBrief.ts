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
  };
}

export function formatHangarInquiryBrief(brief: HangarInquiryBrief): string {
  return [
    `Габарити: ${brief.dimensionsLabel}`,
    `Площа забудови: ≈ ${brief.areaSqm.toLocaleString('uk-UA')} м²`,
    `Контур: ${brief.envelopeLabel}`,
    `Огородження: ${brief.claddingSystemLabel}`,
    `Попередня конструктивна схема: ${brief.structuralVisualizationLabel}`,
    `Основа: ${brief.foundationTypeLabel}`,
    `Обсяг: ${brief.scopeSummaryLabel}`,
    `Ворота: ${brief.gatesLabel}`,
  ].join('\n');
}
