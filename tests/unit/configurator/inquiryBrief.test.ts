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
