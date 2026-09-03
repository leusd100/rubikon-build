import type { HangarDomainModel } from './domainModel';
import type { EnvelopeChoice } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// THE SINGLE SOURCE OF GEOMETRIC TRUTH (Phase 3-0, 2026-09-03)
//
// Every metric fact about the hangar's shape is derived here, exactly once:
// ridge height, roof slope, bay stations, wall planes, roof planes, gable
// profiles, gate rectangles and the slab footprint. Renderers consume these
// numbers; they never re-derive them.
//
// This module exists because they used to. Before this phase the SVG projector
// rebuilt the building's corners from `dimensions` alone and the R3F spike
// invented its own gable — so the two renderers drew *different buildings*
// (flat roof at 8 m vs a 12° gable ridging at 10.55 m on the same 24 m config).
// That divergence is what this layer makes structurally impossible.
//
// Hard rules for anything added here:
//   • Pure. No React, no SVG, no THREE, no DOM, no pixels — metres only.
//   • Deterministic. Same domain model in, byte-identical model out.
//   • JSON-friendly. Plain objects and numbers, no class instances.
//
// COORDINATE SYSTEM — frozen, and asserted by tests (not just this comment,
// because a camera/face convention mismatch already cost this project a real
// debugging session during the R3F spike):
//
//        Y (up)
//        │      Z (length, toward rear)
//        │    ╱
//        │  ╱
//        └────── X (width)
//
//   X : 0 … widthM      left face at x=0,  right face at x=widthM
//   Y : 0 … ridgeM      0 is the top of the slab (ground line), up is positive
//   Z : 0 … lengthM     FRONT facade at z=0, REAR facade at z=lengthM
//
//   The ridge runs along Z at x = widthM/2, y = ridgeM.
//   Gates live on the FRONT face (z=0), matching the domain model.
// ─────────────────────────────────────────────────────────────────────────────

export type Vec3 = { x: number; y: number; z: number };

/** The four vertical faces, named from outside the building looking at it. */
export type WallFace = 'front' | 'rear' | 'left' | 'right';
export type RoofSlope = 'left' | 'right';

/** A planar quad, corners ordered consistently (see `quad()`), in metres. */
export type BuildingPlane = {
  corners: [Vec3, Vec3, Vec3, Vec3];
};

/** One bay's worth of a side wall — the segmentation the build-up animation stages. */
export type WallSegment = BuildingPlane & {
  face: WallFace;
  index: number;
  segmentCount: number;
};

export type RoofSegment = BuildingPlane & {
  slope: RoofSlope;
  index: number;
  segmentCount: number;
};

/**
 * A gable end as a real pentagon — base corners, both eaves, and the ridge.
 * This is the shape the old model could not express at all: it treated every
 * wall as a rectangle, which is precisely why the technical view had a flat roof.
 */
export type GableProfile = {
  face: 'front' | 'rear';
  /** baseLeft → baseRight → eaveRight → ridge → eaveLeft, closing back to baseLeft. */
  outline: [Vec3, Vec3, Vec3, Vec3, Vec3];
};

/** A structural member as a pure centre-line segment. Section/thickness is a
 *  *rendering* concern (a line weight in SVG, a box in 3D) and deliberately
 *  stays out of the geometric model — see the honesty rule in the docs: this is
 *  object form, not construction documentation. */
export type Member = { a: Vec3; b: Vec3 };

export type PortalFrame = {
  /** Position along Z. */
  stationM: number;
  index: number;
  leftColumn: Member;
  rightColumn: Member;
  leftRafter: Member;
  rightRafter: Member;
  ridgePoint: Vec3;
};

export type OpeningGeometry = {
  index: number;
  face: 'front';
  /** Origin-relative rectangle on the face, for renderers that prefer 2D. */
  rect: { xM: number; yM: number; widthM: number; heightM: number };
  /** The same rectangle in world space, for renderers that prefer 3D. */
  corners: [Vec3, Vec3, Vec3, Vec3];
};

