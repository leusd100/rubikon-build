import { describe, expect, it } from 'vitest';
import {
  GATE_DIMENSIONS_M,
  GATE_TOP_CLEARANCE_M,
  PITCH_MAX_WIDTH_M,
  PITCH_MIN_WIDTH_M,
  ROOF_PITCH_MAX_DEG,
  ROOF_PITCH_MIN_DEG,
  STRUCTURAL_VISUALIZATION_THRESHOLDS,
  buildParametricModel,
  clampGateSelection,
  clampRidgeHeightM,
  defaultRidgeHeightM,
  deriveStructuralVisualization,
  frameBayCount,
  gateHeightFits,
  gateSelectionFits,
  maxGateCountThatFits,
  pitchDegForRidge,
  ridgeHeightM,
  ridgeHeightRangeM,
  roofPitchDegForWidth,
  type ParametricBuildingModel,
  type Vec3,
} from '../../../app/lib/configurator/parametricModel';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import {
  DEFAULT_CONFIGURATOR_STATE,
  DIMENSION_BOUNDS,
  type ConfiguratorState,
  type RoofStructure,
  type StructuralScheme,
} from '../../../app/lib/configurator/types';

// Behavioural numeric assertions, deliberately not a giant JSON snapshot: a snapshot would go
// red on every intentional visual change and tell us nothing about *which* geometric invariant
// broke. These are the invariants a future 3D renderer will silently depend on.

const W = DIMENSION_BOUNDS.width;
const L = DIMENSION_BOUNDS.length;
const H = DIMENSION_BOUNDS.height;

function modelFor(overrides: Partial<ConfiguratorState['dimensions']> = {}, rest: Partial<ConfiguratorState> = {}) {
  const state: ConfiguratorState = {
    ...DEFAULT_CONFIGURATOR_STATE,
    ...rest,
    dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, ...overrides },
  };
  return buildParametricModel(deriveDomainModel(state));
}

/**
 * Phase 3E.1: `structuralScheme`/`roofStructure` are no longer part of `ConfiguratorState` — they
 * are derived from width (see `deriveStructuralVisualization`). The structural-geometry tests
 * below (internal columns, internal-column footings, truss webs) still need to exercise the FULL
 * matrix the underlying geometry functions support, INCLUDING `portalRafter` + `centerSupport`,
 * which the width-only derivation itself never produces — see `deriveStructuralVisualization`'s
 * own doc comment on why that combination is intentionally unreachable through it, and this
 * module's own header on "keep the implementation reusable internally". This helper builds the
 * `HangarDomainModel` directly and overrides `structural` after deriving it from `state`, the same
 * "test the geometry layer independently of the derivation" pattern the rest of this suite already
 * uses for other domain facts.
 */
function modelForStructural(
  structural: { scheme: StructuralScheme; roofStructure: RoofStructure },
  overrides: Partial<ConfiguratorState['dimensions']> = {},
  rest: Partial<ConfiguratorState> = {},
) {
  const state: ConfiguratorState = {
    ...DEFAULT_CONFIGURATOR_STATE,
    ...rest,
    dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, ...overrides },
  };
  return buildParametricModel({ ...deriveDomainModel(state), structural });
}

function allPoints(m: ParametricBuildingModel): Vec3[] {
  return [
    ...m.frames.flatMap((f) => [f.leftColumn.a, f.leftColumn.b, f.rightColumn.a, f.rightColumn.b,
      f.leftRafter.a, f.leftRafter.b, f.rightRafter.a, f.rightRafter.b, f.ridgePoint]),
    ...m.envelope.wallSegments.flatMap((s) => s.corners),
    ...m.envelope.roofSegments.flatMap((s) => s.corners),
    ...m.envelope.gableEnds.flatMap((g) => g.outline),
    ...m.girts.flatMap((g) => [g.a, g.b]),
    ...m.openings.flatMap((o) => o.corners),
    ...m.slab.corners,
  ];
}

describe('coordinate convention', () => {
  // This is the frozen contract from parametricModel.ts's header. It is tested rather than left
  // to a comment because a front/rear face mismatch between the model and a camera already cost
  // this project a real debugging session during the R3F spike.
  const m = modelFor();

  it('puts the FRONT facade at z = 0 and the REAR at z = lengthM', () => {
    const front = m.envelope.gableEnds.find((g) => g.face === 'front');
    const rear = m.envelope.gableEnds.find((g) => g.face === 'rear');

    expect(front!.outline.every((p) => p.z === 0)).toBe(true);
    expect(rear!.outline.every((p) => p.z === m.footprint.lengthM)).toBe(true);
  });

  it('puts the LEFT wall at x = 0 and the RIGHT wall at x = widthM', () => {
    const left = m.envelope.wallSegments.filter((s) => s.face === 'left');
    const right = m.envelope.wallSegments.filter((s) => s.face === 'right');

    expect(left.length).toBeGreaterThan(0);
    expect(left.every((s) => s.corners.every((p) => p.x === 0))).toBe(true);
    expect(right.every((s) => s.corners.every((p) => p.x === m.footprint.widthM))).toBe(true);
  });

  it('treats Y as up, with the ground/slab line at y = 0 and the ridge as the highest point', () => {
    const ys = allPoints(m).map((p) => p.y);

    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBeCloseTo(m.heights.ridgeM, 6);
  });

  it('runs the ridge along Z at mid-width', () => {
    for (const frame of m.frames) {
      expect(frame.ridgePoint.x).toBeCloseTo(m.footprint.widthM / 2, 6);
      expect(frame.ridgePoint.y).toBeCloseTo(m.heights.ridgeM, 6);
    }
    const zs = m.frames.map((f) => f.ridgePoint.z);
    expect(Math.min(...zs)).toBe(0);
    expect(Math.max(...zs)).toBe(m.footprint.lengthM);
  });
});

