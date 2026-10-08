import type { HangarDomainModel } from './domainModel';
import { deriveSummary } from './deriveSummary';
import { INTERNAL_SUPPORTS_LABELS, type ConfirmedTopic } from './types';

export type HangarInquiryBrief = ReturnType<typeof createHangarInquiryBrief>;
export type HangarInquiryBriefRow = { label: string; value: string };
type TopicRow = HangarInquiryBriefRow & { topic: ConfirmedTopic };
export type HangarInquiryBriefSections = {
  /** «Об’єкт»: only the questions answered */
  object: HangarInquiryBriefRow[];
  /** What the drawing draws and the visitor answered: the sizes, the insulation, the cladding, the scope, the openings */
  selected: HangarInquiryBriefRow[];
  /** …and what they left as the page's example (07.10): sent too, so the manager sees the whole drawing, but apart */
  defaults: HangarInquiryBriefRow[];
  preliminary: HangarInquiryBriefRow[];
};
/** A headed part of the brief: `heading` in the form's card, `textHeading` as the lead's text line */
export type HangarInquiryBriefSection = {
  id: 'object' | 'selected' | 'defaults' | 'preliminary';
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
    // the groups still the page's example (domainModel.ts exampleTopics: not answered and holding the example's value)
    exampleTopics: domain.exampleTopics,
    sizesUnknown: domain.sizesUnknown,
    // «Колони всередині» (07.10): null until answered
    supportsLabel: domain.internalSupports === 'unknown' ? null : INTERNAL_SUPPORTS_LABELS[domain.internalSupports],
    // without walls and roof there is no envelope to describe: no «Утеплення» or «Огородження» rows (07.10, audit)
    enclosed: domain.scope.walls || domain.scope.roof,
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
    answeredRow('Колони всередині', brief.supportsLabel),
  ]);
  const fromExample = (topic: ConfirmedTopic) => brief.exampleTopics.includes(topic);
  const rows: Array<TopicRow | null> = [
    { topic: 'dimensions', label: 'Габарити', value: brief.dimensionsLabel },
    // The ridge the visitor set used to stop here, like the door once did (2026-10); with its slope since 03.10
    { topic: 'dimensions', label: 'Висота в конику', value: brief.ridgeHeightLabel },
    brief.enclosed ? { topic: 'envelope', label: 'Утеплення', value: brief.envelopeLabel } : null,
    brief.enclosed ? { topic: 'cladding', label: 'Огородження', value: brief.claddingSystemLabel } : null,
    { topic: 'scope', label: 'Обсяг', value: brief.scopeSummaryLabel },
    brief.gatesLabel === null ? null : { topic: 'openings', label: 'Ворота', value: brief.gatesLabel },
    brief.doorsLabel === null ? null : { topic: 'openings', label: 'Двері', value: brief.doorsLabel },
  ];
  const drawn = rows.filter((row): row is TopicRow => row !== null && row.value !== '' && row.topic !== 'dimensions');
  const plain = ({ label, value }: TopicRow): HangarInquiryBriefRow => ({ label, value });
  // «Точних розмірів ще немає» (07.10): one row says so — with the sizes the visitor set as their orientation, or, when
  // they moved nothing, the drawn sizes go with the example's (audit: a 30 m the visitor set went out as «прикладу»)
  const sizeRows: { selected: HangarInquiryBriefRow[]; defaults: HangarInquiryBriefRow[] } = { selected: [], defaults: [] };
  if (brief.sizesUnknown && fromExample('dimensions')) {
    sizeRows.selected.push({ label: 'Габарити', value: 'Ще уточнюються' });
    sizeRows.defaults.push({ label: 'Габарити на кресленні', value: brief.dimensionsLabel }, { label: 'Висота в конику', value: brief.ridgeHeightLabel });
  } else if (brief.sizesUnknown) {
    sizeRows.selected.push(
      { label: 'Габарити', value: `Ще уточнюються · орієнтир клієнта ${brief.dimensionsLabel}` },
      { label: 'Висота в конику', value: `орієнтир клієнта ${brief.ridgeHeightLabel}` },
    );
  } else if (fromExample('dimensions')) {
    sizeRows.defaults.push({ label: 'Габарити', value: brief.dimensionsLabel }, { label: 'Висота в конику', value: brief.ridgeHeightLabel });
  } else {
    sizeRows.selected.push({ label: 'Габарити', value: brief.dimensionsLabel }, { label: 'Висота в конику', value: brief.ridgeHeightLabel });
  }

  return {
    object,
    selected: [...sizeRows.selected, ...drawn.filter((row) => !fromExample(row.topic)).map(plain)],
    defaults: [...sizeRows.defaults, ...drawn.filter((row) => fromExample(row.topic)).map(plain)],
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
 * The brief in its headed parts, for the card and the text alike (07.10): what the visitor answered about the object,
 * the configuration they chose, what they left as the page's example — the manager must be able to tell the two apart,
 * as the stamp now does — and the preliminary data the configurator works out. Empty parts are left out.
 */
export function createHangarInquiryBriefOutline(brief: HangarInquiryBrief): HangarInquiryBriefSection[] {
  const sections = createHangarInquiryBriefSections(brief);
  const parts: HangarInquiryBriefSection[] = [
    { id: 'object', heading: 'Про об’єкт', textHeading: 'Про об’єкт:', rows: sections.object },
    { id: 'selected', heading: 'Вибрана конфігурація', textHeading: 'Вибрана конфігурація:', rows: sections.selected },
    {
      id: 'defaults',
      heading: 'Не уточнено — значення прикладу',
      textHeading: 'Не уточнено клієнтом (значення прикладу на сайті):',
      rows: sections.defaults,
    },
    // «Системні попередні дані» was the code's word for it, shown to the visitor (04.10)
    { id: 'preliminary', heading: 'Попередні дані', textHeading: 'Попередні дані:', rows: sections.preliminary },
  ];
  return parts.filter((part) => part.rows.length > 0);
}

export function formatHangarInquiryBrief(brief: HangarInquiryBrief): string {
  return createHangarInquiryBriefOutline(brief)
    .flatMap((section) => [section.textHeading, ...section.rows.map((row) => `${row.label}: ${row.value}`)])
    .join('\n');
}
