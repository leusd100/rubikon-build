import { describe, expect, it } from 'vitest';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { HANGAR_CONFIGURATOR_VERSION, createHangarAttachment } from '../../../app/lib/configurator/hangarAttachment';
import {
  createHangarInquiryBrief,
  createHangarInquiryBriefSections,
  formatHangarInquiryBrief,
} from '../../../app/lib/configurator/inquiryBrief';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

// details.configuration as the /angary form sent it on main (f28dc47), before the shared contract:
// the default configuration attached through «Обговорити цю конфігурацію».
const DEFAULT_CONFIGURATION_BEFORE_PHASE_3 = [
  'Вибрана конфігурація:',
  'Габарити: 24 × 60 × 8 м',
  'Контур: Холодний',
  'Огородження: Профнастил',
  'Основа: Визначити після розрахунку',
  'Обсяг: Фундамент + Металокаркас + Стіни / огороджувальний контур + Покрівля',
  'Ворота: 1 × стандартні, 4×4 м',
  'Двері: Не передбачені',
  'Системні попередні дані:',
  'Площа забудови: ≈ 1 440 м²',
  'Попередня конструктивна схема: Металева ферма · Центральний ряд опор',
].join('\n');

const variants: Record<string, ConfiguratorState> = {
  default: DEFAULT_CONFIGURATOR_STATE,
  wider: { ...DEFAULT_CONFIGURATOR_STATE, dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width: 30 } },
  longer: { ...DEFAULT_CONFIGURATOR_STATE, dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width: 30, length: 50 } },
  'narrower scope': { ...DEFAULT_CONFIGURATOR_STATE, scope: DEFAULT_CONFIGURATOR_STATE.scope.slice(1) },
};

/** What ProjectInquiryForm computed itself before Phase 3. */
function formBeforePhase3(state: ConfiguratorState) {
  const brief = createHangarInquiryBrief(deriveDomainModel(state));
  return { brief, text: formatHangarInquiryBrief(brief), sections: createHangarInquiryBriefSections(brief) };
}

describe('createHangarAttachment', () => {
  it('sends the default configuration byte-for-byte as the form did before the shared contract', () => {
    expect(createHangarAttachment(DEFAULT_CONFIGURATOR_STATE).text).toBe(DEFAULT_CONFIGURATION_BEFORE_PHASE_3);
  });

  for (const [name, state] of Object.entries(variants)) {
    it(`${name}: text, rows, headline and dimensions are the pre-Phase-3 form's`, () => {
      const before = formBeforePhase3(state);
      const attachment = createHangarAttachment(state);

      expect(attachment.text).toBe(before.text);
      expect(attachment.headline).toBe(`${before.brief.dimensionsLabel} · ${before.brief.envelopeLabel}`);
      expect(attachment.sections).toEqual([
        { id: 'selected', heading: 'Вибрана конфігурація', rows: before.sections.selected },
        { id: 'preliminary', heading: 'Системні попередні дані', rows: before.sections.preliminary },
      ]);
      expect(attachment.dimensionsField).toEqual({ mode: 'fixed', value: before.brief.dimensionsLabel });
      expect(attachment).toMatchObject({
        kind: 'hangar-configuration',
        version: HANGAR_CONFIGURATOR_VERSION,
        title: 'До заявки додано вашу конфігурацію',
        editHref: '#configurator',
      });
      expect(attachment).not.toHaveProperty('data');
    });

    it(`${name}: the visible rows are exactly the text's rows`, () => {
      const attachment = createHangarAttachment(state);
      const rows = attachment.sections.flatMap((section) => section.rows.map((row) => `${row.label}: ${row.value}`));
      expect(attachment.text.split('\n').filter((line) => !line.endsWith(':'))).toEqual(rows);
    });
  }
});