describe('ridge derivation', () => {
  it('is the one formula: ridge = eave + (width/2)·tan(pitch)', () => {
    const m = modelFor({ width: 24, height: 8 });
    const expected = 8 + 12 * Math.tan((m.roof.pitchDeg * Math.PI) / 180);

    expect(m.heights.ridgeM).toBeCloseTo(expected, 6);
    expect(ridgeHeightM(24, 8, m.roof.pitchDeg)).toBeCloseTo(expected, 6);
  });

  it('keeps riseM consistent with the two heights it sits between', () => {
    const m = modelFor({ width: 30, height: 7 });
    expect(m.roof.riseM).toBeCloseTo(m.heights.ridgeM - m.heights.eaveM, 6);
    expect(m.heights.ridgeM).toBeGreaterThan(m.heights.eaveM);
  });

  it('shallows the DEFAULT pitch as the span widens — a fixed pitch is wrong across a 10–60 m range', () => {
    const pitches = [10, 24, 40, 60].map(roofPitchDegForWidth);

    expect(pitches).toEqual([...pitches].sort((a, b) => b - a));
    // A fixed 12° would put the ridge 6.38 m above the eave on a 60 m span. The span rule keeps
    // the *starting* ridge sane; once the ridge became user-adjustable, the pitch clamp below is
    // what keeps it sane thereafter.
    const widestDefault = defaultRidgeHeightM(W.max, H.min);
    expect(widestDefault - H.min).toBeLessThan(H.min);
  });

  it('keeps the resulting pitch inside the credible range for ANY stored ridge', () => {
    // The ridge is user-set, so the model must stay sane even if state carries something absurd.
    for (const [width, height] of [[W.min, H.min], [24, 8], [W.max, H.max], [W.max, H.min]] as const) {
      for (const attempted of [-50, 0, 3, 11, 40, 500]) {
        const ridge = clampRidgeHeightM(attempted, width, height);
        const pitch = pitchDegForRidge(width, height, ridge);

        expect(pitch).toBeGreaterThanOrEqual(ROOF_PITCH_MIN_DEG - 0.05);
        expect(pitch).toBeLessThanOrEqual(ROOF_PITCH_MAX_DEG + 0.05);
        expect(ridge).toBeGreaterThan(height);
      }
    }
  });

  it('moves the legal ridge range with width and eave height', () => {
    const narrow = ridgeHeightRangeM(12, 8);
    const wide = ridgeHeightRangeM(48, 8);
    const taller = ridgeHeightRangeM(12, 12);

    // A wider span reaches higher at the same pitch...
    expect(wide.max).toBeGreaterThan(narrow.max);
    // ...and raising the walls lifts the whole range with them.
    expect(taller.min).toBeGreaterThan(narrow.min);
    for (const range of [narrow, wide, taller]) expect(range.max).toBeGreaterThan(range.min);
  });

  it('round-trips ridge height and pitch — the two directions agree', () => {
    for (const [width, eave, ridge] of [[24, 8, 10.6], [40, 6, 9.4], [12, 5, 6.2]] as const) {
      const pitch = pitchDegForRidge(width, eave, ridge);
      expect(ridgeHeightM(width, eave, pitch)).toBeCloseTo(ridge, 4);
    }
  });

  it('starts from the span rule, snapped to the adjustment step', () => {
    const fromRule = 8 + 12 * Math.tan((roofPitchDegForWidth(24) * Math.PI) / 180);
    expect(defaultRidgeHeightM(24, 8)).toBeCloseTo(Math.round(fromRule / 0.1) * 0.1, 6);
    expect(defaultRidgeHeightM(24, 8)).toBe(DEFAULT_CONFIGURATOR_STATE.ridgeHeightM);
  });

  it('clamps the pitch rule outside its own curve range instead of extrapolating', () => {
    // Phase 3E.1: asserted against the pitch curve's OWN anchors (PITCH_MIN/MAX_WIDTH_M), not
    // DIMENSION_BOUNDS.width — the two were deliberately decoupled when the public width max
    // dropped to 50 while this curve's own upper anchor stayed at 60 (see
    // roofPitchDegForWidth's own doc comment for why).
    expect(roofPitchDegForWidth(PITCH_MIN_WIDTH_M - 20)).toBe(roofPitchDegForWidth(PITCH_MIN_WIDTH_M));
    expect(roofPitchDegForWidth(PITCH_MAX_WIDTH_M + 20)).toBe(roofPitchDegForWidth(PITCH_MAX_WIDTH_M));
  });
});

describe('roof symmetry', () => {
  it('mirrors the two slopes about mid-width', () => {
    const m = modelFor({ width: 24, length: 60, height: 8 });
    const left = m.envelope.roofSegments.filter((s) => s.slope === 'left');
    const right = m.envelope.roofSegments.filter((s) => s.slope === 'right');
    const o = m.roof.overhangM;

    expect(left).toHaveLength(right.length);
    for (let i = 0; i < left.length; i += 1) {
      // The outer (non-ridge) pair of each segment's quad — identified by NOT being at ridge
      // height, since the overhang means it is no longer at exactly eave height either (see the
      // 'roof overhang' block below for that relationship).
      const leftOuter = left[i].corners.filter((p) => p.y !== m.heights.ridgeM);
      const rightOuter = right[i].corners.filter((p) => p.y !== m.heights.ridgeM);
      expect(leftOuter.every((p) => p.x === -o)).toBe(true);
      expect(rightOuter.every((p) => p.x === m.footprint.widthM + o)).toBe(true);
      // Both slopes cantilever the same horizontal distance, so they drop the same amount too.
      expect(leftOuter.map((p) => p.y)).toEqual(rightOuter.map((p) => p.y));
    }
  });

  it('gives both rafters of a portal frame the same run and the same rise', () => {
    const m = modelFor({ width: 36, height: 9 });
    const frame = m.frames[0];
    const runLeft = Math.abs(frame.leftRafter.b.x - frame.leftRafter.a.x);
    const runRight = Math.abs(frame.rightRafter.b.x - frame.rightRafter.a.x);

    expect(runLeft).toBeCloseTo(runRight, 6);
    expect(frame.leftRafter.b.y).toBeCloseTo(frame.rightRafter.b.y, 6);
    expect(frame.leftRafter.a.y).toBeCloseTo(frame.rightRafter.a.y, 6);
  });
});

