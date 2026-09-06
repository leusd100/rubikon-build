import { describe, expect, it } from 'vitest';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { createHangarInquiryBrief, formatHangarInquiryBrief } from '../../../app/lib/configurator/inquiryBrief';
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

  it('does not order openings in walls the request excludes', () => {
    const text = formatHangarInquiryBrief(
      createHangarInquiryBrief(deriveDomainModel({
        ...DEFAULT_CONFIGURATOR_STATE,
        scope: ['foundation', 'frame', 'roof'],
        gates: 2,
        doors: 1,
      })),
    );

    // The Обсяг line and the openings lines must agree with each other.
    expect(text).toContain('Обсяг: Фундамент + Металокаркас + Покрівля');
    expect(text).toMatch(/Ворота:.*поза обсягом заявки/);
    expect(text).toMatch(/Двері:.*поза обсягом заявки/);
    expect(text).toContain('Огородження: Покрівля:');
  });
});
