import { describe, expect, it } from 'vitest';
import { deriveDomainModel, withRidge } from '../../../app/lib/configurator/domainModel';
import { HANGAR_CONFIGURATOR_VERSION, createHangarAttachment } from '../../../app/lib/configurator/hangarAttachment';
import {
  createHangarInquiryBrief,
  createHangarInquiryBriefOutline,
  formatHangarInquiryBrief,
} from '../../../app/lib/configurator/inquiryBrief';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

/** The labels hold numbers to their units with U+00A0 (04.10); these tests read the words */
const plain = (text: string) => text.replaceAll('\u00A0', ' ');

// details.configuration for the untouched example attached through «Обговорити цю конфігурацію», as the lead reads it
// since 1.4.1 (08.10, audit iteration 1): nothing in it is the visitor's, so every value sits under «Не уточнено
// клієнтом» — the manager reads the site's example as the example, not as an answer. The ridge row (1.1.0) with its
// slope (1.2.0), the foundation among the preliminary data and «одні / двоє» gates (1.3.0), «Утеплення» in place of
// «Контур» and the scope as answered (1.4.x). 1.4.2 (10.10): «Стіни й покрівля» for «Огородження», the scope by its mode
// with one colon, «Фундамент: Після розрахунку проєктувальника» for «Основа: Визначити після розрахунку», «колон».
const DEFAULT_CONFIGURATION_TEXT = [
  'Не уточнено клієнтом (значення прикладу на сайті):',
  'Габарити: 24 × 60 × 8 м',
  'Висота в конику: 10,6 м · ухил ≈ 12°',
  'Утеплення: Без утеплення',
  'Стіни й покрівля: Профнастил',
  'Обсяг: Комплекс робіт',
  'Ворота: Одні стандартні, 4 × 4 м',
  'Двері: Не передбачені',
  'Попередні дані:',
  'Площа забудови: ≈ 1 440 м²',
  'Попередня конструктивна схема: Ферма · Центральний ряд колон',
  'Фундамент: Після розрахунку проєктувальника',
].join('\n');

const answeredProfile = { purpose: 'storage', project: 'none', region: 'Київська область', lifting: 'unknown', temperature: 'unknown' } as const;

// ownSizes: the sizes are the visitor's (sizesProvenance 'own') — only then do they fill the form's «Габарити» field
const variants: Record<string, { state: ConfiguratorState; ownSizes: boolean }> = {
  default: { state: DEFAULT_CONFIGURATOR_STATE, ownSizes: false },
  wider: { state: { ...DEFAULT_CONFIGURATOR_STATE, dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width: 30 } }, ownSizes: true },
  longer: { state: { ...DEFAULT_CONFIGURATOR_STATE, dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width: 30, length: 50 } }, ownSizes: true },
  // the scope is answered, the sizes are still the example's
  'narrower scope': { state: { ...DEFAULT_CONFIGURATOR_STATE, scopeMode: 'partial', scope: DEFAULT_CONFIGURATOR_STATE.scope.slice(1) }, ownSizes: false },
  'answered object': { state: { ...DEFAULT_CONFIGURATOR_STATE, objectProfile: answeredProfile }, ownSizes: false },
  'example sizes confirmed': { state: { ...DEFAULT_CONFIGURATOR_STATE, confirmed: ['dimensions'] }, ownSizes: true },
  'sizes not known yet': { state: { ...DEFAULT_CONFIGURATOR_STATE, sizesUnknown: true }, ownSizes: false },
};

describe('createHangarAttachment', () => {
  it('sends the untouched example as the example (1.4.2)', () => {
    expect(plain(createHangarAttachment(DEFAULT_CONFIGURATOR_STATE).text)).toBe(DEFAULT_CONFIGURATION_TEXT);
  });

  for (const [name, { state, ownSizes }] of Object.entries(variants)) {
    it(`${name}: the text and the card's sections are one outline`, () => {
      const brief = createHangarInquiryBrief(deriveDomainModel(state));
      const attachment = createHangarAttachment(state);

      expect(attachment.text).toBe(formatHangarInquiryBrief(brief));
      expect(attachment.sections).toEqual(
        createHangarInquiryBriefOutline(brief).map(({ id, heading, rows }) => ({ id, heading, rows })),
      );
      expect(attachment).toMatchObject({ kind: 'hangar-configuration', version: HANGAR_CONFIGURATOR_VERSION, editHref: '#configurator' });
      expect(attachment).not.toHaveProperty('data');
    });

    it(`${name}: the lead's «Габарити» field is the visitor's sizes only when they are theirs (04.10; 07.10)`, () => {
      const attachment = createHangarAttachment(state);
      const brief = createHangarInquiryBrief(deriveDomainModel(state));
      expect(attachment.dimensionsField).toEqual(ownSizes ? { mode: 'fixed', value: brief.dimensionsLabel } : { mode: 'manual' });
    });

    it(`${name}: the visible rows are exactly the text's rows`, () => {
      const attachment = createHangarAttachment(state);
      const rows = attachment.sections.flatMap((section) => section.rows.map((row) => `${row.label}: ${row.value}`));
      expect(attachment.text.split('\n').filter((line) => !line.endsWith(':'))).toEqual(rows);
    });
  }
});

