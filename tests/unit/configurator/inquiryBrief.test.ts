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
