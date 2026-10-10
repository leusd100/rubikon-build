import { describe, expect, it } from 'vitest';
import { deriveDomainModel, openingsShown, resolveRidgeHeightM, withRidge, withSpanRuleRidge } from '../../../app/lib/configurator/domainModel';
import {
  clampRidgeHeightM,
  defaultRidgeHeightM,
  deriveStructuralVisualization,
  pitchDegForRidge,
  roofPitchDegForWidth,
} from '../../../app/lib/configurator/parametricModel';
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
    const domain = deriveDomainModel(withState({ scopeMode: 'partial', scope: ['roof', 'walls'] }));

    expect(domain.scope).toEqual({ foundation: false, frame: false, walls: true, roof: true });
  });

  it('resolves an empty scope to all-false, not a missing/undefined shape', () => {
    expect(deriveDomainModel(withState({ scopeMode: 'partial', scope: [] })).scope).toEqual({
      foundation: false,
      frame: false,
      walls: false,
      roof: false,
    });
  });

  it('resolves a gable roof with a pitch derived from the span, not left implicit', () => {
    const narrow = deriveDomainModel(withState({ dimensions: { width: 10, length: 30, height: 6 } }));
    const wide = deriveDomainModel(withState({ dimensions: { width: 50, length: 30, height: 6 } }));

    expect(narrow.roof.type).toBe('gable');
    // Wider spans get a shallower pitch — a fixed pitch would put an absurd roof on a wide span.
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
    expect(domain.envelope).toEqual({
      walls: 'cold',
      roof: 'cold',
      // Phase 3D: cladding system, independent of the thermal choice above — see the same test's
      // sibling below for that independence actually being exercised.
      wallSystem: 'profiled-sheet',
      roofSystem: 'profiled-sheet',
    });
    expect(domain.gates).toBe(2);
  });

  it('Phase 3D: passes wall/roof cladding system and foundation type through independently of the thermal envelope', () => {
    const domain = deriveDomainModel(
      withState({ wallSystem: 'sandwich-panel', roofSystem: 'profiled-sheet', foundationType: 'isolated' }),
    );

    expect(domain.envelope.wallSystem).toBe('sandwich-panel');
    expect(domain.envelope.roofSystem).toBe('profiled-sheet');
    expect(domain.foundation).toEqual({ type: 'isolated' });
  });

  describe('Phase 3E.1: `structural` is derived from width alone, not read from stored state', () => {
    it('resolves to the same value deriveStructuralVisualization(width) would, for a few representative widths', () => {
      for (const width of [12, 20, 30]) {
        const domain = deriveDomainModel(withState({ dimensions: { width, length: 40, height: 6 } }));
        expect(domain.structural).toEqual(deriveStructuralVisualization(width));
      }
    });

    it('is unaffected by anything else in state — length, height, envelope, foundation, gates', () => {
      const a = deriveDomainModel(withState({ dimensions: { width: 30, length: 40, height: 6 } }));
      const b = deriveDomainModel(withState({
        dimensions: { width: 30, length: 90, height: 12 },
        envelope: 'insulated',
        foundationType: 'isolated',
        gates: 2,
        gateType: 'double',
      }));
      expect(a.structural).toEqual(b.structural);
    });
  });
});

describe('the ridge follows the span rule until the visitor edits it (03.10)', () => {
  // Only clamping the stored ridge let the slope drift with the width alone: the default 10.6 m ridge read 5.9° at 50 m
  // and 19.3° at 12 m, and the lead received a «Висота в конику» nobody had chosen.
  it('reproduces the drift the flag removes: the old clamp alone', () => {
    expect(pitchDegForRidge(50, 8, clampRidgeHeightM(10.6, 50, 8))).toBeCloseTo(5.9, 1);
    expect(pitchDegForRidge(12, 8, clampRidgeHeightM(10.6, 12, 8))).toBeCloseTo(19.3, 1);
  });

  it('an unedited ridge is the span rule’s ridge for the current width and eave height, snapped to 0.1 m', () => {
    for (const width of [10, 12, 18, 24, 30, 36, 42, 50]) {
      for (const height of [4, 8, 15]) {
        const state = withState({ dimensions: { width, length: 60, height } });
        expect(resolveRidgeHeightM(state), `${width} × ${height}`).toBe(defaultRidgeHeightM(width, height));
        // the 0.1 m snap moves the slope by well under a degree, even on the narrowest span
        const pitch = deriveDomainModel(state).roof.pitchDeg;
        expect(Math.abs(pitch - roofPitchDegForWidth(width)), `${width} × ${height}`).toBeLessThan(0.6);
      }
    }
    expect(Math.round(deriveDomainModel(withState({ dimensions: { width: 12, length: 60, height: 8 } })).roof.pitchDeg)).toBe(14);
    expect(Math.round(deriveDomainModel(withState({ dimensions: { width: 50, length: 60, height: 8 } })).roof.pitchDeg)).toBe(8);
  });

  it('ignores a stored ridge while unedited — it is not the visitor’s', () => {
    const state = withState({ ridgeHeightM: 12.3 });
    expect(resolveRidgeHeightM(state)).toBe(10.6);
  });

  it('an edited ridge is the visitor’s, held inside the legal range as the footprint changes', () => {
    const edited = withState({ ridgeHeightM: 12.3, ridgeEdited: true });
    expect(resolveRidgeHeightM(edited)).toBe(12.3);
    expect(resolveRidgeHeightM({ ...edited, dimensions: { width: 50, length: 60, height: 8 } })).toBe(12.3);
    // 12 m wide: the steepest credible ridge is 10.1 m
    expect(resolveRidgeHeightM({ ...edited, dimensions: { width: 12, length: 60, height: 8 } })).toBe(clampRidgeHeightM(12.3, 12, 8));
  });

  it('the default state stores exactly the ridge it resolves to', () => {
    expect(resolveRidgeHeightM(DEFAULT_CONFIGURATOR_STATE)).toBe(DEFAULT_CONFIGURATOR_STATE.ridgeHeightM);
  });

  it('copies the «Об’єкт» answers as given', () => {
    const objectProfile = { purpose: 'agricultural', project: 'ready', region: 'Полтавська область', lifting: 'none', temperature: 'unknown' } as const;
    expect(deriveDomainModel(withState({ objectProfile })).objectProfile).toEqual(objectProfile);
  });
});

