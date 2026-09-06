import type { HangarDomainModel } from './domainModel';
import { deriveSummary } from './deriveSummary';

export type HangarInquiryBrief = ReturnType<typeof createHangarInquiryBrief>;
export type HangarInquiryBriefRow = { label: string; value: string };
export type HangarInquiryBriefSections = {
  selected: HangarInquiryBriefRow[];
  preliminary: HangarInquiryBriefRow[];
};

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

/**
 * One canonical row model for both the visible form summary and the submitted string. Optional
 * opening rows are removed here, so neither consumer can accidentally display or send ghost work.
 */
export function createHangarInquiryBriefSections(brief: HangarInquiryBrief): HangarInquiryBriefSections {
  const selected: Array<HangarInquiryBriefRow | null> = [
    { label: 'Габарити', value: brief.dimensionsLabel },
    { label: 'Контур', value: brief.envelopeLabel },
    { label: 'Огородження', value: brief.claddingSystemLabel },
    { label: 'Основа', value: brief.foundationTypeLabel },
    { label: 'Обсяг', value: brief.scopeSummaryLabel },
    brief.gatesLabel === null ? null : { label: 'Ворота', value: brief.gatesLabel },
    brief.doorsLabel === null ? null : { label: 'Двері', value: brief.doorsLabel },
  ];

  return {
    selected: selected.filter((row): row is HangarInquiryBriefRow => row !== null && row.value !== ''),
    preliminary: [
      {
        label: 'Площа забудови',
        value: `≈ ${brief.areaSqm.toLocaleString('uk-UA')} м²`,
      },
      {
        label: 'Попередня конструктивна схема',
        value: brief.structuralVisualizationLabel,
      },
    ],
  };
}

export function formatHangarInquiryBrief(brief: HangarInquiryBrief): string {
  const sections = createHangarInquiryBriefSections(brief);

  return [
    'Вибрана конфігурація:',
    ...sections.selected.map((row) => `${row.label}: ${row.value}`),
    'Системні попередні дані:',
    ...sections.preliminary.map((row) => `${row.label}: ${row.value}`),
  ].join('\n');
}