export type SlabGeometry = {
  corners: [Vec3, Vec3, Vec3, Vec3];
  widthM: number;
  lengthM: number;
  thicknessM: number;
  /** How far the slab oversails the footprint on every side. */
  overhangM: number;
};

export type ParametricBuildingModel = {
  footprint: { widthM: number; lengthM: number };
  heights: { eaveM: number; ridgeM: number };
  roof: {
    type: 'gable';
    pitchDeg: number;
    /** Horizontal run from eave to ridge — half the width for a symmetric gable. */
    halfSpanM: number;
    /** Vertical rise from eave to ridge. `ridgeM - eaveM`, kept explicit. */
    riseM: number;
  };
  bays: { count: number; stationsM: number[] };
  frames: PortalFrame[];
  envelope: {
    wallSegments: WallSegment[];
    roofSegments: RoofSegment[];
    gableEnds: GableProfile[];
    walls: EnvelopeChoice;
    roofEnvelope: EnvelopeChoice;
  };
  /** Secondary horizontal members on the side walls (girts) — visual weight only. */
  girts: Member[];
  openings: OpeningGeometry[];
  /**
   * ALWAYS present, never null — even when `scope.foundation` is false.
   * "Invisible ≠ nonexistent for geometry": an earlier refactor omitted the slab
   * primitive when it was out of scope, which silently tightened the SVG viewBox
   * whenever the foundation was toggled off (caught by visual regression, 3792px
   * diff). Visibility is the renderer's business; the footprint is a fact.
   */
  slab: SlabGeometry;
};

// ── Tunable visual constants ────────────────────────────────────────────────
// All of these are VISUAL RHYTHM / VISUAL FORM rules. None of them is an
// engineering calculation, and no UI copy may present them as one.

const FRAME_TARGET_SPACING_M = 6;
const FRAME_MIN_BAYS = 2;
const FRAME_MAX_BAYS = 10;

/**
 * Roof pitch as a function of span.
 *
 * A single fixed pitch is the wrong abstraction across this configurator's
 * supported 10–60 m width range, and that was verified rather than assumed: a
 * fixed 12° puts the ridge 6.38 m above the eave on a 60 m span, which on the
 * 4 m minimum eave height is a roof 1.6× taller than the walls it sits on.
 * Real wide-span portal frames go the other way — the wider the span, the
 * shallower the pitch.
 *
 * So pitch interpolates from steeper-at-narrow to shallower-at-wide, clamped at
 * both ends. Two independent checks on the numbers below:
 *   • At the default 24 m width this yields 12.04°, i.e. visually identical to
 *     the 12° the earlier R3F spike used and was judged to read well.
 *   • The user-supplied reference warehouse model measures a 28.2 m span with a
 *     2.84 m eave-to-ridge rise (≈11.4–12.0°). This rule predicts 2.86 m at that
 *     span — a match to within 2 cm, from an independent source.
 *
 * It remains a VISUAL rule. Final roof geometry on a real project is an
 * engineering decision (snow load, span, cladding system) made off this tool.
 */
const PITCH_AT_MIN_WIDTH_DEG = 14;
const PITCH_AT_MAX_WIDTH_DEG = 7;
const PITCH_MIN_WIDTH_M = 10;
const PITCH_MAX_WIDTH_M = 60;

/**
 * The "reasonable limits" a user-set ridge is held inside.
 *
 * Below ~5° a gable stops reading as a pitched roof at all and drainage stops being credible;
 * above ~20° an industrial portal frame starts looking like a house. The span rule above still
 * supplies the DEFAULT ridge; these bounds only constrain how far it can then be adjusted.
 * Neither is an engineering limit — final roof geometry is a project decision.
 */
export const ROOF_PITCH_MIN_DEG = 5;
export const ROOF_PITCH_MAX_DEG = 20;
/** Ridge height is adjusted in whole decimetres — finer than that is false precision here. */
export const RIDGE_HEIGHT_STEP_M = 0.1;

