import { describe, expect, it } from 'vitest';
import { CONTROL_GROUP_TITLES, describeControlGroups } from '../../../app/lib/configurator/controlGroups';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

/** «_» marks a no-break space (U+00A0) */
const nb = (text: string) => text.replaceAll('_', '\u00A0');

function valuesFor(overrides: Partial<ConfiguratorState>) {
  return describeControlGroups(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides }));
}

describe('phone accordion header values (03.10)', () => {
  it('says what is set in each group of the default configuration', () => {
    expect(valuesFor({})).toEqual({
      object: 'Ще не вказано',
      dimensions: nb('24_×_60_×_8_м'),
      envelope: 'Холодний · профнастил',
      cladding: 'Профнастил',
      foundation: 'Визначити після розрахунку',
      scope: '4 з 4 робіт',
      // «одні ворота», not «1 ворота» (04.10)
      openings: 'одні ворота · без дверей',
    });
  });

  it('follows the choices', () => {
    const values = valuesFor({
      dimensions: { width: 30, length: 72, height: 9 },
      envelope: 'insulated',
      wallSystem: 'sandwich-panel',
      roofSystem: 'sandwich-panel',
      scope: ['frame', 'walls'],
      gates: 2,
      doors: 1,
      objectProfile: { purpose: 'storage', project: 'unknown', region: 'Київська область', lifting: 'unknown' },
    });
    expect(values.object).toBe('Склад · Київська обл.');
    expect(values.dimensions).toBe(nb('30_×_72_×_9_м'));
    expect(values.envelope).toBe('Утеплений · стіни: сендвіч-панель');
    expect(values.cladding).toBe('Стіни: Сендвіч-панель');
    expect(values.scope).toBe('2 з 4 робіт');
    expect(values.openings).toBe('двоє воріт · одні двері');
  });

  it('says an opening or an envelope is outside the request when its walls and roof are', () => {
    const noWalls = valuesFor({ scope: ['foundation', 'frame', 'roof'], gates: 2 });
    expect(noWalls.openings).toBe('Поза обсягом заявки');
    expect(noWalls.envelope).toBe('Холодний · покрівля: профнастил');
    const frameOnly = valuesFor({ scope: ['frame'] });
    expect(frameOnly.envelope).toBe('Поза обсягом заявки');
    expect(frameOnly.scope).toBe('1 з 4 робіт');
    expect(valuesFor({ gates: 0 }).openings).toBe('без воріт · без дверей');
  });

  it('has a title for every group it describes', () => {
    expect(Object.keys(valuesFor({})).sort()).toEqual(Object.keys(CONTROL_GROUP_TITLES).sort());
  });
});
