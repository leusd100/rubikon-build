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
    ridgeHeightLabel: summary.ridgeHeightLabel,
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
    // «Об’єкт» (03.10): null until answered
    purposeLabel: summary.objectProfile.purpose,
    projectLabel: summary.objectProfile.project,
    regionLabel: summary.objectProfile.region,
    liftingLabel: summary.objectProfile.lifting,
  };
}

function answeredRow(label: string, value: string | null): HangarInquiryBriefRow | null {
  return value === null ? null : { label, value };
}

/**
 * One canonical row model for both the visible form summary and the submitted string. Optional
 * opening rows are removed here, so neither consumer can accidentally display or send ghost work.
 */
export function createHangarInquiryBriefSections(brief: HangarInquiryBrief): HangarInquiryBriefSections {
  const selected: Array<HangarInquiryBriefRow | null> = [
    // «Об’єкт» first, as in the controls: what and where before the sizes. Only what was answered (03.10)
    answeredRow('Призначення', brief.purposeLabel),
    answeredRow('Проєкт', brief.projectLabel),
    answeredRow('Область', brief.regionLabel),
    answeredRow('Підйомне обладнання', brief.liftingLabel),
    { label: 'Габарити', value: brief.dimensionsLabel },
    // The ridge the visitor set used to stop here, like the door once did (2026-10); with its slope since 03.10
    { label: 'Висота в конику', value: brief.ridgeHeightLabel },
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

export function formatHangarInquiryBrief(brief: HangarInquiryBrief, untouched = false): string {
  const sections = createHangarInquiryBriefSections(brief);

  return [
    // Values that are the defaults (never changed, or changed back) — the manager reading the lead has to know (2026-10)
    untouched ? 'Базова конфігурація (параметри за замовчуванням):' : 'Вибрана конфігурація:',
    ...sections.selected.map((row) => `${row.label}: ${row.value}`),
    'Системні попередні дані:',
    ...sections.preliminary.map((row) => `${row.label}: ${row.value}`),
  ].join('\n');
}
