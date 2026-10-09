import { describe, expect, it } from 'vitest';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import {
  deriveSummary,
  doorsCountPhrase,
  formatMeters,
  formatRoofSlope,
  formatSize,
  gatesCountPhrase,
} from '../../../app/lib/configurator/deriveSummary';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

function summaryFor(overrides: Partial<ConfiguratorState>) {
  return deriveSummary(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides }));
}

/** «_» marks a no-break space (U+00A0) in an expected label */
const nb = (text: string) => text.replaceAll('_', '\u00A0');

describe('deriveSummary', () => {
  it('matches the brief\'s own reference example for the default state', () => {
    const summary = summaryFor({});

    expect(summary.dimensionsLabel).toBe(nb('24_×_60_×_8_м'));
    expect(summary.areaSqm).toBe(1440);
    expect(summary.areaLabel).toBe(nb('≈_1\u00A0440_м²'));
    expect(summary.headlineLabel).toBe(nb('24_×_60_×_8_м_· Без утеплення'));
    expect(summary.structuralVisualizationDescription).toBe(
      nb('Для ширини 24_м у попередній візуалізації показано ферму з центральним рядом опор.'),
    );
  });

  it('recalculates area as width × length whenever a dimension changes', () => {
    const summary = summaryFor({ dimensions: { width: 30, length: 50, height: 8 } });

    expect(summary.areaSqm).toBe(1500);
  });

  it('rounds a fractional area to the nearest whole square metre', () => {
    const summary = summaryFor({ dimensions: { width: 11, length: 33.5, height: 4 } });

    expect(summary.areaSqm).toBe(Math.round(11 * 33.5));
  });

  it('formats a half-metre height with one decimal comma, whole metres without (04.10: it printed «8.5»)', () => {
    const summary = summaryFor({ dimensions: { width: 24, length: 60, height: 8.5 } });

    expect(summary.dimensionsLabel).toBe(nb('24_×_60_×_8,5_м'));
    expect(formatMeters(7.5)).toBe('7,5');
    expect(formatMeters(24)).toBe('24');
  });

  it('holds every number to its unit and to the «×» of its size with no-break spaces (04.10)', () => {
    expect(formatSize(4, 4)).toBe(nb('4_×_4_м'));
    expect(formatSize(1, 2.1)).toBe(nb('1_×_2,1_м'));
    const summary = summaryFor({ dimensions: { width: 24, length: 60, height: 7.5 }, doors: 1 });
    for (const label of [summary.dimensionsLabel, summary.gatesLabel, summary.doorsLabel, summary.ridgeHeightLabel]) {
      expect(label).not.toMatch(/\d [м%°]|\d [×]|× \d/);
      expect(label).not.toContain('.');
    }
  });

  it.each([
    ['cold', 'Без утеплення', 'profiled-sheet'],
    ['insulated', 'Утеплений', 'sandwich-panel'],
    ['undecided', 'Уточнимо', 'profiled-sheet'],
  ] as const)('labels envelope "%s" as "%s" with its usual system (07.10)', (envelope, label, system) => {
    expect(summaryFor({ envelope, wallSystem: system, roofSystem: system }).envelopeLabel).toBe(label);
  });

  it('lists scope items in a fixed reading order regardless of toggle order', () => {
    const summary = summaryFor({ scopeMode: 'partial' as const, scope: ['roof', 'foundation', 'walls'] });

    expect(summary.scopeLabels).toEqual(['Фундамент', 'Стіни / огороджувальний контур', 'Покрівля']);
    expect(summary.scopeSummaryLabel).toBe('Фундамент + Стіни / огороджувальний контур + Покрівля');
  });

  it('says so plainly when no scope item is selected, instead of an empty string', () => {
    const summary = summaryFor({ scopeMode: 'partial' as const, scope: [] });

    // under the row label «Обсяг»: «Обсяг: Обсяг робіт ще не обрано» said it twice (04.10)
    expect(summary.scopeSummaryLabel).toBe('Ще не обрано');
    expect(summary.scopeLabels).toEqual([]);
  });

  it('labels 0 gates as "Без воріт", with no size mentioned', () => {
    expect(summaryFor({ gates: 0 }).gatesLabel).toBe('Без воріт');
  });

  it.each([
    [1, 'standard', 'Одні стандартні, 4_×_4_м'],
    [2, 'standard', 'Двоє стандартних, 4_×_4_м'],
    [1, 'double', 'Одні для заїзду техніки, 5_×_5_м'],
    [2, 'double', 'Двоє для заїзду техніки, 5_×_5_м'],
  ] as const)('labels %i %s gate(s) with the numeral and their real, fixed size (Phase 3F.1; 04.10): "%s"', (gates, gateType, label) => {
    expect(summaryFor({ gates, gateType }).gatesLabel).toBe(nb(label));
  });

  // 09.10, owner («Звичайно»): at 12 m two 5 × 5 m gates asked for, the scheme draws one — and the stamp said only «у схемі
  // не вміщуються», never that one is drawn. The label says what was asked, the size that holds it, and what is drawn.
  it.each([
    // the width holds the count: fewer of the same are drawn
    [{ gates: 2, gateType: 'double', dimensions: { width: 12, length: 60, height: 8 } }, 'Двоє для заїзду техніки, 5_×_5_м_— за ширини 12_м у схемі вміщуються лише одні'],
    // the wall height holds the type: the smaller type is drawn
    [{ gates: 1, gateType: 'double', dimensions: { width: 24, length: 60, height: 5 } }, 'Одні для заїзду техніки, 5_×_5_м_— під стіни 5_м у схемі показано одні стандартні, 4_×_4_м'],
    [{ gates: 2, gateType: 'double', dimensions: { width: 24, length: 60, height: 5 } }, 'Двоє для заїзду техніки, 5_×_5_м_— під стіни 5_м у схемі показано двоє стандартних, 4_×_4_м'],
    // nothing stands under a 4 m wall: none drawn, said as before
    [{ gates: 1, gateType: 'standard', dimensions: { width: 24, length: 60, height: 4 } }, 'Одні стандартні, 4_×_4_м_— під стіни 4_м у схемі не вміщуються'],
  ] as const)('says the gates asked for, why the scheme holds them and what it draws instead: %j', (state, label) => {
    expect(summaryFor(state).gatesLabel).toBe(nb(label));
  });

  it('counts plural-only nouns with «одні» and «двоє», never «1 ворота» or «2 ворота» (04.10)', () => {
    expect([0, 1, 2].map(gatesCountPhrase)).toEqual(['без воріт', 'одні ворота', 'двоє воріт']);
    expect([0, 1].map(doorsCountPhrase)).toEqual(['без дверей', 'одні двері']);
  });
});

