import { INQUIRY_ATTACHMENT_LABELS, type InquiryAttachment } from '../inquiry/attachment';
import { deriveDomainModel, sizesProvenance } from './domainModel';
import { createHangarInquiryBrief, createHangarInquiryBriefOutline, formatHangarInquiryBrief } from './inquiryBrief';
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
// 1.4.1 (08.10, audit): a value is «прикладу» only while unanswered AND still the example's — what another answer set
// is the visitor's; «Обсяг» as answered («Допоможіть визначити», «Комплекс робіт: …»); gates the sizes leave no room
// for are named with the reason; «Габарити: Ще уточнюються · орієнтир клієнта …»; no «Утеплення»/«Огородження»
// without walls and roof; the card's line built from its own sections.
export const HANGAR_CONFIGURATOR_VERSION = 'hangar-configurator@1.4.1';

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
  const domain = deriveDomainModel(state);
  const brief = createHangarInquiryBrief(domain);
  const outline = createHangarInquiryBriefOutline(brief);
  const rowsOf = (id: string) => outline.find((section) => section.id === id)?.rows ?? [];
  const chosen = rowsOf('selected');
  const object = rowsOf('object');
  // The sizes fill the form's own field only when they are the visitor's (07.10): not the example's, not an orientation
  const ownSizes = sizesProvenance(domain) === 'own';

  // Title and the card's one line, from the card's own sections (07.10, audit: «Колони: Не можна» gave «Ще не вказано»,
  // «Точних розмірів ще немає» showed the example's sizes as «вашу конфігурацію», a crane answer started lower-case):
  // the first answers as they stand in the card, «Габарити» by their value, the rest as «назва: значення»
  let title = INQUIRY_ATTACHMENT_LABELS['hangar-configuration'].form;
  let headline: string;
  if (!chosen.length && !object.length) {
    title = 'До заявки додано приклад з креслення';
    headline = `Приклад з креслення\u00A0· ${brief.dimensionsLabel}`;
  } else {
    if (!chosen.length) title = 'До заявки додано відповіді про об’єкт';
    // the ridge is the sizes' detail, not a line of its own
    const lines = [...chosen, ...object].filter((row) => row.label !== 'Висота в конику').slice(0, 2).map((row) => {
      if (row.label !== 'Габарити') return `${row.label}: ${row.value.charAt(0).toLowerCase()}${row.value.slice(1)}`;
      if (!row.value.startsWith('Ще уточнюються')) return row.value;
      const orientation = row.value.slice('Ще уточнюються'.length).replace(' · орієнтир клієнта', ' · орієнтир');
      return `Габарити ще уточнюються${orientation}`;
    });
    const joined = lines.join('\u00A0· ');
    headline = joined.charAt(0).toUpperCase() + joined.slice(1);
  }

  return {
    kind: 'hangar-configuration',
    version: HANGAR_CONFIGURATOR_VERSION,
    title,
    headline,
    sections: outline.map(({ id, heading, rows }) => ({ id, heading, rows })),
    text: formatHangarInquiryBrief(brief),
    editHref: '#configurator',
    dimensionsField: ownSizes ? { mode: 'fixed', value: brief.dimensionsLabel } : { mode: 'manual' },
  };
}

