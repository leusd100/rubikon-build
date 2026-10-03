import type { HangarDomainModel } from './domainModel';
import { deriveSummary } from './deriveSummary';

export type HangarInquiryBrief = ReturnType<typeof createHangarInquiryBrief>;
export type HangarInquiryBriefRow = { label: string; value: string };
export type HangarInquiryBriefSections = {
  /** «Об’єкт»: only the questions answered */
  object: HangarInquiryBriefRow[];
  /** What the drawing draws: the sizes, the contour, the scope and the openings */
  configuration: HangarInquiryBriefRow[];
  /** object + configuration — the visitor's own configuration, read as one list */
  selected: HangarInquiryBriefRow[];
  preliminary: HangarInquiryBriefRow[];
};
/** A headed part of the brief: `heading` in the form's card, `textHeading` as the lead's text line */
export type HangarInquiryBriefSection = {
  id: 'object' | 'selected' | 'preliminary';
  heading: string;
  textHeading: string;
  rows: HangarInquiryBriefRow[];
};

export function createHangarInquiryBrief(domain: HangarDomainModel) {
  const summary = deriveSummary(domain);

  return {
    dimensionsLabel: summary.dimensionsLabel,
    headlineLabel: summary.headlineLabel,
    ridgeHeightLabel: summary.ridgeHeightLabel,
    areaSqm: summary.areaSqm,
    areaLabel: summary.areaLabel,
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

const present = (rows: Array<HangarInquiryBriefRow | null>) =>
  rows.filter((row): row is HangarInquiryBriefRow => row !== null && row.value !== '');

/**
 * One canonical row model for both the visible form summary and the submitted string. Optional
 * opening rows are removed here, so neither consumer can accidentally display or send ghost work.
 */
export function createHangarInquiryBriefSections(brief: HangarInquiryBrief): HangarInquiryBriefSections {
  // «Об’єкт» first, as in the controls: what and where before the sizes. Only what was answered (03.10)
  const object = present([
    answeredRow('Призначення', brief.purposeLabel),
    answeredRow('Проєкт', brief.projectLabel),
    answeredRow('Область', brief.regionLabel),
    answeredRow('Підйомне обладнання', brief.liftingLabel),
  ]);
  const configuration = present([
    { label: 'Габарити', value: brief.dimensionsLabel },
    // The ridge the visitor set used to stop here, like the door once did (2026-10); with its slope since 03.10
    { label: 'Висота в конику', value: brief.ridgeHeightLabel },
    { label: 'Контур', value: brief.envelopeLabel },
    { label: 'Огородження', value: brief.claddingSystemLabel },
    { label: 'Обсяг', value: brief.scopeSummaryLabel },
    brief.gatesLabel === null ? null : { label: 'Ворота', value: brief.gatesLabel },
    brief.doorsLabel === null ? null : { label: 'Двері', value: brief.doorsLabel },
  ]);

  return {
    object,
    configuration,
    selected: [...object, ...configuration],
    preliminary: [
      {
        label: 'Площа забудови',
        value: brief.areaLabel,
      },
      {
        label: 'Попередня конструктивна схема',
        value: brief.structuralVisualizationLabel,
      },
      // Not a choice: /angary offers no foundation control, the designer decides it (owner, 03.10) — it sat among the
      // visitor's answers as «Основа: Визначити після розрахунку» (04.10)
      { label: 'Основа', value: brief.foundationTypeLabel },
    ],
  };
}

/**
 * The brief in its headed parts, for the card and the text alike. `example`: the drawn hangar is still the page's
 * example (sameDrawnHangar) — its sizes are then the defaults, never the visitor's choice, even when «Об’єкт» answers
 * came with it; those go first under a heading of their own (04.10: the lead called the example's 24 × 60 × 8 м
 * «Вибрана конфігурація» while both drawings said «Приклад»).
 */
export function createHangarInquiryBriefOutline(brief: HangarInquiryBrief, example = false): HangarInquiryBriefSection[] {
  const sections = createHangarInquiryBriefSections(brief);
  const preliminary: HangarInquiryBriefSection = {
    id: 'preliminary',
    // «Системні попередні дані» was the code's word for it, shown to the visitor (04.10)
    heading: 'Попередні дані',
    textHeading: 'Попередні дані:',
    rows: sections.preliminary,
  };
  if (!example) {
    return [
      { id: 'selected', heading: 'Вибрана конфігурація', textHeading: 'Вибрана конфігурація:', rows: sections.selected },
      preliminary,
    ];
  }
  return [
    ...(sections.object.length
      ? [{ id: 'object' as const, heading: 'Про об’єкт', textHeading: 'Про об’єкт:', rows: sections.object }]
      : []),
    {
      id: 'selected',
      heading: 'Базові параметри (за замовчуванням)',
      // Values that are the defaults (never changed, or changed back) — the manager reading the lead has to know (2026-10)
      textHeading: 'Базова конфігурація (параметри за замовчуванням):',
      rows: sections.configuration,
    },
    preliminary,
  ];
}

export function formatHangarInquiryBrief(brief: HangarInquiryBrief, example = false): string {
  return createHangarInquiryBriefOutline(brief, example)
    .flatMap((section) => [section.textHeading, ...section.rows.map((row) => `${row.label}: ${row.value}`)])
    .join('\n');
}
