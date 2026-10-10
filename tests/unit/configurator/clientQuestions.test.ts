import { describe, expect, it } from 'vitest';
import {
  deriveDomainModel,
  materialsSetApart,
  withPurpose,
  withShellAnswer,
  withShellConfirmedAgain,
  withShellMaterial,
} from '../../../app/lib/configurator/domainModel';
import { createHangarInquiryBrief, formatHangarInquiryBrief } from '../../../app/lib/configurator/inquiryBrief';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

// Round 5 (10.10, owner): the questions from the client's side — one shell question with presets, a cold store's warm
// suggestion and its temperature, «Простір усередині».
const brief = (state: ConfiguratorState) => formatHangarInquiryBrief(createHangarInquiryBrief(deriveDomainModel(state)));
const examples = (state: ConfiguratorState) => deriveDomainModel(state).exampleTopics;

describe('«Який ангар потрібен?»', () => {
  it('a preset brings its materials and answers both topics, even when they are the example’s', () => {
    const cold = withShellAnswer(DEFAULT_CONFIGURATOR_STATE, 'cold');
    expect(examples(cold)).not.toContain('envelope');
    expect(examples(cold)).not.toContain('cladding');
    const warm = withShellAnswer(cold, 'insulated');
    expect([warm.wallSystem, warm.roofSystem]).toEqual(['sandwich-panel', 'sandwich-panel']);
  });

  it('«Ще не знаю» takes back the materials a preset brought, and keeps the ones set apart', () => {
    const fromPreset = withShellAnswer(withShellAnswer(DEFAULT_CONFIGURATOR_STATE, 'insulated'), 'undecided');
    expect([fromPreset.wallSystem, fromPreset.roofSystem]).toEqual(['profiled-sheet', 'profiled-sheet']);
    expect(examples(fromPreset)).toContain('cladding');
    const mixed = withShellMaterial(withShellAnswer(DEFAULT_CONFIGURATOR_STATE, 'insulated'), 'roofSystem', 'profiled-sheet');
    expect(materialsSetApart(mixed)).toBe(true);
    const kept = withShellAnswer(mixed, 'undecided');
    expect([kept.wallSystem, kept.roofSystem]).toEqual(['sandwich-panel', 'profiled-sheet']);
    expect(materialsSetApart(kept)).toBe(true);
  });
});

describe('«Холодильний склад»', () => {
  const coldStore = withPurpose(DEFAULT_CONFIGURATOR_STATE, 'coldStore');

  it('suggests the warm hangar, still the example’s until confirmed', () => {
    expect(coldStore.envelope).toBe('insulated');
    expect(examples(coldStore)).toEqual(expect.arrayContaining(['envelope', 'cladding']));
    expect(examples(withShellConfirmedAgain(coldStore))).not.toContain('envelope');
    // another purpose takes the example's shell back while unanswered; an answered shell stays
    expect(withPurpose(coldStore, 'storage').envelope).toBe('cold');
    expect(withPurpose(withShellConfirmedAgain(coldStore), 'storage').envelope).toBe('insulated');
  });

  it('sends the temperature under its purpose, and only with it', () => {
    const frozen = { ...coldStore, objectProfile: { ...coldStore.objectProfile, temperature: 'frozen' as const } };
    expect(brief(frozen)).toContain('Призначення: Холодильний склад\nТемпература всередині: Мінусова — заморозка');
    expect(brief(withPurpose(frozen, 'storage'))).not.toContain('Температура');
    expect(brief({ ...frozen, envelope: 'undecided', confirmed: ['envelope'] })).toContain('Утеплення: Уточнимо');
  });

  it('says the space inside as asked', () => {
    expect(brief({ ...DEFAULT_CONFIGURATOR_STATE, internalSupports: 'not-allowed' })).toContain('Простір усередині: Без колон');
  });
});
