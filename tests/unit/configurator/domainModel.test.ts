import { describe, expect, it } from 'vitest';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

function withState(overrides: Partial<ConfiguratorState>): ConfiguratorState {
  return { ...DEFAULT_CONFIGURATOR_STATE, ...overrides };
}

describe('deriveDomainModel', () => {
  it('is plain, JSON-serializable data — no functions, survives a round trip unchanged', () => {
    const domain = deriveDomainModel(DEFAULT_CONFIGURATOR_STATE);

    const roundTripped = JSON.parse(JSON.stringify(domain));
    expect(roundTripped).toEqual(domain);
  });

  it('carries the object type explicitly, for a future multi-template engine', () => {
    expect(deriveDomainModel(DEFAULT_CONFIGURATOR_STATE).objectType).toBe('hangar');
  });

  it('renames dimensions to explicit metre-suffixed fields without changing their values', () => {
    const domain = deriveDomainModel(withState({ dimensions: { width: 12, length: 34, height: 5.5 } }));

    expect(domain.dimensions).toEqual({ widthM: 12, lengthM: 34, eaveHeightM: 5.5 });
  });

  it('resolves scope into named booleans instead of leaving a raw array for every consumer to re-check', () => {
    const domain = deriveDomainModel(withState({ scope: ['roof', 'walls'] }));

    expect(domain.scope).toEqual({ foundation: false, frame: false, walls: true, roof: true });
  });

  it('resolves an empty scope to all-false, not a missing/undefined shape', () => {
    expect(deriveDomainModel(withState({ scope: [] })).scope).toEqual({
      foundation: false,
      frame: false,
      walls: false,
      roof: false,
    });
  });

  it('resolves a gable roof with a pitch derived from the span, not left implicit', () => {
    const narrow = deriveDomainModel(withState({ dimensions: { width: 10, length: 30, height: 6 } }));
    const wide = deriveDomainModel(withState({ dimensions: { width: 60, length: 30, height: 6 } }));

    expect(narrow.roof.type).toBe('gable');
    // Wider spans get a shallower pitch — a fixed pitch would put an absurd roof on a 60m span.
    expect(wide.roof.pitchDeg).toBeLessThan(narrow.roof.pitchDeg);
  });

  it('computes areaSqm once here, matching width × length', () => {
    const domain = deriveDomainModel(withState({ dimensions: { width: 20, length: 15, height: 6 } }));

    expect(domain.areaSqm).toBe(300);
  });

  it('passes envelope and gates through unchanged', () => {
    const domain = deriveDomainModel(withState({ envelope: 'cold', gates: 2 }));

    // Envelope is split into walls/roof in Phase 3-0. The UI still offers one choice, so both
    // sides resolve to it — but the model can now express them independently.
    expect(domain.envelope).toEqual({ walls: 'cold', roof: 'cold' });
    expect(domain.gates).toBe(2);
  });
});
