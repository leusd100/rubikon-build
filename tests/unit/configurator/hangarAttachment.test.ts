import { describe, expect, it } from 'vitest';
import { deriveDomainModel, withRidge } from '../../../app/lib/configurator/domainModel';
import { HANGAR_CONFIGURATOR_VERSION, createHangarAttachment } from '../../../app/lib/configurator/hangarAttachment';
import {
  createHangarInquiryBrief,
  createHangarInquiryBriefOutline,
  formatHangarInquiryBrief,
} from '../../../app/lib/configurator/inquiryBrief';
import { objectProfileLine } from '../../../app/lib/configurator/objectProfile';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

/** The labels hold numbers to their units with U+00A0 (04.10); these tests read the words */
const plain = (text: string) => text.replaceAll(' ', ' ');

// details.configuration for the default configuration attached through «Обговорити цю конфігурацію». As the form sent it
// on main (f28dc47), with the changes since: 2026-10 (hangar-configurator@1.1.0) the ridge height row, which the lead
// used to drop, and an untouched default said to be one rather than sent as «Вибрана конфігурація»; 03.10 (1.2.0) the
// ridge row's slope; 04.10 (1.3.0) «Основа» among the preliminary data, which are no longer «Системні», and the gates
// counted «одні / двоє». The unanswered «Об’єкт» group adds no row.
const DEFAULT_CONFIGURATION_TEXT = [
  'Базова конфігурація (параметри за замовчуванням):',
  'Габарити: 24 × 60 × 8 м',
  'Висота в конику: 10,6 м · ухил ≈ 12°',
  'Контур: Холодний',
  'Огородження: Профнастил',
  'Обсяг: Фундамент + Металокаркас + Стіни / огороджувальний контур + Покрівля',
  'Ворота: Одні стандартні, 4 × 4 м',
  'Двері: Не передбачені',
  'Попередні дані:',
  'Площа забудови: ≈ 1 440 м²',
  'Попередня конструктивна схема: Металева ферма · Центральний ряд опор',
  'Основа: Визначити після розрахунку',
].join('\n');

const answeredProfile = { purpose: 'storage', project: 'none', region: 'Київська область', lifting: 'unknown' } as const;

// example: the drawn hangar is still the page's — sameDrawnHangar
const variants: Record<string, { state: ConfiguratorState; example: boolean }> = {
  default: { state: DEFAULT_CONFIGURATOR_STATE, example: true },
  wider: { state: { ...DEFAULT_CONFIGURATOR_STATE, dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width: 30 } }, example: false },
  longer: { state: { ...DEFAULT_CONFIGURATOR_STATE, dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width: 30, length: 50 } }, example: false },
  'narrower scope': { state: { ...DEFAULT_CONFIGURATOR_STATE, scope: DEFAULT_CONFIGURATOR_STATE.scope.slice(1) }, example: false },
  'answered object': { state: { ...DEFAULT_CONFIGURATOR_STATE, objectProfile: answeredProfile }, example: true },
};

describe('createHangarAttachment', () => {
  it('sends the default configuration as the lead has read it since 1.3.0', () => {
    expect(plain(createHangarAttachment(DEFAULT_CONFIGURATOR_STATE).text)).toBe(DEFAULT_CONFIGURATION_TEXT);
  });

  for (const [name, { state, example }] of Object.entries(variants)) {
    it(`${name}: the text and the card's sections are one outline`, () => {
      const brief = createHangarInquiryBrief(deriveDomainModel(state));
      const attachment = createHangarAttachment(state);

      expect(attachment.text).toBe(formatHangarInquiryBrief(brief, example));
      expect(attachment.sections).toEqual(
        createHangarInquiryBriefOutline(brief, example).map(({ id, heading, rows }) => ({ id, heading, rows })),
      );
      expect(attachment).toMatchObject({ kind: 'hangar-configuration', version: HANGAR_CONFIGURATOR_VERSION, editHref: '#configurator' });
      expect(attachment).not.toHaveProperty('data');
    });

    it(`${name}: the lead's «Габарити» field is the visitor's sizes only once the hangar is theirs (04.10)`, () => {
      const attachment = createHangarAttachment(state);
      const brief = createHangarInquiryBrief(deriveDomainModel(state));
      expect(attachment.dimensionsField).toEqual(example ? { mode: 'manual' } : { mode: 'fixed', value: brief.dimensionsLabel });
    });

    it(`${name}: the visible rows are exactly the text's rows`, () => {
      const attachment = createHangarAttachment(state);
      const rows = attachment.sections.flatMap((section) => section.rows.map((row) => `${row.label}: ${row.value}`));
      expect(attachment.text.split('\n').filter((line) => !line.endsWith(':'))).toEqual(rows);
    });
  }
});

