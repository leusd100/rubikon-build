import { describe, expect, it } from 'vitest';
import {
  BUILD_REGIONS,
  DEFAULT_OBJECT_PROFILE,
  LIFTING_EQUIPMENT_ORDER,
  PROJECT_STATUS_ORDER,
  PURPOSE_LABELS,
  PURPOSE_ORDER,
  isBuildRegion,
  objectProfileLabels,
  objectProfileLine,
  sameObjectProfile,
} from '../../../app/lib/configurator/objectProfile';

describe('«Об’єкт» (03.10)', () => {
  it('offers the owner’s answers in the owner’s order', () => {
    expect(PURPOSE_ORDER.map((purpose) => PURPOSE_LABELS[purpose])).toEqual(['Склад', 'Техніка', 'Виробництво', 'Аграрний об’єкт', 'Інше']);
    expect(PROJECT_STATUS_ORDER).toEqual(['ready', 'inProgress', 'none', 'unknown']);
    expect(LIFTING_EQUIPMENT_ORDER).toEqual(['none', 'craneOrHoist', 'unknown']);
  });

  it('lists the 24 oblasts and Kyiv once each', () => {
    expect(BUILD_REGIONS).toHaveLength(25);
    expect(new Set(BUILD_REGIONS).size).toBe(25);
    expect(BUILD_REGIONS.filter((region) => region.endsWith(' область'))).toHaveLength(24);
    expect(BUILD_REGIONS).toContain('м. Київ');
  });

  it('accepts only a listed region or «unknown» from the select', () => {
    expect(isBuildRegion('Львівська область')).toBe(true);
    expect(isBuildRegion('unknown')).toBe(true);
    expect(isBuildRegion('Львів')).toBe(false);
    expect(isBuildRegion('')).toBe(false);
  });

  it('starts unanswered', () => {
    expect(DEFAULT_OBJECT_PROFILE).toEqual({ purpose: null, project: 'unknown', region: 'unknown', lifting: 'unknown' });
    expect(objectProfileLabels(DEFAULT_OBJECT_PROFILE)).toEqual({ purpose: null, project: null, region: null, lifting: null });
    expect(objectProfileLine(DEFAULT_OBJECT_PROFILE)).toBe('Ще не вказано');
  });

  it('writes the phone header line in the order the questions are asked, the oblast shortened', () => {
    expect(objectProfileLine({ ...DEFAULT_OBJECT_PROFILE, purpose: 'storage', region: 'Київська область' })).toBe('Склад · Київська обл.');
    expect(objectProfileLine({ ...DEFAULT_OBJECT_PROFILE, region: 'м. Київ' })).toBe('м. Київ');
    expect(objectProfileLine({ purpose: 'other', project: 'none', region: 'unknown', lifting: 'craneOrHoist' }))
      .toBe('Інше · проєкту ще немає · кран-балка або тельфер');
    expect(objectProfileLine({ ...DEFAULT_OBJECT_PROFILE, project: 'inProgress', lifting: 'none' }))
      .toBe('проєкт готується · без підйомного обладнання');
  });

  it('compares every answer', () => {
    expect(sameObjectProfile(DEFAULT_OBJECT_PROFILE, { ...DEFAULT_OBJECT_PROFILE })).toBe(true);
    expect(sameObjectProfile(DEFAULT_OBJECT_PROFILE, { ...DEFAULT_OBJECT_PROFILE, purpose: 'machinery' })).toBe(false);
    expect(sameObjectProfile(DEFAULT_OBJECT_PROFILE, { ...DEFAULT_OBJECT_PROFILE, project: 'ready' })).toBe(false);
    expect(sameObjectProfile(DEFAULT_OBJECT_PROFILE, { ...DEFAULT_OBJECT_PROFILE, region: 'Одеська область' })).toBe(false);
    expect(sameObjectProfile(DEFAULT_OBJECT_PROFILE, { ...DEFAULT_OBJECT_PROFILE, lifting: 'none' })).toBe(false);
  });
});