describe('bay stations', () => {
  it('are strictly increasing and span exactly 0…lengthM', () => {
    for (const length of [L.min, 37, 60, L.max]) {
      const m = modelFor({ length });
      const s = m.bays.stationsM;

      expect(s[0]).toBe(0);
      expect(s[s.length - 1]).toBeCloseTo(length, 6);
      for (let i = 1; i < s.length; i += 1) expect(s[i]).toBeGreaterThan(s[i - 1]);
      expect(s).toHaveLength(m.bays.count + 1);
    }
  });

  it('stays inside the legible 2–10 bay clamp even at maximum length', () => {
    expect(frameBayCount(L.min)).toBeGreaterThanOrEqual(2);
    expect(frameBayCount(L.max)).toBeLessThanOrEqual(10);
    // The clamp is what bounds member count for BOTH renderers: a 120 m hangar gets 10 bays.
    expect(modelFor({ length: L.max }).frames).toHaveLength(frameBayCount(L.max) + 1);
  });

  it('places one portal frame per station', () => {
    const m = modelFor({ length: 60 });
    expect(m.frames.map((f) => f.stationM)).toEqual(m.bays.stationsM);
  });
});

describe('gable ends', () => {
  it('are pentagons that close, with the apex at the ridge and mid-width', () => {
    const m = modelFor({ width: 24, height: 8 });

    for (const gable of m.envelope.gableEnds) {
      expect(gable.outline).toHaveLength(5);
      const apex = gable.outline.reduce((a, b) => (b.y > a.y ? b : a));
      expect(apex.y).toBeCloseTo(m.heights.ridgeM, 6);
      expect(apex.x).toBeCloseTo(m.footprint.widthM / 2, 6);

      const base = gable.outline.filter((p) => p.y === 0);
      const eaves = gable.outline.filter((p) => p.y === m.heights.eaveM);
      expect(base).toHaveLength(2);
      expect(eaves).toHaveLength(2);
    }
  });
});

describe('openings', () => {
  it('stay inside the front face — on it, within its width, and below the eave', () => {
    for (const gates of [1, 2] as const) {
      for (const width of [W.min, 24, W.max]) {
        const m = modelFor({ width }, { gates });
        expect(m.openings).toHaveLength(gates);

        for (const opening of m.openings) {
          expect(opening.face).toBe('front');
          expect(opening.corners.every((p) => p.z === 0)).toBe(true);
          expect(opening.rect.xM).toBeGreaterThanOrEqual(0);
          expect(opening.rect.xM + opening.rect.widthM).toBeLessThanOrEqual(m.footprint.widthM);
          // Below the eave, so the opening never collides with the sloped part of the gable.
          expect(opening.rect.heightM).toBeLessThan(m.heights.eaveM);
        }
      }
    }
  });

  it('never overlap each other when two gates are configured', () => {
    const m = modelFor({ width: 24 }, { gates: 2 });
    const [a, b] = m.openings;
    expect(a.rect.xM + a.rect.widthM).toBeLessThanOrEqual(b.rect.xM);
  });

  it('produces no openings when the configuration has no gates', () => {
    expect(modelFor({}, { gates: 0 }).openings).toHaveLength(0);
  });
});

describe('fixed gate presets (Phase 3F.1, brief §B1-B2)', () => {
  it('a standard gate is exactly 4x4 m, at every supported width and eave height', () => {
    for (const width of [W.min, 24, W.max]) {
      for (const height of [H.min, 8, H.max]) {
        if (!gateHeightFits('standard', height)) continue; // not this test's concern — see the compatibility describe block below
        const m = modelFor({ width, height }, { gates: 1, gateType: 'standard' });
        expect(m.openings[0].rect.widthM).toBe(4);
        expect(m.openings[0].rect.heightM).toBe(4);
      }
    }
  });

  it('a machinery gate is exactly 5x5 m, at every supported width and eave height it fits', () => {
    for (const width of [W.min, 24, W.max]) {
      for (const height of [H.min, 8, H.max]) {
        if (!gateHeightFits('double', height)) continue;
        const m = modelFor({ width, height }, { gates: 1, gateType: 'double' });
        expect(m.openings[0].rect.widthM).toBe(5);
        expect(m.openings[0].rect.heightM).toBe(5);
      }
    }
  });

  it('GATE_DIMENSIONS_M itself is exactly the brief\'s own two product presets', () => {
    expect(GATE_DIMENSIONS_M.standard).toEqual({ widthM: 4, heightM: 4 });
    expect(GATE_DIMENSIONS_M.double).toEqual({ widthM: 5, heightM: 5 });
  });

  it('gate size does not vary with building width — the exact defect this phase fixes', () => {
    const narrow = modelFor({ width: W.min }, { gates: 1, gateType: 'standard' });
    const wide = modelFor({ width: W.max }, { gates: 1, gateType: 'standard' });
    expect(narrow.openings[0].rect.widthM).toBe(wide.openings[0].rect.widthM);
    expect(narrow.openings[0].rect.heightM).toBe(wide.openings[0].rect.heightM);
  });
});

describe('gate/building compatibility (Phase 3F.1, brief §B2)', () => {
  it('gateHeightFits requires the eave to clear the gate height plus the visualisation top clearance', () => {
    expect(gateHeightFits('standard', 4 + GATE_TOP_CLEARANCE_M)).toBe(true);
    expect(gateHeightFits('standard', 4 + GATE_TOP_CLEARANCE_M - 0.01)).toBe(false);
    expect(gateHeightFits('double', 5 + GATE_TOP_CLEARANCE_M)).toBe(true);
    expect(gateHeightFits('double', 5 + GATE_TOP_CLEARANCE_M - 0.01)).toBe(false);
  });

  it('at the minimum supported eave height (4 m), no gate clears the top clearance — an honest, expected edge case, not a bug', () => {
    expect(gateHeightFits('standard', H.min)).toBe(false);
    expect(gateHeightFits('double', H.min)).toBe(false);
  });

  it('maxGateCountThatFits never exceeds this configurator\'s own supported gate count (0/1/2)', () => {
    for (const width of [W.min, 24, W.max]) {
      for (const gateType of ['standard', 'double'] as const) {
        const count = maxGateCountThatFits(gateType, width);
        expect([0, 1, 2]).toContain(count);
      }
    }
  });

  it('two machinery gates do not fit on the narrowest supported building; one does', () => {
    expect(maxGateCountThatFits('double', W.min)).toBe(1);
  });

  it('two standard gates fit on the narrowest supported building', () => {
    expect(maxGateCountThatFits('standard', W.min)).toBe(2);
  });

  it('gateSelectionFits agrees with the two underlying checks — height AND count both matter, and 0 gates always fits', () => {
    expect(gateSelectionFits('double', 0, W.min, H.min)).toBe(true);
    expect(gateSelectionFits('double', 2, W.min, 8)).toBe(false); // count fails
    expect(gateSelectionFits('standard', 1, 24, H.min)).toBe(false); // height fails
    expect(gateSelectionFits('standard', 1, 24, 8)).toBe(true);
  });
});

