import { describe, expect, it } from 'vitest';
import { miniReadout, previewDescription, sheetObjectLabel } from '../../../app/components/configurator/sheetLabels';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

function domainWith(overrides: Partial<ConfiguratorState>) {
  return deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides });
}

/** The labels keep their parts whole with no-break spaces; what a visitor reads has plain ones */
const read = (text: string) => text.replaceAll(' ', ' ');

describe('the configurator sheet’s title block (/angary, 03.10)', () => {
  it('names the default configuration as the example, as the frame drawing does', () => {
    const domain = deriveDomainModel(DEFAULT_CONFIGURATOR_STATE);
    expect(read(sheetObjectLabel(false, domain.dimensions))).toBe('Приклад · 24 × 60 × 8 м');
  });

  it('names the visitor’s own configuration, with a decimal comma', () => {
    const domain = domainWith({ dimensions: { width: 16, length: 42, height: 7.5 } });
    expect(read(sheetObjectLabel(true, domain.dimensions))).toBe('Ваш ангар · 16 × 42 × 7,5 м');
  });

  it('keeps the sizes one piece, so a narrow sheet wraps only after «·»', () => {
    const domain = deriveDomainModel(DEFAULT_CONFIGURATOR_STATE);
    // the one breakable space is the one after «·»
    expect(sheetObjectLabel(false, domain.dimensions).split(' ')).toEqual(['Приклад\u00A0·', '24\u00A0×\u00A060\u00A0×\u00A08\u00A0м']);
  });
});

describe('the phone’s mini readout', () => {
  it('reads the sizes of the drawing, one line beside the view switch', () => {
    expect(read(miniReadout(deriveDomainModel(DEFAULT_CONFIGURATOR_STATE)))).toBe('24 × 60 × 8 м');
  });

  it('leaves the ridge and the gates to their own groups, so it never runs to a second line', () => {
    const readout = read(miniReadout(domainWith({ gates: 2 })));
    expect(readout).not.toMatch(/коник|ворот/);
  });

  it('is one unbreakable piece, decimals with a comma', () => {
    const readout = miniReadout(domainWith({ dimensions: { width: 30, length: 120, height: 12.5 } }));
    expect(readout.split(' ')).toHaveLength(1);
    expect(read(readout)).toBe('30 × 120 × 12,5 м');
  });
});

describe('what a screen reader hears for the picture', () => {
  it('reads the drawing’s figures with a decimal comma, as the sheet shows them', () => {
    const domain = domainWith({ dimensions: { width: 24, length: 60, height: 7.5 } });
    expect(previewDescription('technical', domain.dimensions, 10.06)).toBe(
      'Схематичний ескіз ангара: 24 на 60 метрів, висота стін 7,5 м, двосхила покрівля, висота в конику приблизно 10,1 м',
    );
  });

  it('describes the 3D view with the same figures and says where the rest is', () => {
    const domain = deriveDomainModel(DEFAULT_CONFIGURATOR_STATE);
    const description = previewDescription('three', domain.dimensions, 10.56);
    expect(description).toMatch(/^Тривимірна візуалізація ангара: 24 на 60 метрів, висота стін 8 м, .* приблизно 10,6 м\. /);
    expect(description).toContain('Повний опис конфігурації — у полях керування та підсумку.');
    expect(description).not.toMatch(/\d\.\d/);
  });

  it('agrees the metres with the length', () => {
    const lengthOf = (length: number) => previewDescription('technical', domainWith({ dimensions: { width: 20, length, height: 6 } }).dimensions, 8)
      .match(/на (\d+ \S+),/)?.[1];
    expect(lengthOf(21)).toBe('21 метр');
    expect(lengthOf(42)).toBe('42 метри');
    expect(lengthOf(12)).toBe('12 метрів');
    expect(lengthOf(111)).toBe('111 метрів');
    expect(lengthOf(60)).toBe('60 метрів');
    const half = { ...deriveDomainModel(DEFAULT_CONFIGURATOR_STATE).dimensions, lengthM: 60.5 };
    expect(previewDescription('technical', half, 10)).toContain('24 на 60,5 метра,');
  });
});
