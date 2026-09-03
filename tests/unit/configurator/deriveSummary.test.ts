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
    ['cold', 'Холодний'],
    ['insulated', 'Утеплений'],
    ['undecided', 'Ще не визначився'],
  ] as const)('labels envelope "%s" as "%s"', (envelope, label) => {
    expect(summaryFor({ envelope }).envelopeLabel).toBe(label);
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

  it.each([
    [0, 'Без воріт'],
    [1, '1 ворота'],
    [2, '2 воріт'],
  ] as const)('labels %i gates as "%s"', (gates, label) => {
    expect(summaryFor({ gates }).gatesLabel).toBe(label);
  });
});