describe('clampGateSelection (Phase 3F.1, brief §B2 — the domain-model safety net)', () => {
  it('leaves an already-compatible selection completely untouched', () => {
    expect(clampGateSelection(2, 'standard', 24, 8)).toEqual({ gates: 2, gateType: 'standard' });
  });

  it('reduces gate COUNT first, keeping the requested type, when only count stops fitting', () => {
    // 2 machinery gates do not fit at 10 m wide; 1 does (see the compatibility block above).
    expect(clampGateSelection(2, 'double', W.min, 8)).toEqual({ gates: 1, gateType: 'double' });
  });

  it('never fakes a fit by scaling — falls back to the smaller standard preset, never a resized gate, when the type itself does not fit', () => {
    // width=5: a single 5x5 machinery gate does not clear its own margins (usable width 4.4 m <
    // 5 m), but a single 4x4 standard gate does (4 m <= 4.4 m) — isolates a WIDTH-only fallback,
    // not conflated with the height check.
    expect(maxGateCountThatFits('double', 5)).toBe(0);
    expect(maxGateCountThatFits('standard', 5)).toBeGreaterThanOrEqual(1);
    const result = clampGateSelection(1, 'double', 5, 8);
    expect(result.gateType).toBe('standard');
    expect(result.gates).toBe(1);
  });

  it('falls all the way back to zero gates when nothing fits — honest absence, never a gate touching the eave line', () => {
    expect(clampGateSelection(1, 'standard', 24, H.min)).toEqual({ gates: 0, gateType: 'standard' });
  });

  it('0 gates is always a no-op, regardless of dimensions', () => {
    expect(clampGateSelection(0, 'double', W.min, H.min)).toEqual({ gates: 0, gateType: 'double' });
  });

  it('is idempotent — clamping an already-clamped selection changes nothing further', () => {
    const once = clampGateSelection(2, 'double', W.min, 8);
    const twice = clampGateSelection(once.gates, once.gateType, W.min, 8);
    expect(twice).toEqual(once);
  });
});

describe('slab', () => {
  it('always exists, even when the foundation is out of scope — invisible is not nonexistent', () => {
    // Omitting slab geometry when out of scope silently tightened the SVG viewBox once already
    // (caught by visual regression, ~3792px diff). Geometry is a fact; visibility is a renderer's.
    const withFoundation = modelFor({}, { scope: ['foundation', 'frame', 'walls', 'roof'] });
    const without = modelFor({}, { scope: ['frame'] });

    expect(without.slab).not.toBeNull();
    expect(without.slab.corners).toEqual(withFoundation.slab.corners);
  });

  it('matches the footprint plus a symmetric overhang', () => {
    const m = modelFor({ width: 24, length: 60 });
    const o = m.slab.overhangM;

    expect(m.slab.widthM).toBeCloseTo(24 + o * 2, 6);
    expect(m.slab.lengthM).toBeCloseTo(60 + o * 2, 6);
    expect(Math.min(...m.slab.corners.map((p) => p.x))).toBeCloseTo(-o, 6);
    expect(Math.max(...m.slab.corners.map((p) => p.x))).toBeCloseTo(24 + o, 6);
    expect(m.slab.corners.every((p) => p.y === 0)).toBe(true);
  });

  it('Phase 3F.1: is 3x thicker once the customer explicitly confirms a monolithic slab, not before', () => {
    const undecided = modelFor({}, { foundationType: 'engineeringDecision' });
    const isolated = modelFor({}, { foundationType: 'isolated' });
    const confirmed = modelFor({}, { foundationType: 'slab' });

    expect(confirmed.slab.thicknessM).toBeCloseTo(undecided.slab.thicknessM * 3, 6);
    // Neither the honest "not yet decided" default nor an isolated-footing choice gets the
    // thicker treatment — only an explicit, real "Монолітна плита" commitment does.
    expect(isolated.slab.thicknessM).toBeCloseTo(undecided.slab.thicknessM, 6);
  });

  it("Phase 3F.1: the thicker slab never touches isolated footings' own dimensions — those stay exactly as they were", () => {
    const isolated = modelFor({}, { foundationType: 'isolated' });
    const confirmedSlab = modelFor({}, { foundationType: 'slab' });
    const isolatedFooting = isolated.footings.find((f) => f.side !== 'center')!;
    const slabModeFooting = confirmedSlab.footings.find((f) => f.side !== 'center')!;
    expect(slabModeFooting.padThicknessM).toBe(isolatedFooting.padThicknessM);
    expect(slabModeFooting.pedestalHeightM).toBe(isolatedFooting.pedestalHeightM);
  });
});