describe('createHangarAttachment — «Об’єкт» (03.10) and the example (04.10)', () => {
  it('is version 1.3.0', () => {
    expect(HANGAR_CONFIGURATOR_VERSION).toBe('hangar-configurator@1.3.0');
  });

  it('the untouched example is the base configuration', () => {
    const attachment = createHangarAttachment(DEFAULT_CONFIGURATOR_STATE);
    expect(attachment.title).toBe('До заявки додано базову конфігурацію');
    expect(plain(attachment.headline)).toBe('24 × 60 × 8 м · Холодний');
    expect(attachment.sections.map((section) => section.heading)).toEqual(['Базові параметри (за замовчуванням)', 'Попередні дані']);
  });

  it('«Об’єкт» answers alone add the answers, and the example’s sizes stay the defaults', () => {
    // 04.10: the lead said «Вибрана конфігурація: … Габарити: 24 × 60 × 8 м» while both drawings said «Приклад»
    const state = { ...DEFAULT_CONFIGURATOR_STATE, objectProfile: { ...DEFAULT_CONFIGURATOR_STATE.objectProfile, region: 'Київська область' as const } };
    const attachment = createHangarAttachment(state);
    expect(attachment.title).toBe('До заявки додано відповіді про об’єкт');
    expect(attachment.headline).toBe(objectProfileLine(state.objectProfile));
    expect(attachment.sections.map((section) => section.heading)).toEqual([
      'Про об’єкт',
      'Базові параметри (за замовчуванням)',
      'Попередні дані',
    ]);
    expect(plain(attachment.text).split('\n').slice(0, 4)).toEqual([
      'Про об’єкт:',
      'Область: Київська область',
      'Базова конфігурація (параметри за замовчуванням):',
      'Габарити: 24 × 60 × 8 м',
    ]);
    expect(attachment.text).not.toContain('Вибрана конфігурація');
    expect(attachment.dimensionsField).toEqual({ mode: 'manual' });
  });

  it('an answered «Об’єкт» with a hangar of the visitor’s own is their configuration, answers first', () => {
    const attachment = createHangarAttachment({
      ...DEFAULT_CONFIGURATOR_STATE,
      dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width: 30 },
      objectProfile: { ...DEFAULT_CONFIGURATOR_STATE.objectProfile, region: 'Київська область' },
    });
    expect(attachment.title).toBe('До заявки додано вашу конфігурацію');
    expect(plain(attachment.text).split('\n').slice(0, 3)).toEqual(['Вибрана конфігурація:', 'Область: Київська область', 'Габарити: 30 × 60 × 8 м']);
    expect(attachment.dimensionsField).toEqual({ mode: 'fixed', value: '30 × 60 × 8 м' });
  });

  it('a ridge edited and set back to the span rule’s value is the default configuration again', () => {
    const attachment = createHangarAttachment(withRidge(withRidge(DEFAULT_CONFIGURATOR_STATE, 12), 10.6));
    expect(attachment.title).toBe('До заявки додано базову конфігурацію');
    expect(plain(attachment.text)).toBe(DEFAULT_CONFIGURATION_TEXT);
  });

  it('without walls and roof the headline is the sizes alone (04.10)', () => {
    const attachment = createHangarAttachment({ ...DEFAULT_CONFIGURATOR_STATE, scope: ['foundation', 'frame'] });
    expect(plain(attachment.headline)).toBe('24 × 60 × 8 м');
    expect(plain(attachment.text)).toContain('Контур: Поза обсягом заявки');
  });
});