// 07.10: «Утеплення» is the thermal answer on its own. A changed material used to turn it into «Індивідуальна
// конфігурація», and the visitor could no longer tell which envelope they asked for; a sandwich panel carries its own
// insulation, so it says where (iteration 1, 08.10: also over «Ще не знаю»).
describe('the insulation label beside the materials (07.10)', () => {
  it('keeps «Утеплений» when the materials differ, and names them one by one below it', () => {
    const summary = summaryFor({ envelope: 'insulated', wallSystem: 'profiled-sheet', roofSystem: 'sandwich-panel' });
    expect(summary.envelopeLabel).toBe('Утеплений');
    expect(summary.claddingSystemLabel).toBe('Стіни: Профнастил, покрівля: Сендвіч-панель');
  });

  it('says where a sandwich panel brings insulation to a building asked without it', () => {
    expect(summaryFor({ envelope: 'cold', wallSystem: 'sandwich-panel', roofSystem: 'profiled-sheet' }).envelopeLabel)
      .toBe('Лише в стінах (сендвіч-панелі)');
    expect(summaryFor({ envelope: 'cold', wallSystem: 'profiled-sheet', roofSystem: 'sandwich-panel' }).envelopeLabel)
      .toBe('Лише в покрівлі (сендвіч-панелі)');
    expect(summaryFor({ envelope: 'cold', wallSystem: 'sandwich-panel', roofSystem: 'sandwich-panel' }).envelopeLabel)
      .toBe('У сендвіч-панелях');
  });

  it('lets a sandwich panel answer «Ще не знаю», instead of «Уточнимо» beside «з утеплювачем»', () => {
    expect(summaryFor({ envelope: 'undecided', wallSystem: 'sandwich-panel', roofSystem: 'profiled-sheet' }).envelopeLabel)
      .toBe('Лише в стінах (сендвіч-панелі)');
  });

  it('dimensions and every other summary fact stay unaffected by a mismatched envelope/system pair', () => {
    const summary = summaryFor({ envelope: 'insulated', wallSystem: 'profiled-sheet', roofSystem: 'sandwich-panel' });
    expect(summary.dimensionsLabel).toBe(nb('24_×_60_×_8_м'));
    expect(summary.areaSqm).toBe(1440);
  });
});

describe('personnel door label', () => {
  it('reports the real fixed size when a door is configured', () => {
    // «Одні службові, 1 × 2,1 м»: it was «1 × 1×2,1 м», a count and a size with one sign (04.10)
    expect(summaryFor({ doors: 1 }).doorsLabel).toBe(nb('Одні службові, 1_×_2,1_м'));
  });

  it('says so plainly when there is none, rather than omitting the row', () => {
    expect(summaryFor({ doors: 0 }).doorsLabel).toBe('Не передбачені');
  });
});

