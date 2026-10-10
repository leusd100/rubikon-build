import { describe, expect, it } from 'vitest';
import { CONTROL_GROUP_TITLES, describeControlGroups } from '../../../app/lib/configurator/controlGroups';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

/** «_» marks a no-break space (U+00A0) */
const nb = (text: string) => text.replaceAll('_', '\u00A0');

function valuesFor(overrides: Partial<ConfiguratorState>) {
  return describeControlGroups(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides }));
}

describe('step header values (03.10; steps 07.10)', () => {
  it('says what is set in each group of the default configuration', () => {
    expect(valuesFor({})).toEqual({
      need: 'Ще не вказано',
      dimensions: nb('24_×_60_×_8_м'),
      // a cold contour is named by what it lacks (07.10, GPT review): «Холодний» read as a defect
      envelope: 'Без утеплення · профнастил',
      cladding: 'Профнастил',
      foundation: 'Після розрахунку проєктувальника',
      // the whole list unless the visitor narrows it (scopeMode, 07.10)
      scope: 'Комплекс робіт',
      // «одні ворота», not «1 ворота» (04.10)
      openings: 'одні ворота · без дверей',
      space: 'Ще не знаю',
      project: 'Ще не вказано',
    });
  });

  it('follows the choices', () => {
    const values = valuesFor({
      dimensions: { width: 30, length: 72, height: 9 },
      envelope: 'insulated',
      wallSystem: 'sandwich-panel',
      roofSystem: 'sandwich-panel',
      scopeMode: 'partial', scope: ['frame', 'walls'],
      gates: 2,
      doors: 1,
      objectProfile: { purpose: 'storage', project: 'unknown', region: 'Київська область', lifting: 'unknown', temperature: 'unknown' },
    });
    expect(values.need).toBe('Склад · Київська обл.');
    expect(values.project).toBe('Ще не вказано');
    expect(values.dimensions).toBe(nb('30_×_72_×_9_м'));
    expect(values.envelope).toBe('Утеплений · стіни: сендвіч-панель');
    expect(values.cladding).toBe('Стіни: Сендвіч-панель');
    expect(values.scope).toBe('2 з 4 робіт');
    expect(values.openings).toBe('двоє воріт · одні двері');
  });

  it('says an opening or an envelope is outside the request when its walls and roof are', () => {
    const noWalls = valuesFor({ scopeMode: 'partial', scope: ['foundation', 'frame', 'roof'], gates: 2 });
    expect(noWalls.openings).toBe('Поза обсягом робіт');
    expect(noWalls.envelope).toBe('Без утеплення · покрівля: профнастил');
    const frameOnly = valuesFor({ scopeMode: 'partial', scope: ['frame'] });
    expect(frameOnly.envelope).toBe('Поза обсягом робіт');
    expect(frameOnly.scope).toBe('1 з 4 робіт');
    expect(valuesFor({ gates: 0 }).openings).toBe('без воріт · без дверей');
  });

  it('marks sizes not known yet as an orientation', () => {
    expect(valuesFor({ sizesUnknown: true }).dimensions).toBe(nb('уточнюємо · 24_×_60_×_8_м'));
  });

  it('has a title for every group it describes', () => {
    expect(Object.keys(valuesFor({})).sort()).toEqual(Object.keys(CONTROL_GROUP_TITLES).sort());
  });
});
