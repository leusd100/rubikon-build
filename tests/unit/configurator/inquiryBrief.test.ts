import { describe, expect, it } from 'vitest';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import {
  createHangarInquiryBrief,
  createHangarInquiryBriefOutline,
  createHangarInquiryBriefSections,
  formatHangarInquiryBrief,
} from '../../../app/lib/configurator/inquiryBrief';
import { DEFAULT_CONFIGURATOR_STATE } from '../../../app/lib/configurator/types';

/** The labels hold numbers to their units with U+00A0 (04.10); these tests read the words */
const plain = (text: string) => text.replaceAll('\u00A0', ' ');

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
    const formatted = plain(formatHangarInquiryBrief(brief));

    expect(plain(brief.dimensionsLabel)).toBe('30 × 50 × 8 м');
    expect(brief.areaSqm).toBe(1500);
    expect(formatted).toContain('Площа забудови: ≈ 1 500 м²');
    expect(formatted).toContain('Утеплення: Утеплений');
    expect(formatted).toContain('Огородження: Сендвіч-панель');
    expect(formatted).toContain('Ворота: Двоє стандартних, 4 × 4 м');
  });

  it('uses the same non-empty rows for the visible summary and submitted payload', () => {
    const brief = createHangarInquiryBrief(deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      doors: 1,
    }));
    const sections = createHangarInquiryBriefSections(brief);
    const formatted = formatHangarInquiryBrief(brief);

    expect(formatted).toContain('Вибрана конфігурація:');
    // «Системні попередні дані» was internal wording shown to the visitor (04.10)
    expect(formatted).toContain('Попередні дані:');
    expect(formatted).not.toContain('Системні');
    for (const row of [...sections.selected, ...sections.preliminary]) {
      expect(row.value).not.toBe('');
      expect(formatted).toContain(`${row.label}: ${row.value}`);
    }
    // «Основа» is not the visitor's choice on /angary (no control there): it is preliminary, last (04.10)
    expect(sections.preliminary.map((row) => row.label)).toEqual([
      'Площа забудови',
      'Попередня конструктивна схема',
      'Основа',
    ]);
    expect(sections.selected.map((row) => row.label)).not.toContain('Основа');
  });
});

describe('inquiry brief — Phase 3F.2', () => {
  // The door was collected by the configurator and shown in "Ваш об'єкт", then never reached the
  // request: `createHangarInquiryBrief` simply had no doorsLabel field. A customer input dropped
  // silently between the screen and the lead.
  it('carries the personnel door, which it used to drop entirely', () => {
    const text = plain(formatHangarInquiryBrief(
      createHangarInquiryBrief(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, doors: 1 })),
    ));

    expect(text).toContain('Двері: Одні службові, 1 × 2,1 м');
  });

  it('omits openings entirely from a request that excludes walls', () => {
    const text = formatHangarInquiryBrief(
      createHangarInquiryBrief(deriveDomainModel({
        ...DEFAULT_CONFIGURATOR_STATE,
        scopeMode: 'partial', scope: ['foundation', 'frame', 'roof'],
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
    expect(plain(formatHangarInquiryBrief(brief))).toContain('Висота в конику: 13 м · ухил ≈ 15°');
    // the dimensions field of the lead stays width × length × wall height
    expect(plain(brief.dimensionsLabel)).toBe('30 × 72 × 9 м');
  });

  it('sends the span rule’s ridge, not a stored one nobody chose, until the visitor edits it (03.10)', () => {
    // A stale stored ridge (13 m) is not the visitor's: unedited, the ridge is the span rule's for 30 × 9 m
    const text = formatHangarInquiryBrief(createHangarInquiryBrief(deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      dimensions: { width: 30, length: 72, height: 9 },
      ridgeHeightM: 13,
    })));
    // pitch(30 m) = 11.2° → 9 + 15 · tan 11.2° = 11.97 → 12 m; atan(3 / 15) = 11.3°
    expect(plain(text)).toContain('Висота в конику: 12 м · ухил ≈ 11°');
  });
});