const SLAB_OVERHANG_M = 0.35;
const SLAB_THICKNESS_M = 0.3;

/** Side-wall girt heights, as a fraction of eave height. Stylised "secondary
 *  structure exists here", matching the previous model's two levels. */
const GIRT_LEVELS = [1 / 3, 2 / 3] as const;

const DEG = Math.PI / 180;

function round(value: number, dp = 6): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

function v3(x: number, y: number, z: number): Vec3 {
  return { x: round(x), y: round(y), z: round(z) };
}

function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3): [Vec3, Vec3, Vec3, Vec3] {
  return [a, b, c, d];
}

/**
 * Roof pitch in degrees for a given span. Exported so tests can assert the rule
 * directly, and so a future 3D renderer can never re-invent it.
 */
export function roofPitchDegForWidth(widthM: number): number {
  const t = (widthM - PITCH_MIN_WIDTH_M) / (PITCH_MAX_WIDTH_M - PITCH_MIN_WIDTH_M);
  const clamped = Math.min(1, Math.max(0, t));
  return round(PITCH_AT_MIN_WIDTH_DEG + (PITCH_AT_MAX_WIDTH_DEG - PITCH_AT_MIN_WIDTH_DEG) * clamped, 4);
}

/**
 * How many structural bays a span gets — a visual-rhythm heuristic (target ~6 m,
 * clamped to a legible 2–10), NOT a structural span calculation. Keep it framed
 * that way in any UI copy. The clamp also bounds member count for both
 * renderers: a 120 m hangar gets 10 bays, not 20.
 */
export function frameBayCount(spanMetres: number): number {
  const raw = Math.round(spanMetres / FRAME_TARGET_SPACING_M);
  return Math.min(FRAME_MAX_BAYS, Math.max(FRAME_MIN_BAYS, raw));
}

/** Ridge height for a symmetric gable. The ONLY place this formula exists. */
export function ridgeHeightM(widthM: number, eaveHeightM: number, pitchDeg: number): number {
  return round(eaveHeightM + (widthM / 2) * Math.tan(pitchDeg * DEG));
}

/**
 * The range a ridge height may occupy for a given footprint and eave height, derived from the
 * pitch limits. Both ends move when width or eave height change, which is why the ridge control
 * reads its bounds from here on every render rather than from a static table like DIMENSION_BOUNDS.
 */
export function ridgeHeightRangeM(widthM: number, eaveHeightM: number): { min: number; max: number } {
  const halfSpan = widthM / 2;
  const toRidge = (deg: number) => eaveHeightM + halfSpan * Math.tan(deg * DEG);
  // Snap inward to the adjustment step so every reachable slider position is also a legal one.
  const min = Math.ceil(toRidge(ROOF_PITCH_MIN_DEG) / RIDGE_HEIGHT_STEP_M) * RIDGE_HEIGHT_STEP_M;
  const max = Math.floor(toRidge(ROOF_PITCH_MAX_DEG) / RIDGE_HEIGHT_STEP_M) * RIDGE_HEIGHT_STEP_M;
  return { min: round(min, 2), max: round(max, 2) };
}

/** Holds a ridge height inside the legal range for the current footprint, snapped to the step. */
export function clampRidgeHeightM(valueM: number, widthM: number, eaveHeightM: number): number {
  const { min, max } = ridgeHeightRangeM(widthM, eaveHeightM);
  if (!Number.isFinite(valueM)) return defaultRidgeHeightM(widthM, eaveHeightM);
  const snapped = Math.round(valueM / RIDGE_HEIGHT_STEP_M) * RIDGE_HEIGHT_STEP_M;
  return round(Math.min(max, Math.max(min, snapped)), 2);
}

/** The ridge the span rule produces — the value the configurator starts from, and what a reset
 *  would return to. */
