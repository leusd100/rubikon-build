import { describe, expect, it } from 'vitest';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { HANGAR_CONFIGURATOR_VERSION, createHangarAttachment } from '../../../app/lib/configurator/hangarAttachment';
import {
  createHangarInquiryBrief,
  createHangarInquiryBriefSections,
  formatHangarInquiryBrief,
} from '../../../app/lib/configurator/inquiryBrief';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

// details.configuration for the default configuration attached through «Обговорити цю конфігурацію». As the form sent it
// on main (f28dc47), with two changes of 2026-10 (hangar-configurator@1.1.0): the ridge height row, which the lead used to
// drop, and an untouched default is said to be one rather than sent as «Вибрана конфігурація»; and one of 03.10
// (1.2.0): the ridge row says its slope. The unanswered «Об’єкт» group adds no row.
const DEFAULT_CONFIGURATION_BEFORE_PHASE_3 = [
  'Базова конфігурація (параметри за замовчуванням):',
  'Габарити: 24 × 60 × 8 м',
  'Висота в конику: 10,6 м · ухил ≈ 12°',
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
  'answered object': {
    ...DEFAULT_CONFIGURATOR_STATE,
    objectProfile: { purpose: 'storage', project: 'none', region: 'Київська область', lifting: 'unknown' },
  },
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

      const untouched = name === 'default';
      expect(attachment.text).toBe(untouched ? formatHangarInquiryBrief(before.brief, true) : before.text);
      expect(attachment.headline).toBe(`${before.brief.dimensionsLabel} · ${before.brief.envelopeLabel}`);
      expect(attachment.sections).toEqual([
        { id: 'selected', heading: untouched ? 'Базові параметри (за замовчуванням)' : 'Вибрана конфігурація', rows: before.sections.selected },
        { id: 'preliminary', heading: 'Системні попередні дані', rows: before.sections.preliminary },
      ]);
      expect(attachment.dimensionsField).toEqual({ mode: 'fixed', value: before.brief.dimensionsLabel });
      expect(attachment).toMatchObject({
        kind: 'hangar-configuration',
        version: HANGAR_CONFIGURATOR_VERSION,
        title: untouched ? 'До заявки додано базову конфігурацію' : 'До заявки додано вашу конфігурацію',
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

describe('createHangarAttachment — «Об’єкт» (03.10)', () => {
  it('is version 1.2.0', () => {
    expect(HANGAR_CONFIGURATOR_VERSION).toBe('hangar-configurator@1.2.0');
  });

  it('an answered «Об’єкт» question is the visitor’s configuration, not the default one', () => {
    const attachment = createHangarAttachment({
      ...DEFAULT_CONFIGURATOR_STATE,
      objectProfile: { ...DEFAULT_CONFIGURATOR_STATE.objectProfile, region: 'Київська область' },
    });
    expect(attachment.title).toBe('До заявки додано вашу конфігурацію');
    expect(attachment.text.split('\n').slice(0, 3)).toEqual(['Вибрана конфігурація:', 'Область: Київська область', 'Габарити: 24 × 60 × 8 м']);
  });

  it('a ridge edited and set back to the span rule’s value is the default configuration again', () => {
    const attachment = createHangarAttachment({ ...DEFAULT_CONFIGURATOR_STATE, ridgeEdited: true });
    expect(attachment.title).toBe('До заявки додано базову конфігурацію');
    expect(attachment.text).toBe(DEFAULT_CONFIGURATION_BEFORE_PHASE_3);
  });
});
