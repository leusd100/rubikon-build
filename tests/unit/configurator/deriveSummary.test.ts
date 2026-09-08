import { describe, expect, it } from 'vitest';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { deriveSummary } from '../../../app/lib/configurator/deriveSummary';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

function summaryFor(overrides: Partial<ConfiguratorState>) {
  return deriveSummary(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides }));
}

describe('deriveSummary', () => {
  it('matches the brief\'s own reference example for the default state', () => {
    const summary = summaryFor({});

    expect(summary.dimensionsLabel).toBe('24 × 60 × 8 м');
    expect(summary.areaSqm).toBe(1440);
    expect(summary.structuralVisualizationDescription).toBe(
      'Для ширини 24 м у попередній візуалізації показано ферму з центральним рядом опор.',
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

  it('formats a half-metre height with one decimal, whole metres without', () => {
    const summary = summaryFor({ dimensions: { width: 24, length: 60, height: 8.5 } });

    expect(summary.dimensionsLabel).toBe('24 × 60 × 8.5 м');
  });

  it.each([
    ['cold', 'Холодний', 'profiled-sheet'],
    ['insulated', 'Утеплений', 'sandwich-panel'],
    ['undecided', 'Ще не визначився', 'profiled-sheet'],
  ] as const)('labels envelope "%s" as "%s" when the actual wall/roof system matches its own preset', (envelope, label, system) => {
    // Phase 3E, brief §18: the simple label only holds while the materials still match what this
    // envelope choice implies — set them explicitly here (rather than relying on
    // DEFAULT_CONFIGURATOR_STATE's own profiled-sheet default, which only happens to match
    // 'cold') so this test exercises the "matches" case specifically, not an accident of the
    // default state. The "mismatch" case has its own describe block below.
    expect(summaryFor({ envelope, wallSystem: system, roofSystem: system }).envelopeLabel).toBe(label);
  });

  it('lists scope items in a fixed reading order regardless of toggle order', () => {
    const summary = summaryFor({ scope: ['roof', 'foundation', 'walls'] });

    expect(summary.scopeLabels).toEqual(['Фундамент', 'Стіни / огороджувальний контур', 'Покрівля']);
    expect(summary.scopeSummaryLabel).toBe('Фундамент + Стіни / огороджувальний контур + Покрівля');
  });

  it('says so plainly when no scope item is selected, instead of an empty string', () => {
    const summary = summaryFor({ scope: [] });

    expect(summary.scopeSummaryLabel).toBe('Обсяг робіт ще не обрано');
    expect(summary.scopeLabels).toEqual([]);
  });

  it('labels 0 gates as "Без воріт", with no size mentioned', () => {
    expect(summaryFor({ gates: 0 }).gatesLabel).toBe('Без воріт');
  });

  it.each([
    [1, 'standard', '1 × стандартні, 4×4 м'],
    [2, 'standard', '2 × стандартні, 4×4 м'],
    [1, 'double', '1 × для заїзду техніки, 5×5 м'],
    [2, 'double', '2 × для заїзду техніки, 5×5 м'],
  ] as const)('labels %i %s gate(s) with their real, fixed size (Phase 3F.1, brief §D): "%s"', (gates, gateType, label) => {
    expect(summaryFor({ gates, gateType }).gatesLabel).toBe(label);
  });
});

describe('envelope preset drift (Phase 3E, brief §18)', () => {
  it('stops claiming "Утеплений" the moment one system is manually overridden away from its preset', () => {
    const summary = summaryFor({ envelope: 'insulated', wallSystem: 'profiled-sheet', roofSystem: 'sandwich-panel' });
    expect(summary.envelopeLabel).toBe('Індивідуальна конфігурація');
    // The real systems are still fully visible right below it — nothing is hidden, just not
    // mislabelled as the simple preset any more.
    expect(summary.claddingSystemLabel).toBe('Стіни: Профнастил, покрівля: Сендвіч-панель');
  });

  it('stops claiming "Холодний" the same way, in the other direction', () => {
    const summary = summaryFor({ envelope: 'cold', wallSystem: 'sandwich-panel', roofSystem: 'profiled-sheet' });
    expect(summary.envelopeLabel).toBe('Індивідуальна конфігурація');
  });

  it('"Ще не визначився" never drifts — it never implied a system to begin with', () => {
    const summary = summaryFor({ envelope: 'undecided', wallSystem: 'sandwich-panel', roofSystem: 'profiled-sheet' });
    expect(summary.envelopeLabel).toBe('Ще не визначився');
  });

  it('dimensions and every other summary fact stay unaffected by a mismatched envelope/system pair', () => {
    const summary = summaryFor({ envelope: 'insulated', wallSystem: 'profiled-sheet', roofSystem: 'sandwich-panel' });
    expect(summary.dimensionsLabel).toBe('24 × 60 × 8 м');
    expect(summary.areaSqm).toBe(1440);
  });
});

describe('personnel door label', () => {
  it('reports the real fixed size when a door is configured', () => {
    expect(summaryFor({ doors: 1 }).doorsLabel).toBe('1 × 1×2,1 м');
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
  const noWalls = { scope: ['foundation', 'frame', 'roof'] as ConfiguratorState['scope'] };

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

    expect(summary.gatesLabel).toBe('2 × стандартні, 4×4 м');
    expect(summary.doorsLabel).toBe('1 × 1×2,1 м');
    expect(summary.openingsLabel).toBe('2 × стандартні, 4×4 м · двері: 1 × 1×2,1 м');
  });

  it('still says "no gates" as a real answer when walls ARE ordered', () => {
    const summary = summaryFor({ gates: 0, doors: 0 });

    expect(summary.gatesLabel).toBe('Без воріт');
    expect(summary.doorsLabel).toBe('Не передбачені');
  });

  it('names only the clad surfaces the customer is asking for', () => {
    expect(summaryFor({ ...noWalls }).claddingSystemLabel).toMatch(/^Покрівля: /);
    expect(summaryFor({ scope: ['foundation', 'frame', 'walls'] }).claddingSystemLabel).toMatch(/^Стіни: /);
    expect(summaryFor({ scope: ['foundation', 'frame'] }).claddingSystemLabel).toBe('Поза обсягом заявки');
    // Both in scope and agreeing: still the single combined label, unchanged.
    expect(summaryFor({}).claddingSystemLabel).not.toContain(':');
  });
});
