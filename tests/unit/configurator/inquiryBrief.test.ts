import { describe, expect, it } from 'vitest';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import {
  createHangarInquiryBrief,
  createHangarInquiryBriefSections,
  formatHangarInquiryBrief,
} from '../../../app/lib/configurator/inquiryBrief';
import { DEFAULT_CONFIGURATOR_STATE } from '../../../app/lib/configurator/types';

describe('hangar inquiry brief', () => {
  it('carries the live dimensions and the complete decision summary into a readable lead brief', () => {
    const domain = deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      dimensions: { width: 30, length: 50, height: 8 },
      envelope: 'insulated',
      wallSystem: 'sandwich-panel',
      roofSystem: 'sandwich-panel',
      gates: 2,
    });
    const brief = createHangarInquiryBrief(domain);
    const formatted = formatHangarInquiryBrief(brief);

    expect(brief.dimensionsLabel).toBe('30 × 50 × 8 м');
    expect(brief.areaSqm).toBe(1500);
    expect(formatted).toContain('Площа забудови: ≈ 1 500 м²');
    expect(formatted).toContain('Контур: Утеплений');
    expect(formatted).toContain('Огородження: Сендвіч-панель');
    expect(formatted).toContain('Ворота: 2 × стандартні, 4×4 м');
  });

  it('uses the same non-empty rows for the visible summary and submitted payload', () => {
    const brief = createHangarInquiryBrief(deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      doors: 1,
    }));
    const sections = createHangarInquiryBriefSections(brief);
    const formatted = formatHangarInquiryBrief(brief);

    expect(formatted).toContain('Вибрана конфігурація:');
    expect(formatted).toContain('Системні попередні дані:');
    for (const row of [...sections.selected, ...sections.preliminary]) {
      expect(row.value).not.toBe('');
      expect(formatted).toContain(`${row.label}: ${row.value}`);
    }
    expect(sections.preliminary.map((row) => row.label)).toEqual([
      'Площа забудови',
      'Попередня конструктивна схема',
    ]);
  });
});

describe('inquiry brief — Phase 3F.2', () => {
  // The door was collected by the configurator and shown in "Ваш об'єкт", then never reached the
  // request: `createHangarInquiryBrief` simply had no doorsLabel field. A customer input dropped
  // silently between the screen and the lead.
  it('carries the personnel door, which it used to drop entirely', () => {
    const text = formatHangarInquiryBrief(
      createHangarInquiryBrief(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, doors: 1 })),
    );

    expect(text).toContain('Двері: 1 × 1×2,1 м');
  });

  it('omits openings entirely from a request that excludes walls', () => {
    const text = formatHangarInquiryBrief(
      createHangarInquiryBrief(deriveDomainModel({
        ...DEFAULT_CONFIGURATOR_STATE,
        scope: ['foundation', 'frame', 'roof'],
        gates: 2,
        doors: 1,
      })),
    );

    // There is no wall for an opening to be cut into, so quoting one would be quoting work nobody
    // asked for. The lines are absent, not caveated.
    expect(text).toContain('Обсяг: Фундамент + Металокаркас + Покрівля');
    expect(text).not.toContain('Ворота:');
    expect(text).not.toContain('Двері:');
    expect(text).toContain('Огородження: Покрівля:');
  });
});

describe('the ridge height (2026-10)', () => {
  it('reaches the lead: the visitor’s «Висота в конику» is a row right after the dimensions, with its slope (03.10)', async () => {
    const { deriveDomainModel } = await import('../../../app/lib/configurator/domainModel');
    const { DEFAULT_CONFIGURATOR_STATE } = await import('../../../app/lib/configurator/types');
    const { createHangarInquiryBrief, createHangarInquiryBriefSections, formatHangarInquiryBrief } = await import('../../../app/lib/configurator/inquiryBrief');
    const state = { ...DEFAULT_CONFIGURATOR_STATE, dimensions: { width: 30, length: 72, height: 9 }, ridgeHeightM: 13, ridgeEdited: true };
    const brief = createHangarInquiryBrief(deriveDomainModel(state));
    const rows = createHangarInquiryBriefSections(brief).selected.map((row) => row.label);
    expect(rows.slice(0, 2)).toEqual(['Габарити', 'Висота в конику']);
    // 4 m of rise over a 15 m half-span: atan(4 / 15) = 14.9°
    expect(formatHangarInquiryBrief(brief)).toContain('Висота в конику: 13 м · ухил ≈ 15°');
    // the dimensions field of the lead stays width × length × wall height
    expect(brief.dimensionsLabel).toBe('30 × 72 × 9 м');
  });

  it('sends the span rule’s ridge, not a stored one nobody chose, until the visitor edits it (03.10)', () => {
    // A stale stored ridge (13 m) is not the visitor's: unedited, the ridge is the span rule's for 30 × 9 m
    const text = formatHangarInquiryBrief(createHangarInquiryBrief(deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      dimensions: { width: 30, length: 72, height: 9 },
      ridgeHeightM: 13,
    })));
    // pitch(30 m) = 11.2° → 9 + 15 · tan 11.2° = 11.97 → 12 m; atan(3 / 15) = 11.3°
    expect(text).toContain('Висота в конику: 12 м · ухил ≈ 11°');
  });
});

describe('«Об’єкт» rows (03.10)', () => {
  it('sends nothing from the group while it is unanswered', () => {
    const text = formatHangarInquiryBrief(createHangarInquiryBrief(deriveDomainModel(DEFAULT_CONFIGURATOR_STATE)));
    for (const label of ['Призначення', 'Проєкт', 'Область', 'Підйомне обладнання']) expect(text).not.toContain(`${label}:`);
  });

  it('leads the selected rows with the answered questions, in the order they are asked', () => {
    const brief = createHangarInquiryBrief(deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      objectProfile: { purpose: 'machinery', project: 'inProgress', region: 'Дніпропетровська область', lifting: 'craneOrHoist' },
    }));
    expect(createHangarInquiryBriefSections(brief).selected.slice(0, 5)).toEqual([
      { label: 'Призначення', value: 'Техніка' },
      { label: 'Проєкт', value: 'Готується' },
      { label: 'Область', value: 'Дніпропетровська область' },
      { label: 'Підйомне обладнання', value: 'Кран-балка або тельфер' },
      { label: 'Габарити', value: '24 × 60 × 8 м' },
    ]);
  });

  it('keeps an answered «Немає» and drops each «Ще не знаю» on its own', () => {
    const rows = createHangarInquiryBriefSections(createHangarInquiryBrief(deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      objectProfile: { purpose: null, project: 'ready', region: 'unknown', lifting: 'none' },
    }))).selected;
    expect(rows.slice(0, 3)).toEqual([
      { label: 'Проєкт', value: 'Є' },
      { label: 'Підйомне обладнання', value: 'Немає' },
      { label: 'Габарити', value: '24 × 60 × 8 м' },
    ]);
  });
});