describe('createHangarAttachment — the card’s title and line (03.10; built from its sections 08.10)', () => {
  it('is version 1.5.0', () => {
    expect(HANGAR_CONFIGURATOR_VERSION).toBe('hangar-configurator@1.5.0');
  });

  it('the untouched example says it is the example from the drawing', () => {
    const attachment = createHangarAttachment(DEFAULT_CONFIGURATOR_STATE);
    expect(attachment.title).toBe('До заявки додано приклад з креслення');
    expect(plain(attachment.headline)).toBe('Приклад з креслення · 24 × 60 × 8 м');
    expect(attachment.sections.map((section) => section.id)).toEqual(['defaults', 'preliminary']);
  });

  it('«Об’єкт» answers alone add the answers, and the example’s sizes stay the example’s', () => {
    // 04.10: the lead said «Вибрана конфігурація: … Габарити: 24 × 60 × 8 м» while both drawings said «Приклад»
    const state = { ...DEFAULT_CONFIGURATOR_STATE, objectProfile: { ...DEFAULT_CONFIGURATOR_STATE.objectProfile, region: 'Київська область' as const } };
    const attachment = createHangarAttachment(state);
    expect(attachment.title).toBe('До заявки додано відповіді про об’єкт');
    // a place name keeps its capital in the line (08.10: «Область: київська область»)
    expect(attachment.headline).toBe('Область: Київська область');
    expect(attachment.sections.map((section) => section.id)).toEqual(['object', 'defaults', 'preliminary']);
    expect(plain(attachment.text).split('\n').slice(0, 4)).toEqual([
      'Про об’єкт:',
      'Область: Київська область',
      'Не уточнено клієнтом (значення прикладу на сайті):',
      'Габарити: 24 × 60 × 8 м',
    ]);
    expect(attachment.text).not.toContain('Вибрана конфігурація');
  });

  it('a hangar of the visitor’s own is their configuration; only what they answered is «Вибрана»', () => {
    const attachment = createHangarAttachment({
      ...DEFAULT_CONFIGURATOR_STATE,
      dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width: 30 },
      objectProfile: { ...DEFAULT_CONFIGURATOR_STATE.objectProfile, region: 'Київська область' },
    });
    expect(attachment.title).toBe('До заявки додано вашу конфігурацію');
    expect(plain(attachment.headline)).toBe('30 × 60 × 8 м · Область: Київська область');
    expect(plain(attachment.text).split('\n').slice(0, 6)).toEqual([
      'Про об’єкт:',
      'Область: Київська область',
      'Вибрана конфігурація:',
      'Габарити: 30 × 60 × 8 м',
      'Висота в конику: 11 м · ухил ≈ 11°',
      // the insulation and the rest nobody touched are still the example's
      'Не уточнено клієнтом (значення прикладу на сайті):',
    ]);
    expect(attachment.dimensionsField).toEqual({ mode: 'fixed', value: '30\u00A0×\u00A060\u00A0×\u00A08\u00A0м' });
  });

  it('a ridge edited and set back to the span rule’s value is the example again', () => {
    const attachment = createHangarAttachment(withRidge(withRidge(DEFAULT_CONFIGURATOR_STATE, 12), 10.6));
    expect(attachment.title).toBe('До заявки додано приклад з креслення');
    expect(plain(attachment.text)).toBe(DEFAULT_CONFIGURATION_TEXT);
  });

  it('without walls and roof there is no «Утеплення» or «Стіни й покрівля», and the line is the answered scope', () => {
    const attachment = createHangarAttachment({ ...DEFAULT_CONFIGURATOR_STATE, scopeMode: 'partial', scope: ['foundation', 'frame'] });
    // every item of the list in lower case after «Обсяг:» (08.10: «фундамент + Металокаркас»; a comma list since 10.10)
    expect(plain(attachment.headline)).toBe('Обсяг: фундамент, каркас');
    expect(attachment.text).not.toMatch(/Утеплення|Стіни й покрівля|Огородження|Контур/);
    expect(plain(attachment.text)).toContain('Обсяг: Фундамент, каркас');
  });

  it('one colon after «Обсяг», whatever the mode (10.10, audit F43: «Обсяг: Комплекс робіт: …»)', () => {
    for (const scopeMode of ['full', 'partial', 'help'] as const) {
      const lines = createHangarAttachment({ ...DEFAULT_CONFIGURATOR_STATE, scopeMode, confirmed: ['scope'] }).text.split('\n');
      const scope = lines.find((line) => line.startsWith('Обсяг:'));
      expect(scope?.split(':')).toHaveLength(2);
    }
  });

  it('the cladding row is named by the surfaces asked for (10.10, audit F36)', () => {
    const rowOf = (state: ConfiguratorState) => createHangarAttachment({ ...state, confirmed: ['cladding'] }).sections
      .flatMap((section) => section.rows)
      .find((row) => ['Стіни й покрівля', 'Стіни', 'Покрівля'].includes(row.label));
    expect(rowOf(DEFAULT_CONFIGURATOR_STATE)).toEqual({ label: 'Стіни й покрівля', value: 'Профнастил' });
    expect(rowOf({ ...DEFAULT_CONFIGURATOR_STATE, wallSystem: 'sandwich-panel' }))
      .toEqual({ label: 'Стіни й покрівля', value: 'Стіни\u00A0— сендвіч-панель, покрівля\u00A0— профнастил' });
    expect(rowOf({ ...DEFAULT_CONFIGURATOR_STATE, scopeMode: 'partial', scope: ['frame', 'roof'] })).toEqual({ label: 'Покрівля', value: 'Профнастил' });
    expect(rowOf({ ...DEFAULT_CONFIGURATOR_STATE, scopeMode: 'partial', scope: ['frame', 'walls'] })).toEqual({ label: 'Стіни', value: 'Профнастил' });
  });

  it('sizes not known yet say so in the line, with the visitor’s orientation', () => {
    const attachment = createHangarAttachment({ ...DEFAULT_CONFIGURATOR_STATE, sizesUnknown: true, confirmed: ['dimensions'] });
    expect(plain(attachment.headline)).toMatch(/^Габарити ще уточнюються/);
    expect(attachment.dimensionsField).toEqual({ mode: 'manual' });
  });
});