export function defaultRidgeHeightM(widthM: number, eaveHeightM: number): number {
  const { min, max } = ridgeHeightRangeM(widthM, eaveHeightM);
  const fromSpanRule = eaveHeightM + (widthM / 2) * Math.tan(roofPitchDegForWidth(widthM) * DEG);
  const snapped = Math.round(fromSpanRule / RIDGE_HEIGHT_STEP_M) * RIDGE_HEIGHT_STEP_M;
  return round(Math.min(max, Math.max(min, snapped)), 2);
}

/** The inverse of ridgeHeightM(): the pitch a given ridge implies. Kept here so the pitch↔ridge
 *  relationship exists in exactly one module, in both directions. */
export function pitchDegForRidge(widthM: number, eaveHeightM: number, ridgeM: number): number {
  const halfSpan = widthM / 2;
  if (halfSpan <= 0) return ROOF_PITCH_MIN_DEG;
  return round(Math.atan((ridgeM - eaveHeightM) / halfSpan) / DEG, 4);
}

function buildBayStations(lengthM: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) => round((i / count) * lengthM));
}

function buildFrames(widthM: number, eaveM: number, ridgeM: number, stationsM: number[]): PortalFrame[] {
  const midX = widthM / 2;
  return stationsM.map((z, index) => ({
    stationM: z,
    index,
    leftColumn: { a: v3(0, 0, z), b: v3(0, eaveM, z) },
    rightColumn: { a: v3(widthM, 0, z), b: v3(widthM, eaveM, z) },
    leftRafter: { a: v3(0, eaveM, z), b: v3(midX, ridgeM, z) },
    rightRafter: { a: v3(widthM, eaveM, z), b: v3(midX, ridgeM, z) },
    ridgePoint: v3(midX, ridgeM, z),
  }));
}

/** Side walls only. The front/rear faces are gables and get their own pentagon. */
function buildWallSegments(widthM: number, lengthM: number, eaveM: number, stationsM: number[]): WallSegment[] {
  const segmentCount = stationsM.length - 1;
  const segments: WallSegment[] = [];

  for (const [face, x] of [
    ['left', 0],
    ['right', widthM],
  ] as const) {
    for (let i = 0; i < segmentCount; i += 1) {
      const z0 = stationsM[i];
      const z1 = stationsM[i + 1];
      segments.push({
        face,
        index: i,
        segmentCount,
        corners: quad(v3(x, eaveM, z0), v3(x, eaveM, z1), v3(x, 0, z1), v3(x, 0, z0)),
      });
    }
  }
  return segments;
}

function buildRoofSegments(
  widthM: number,
  eaveM: number,
  ridgeM: number,
  stationsM: number[],
): RoofSegment[] {
  const segmentCount = stationsM.length - 1;
  const midX = widthM / 2;
  const segments: RoofSegment[] = [];

  for (const slope of ['left', 'right'] as const) {
    const eaveX = slope === 'left' ? 0 : widthM;
    for (let i = 0; i < segmentCount; i += 1) {
      const z0 = stationsM[i];
      const z1 = stationsM[i + 1];
      segments.push({
        slope,
        index: i,
        segmentCount,
        corners: quad(
          v3(eaveX, eaveM, z0),
          v3(eaveX, eaveM, z1),
          v3(midX, ridgeM, z1),
          v3(midX, ridgeM, z0),
        ),
      });
    }
  }
  return segments;
}

function buildGableEnds(widthM: number, lengthM: number, eaveM: number, ridgeM: number): GableProfile[] {
  const midX = widthM / 2;
  return (['front', 'rear'] as const).map((face) => {
    const z = face === 'front' ? 0 : lengthM;
    return {
      face,
      outline: [
        v3(0, 0, z),
        v3(widthM, 0, z),
        v3(widthM, eaveM, z),
        v3(midX, ridgeM, z),
        v3(0, eaveM, z),
      ] as [Vec3, Vec3, Vec3, Vec3, Vec3],
    };
  });
}

function buildGirts(widthM: number, lengthM: number, eaveM: number): Member[] {
  const members: Member[] = [];
  for (const level of GIRT_LEVELS) {
    const y = round(eaveM * level);
    members.push({ a: v3(widthM, y, 0), b: v3(widthM, y, lengthM) });
  }
  return members;
}

