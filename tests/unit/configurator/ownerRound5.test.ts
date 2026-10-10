import { describe, expect, it } from 'vitest';
import { anythingChosen, deriveDomainModel, sizesProvenance, withPurpose } from '../../../app/lib/configurator/domainModel';
import { createHangarAttachment } from '../../../app/lib/configurator/hangarAttachment';
import { createHangarInquiryBrief, formatHangarInquiryBrief } from '../../../app/lib/configurator/inquiryBrief';
import { DEFAULT_OBJECT_PROFILE, objectProfileLine } from '../../../app/lib/configurator/objectProfile';
import { DEFAULT_CONFIGURATOR_STATE, ENVELOPE_LABELS, type ConfiguratorState } from '../../../app/lib/configurator/types';
import { sheetObjectLabel } from '../../../app/components/configurator/sheetLabels';

// The owner's rounds on the round-5 prototype and the QA pass after them (10.10)
const at = (patch: Partial<ConfiguratorState>): ConfiguratorState => ({ ...DEFAULT_CONFIGURATOR_STATE, ...patch });
const sized = (width: number, patch: Partial<ConfiguratorState> = {}) => at({ dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width }, ...patch });
const brief = (state: ConfiguratorState) => formatHangarInquiryBrief(createHangarInquiryBrief(deriveDomainModel(state)));
/** The words, whatever spaces keep them together */
const plain = (text: string) => text.replaceAll('\u00A0', ' ');

describe('«Потрібен простір без колон усередині?»', () => {
  it('«Колони можна» draws the centre row on any truss — 18 m and up — and a portal frame stays without one', () => {
    for (const width of [18, 20, 24, 36]) {
      expect(deriveDomainModel(sized(width, { internalSupports: 'allowed' })).structural.scheme).toBe('centerSupport');
    }
    expect(deriveDomainModel(sized(12, { internalSupports: 'allowed' })).structural).toEqual({ scheme: 'clearSpan', roofStructure: 'portalRafter' });
    // the width's own rule while unanswered, and «Так, без колон» clear whatever the width
    expect(deriveDomainModel(sized(20)).structural.scheme).toBe('clearSpan');
    expect(deriveDomainModel(sized(36, { internalSupports: 'not-allowed' })).structural.scheme).toBe('clearSpan');
  });
});

describe('the shell and the temperature in words', () => {
  it('names the shell by its insulation, never «Холодний» beside «Холодильний склад»', () => {
    expect(ENVELOPE_LABELS.cold).toBe('Без утеплення');
  });

  it('says a cold store’s temperature as its tile does', () => {
    const profile = { ...DEFAULT_OBJECT_PROFILE, purpose: 'coldStore' as const, temperature: 'chilled' as const };
    expect(objectProfileLine(profile)).toContain('охолодження');
    expect(objectProfileLine({ ...profile, temperature: 'frozen' })).toContain('заморозка');
  });
});

describe('the title block and the brief', () => {
  it('calls it «Ваш ангар» once anything is answered, the example’s sizes said so', () => {
    const dims = deriveDomainModel(DEFAULT_CONFIGURATOR_STATE).dimensions;
    expect(plain(sheetObjectLabel('example', dims))).toBe('Приклад · 24 × 60 × 8 м');
    expect(plain(sheetObjectLabel('example', dims, true))).toBe('Ваш ангар · 24 × 60 × 8 м з прикладу');
    expect(plain(sheetObjectLabel('own', dims, true))).toBe('Ваш ангар · 24 × 60 × 8 м');
    const purpose = deriveDomainModel(withPurpose(DEFAULT_CONFIGURATOR_STATE, 'storage'));
    expect(anythingChosen(purpose)).toBe(true);
    expect(sizesProvenance(purpose)).toBe('example');
  });

  it('keeps «Фундамент» only with the foundation in the request', () => {
    expect(brief(DEFAULT_CONFIGURATOR_STATE)).toContain('Фундамент:');
    const noFoundation = at({ scopeMode: 'partial', scope: ['frame', 'walls', 'roof'], confirmed: ['scope'] });
    expect(brief(noFoundation)).not.toContain('Фундамент:');
  });

  it('leads the form’s line with the sizes and the purpose, the insulation by its answer', () => {
    const coldStore = withPurpose(at({ dimensions: { width: 30, length: 60, height: 8 }, confirmed: ['dimensions'], gates: 2 }), 'coldStore');
    expect(plain(createHangarAttachment({ ...coldStore, confirmed: [...coldStore.confirmed, 'openings'] }).headline)).toBe('30 × 60 × 8 м · Холодильний склад');
    const insulated = at({ envelope: 'insulated', wallSystem: 'sandwich-panel', roofSystem: 'sandwich-panel', confirmed: ['dimensions', 'envelope', 'cladding'] });
    expect(plain(createHangarAttachment(insulated).headline)).toBe('24 × 60 × 8 м · Утеплений');
  });
});