describe('deriveSummary — "Обсяг заявки" is the master fact (Phase 3F.2)', () => {
  // Reported live: with walls out of scope, the brief printed "Обсяг: Фундамент + Металокаркас +
  // Покрівля" and then, one line later, "Ворота: 2 × стандартні" — an order for openings in walls
  // nobody had asked for. The 3D renderer already refused to DRAW them in that state
  // (threeSceneModel: "a gate is an opening cut INTO a wall"); the summary simply did not know the
  // rule, which is the same bug one layer up.
  const noWalls = { scopeMode: 'partial' as const, scope: ['foundation', 'frame', 'roof'] as ConfiguratorState['scope'] };

  it('drops gates and doors from the request entirely when walls are not ordered', () => {
    const summary = summaryFor({ ...noWalls, gates: 2, gateType: 'standard', doors: 1 });

    // null, not a "поза обсягом" caveat: there is nothing for an opening to be cut into, so it is
    // not part of this request at all. The choice itself survives in the controls, which are
    // disabled rather than cleared, and returns with the walls.
    expect(summary.gatesLabel).toBeNull();
    expect(summary.doorsLabel).toBeNull();
    expect(summary.openingsLabel).toBe('Поза обсягом заявки');
  });

  it('restores them as soon as walls are ordered again', () => {
    const summary = summaryFor({ gates: 2, gateType: 'standard', doors: 1 });

    expect(summary.gatesLabel).toBe(nb('Двоє стандартних, 4_×_4_м'));
    expect(summary.doorsLabel).toBe(nb('Одні службові, 1_×_2,1_м'));
    expect(summary.openingsLabel).toBe(nb('Двоє стандартних, 4_×_4_м · двері: одні службові, 1_×_2,1_м'));
  });

  it('still says "no gates" as a real answer when walls ARE ordered', () => {
    const summary = summaryFor({ gates: 0, doors: 0 });

    expect(summary.gatesLabel).toBe('Без воріт');
    expect(summary.doorsLabel).toBe('Не передбачені');
  });

  it('names only the clad surfaces the customer is asking for', () => {
    expect(summaryFor({ ...noWalls }).claddingSystemLabel).toMatch(/^Покрівля: /);
    expect(summaryFor({ scopeMode: 'partial' as const, scope: ['foundation', 'frame', 'walls'] }).claddingSystemLabel).toMatch(/^Стіни: /);
    expect(summaryFor({ scopeMode: 'partial' as const, scope: ['foundation', 'frame'] }).claddingSystemLabel).toBe('Поза обсягом заявки');
    // Both in scope and agreeing: still the single combined label, unchanged.
    expect(summaryFor({}).claddingSystemLabel).not.toContain(':');
  });

  it('says the contour is outside the request when walls and roof are, and leaves it out of the headline (04.10)', () => {
    // The stamp said «Контур: Холодний» beside «Огородження: Поза обсягом заявки», the route «24 × 60 × 8 м · Холодний»
    const summary = summaryFor({ scopeMode: 'partial' as const, scope: ['foundation', 'frame'] });
    expect(summary.envelopeLabel).toBe('Поза обсягом заявки');
    expect(summary.headlineLabel).toBe(summary.dimensionsLabel);
    // one surface is enough for a contour
    expect(summaryFor({ scopeMode: 'partial' as const, scope: ['frame', 'roof'] }).envelopeLabel).toBe('Без утеплення');
  });
});

describe('the ridge with its slope (03.10)', () => {
  it('says the slope next to the ridge, in whole degrees', () => {
    const summary = summaryFor({});
    expect(summary.ridgeHeightLabel).toBe(nb('10,6_м · ухил_≈_12°'));
    expect(summary.roofSlopeLabel).toBe(nb('ухил_≈_12°'));
  });

  it('keeps the slope on the span rule when only the width changes', () => {
    expect(summaryFor({ dimensions: { width: 12, length: 60, height: 8 } }).ridgeHeightLabel).toBe(nb('9,5_м · ухил_≈_14°'));
    expect(summaryFor({ dimensions: { width: 50, length: 60, height: 8 } }).ridgeHeightLabel).toBe(nb('11,7_м · ухил_≈_8°'));
  });

  it('shows the visitor’s ridge once edited', () => {
    expect(summaryFor({ ridgeHeightM: 12, ridgeEdited: true }).ridgeHeightLabel).toBe(nb('12_м · ухил_≈_18°'));
  });

  it('adds the percent only when asked (the ridge hint has room for it)', () => {
    expect(formatRoofSlope(12.2249)).toBe(nb('ухил_≈_12°'));
    // tan 12.2249° = 0.2167
    expect(formatRoofSlope(12.2249, true)).toBe(nb('ухил_≈_12° (22_%)'));
    expect(formatRoofSlope(5, true)).toBe(nb('ухил_≈_5° (9_%)'));
  });
});

describe('«Об’єкт» labels (03.10)', () => {
  it('are null while unanswered, so nothing shows them', () => {
    expect(summaryFor({}).objectProfile).toEqual({ purpose: null, project: null, region: null, lifting: null });
  });

  it('carry the answers as the lead reads them', () => {
    expect(summaryFor({
      objectProfile: { purpose: 'production', project: 'ready', region: 'м. Київ', lifting: 'craneOrHoist' },
    }).objectProfile).toEqual({ purpose: 'Виробництво', project: 'Є', region: 'м. Київ', lifting: 'Кран-балка або тельфер' });
  });
});