// Gate placement ratios — carried over unchanged from the previous scene model
// so gate positions do not silently move in this refactor.
const GATE_HEIGHT_RATIO = 0.72;
const GATE_WIDTH_RATIO = 0.22;
const GATE_GAP_RATIO = 0.08;
const GATE_MARGIN_RATIO = 0.06;

function buildOpenings(gates: number, widthM: number, eaveM: number): OpeningGeometry[] {
  if (gates === 0) return [];

  const gateHeightM = round(eaveM * GATE_HEIGHT_RATIO);
  const gateWidthM = round(widthM * GATE_WIDTH_RATIO);
  const gapM = widthM * GATE_GAP_RATIO;
  const marginM = widthM * GATE_MARGIN_RATIO;
  const usableM = widthM - marginM * 2;
  const totalWidthM = gates * gateWidthM + (gates - 1) * gapM;
  const startM = marginM + Math.max(0, (usableM - totalWidthM) / 2);

  return Array.from({ length: gates }, (_, index) => {
    const xM = round(startM + index * (gateWidthM + gapM));
    return {
      index,
      face: 'front' as const,
      rect: { xM, yM: 0, widthM: gateWidthM, heightM: gateHeightM },
      corners: quad(
        v3(xM, gateHeightM, 0),
        v3(xM + gateWidthM, gateHeightM, 0),
        v3(xM + gateWidthM, 0, 0),
        v3(xM, 0, 0),
      ),
    };
  });
}

function buildSlab(widthM: number, lengthM: number): SlabGeometry {
  const o = SLAB_OVERHANG_M;
  return {
    corners: quad(v3(-o, 0, -o), v3(widthM + o, 0, -o), v3(widthM + o, 0, lengthM + o), v3(-o, 0, lengthM + o)),
    widthM: round(widthM + o * 2),
    lengthM: round(lengthM + o * 2),
    thicknessM: SLAB_THICKNESS_M,
    overhangM: o,
  };
}

/**
 * Pure: HangarDomainModel in, one fully-derived building geometry out.
 *
 * Note what is deliberately NOT here: visibility. Scope (`foundation`/`frame`/
 * `walls`/`roof`) decides what a renderer *draws*, and the build-up lifecycle
 * decides how it appears — but the geometry of every part exists unconditionally,
 * so bounds/framing stay stable and a dematerialising layer has real coordinates
 * to animate from.
 */
export function buildParametricModel(domain: HangarDomainModel): ParametricBuildingModel {
  const { widthM, lengthM, eaveHeightM } = domain.dimensions;
  const pitchDeg = domain.roof.pitchDeg;
  const ridgeM = ridgeHeightM(widthM, eaveHeightM, pitchDeg);

  const count = frameBayCount(lengthM);
  const stationsM = buildBayStations(lengthM, count);

  return {
    footprint: { widthM, lengthM },
    heights: { eaveM: eaveHeightM, ridgeM },
    roof: {
      type: 'gable',
      pitchDeg,
      halfSpanM: round(widthM / 2),
      riseM: round(ridgeM - eaveHeightM),
    },
    bays: { count, stationsM },
    frames: buildFrames(widthM, eaveHeightM, ridgeM, stationsM),
    envelope: {
      wallSegments: buildWallSegments(widthM, lengthM, eaveHeightM, stationsM),
      roofSegments: buildRoofSegments(widthM, eaveHeightM, ridgeM, stationsM),
      gableEnds: buildGableEnds(widthM, lengthM, eaveHeightM, ridgeM),
      walls: domain.envelope.walls,
      roofEnvelope: domain.envelope.roof,
    },
    girts: buildGirts(widthM, lengthM, eaveHeightM),
    openings: buildOpenings(domain.gates, widthM, eaveHeightM),
    slab: buildSlab(widthM, lengthM),
  };
}
