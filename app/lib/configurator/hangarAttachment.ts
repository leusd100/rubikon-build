import { INQUIRY_ATTACHMENT_LABELS, type InquiryAttachment } from '../inquiry/attachment';
import { deriveDomainModel } from './domainModel';
import { createHangarInquiryBrief, createHangarInquiryBriefOutline, formatHangarInquiryBrief } from './inquiryBrief';
import { objectProfileLine } from './objectProfile';
import type { ConfiguratorState } from './types';

// 1.1.0 (2026-10): the ridge height row; a configuration on the default values is labelled as such.
// 1.2.0 (03.10): the «Об’єкт» rows (Призначення, Проєкт, Область, Підйомне обладнання) when answered; the ridge row
// carries its slope («10,6 м · ухил ≈ 12°»), and an unedited ridge follows the span rule.
// 1.3.0 (04.10): the example's sizes stay «Базова конфігурація» when only «Об’єкт» was answered, those answers under
// «Про об’єкт:»; «Основа» among «Попередні дані:» (was «Системні попередні дані:»); decimal commas, no-break spaces
// and «одні / двоє» in the values.
// 1.4.0 (07.10): «Контур» is «Утеплення»; the rows the visitor answered are «Вибрана конфігурація:», the rest of the
// drawn configuration «Не уточнено клієнтом (значення прикладу на сайті):» — a group by group answer, not «differs from
// the example as a whole».
export const HANGAR_CONFIGURATOR_VERSION = 'hangar-configurator@1.4.0';

/**
 * The hangar configuration as a shared inquiry attachment. The text is formatHangarInquiryBrief verbatim and the
 * card's sections are the same outline, so the form shows exactly what the lead receives.
 *
 * While the drawn hangar is the page's example (sameDrawnHangar — the drawings say «Приклад»), nothing in it is the
 * visitor's choice of sizes (04.10): the card says what was added — the «Об’єкт» answers, or the example itself — the
 * sizes are labelled as the defaults, and the form keeps its own «Орієнтовні розміри» field, so the lead's «Габарити»
 * is never the example's 24 × 60 × 8 м on the visitor's behalf.
 */
export function createHangarAttachment(state: ConfiguratorState): InquiryAttachment {
  const brief = createHangarInquiryBrief(deriveDomainModel(state));
  const outline = createHangarInquiryBriefOutline(brief);
  const objectAnswered = outline.some((section) => section.id === 'object');
  // The sizes are the visitor's only once they answered them (07.10): until then the form keeps its own field for them
  const ownSizes = state.confirmed.includes('dimensions') && !state.sizesUnknown;
  const nothingChosen = state.confirmed.length === 0 && !state.sizesUnknown;
  // The card's one line names the insulation only when the visitor chose it: «30 × 60 × 8 м · Без утеплення» put the
  // example's answer in their mouth (07.10)
  const headline = state.confirmed.includes('envelope') ? brief.headlineLabel : brief.dimensionsLabel;

  let title = INQUIRY_ATTACHMENT_LABELS['hangar-configuration'].form;
  if (nothingChosen) title = objectAnswered ? 'До заявки додано відповіді про об’єкт' : 'До заявки додано базову конфігурацію';

  return {
    kind: 'hangar-configuration',
    version: HANGAR_CONFIGURATOR_VERSION,
    title,
    headline: !ownSizes && objectAnswered ? objectProfileLine(state.objectProfile) : headline,
    sections: outline.map(({ id, heading, rows }) => ({ id, heading, rows })),
    text: formatHangarInquiryBrief(brief),
    editHref: '#configurator',
    dimensionsField: ownSizes ? { mode: 'fixed', value: brief.dimensionsLabel } : { mode: 'manual' },
  };
}