describe('«Об’єкт» rows (03.10)', () => {
  it('sends nothing from the group while it is unanswered', () => {
    const text = formatHangarInquiryBrief(createHangarInquiryBrief(deriveDomainModel(DEFAULT_CONFIGURATOR_STATE)));
    for (const label of ['Призначення', 'Проєкт', 'Область', 'Підйомне обладнання']) expect(text).not.toContain(`${label}:`);
  });

  it('puts the answered questions in their own part, in the order they are asked', () => {
    const brief = createHangarInquiryBrief(deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      objectProfile: { purpose: 'machinery', project: 'inProgress', region: 'Дніпропетровська область', lifting: 'craneOrHoist' },
    }));
    const sections = createHangarInquiryBriefSections(brief);
    expect(sections.object).toEqual([
      { label: 'Призначення', value: 'Техніка' },
      { label: 'Проєкт', value: 'Готується' },
      { label: 'Область', value: 'Дніпропетровська область' },
      { label: 'Підйомне обладнання', value: 'Кран-балка або тельфер' },
    ]);
    // answering about the object does not make the drawn hangar the visitor's
    expect(sections.selected).toEqual([]);
    expect(sections.defaults[0]).toEqual({ label: 'Габарити', value: brief.dimensionsLabel });
  });

  it('keeps an answered «Немає» and drops each «Ще не знаю» on its own', () => {
    const rows = createHangarInquiryBriefSections(createHangarInquiryBrief(deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      objectProfile: { purpose: null, project: 'ready', region: 'unknown', lifting: 'none' },
    }))).object;
    expect(rows).toEqual([
      { label: 'Проєкт', value: 'Є' },
      { label: 'Підйомне обладнання', value: 'Немає' },
    ]);
  });
});

// 04.10, sharpened 08.10 (audit iteration 1): a value is the visitor's only once answered — a changed one, or the
// example's own chosen again. The rest is the site's example and the lead says so: «Не уточнено клієнтом».
describe('the example’s values are never the visitor’s choice (04.10; 08.10)', () => {
  const answered = createHangarInquiryBrief(deriveDomainModel({
    ...DEFAULT_CONFIGURATOR_STATE,
    objectProfile: { ...DEFAULT_CONFIGURATOR_STATE.objectProfile, purpose: 'storage', region: 'м. Київ' },
  }));

  it('puts the «Об’єкт» answers under «Про об’єкт» and the untouched sizes under «Не уточнено клієнтом»', () => {
    const outline = createHangarInquiryBriefOutline(answered);
    expect(outline.map((section) => [section.id, section.heading])).toEqual([
      ['object', 'Про об’єкт'],
      ['defaults', 'Не уточнено — значення прикладу'],
      ['preliminary', 'Попередні дані'],
    ]);
    expect(outline[0].rows).toEqual([{ label: 'Призначення', value: 'Склад' }, { label: 'Область', value: 'м. Київ' }]);
    expect(outline[1].rows[0].label).toBe('Габарити');
    expect(plain(formatHangarInquiryBrief(answered)).split('\n').slice(0, 5)).toEqual([
      'Про об’єкт:',
      'Призначення: Склад',
      'Область: м. Київ',
      'Не уточнено клієнтом (значення прикладу на сайті):',
      'Габарити: 24 × 60 × 8 м',
    ]);
  });

  it('has no «Про об’єкт» part when nothing was answered', () => {
    const unanswered = createHangarInquiryBrief(deriveDomainModel(DEFAULT_CONFIGURATOR_STATE));
    expect(createHangarInquiryBriefOutline(unanswered).map((section) => section.id)).toEqual(['defaults', 'preliminary']);
  });

  it('lists only what the visitor answered as «Вибрана конфігурація», the rest stays the example’s', () => {
    const outline = createHangarInquiryBriefOutline(createHangarInquiryBrief(deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      dimensions: { width: 30, length: 50, height: 8 },
      envelope: 'insulated',
      wallSystem: 'sandwich-panel',
      roofSystem: 'sandwich-panel',
      gates: 2,
    })));
    const part = (id: string) => outline.find((section) => section.id === id)?.rows.map((row) => row.label);
    expect(part('selected')).toEqual(['Габарити', 'Висота в конику', 'Утеплення', 'Огородження', 'Ворота', 'Двері']);
    expect(part('defaults')).toEqual(['Обсяг']);
  });

  it('the example’s own value chosen again is an answer', () => {
    const outline = createHangarInquiryBriefOutline(createHangarInquiryBrief(deriveDomainModel({
      ...DEFAULT_CONFIGURATOR_STATE,
      confirmed: ['envelope'],
    })));
    expect(outline.find((section) => section.id === 'selected')?.rows).toEqual([{ label: 'Утеплення', value: 'Без утеплення' }]);
  });
});