describe('roof overhang', () => {
  it('cantilevers the same roof plane past the wall, not a separate flat lip', () => {
    const m = modelFor({ width: 24, length: 60, height: 8 });
    const o = m.roof.overhangM;
    const pitchRad = (m.roof.pitchDeg * Math.PI) / 180;
    const expectedOuterY = m.heights.eaveM - o * Math.tan(pitchRad);

    const left = m.envelope.roofSegments.find((s) => s.slope === 'left');
    if (!left) throw new Error('expected at least one left-slope roof segment');
    const outer = left.corners.filter((p) => p.y !== m.heights.ridgeM);

    expect(outer).toHaveLength(2); // both z-ends of this one segment's outer edge
    for (const p of outer) {
      expect(p.x).toBeCloseTo(-o, 6);
      expect(p.y).toBeCloseTo(expectedOuterY, 6);
    }
    // The overhang is a continuation of the SAME slope, so the eave point (wall face, eave
    // height) sits exactly on the line from the outer tip to the ridge — not above or below it,
    // which is what a kinked, flat-lip overhang would produce instead.
    const ridgePoint = { x: m.footprint.widthM / 2, y: m.heights.ridgeM };
    const outerPoint = { x: -o, y: expectedOuterY };
    const eaveFraction = (0 - outerPoint.x) / (ridgePoint.x - outerPoint.x);
    const yAtWallFace = outerPoint.y + eaveFraction * (ridgePoint.y - outerPoint.y);
    expect(yAtWallFace).toBeCloseTo(m.heights.eaveM, 6);
  });

  it('is zero-safe: the outer tip never drops to or below the slab line across the supported range', () => {
    // Steepest allowed pitch (roof pitch is user-adjustable up to ROOF_PITCH_MAX_DEG) combined
    // with the shortest allowed eave is the worst case for the overhang tip dropping toward y = 0.
    const m = modelFor({ width: W.min, height: H.min }, { ridgeHeightM: clampRidgeHeightM(999, W.min, H.min) });
    // Confirms this really is close to the worst case — not exactly ROOF_PITCH_MAX_DEG, because
    // clampRidgeHeightM snaps to RIDGE_HEIGHT_STEP_M first, but well within a step of it.
    expect(m.roof.pitchDeg).toBeGreaterThan(ROOF_PITCH_MAX_DEG - 1);
    const left = m.envelope.roofSegments.find((s) => s.slope === 'left');
    if (!left) throw new Error('expected at least one left-slope roof segment');
    const outer = left.corners.filter((p) => p.y !== m.heights.ridgeM);
    for (const p of outer) {
      expect(p.y).toBeGreaterThan(0);
    }
  });

  it("does not change the roof's own footprint bounds used for framing (the wall face is still on the line, not a corner, by construction above)", () => {
    // Regression guard for the "0 → non-zero overhang" change itself: widening the overhang must
    // widen the model's own points accordingly, so a camera/viewBox that frames off `allPoints`
    // picks it up automatically — this is the whole point of it living in the parametric model
    // rather than being added per-renderer.
    const m = modelFor({ width: 24, length: 60, height: 8 });
    const xs = allPoints(m).map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(Math.min(-m.roof.overhangM, -m.slab.overhangM), 6);
    expect(Math.max(...xs)).toBeCloseTo(Math.max(m.footprint.widthM + m.roof.overhangM, m.footprint.widthM + m.slab.overhangM), 6);
  });
});

describe('footings (Phase 3D — isolated foundation)', () => {
  it('always exists — one pair per portal frame — regardless of foundation type, same "geometry is a fact" rule the slab already follows', () => {
    const m = modelFor({ width: 24, length: 60, height: 8 });
    // Phase 3E.1: filtered to the external pair this test is actually about — at 24 m width the
    // derivation now also produces centre footings (deriveStructuralVisualization derives
    // centerSupport at width >= 24), which are real and correct but not what "one pair per portal
    // frame" describes; see the dedicated internal-column-footings describe block above for those.
    expect(m.footings.filter((f) => f.side !== 'center')).toHaveLength(m.frames.length * 2);
  });

  it('sits exactly at each column base point, never offset or hand-placed', () => {
    const m = modelFor({ width: 24, length: 60, height: 8 });
    for (const frame of m.frames) {
      const left = m.footings.find((f) => f.id === `col-${frame.index}-left`);
      const right = m.footings.find((f) => f.id === `col-${frame.index}-right`);
      expect(left).toBeDefined();
      expect(right).toBeDefined();
      expect(left?.xM).toBeCloseTo(frame.leftColumn.a.x, 6);
      expect(left?.zM).toBeCloseTo(frame.leftColumn.a.z, 6);
      expect(right?.xM).toBeCloseTo(frame.rightColumn.a.x, 6);
      expect(right?.zM).toBeCloseTo(frame.rightColumn.a.z, 6);
    }
  });

  it('never overlaps a neighbouring footing, even at the tightest legal bay spacing', () => {
    // Shortest length ⇒ fewest, closest-together bays (frameBayCount clamps to a 2-bay minimum),
    // which is the actual worst case for footing pads colliding along Z.
    const m = modelFor({ width: W.min, length: L.min, height: H.min });
    const stationsZ = [...new Set(m.footings.map((f) => f.zM))].sort((a, b) => a - b);
    for (let i = 1; i < stationsZ.length; i += 1) {
      const gap = stationsZ[i] - stationsZ[i - 1];
      expect(gap).toBeGreaterThan(m.footings[0].padWidthM);
    }
  });

  it('is a placeholder/schematic value, not derived from span, height or any other building dimension', () => {
    // The whole point (see FootingGeometry's own doc comment): this configurator does not run a
    // footing-sizing calculation. Same pad/pedestal size at both dimension extremes is the
    // behavioural proof of that, not just a comment's claim.
    const small = modelFor({ width: W.min, length: L.min, height: H.min });
    const large = modelFor({ width: W.max, length: L.max, height: H.max });
    expect(small.footings[0].padWidthM).toBe(large.footings[0].padWidthM);
    expect(small.footings[0].pedestalHeightM).toBe(large.footings[0].pedestalHeightM);
  });
});

