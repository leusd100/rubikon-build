import { describe, expect, it } from 'vitest';
import { miniReadout, sheetObjectLabel } from '../../../app/components/configurator/sheetLabels';
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
  it('reads the sizes, the ridge and the gates of the default', () => {
    expect(read(miniReadout(deriveDomainModel(DEFAULT_CONFIGURATOR_STATE)))).toBe('24 × 60 × 8 м · коник 10,6 м · 1 ворота');
  });

  it('follows the gate count', () => {
    expect(read(miniReadout(domainWith({ gates: 2 })))).toMatch(/ · 2 ворота$/);
    expect(read(miniReadout(domainWith({ gates: 0 })))).toMatch(/ · без воріт$/);
  });

  it('leaves the gates out with the walls, as the summary does', () => {
    const readout = read(miniReadout(domainWith({ scope: ['foundation', 'frame', 'roof'] })));
    expect(readout).toBe('24 × 60 × 8 м · коник 10,6 м');
  });

  it('wraps only between its parts, after «·»', () => {
    const lines = miniReadout(domainWith({ dimensions: { width: 30, length: 120, height: 12.5 } })).split(' ');
    expect(lines).toHaveLength(3);
    expect(lines.slice(0, -1).every((line) => line.endsWith('\u00A0·'))).toBe(true);
    expect(read(lines[0])).toBe('30 × 120 × 12,5 м ·');
  });
});