describe('the visitor’s choices are held, not cleared, while the sizes leave no room for them (04.10)', () => {
  it('typing the span rule’s own value is the span rule again; anything else is the visitor’s', () => {
    const edited = withRidge(DEFAULT_CONFIGURATOR_STATE, 11.5);
    expect(edited).toMatchObject({ ridgeHeightM: 11.5, ridgeEdited: true });
    expect(withRidge(edited, 10.6)).toMatchObject({ ridgeHeightM: 10.6, ridgeEdited: false });
    // the span rule's value for the current sizes, not the default's: 11 m at 30 × 8
    expect(withRidge(withState({ dimensions: { width: 30, length: 60, height: 8 } }), 11).ridgeEdited).toBe(false);
    expect(withSpanRuleRidge(withState({ dimensions: { width: 30, length: 60, height: 8 }, ridgeHeightM: 13, ridgeEdited: true })))
      .toMatchObject({ ridgeHeightM: 11, ridgeEdited: false });
  });

  it('an edited ridge a lower wall holds to its range comes back as typed when the wall is raised', () => {
    const edited = withRidge(DEFAULT_CONFIGURATOR_STATE, 11.5);
    const lowered = { ...edited, dimensions: { ...edited.dimensions, height: 4 } };
    expect(resolveRidgeHeightM(lowered)).toBe(8.3);
    expect(resolveRidgeHeightM({ ...lowered, dimensions: { ...lowered.dimensions, height: 8 } })).toBe(11.5);
  });

  it('gates and a door that do not fit are placed as what fits, and come back with the width', () => {
    const chosen = withState({ gates: 2, gateType: 'double', doors: 1 });
    expect(deriveDomainModel({ ...chosen, dimensions: { width: 12, length: 60, height: 8 } })).toMatchObject({ gates: 1, gateType: 'double', doors: 1 });
    expect(deriveDomainModel({ ...chosen, dimensions: { width: 14, length: 60, height: 8 } })).toMatchObject({ gates: 2, doors: 0 });
    expect(deriveDomainModel(chosen)).toMatchObject({ gates: 2, gateType: 'double', doors: 1 });
    // a «5» on the way to «5,5»: the type falls back while it does not fit, and is the visitor’s again at 5,5
    expect(deriveDomainModel({ ...withState({ gates: 1, gateType: 'double' }), dimensions: { width: 24, length: 60, height: 5 } }).gateType).toBe('standard');
    expect(deriveDomainModel({ ...withState({ gates: 1, gateType: 'double' }), dimensions: { width: 24, length: 60, height: 5.5 } }).gateType).toBe('double');
  });
});

describe('the openings the drawings show (09.10, audit F19)', () => {
  it('shows a door with no gates, and nothing without walls', () => {
    const at = (state: Partial<ConfiguratorState>) => openingsShown(deriveDomainModel(withState(state)));
    expect(at({ gates: 0, doors: 1 })).toBe(true);
    expect(at({ gates: 1, doors: 0 })).toBe(true);
    expect(at({ gates: 0, doors: 0 })).toBe(false);
    // the gates held off a 4 m wall: the door stays, and is shown
    expect(at({ gates: 1, doors: 1, dimensions: { width: 20, length: 40, height: 4 } })).toBe(true);
    expect(at({ gates: 1, doors: 1, scopeMode: 'partial', scope: ['foundation', 'frame', 'roof'] })).toBe(false);
  });
});