describe('robustness across the whole supported range', () => {
  const corners: Array<[number, number, number]> = [
    [W.min, L.min, H.min],
    [W.min, L.max, H.max],
    [W.max, L.min, H.max],
    [W.max, L.max, H.min],
    [24, 60, 8],
  ];

  it.each(corners)('produces finite, non-negative geometry at %d × %d × %d', (width, length, height) => {
    const m = modelFor({ width, length, height });

    for (const p of allPoints(m)) {
      for (const axis of ['x', 'y', 'z'] as const) {
        expect(Number.isFinite(p[axis])).toBe(true);
        expect(Number.isNaN(p[axis])).toBe(false);
      }
      // Y is the only axis with a hard floor: nothing sits below the slab line.
      expect(p.y).toBeGreaterThanOrEqual(0);
    }
    expect(m.heights.ridgeM).toBeGreaterThan(m.heights.eaveM);
    expect(m.roof.halfSpanM).toBeCloseTo(width / 2, 6);
  });

  it('is deterministic — same input, byte-identical output', () => {
    const a = modelFor({ width: 31, length: 77, height: 9.5 });
    const b = modelFor({ width: 31, length: 77, height: 9.5 });

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('is plain JSON-serializable data, no class instances', () => {
    const m = modelFor();
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
  });
});

describe('cross-renderer contract', () => {
  // Phase 3-0 exists because the SVG technical view and the R3F spike drew DIFFERENT buildings
  // (flat roof at 8 m vs a 12° gable ridging at 10.55 m on the same 24×60×8 config). These
  // assertions are what make that class of divergence impossible: any renderer that reads the
  // parametric model reads these exact numbers, and there is nowhere else to get them from.
  it('exposes a single ridge/eave/footprint every renderer must share', () => {
    const m = modelFor({ width: 24, length: 60, height: 8 });

    expect(m.heights.eaveM).toBe(8);
    expect(m.heights.ridgeM).toBeGreaterThan(8);
    expect(m.footprint).toEqual({ widthM: 24, lengthM: 60 });
  });

  it('lets a minimal ThreeSceneModel-shaped adapter agree with the model without re-deriving anything', () => {
    // A stand-in for a future 3D adapter: it may only *read* geometry, never recompute it.
    const m = modelFor({ width: 30, length: 48, height: 7 });
    const adapter = {
      meshes: m.frames.flatMap((f) => [f.leftColumn, f.rightColumn, f.leftRafter, f.rightRafter]),
      ridgeY: m.heights.ridgeM,
      stations: m.bays.stationsM,
      openings: m.openings.map((o) => o.rect),
    };

    expect(adapter.ridgeY).toBe(m.heights.ridgeM);
    expect(adapter.stations).toEqual(m.bays.stationsM);
    expect(adapter.meshes).toHaveLength(m.frames.length * 4);
    // Every rafter must terminate exactly on the shared ridge height.
    for (const frame of m.frames) {
      expect(frame.leftRafter.b.y).toBe(m.heights.ridgeM);
      expect(frame.rightRafter.b.y).toBe(m.heights.ridgeM);
    }
  });
});

describe('deriveStructuralVisualization (Phase 3E.1 — width-based auto-derivation, brief §4-5)', () => {
  it('10 <= width < 18: portal frame, clear span', () => {
    for (const width of [DIMENSION_BOUNDS.width.min, 12, 17.99]) {
      expect(deriveStructuralVisualization(width)).toEqual({ scheme: 'clearSpan', roofStructure: 'portalRafter' });
    }
  });

  it('18 <= width < 24: truss, still clear span', () => {
    for (const width of [18, 20, 23.99]) {
      expect(deriveStructuralVisualization(width)).toEqual({ scheme: 'clearSpan', roofStructure: 'truss' });
    }
  });

  it('24 <= width <= 50: truss, centre support', () => {
    for (const width of [24, 36, DIMENSION_BOUNDS.width.max]) {
      expect(deriveStructuralVisualization(width)).toEqual({ scheme: 'centerSupport', roofStructure: 'truss' });
    }
  });

  it('the 17.99 / 18.00 boundary flips roofStructure only, not scheme', () => {
    expect(deriveStructuralVisualization(17.99)).toEqual({ scheme: 'clearSpan', roofStructure: 'portalRafter' });
    expect(deriveStructuralVisualization(18)).toEqual({ scheme: 'clearSpan', roofStructure: 'truss' });
  });

  it('the 23.99 / 24.00 boundary flips scheme only, not roofStructure', () => {
    expect(deriveStructuralVisualization(23.99)).toEqual({ scheme: 'clearSpan', roofStructure: 'truss' });
    expect(deriveStructuralVisualization(24)).toEqual({ scheme: 'centerSupport', roofStructure: 'truss' });
  });

  it('is a pure function of width — deterministic, no hidden state', () => {
    expect(deriveStructuralVisualization(31)).toEqual(deriveStructuralVisualization(31));
  });

  it('never produces portalRafter + centerSupport — CENTER_SUPPORT_FROM_WIDTH_M is always >= TRUSS_FROM_WIDTH_M', () => {
    expect(STRUCTURAL_VISUALIZATION_THRESHOLDS.CENTER_SUPPORT_FROM_WIDTH_M)
      .toBeGreaterThanOrEqual(STRUCTURAL_VISUALIZATION_THRESHOLDS.TRUSS_FROM_WIDTH_M);
    for (let width = DIMENSION_BOUNDS.width.min; width <= DIMENSION_BOUNDS.width.max; width += 0.5) {
      const { scheme, roofStructure } = deriveStructuralVisualization(width);
      expect(scheme === 'centerSupport' && roofStructure === 'portalRafter').toBe(false);
    }
  });
});

describe('internal columns — centreline support (Phase 3E, brief §3-4)', () => {
  it('clearSpan generates zero internal columns', () => {
    expect(modelForStructural({ scheme: 'clearSpan', roofStructure: 'portalRafter' }).internalColumns).toHaveLength(0);
    expect(modelForStructural({ scheme: 'clearSpan', roofStructure: 'truss' }).internalColumns).toHaveLength(0);
  });

  it('centerSupport with no gate (gates: 0) generates one column per frame station, on the centreline', () => {
    const m = modelForStructural({ scheme: 'centerSupport', roofStructure: 'portalRafter' }, {}, { gates: 0 });
    expect(m.internalColumns).toHaveLength(m.bays.stationsM.length);
    const midX = m.footprint.widthM / 2;
    for (const col of m.internalColumns) {
      expect(col.column.a.x).toBeCloseTo(midX, 6);
      expect(col.column.b.x).toBeCloseTo(midX, 6);
      expect(col.column.a.y).toBe(0);
      expect(col.column.b.y).toBe(m.heights.eaveM);
    }
    // Every station is represented, in order — the line is continuous with nothing skipped.
    expect(m.internalColumns.map((c) => c.stationM)).toEqual(m.bays.stationsM);
  });

  it('a single centred gate (the default) excludes the conflicting z=0 support and continues deeper in', () => {
    const m = modelForStructural({ scheme: 'centerSupport', roofStructure: 'portalRafter' }, {}, { gates: 1, gateType: 'standard' });
    expect(m.internalColumns.some((c) => c.stationM === 0)).toBe(false);
    // Nothing else was skipped — every OTHER station still has its column.
    expect(m.internalColumns).toHaveLength(m.bays.stationsM.length - 1);
    expect(m.internalColumns.map((c) => c.stationM)).toEqual(m.bays.stationsM.filter((z) => z !== 0));
  });

  it('two gates leave the centreline clear at z=0 (the gap between them), so no support is skipped', () => {
    const m = modelForStructural({ scheme: 'centerSupport', roofStructure: 'portalRafter' }, {}, { gates: 2, gateType: 'standard' });
    expect(m.internalColumns.some((c) => c.stationM === 0)).toBe(true);
    expect(m.internalColumns).toHaveLength(m.bays.stationsM.length);
  });

  it('no internal column at z=0 may ever fall inside a gate rect, for either gate type/count — the hard rule, checked directly rather than trusting the skip logic alone', () => {
    for (const gates of [1, 2] as const) {
      for (const gateType of ['standard', 'double'] as const) {
        const m = modelForStructural({ scheme: 'centerSupport', roofStructure: 'portalRafter' }, {}, { gates, gateType });
        const frontColumn = m.internalColumns.find((c) => c.stationM === 0);
        if (!frontColumn) continue; // skipped entirely — the safe outcome
        const x = frontColumn.column.a.x;
        for (const o of m.openings) {
          const inside = x > o.rect.xM && x < o.rect.xM + o.rect.widthM;
          expect(inside).toBe(false);
        }
      }
    }
  });

  it('portalRafter gets a king-post prop to the ridge point; truss does not', () => {
    const portal = modelForStructural({ scheme: 'centerSupport', roofStructure: 'portalRafter' });
    const truss = modelForStructural({ scheme: 'centerSupport', roofStructure: 'truss' });

    for (const col of portal.internalColumns) {
      expect(col.ridgeProp).not.toBeNull();
      expect(col.ridgeProp!.a.y).toBe(portal.heights.eaveM);
      expect(col.ridgeProp!.b.y).toBe(portal.heights.ridgeM);
    }
    for (const col of truss.internalColumns) expect(col.ridgeProp).toBeNull();
  });

  it('support positions are deterministic across dimension extremes', () => {
    for (const [width, length] of [[W.min, L.min], [W.max, L.max], [24, 60]] as const) {
      const a = modelForStructural({ scheme: 'centerSupport', roofStructure: 'truss' }, { width, length });
      const b = modelForStructural({ scheme: 'centerSupport', roofStructure: 'truss' }, { width, length });
      expect(JSON.stringify(a.internalColumns)).toBe(JSON.stringify(b.internalColumns));
    }
  });
});

describe('internal-column footings (Phase 3E, brief §5)', () => {
  it('every internal column gets exactly one matching centre footing — no orphans either way', () => {
    const m = modelForStructural({ scheme: 'centerSupport', roofStructure: 'truss' }, {}, { gates: 1 });
    const centerFootings = m.footings.filter((f) => f.side === 'center');
    expect(centerFootings).toHaveLength(m.internalColumns.length);
    for (const col of m.internalColumns) {
      const match = centerFootings.find((f) => f.zM === col.stationM);
      expect(match).toBeDefined();
      expect(match!.xM).toBeCloseTo(col.column.a.x, 6);
    }
  });

  it('clearSpan has zero centre footings — nothing to be orphaned', () => {
    const m = modelForStructural({ scheme: 'clearSpan', roofStructure: 'truss' });
    expect(m.footings.filter((f) => f.side === 'center')).toHaveLength(0);
  });

  it('uses the same schematic pad/pedestal dimensions as external footings — no invented engineered difference', () => {
    const m = modelForStructural({ scheme: 'centerSupport', roofStructure: 'truss' }, {}, { gates: 0 });
    const external = m.footings.find((f) => f.side === 'left')!;
    const internal = m.footings.find((f) => f.side === 'center')!;
    expect(internal.padWidthM).toBe(external.padWidthM);
    expect(internal.padThicknessM).toBe(external.padThicknessM);
    expect(internal.pedestalWidthM).toBe(external.pedestalWidthM);
    expect(internal.pedestalHeightM).toBe(external.pedestalHeightM);
  });
});

describe('truss webs (Phase 3E, brief §7-10)', () => {
  it('are ALWAYS computed, one per frame station, regardless of scheme/roofStructure', () => {
    for (const roofStructure of ['portalRafter', 'truss'] as const) {
      for (const scheme of ['clearSpan', 'centerSupport'] as const) {
        const m = modelForStructural({ scheme, roofStructure });
        expect(m.trusses).toHaveLength(m.frames.length);
      }
    }
  });

  it("the bottom chord is flat at eave height and spans the full width, at every station's own Z", () => {
    const m = modelFor({ width: 30 });
    for (const t of m.trusses) {
      expect(t.bottomChord.a).toEqual({ x: 0, y: m.heights.eaveM, z: t.stationM });
      expect(t.bottomChord.b).toEqual({ x: 30, y: m.heights.eaveM, z: t.stationM });
    }
  });

  it('panel count is bounded across the full supported width range — no degenerate/unbounded web', () => {
    for (const width of [W.min, 24, W.max]) {
      const m = modelFor({ width });
      const webCount = m.trusses[0].webs.length;
      expect(webCount).toBeGreaterThanOrEqual(6); // 2 * TRUSS_PANELS_MIN_PER_HALF
      expect(webCount).toBeLessThanOrEqual(16); // 2 * TRUSS_PANELS_MAX_PER_HALF
      expect(webCount % 2).toBe(0); // always mirrored halves
    }
  });

  it('no degenerate (zero-length) web members', () => {
    const m = modelFor({ width: 45 });
    for (const t of m.trusses) {
      for (const w of t.webs) {
        const dx = w.b.x - w.a.x;
        const dy = w.b.y - w.a.y;
        expect(Math.hypot(dx, dy)).toBeGreaterThan(0.01);
      }
    }
  });

  it('the web pattern is symmetric about the centreline', () => {
    const m = modelFor({ width: 24 });
    const t = m.trusses[0];
    const midX = m.footprint.widthM / 2;
    const mirroredX = (x: number) => 2 * midX - x;
    // Every web, mirrored across X = midX, should match some other web in the set (same two
    // endpoints up to the mirror and up to which end is `a` vs `b`).
    const key = (p: { x: number; y: number }) => `${p.x.toFixed(3)}:${p.y.toFixed(3)}`;
    const edgeKeys = new Set(
      t.webs.map((w) => [key(w.a), key(w.b)].sort().join('|')),
    );
    for (const w of t.webs) {
      const mirroredA = { x: mirroredX(w.a.x), y: w.a.y };
      const mirroredB = { x: mirroredX(w.b.x), y: w.b.y };
      expect(edgeKeys.has([key(mirroredA), key(mirroredB)].sort().join('|'))).toBe(true);
    }
  });

  it('is deterministic', () => {
    const a = modelFor({ width: 37 });
    const b = modelFor({ width: 37 });
    expect(JSON.stringify(a.trusses)).toBe(JSON.stringify(b.trusses));
  });
});

describe('wall bracing (Phase 3E, brief §13)', () => {
  it('braces the first and last bay on both side walls for a short building', () => {
    const m = modelFor({ width: 24, length: L.min }); // min length clamps to 2 bays
    const segmentCount = m.envelope.wallSegments[0].segmentCount;
    for (const face of ['left', 'right'] as const) {
      const bays = m.bracing.filter((b) => b.face === face).map((b) => b.bayIndex).sort((a, b) => a - b);
      expect(bays).toEqual([0, segmentCount - 1]);
    }
  });

  it('adds a middle bay once there are enough bays to call it a middle zone', () => {
    const m = modelFor({ width: 24, length: 60 }); // default: 10 bays at 6 m spacing
    const segmentCount = m.envelope.wallSegments[0].segmentCount;
    expect(segmentCount).toBeGreaterThanOrEqual(6);
    const leftBays = m.bracing.filter((b) => b.face === 'left').map((b) => b.bayIndex).sort((a, b) => a - b);
    expect(leftBays).toHaveLength(3);
    expect(leftBays[0]).toBe(0);
    expect(leftBays[leftBays.length - 1]).toBe(segmentCount - 1);
    expect(leftBays[1]).toBeGreaterThan(0);
    expect(leftBays[1]).toBeLessThan(segmentCount - 1);
  });

  it('never exceeds 3 braced bays per wall, at any supported length — bounded count', () => {
    for (const length of [L.min, 24, 60, L.max]) {
      const m = modelFor({ length });
      const perWall = m.bracing.filter((b) => b.face === 'left').length;
      expect(perWall).toBeLessThanOrEqual(3);
      expect(perWall).toBeGreaterThanOrEqual(1);
    }
  });

  it('is symmetric — left and right walls brace the exact same bay indices', () => {
    const m = modelFor({ width: 30, length: 84 });
    const left = m.bracing.filter((b) => b.face === 'left').map((b) => b.bayIndex).sort((a, b) => a - b);
    const right = m.bracing.filter((b) => b.face === 'right').map((b) => b.bayIndex).sort((a, b) => a - b);
    expect(left).toEqual(right);
  });

  it('each brace is the exact X of its own bay rectangle — both diagonals span the bay, at the correct X and Y range', () => {
    const m = modelFor({ width: 24, length: 60 });
    const widthM = m.footprint.widthM;
    for (const brace of m.bracing) {
      const expectedX = brace.face === 'left' ? 0 : widthM;
      for (const diag of [brace.diagonalA, brace.diagonalB]) {
        expect(diag.a.x).toBeCloseTo(expectedX, 6);
        expect(diag.b.x).toBeCloseTo(expectedX, 6);
        // One end at eave height, the other at grade — a real diagonal, not a degenerate line.
        expect(Math.abs(diag.a.y - diag.b.y)).toBeCloseTo(m.heights.eaveM, 6);
        expect(diag.a.z).not.toBe(diag.b.z);
      }
      // The two diagonals actually cross (opposite corners), not the same line twice.
      expect(brace.diagonalA.a.z).not.toBe(brace.diagonalB.a.z);
    }
  });

  it('can never intersect a gate opening — braces live only on the side walls, which no gate ever touches (face is always "front")', () => {
    for (const gates of [1, 2] as const) {
      const m = modelFor({}, { gates, gateType: 'double' });
      expect(m.bracing.every((b) => b.face === 'left' || b.face === 'right')).toBe(true);
      expect(m.openings.every((o) => o.face === 'front')).toBe(true);
      // Disjoint by construction: no brace X (0 or widthM) ever equals a gate's own face plane.
    }
  });

  it('is deterministic', () => {
    const a = modelFor({ width: 33, length: 51 });
    const b = modelFor({ width: 33, length: 51 });
    expect(JSON.stringify(a.bracing)).toBe(JSON.stringify(b.bracing));
  });
});

describe('girts (Phase 3E, brief §12 audit)', () => {
  it('now run on both side walls, not just one', () => {
    const m = modelFor();
    const xs = new Set(m.girts.map((g) => g.a.x));
    expect(xs.has(0)).toBe(true);
    expect(xs.has(m.footprint.widthM)).toBe(true);
  });

  it('each wall still gets exactly 2 levels, matching GIRT_LEVELS — no accidental duplication', () => {
    const m = modelFor();
    const perWall = m.girts.filter((g) => g.a.x === 0).length;
    expect(perWall).toBe(2);
    expect(m.girts).toHaveLength(4);
  });
});
