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
