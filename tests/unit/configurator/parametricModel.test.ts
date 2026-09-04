import { describe, expect, it } from 'vitest';
import {
  ROOF_PITCH_MAX_DEG,
  ROOF_PITCH_MIN_DEG,
  buildParametricModel,
  clampRidgeHeightM,
  defaultRidgeHeightM,
  frameBayCount,
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

  it('clamps the pitch rule outside the supported width range instead of extrapolating', () => {
    expect(roofPitchDegForWidth(W.min - 20)).toBe(roofPitchDegForWidth(W.min));
    expect(roofPitchDegForWidth(W.max + 20)).toBe(roofPitchDegForWidth(W.max));
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
