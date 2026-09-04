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
  structuralSchemeAdvisory,
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

describe('footings (Phase 3D — isolated foundation)', () => {
  it('always exists — one pair per portal frame — regardless of foundation type, same "geometry is a fact" rule the slab already follows', () => {
    const m = modelFor({ width: 24, length: 60, height: 8 });
    expect(m.footings).toHaveLength(m.frames.length * 2);
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

describe('structuralSchemeAdvisory (Phase 3E, brief §2 — UX heuristic only)', () => {
  it('says nothing once centerSupport is already chosen, at any width', () => {
    expect(structuralSchemeAdvisory(10, 'centerSupport')).toBeNull();
    expect(structuralSchemeAdvisory(60, 'centerSupport')).toBeNull();
  });

  it('says nothing under the advisory width for either other scheme', () => {
    expect(structuralSchemeAdvisory(24, 'clearSpan')).toBeNull();
    expect(structuralSchemeAdvisory(20, 'engineeringDecision')).toBeNull();
  });

  it('advises above the threshold width, for clearSpan and engineeringDecision alike', () => {
    expect(structuralSchemeAdvisory(30, 'clearSpan')).toEqual(expect.any(String));
    expect(structuralSchemeAdvisory(30, 'engineeringDecision')).toEqual(expect.any(String));
  });

  it('never claims a calculated/required answer — engineering-honesty wording check', () => {
    const advisory = structuralSchemeAdvisory(40, 'clearSpan')!;
    expect(advisory).toContain('конструктивним розрахунком');
    expect(advisory).not.toContain('потрібн'); // "потрібна"/"потрібно" — a requirement claim
    expect(advisory).not.toMatch(/розрахован/); // "розрахована" — a calculated-answer claim
  });
});

describe('internal columns — centreline support (Phase 3E, brief §3-4)', () => {
  it('clearSpan and engineeringDecision both generate zero internal columns', () => {
    expect(modelFor({}, { structuralScheme: 'clearSpan' }).internalColumns).toHaveLength(0);
    expect(modelFor({}, { structuralScheme: 'engineeringDecision' }).internalColumns).toHaveLength(0);
  });

  it('centerSupport with no gate (gates: 0) generates one column per frame station, on the centreline', () => {
    const m = modelFor({}, { structuralScheme: 'centerSupport', gates: 0 });
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
    const m = modelFor({}, { structuralScheme: 'centerSupport', gates: 1, gateType: 'standard' });
    expect(m.internalColumns.some((c) => c.stationM === 0)).toBe(false);
    // Nothing else was skipped — every OTHER station still has its column.
    expect(m.internalColumns).toHaveLength(m.bays.stationsM.length - 1);
    expect(m.internalColumns.map((c) => c.stationM)).toEqual(m.bays.stationsM.filter((z) => z !== 0));
  });

  it('two gates leave the centreline clear at z=0 (the gap between them), so no support is skipped', () => {
    const m = modelFor({}, { structuralScheme: 'centerSupport', gates: 2, gateType: 'standard' });
    expect(m.internalColumns.some((c) => c.stationM === 0)).toBe(true);
    expect(m.internalColumns).toHaveLength(m.bays.stationsM.length);
  });

  it('no internal column at z=0 may ever fall inside a gate rect, for either gate type/count — the hard rule, checked directly rather than trusting the skip logic alone', () => {
    for (const gates of [1, 2] as const) {
      for (const gateType of ['standard', 'double'] as const) {
        const m = modelFor({}, { structuralScheme: 'centerSupport', gates, gateType });
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

  it('portalRafter/engineeringDecision get a king-post prop to the ridge point; truss does not', () => {
    const portal = modelFor({}, { structuralScheme: 'centerSupport', roofStructure: 'portalRafter' });
    const undecided = modelFor({}, { structuralScheme: 'centerSupport', roofStructure: 'engineeringDecision' });
    const truss = modelFor({}, { structuralScheme: 'centerSupport', roofStructure: 'truss' });

    for (const col of portal.internalColumns) {
      expect(col.ridgeProp).not.toBeNull();
      expect(col.ridgeProp!.a.y).toBe(portal.heights.eaveM);
      expect(col.ridgeProp!.b.y).toBe(portal.heights.ridgeM);
    }
    for (const col of undecided.internalColumns) expect(col.ridgeProp).not.toBeNull();
    for (const col of truss.internalColumns) expect(col.ridgeProp).toBeNull();
  });

  it('support positions are deterministic across dimension extremes', () => {
    for (const [width, length] of [[W.min, L.min], [W.max, L.max], [24, 60]] as const) {
      const a = modelFor({ width, length }, { structuralScheme: 'centerSupport' });
      const b = modelFor({ width, length }, { structuralScheme: 'centerSupport' });
      expect(JSON.stringify(a.internalColumns)).toBe(JSON.stringify(b.internalColumns));
    }
  });
});

describe('internal-column footings (Phase 3E, brief §5)', () => {
  it('every internal column gets exactly one matching centre footing — no orphans either way', () => {
    const m = modelFor({}, { structuralScheme: 'centerSupport', gates: 1 });
    const centerFootings = m.footings.filter((f) => f.side === 'center');
    expect(centerFootings).toHaveLength(m.internalColumns.length);
    for (const col of m.internalColumns) {
      const match = centerFootings.find((f) => f.zM === col.stationM);
      expect(match).toBeDefined();
      expect(match!.xM).toBeCloseTo(col.column.a.x, 6);
    }
  });

  it('clearSpan has zero centre footings — nothing to be orphaned', () => {
    const m = modelFor({}, { structuralScheme: 'clearSpan' });
    expect(m.footings.filter((f) => f.side === 'center')).toHaveLength(0);
  });

  it('uses the same schematic pad/pedestal dimensions as external footings — no invented engineered difference', () => {
    const m = modelFor({}, { structuralScheme: 'centerSupport', gates: 0 });
    const external = m.footings.find((f) => f.side === 'left')!;
    const internal = m.footings.find((f) => f.side === 'center')!;
    expect(internal.padWidthM).toBe(external.padWidthM);
    expect(internal.padThicknessM).toBe(external.padThicknessM);
    expect(internal.pedestalWidthM).toBe(external.pedestalWidthM);
    expect(internal.pedestalHeightM).toBe(external.pedestalHeightM);
  });
});

describe('truss webs (Phase 3E, brief §7-10)', () => {
  it('are ALWAYS computed, one per frame station, regardless of roofStructure', () => {
    for (const roofStructure of ['portalRafter', 'truss', 'engineeringDecision'] as const) {
      const m = modelFor({}, { roofStructure });
      expect(m.trusses).toHaveLength(m.frames.length);
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
