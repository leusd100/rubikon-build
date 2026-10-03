import { INQUIRY_ATTACHMENT_LABELS, type InquiryAttachment } from '../inquiry/attachment';
import { deriveDomainModel } from './domainModel';
import { createHangarInquiryBrief, createHangarInquiryBriefOutline, formatHangarInquiryBrief } from './inquiryBrief';
import { sameDrawnHangar } from './attachmentContract';
import { objectProfileLine } from './objectProfile';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from './types';

// 1.1.0 (2026-10): the ridge height row; a configuration on the default values is labelled as such.
// 1.2.0 (03.10): the «Об’єкт» rows (Призначення, Проєкт, Область, Підйомне обладнання) when answered; the ridge row
// carries its slope («10,6 м · ухил ≈ 12°»), and an unedited ridge follows the span rule.
// 1.3.0 (04.10): the example's sizes stay «Базова конфігурація» when only «Об’єкт» was answered, those answers under
// «Про об’єкт:»; «Основа» among «Попередні дані:» (was «Системні попередні дані:»); decimal commas, no-break spaces
// and «одні / двоє» in the values.
export const HANGAR_CONFIGURATOR_VERSION = 'hangar-configurator@1.3.0';

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
  const example = sameDrawnHangar(state, DEFAULT_CONFIGURATOR_STATE);
  const outline = createHangarInquiryBriefOutline(brief, example);
  const objectAnswered = outline.some((section) => section.id === 'object');

  let title = INQUIRY_ATTACHMENT_LABELS['hangar-configuration'].form;
  if (example) title = objectAnswered ? 'До заявки додано відповіді про об’єкт' : 'До заявки додано базову конфігурацію';

  return {
    kind: 'hangar-configuration',
    version: HANGAR_CONFIGURATOR_VERSION,
    title,
    headline: example && objectAnswered ? objectProfileLine(state.objectProfile) : brief.headlineLabel,
    sections: outline.map(({ id, heading, rows }) => ({ id, heading, rows })),
    text: formatHangarInquiryBrief(brief, example),
    editHref: '#configurator',
    dimensionsField: example ? { mode: 'manual' } : { mode: 'fixed', value: brief.dimensionsLabel },
  };
}
