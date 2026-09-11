import { INQUIRY_ATTACHMENT_LABELS, type InquiryAttachment } from '../inquiry/attachment';
import { deriveDomainModel } from './domainModel';
import { createHangarInquiryBrief, createHangarInquiryBriefSections, formatHangarInquiryBrief } from './inquiryBrief';
import type { ConfiguratorState } from './types';

export const HANGAR_CONFIGURATOR_VERSION = 'hangar-configurator@1.0.0';

/**
 * The hangar configuration as a shared inquiry attachment. Everything the form showed and sent
 * before the shared contract comes from the same functions as before: the text is
 * formatHangarInquiryBrief verbatim, the rows are createHangarInquiryBriefSections, the headline
 * is «dimensions · envelope», and the dimensions field stays fixed to the configured size.
 */
export function createHangarAttachment(state: ConfiguratorState): InquiryAttachment {
  const brief = createHangarInquiryBrief(deriveDomainModel(state));
  const sections = createHangarInquiryBriefSections(brief);

  return {
    kind: 'hangar-configuration',
    version: HANGAR_CONFIGURATOR_VERSION,
    title: INQUIRY_ATTACHMENT_LABELS['hangar-configuration'].form,
    headline: `${brief.dimensionsLabel} · ${brief.envelopeLabel}`,
    sections: [
      { id: 'selected', heading: 'Вибрана конфігурація', rows: sections.selected },
      { id: 'preliminary', heading: 'Системні попередні дані', rows: sections.preliminary },
    ],
    text: formatHangarInquiryBrief(brief),
    editHref: '#configurator',
    dimensionsField: { mode: 'fixed', value: brief.dimensionsLabel },
  };
}
