import type { HangarDomainModel } from './domainModel';
import type { EnvelopeChoice, GateType, RoofStructure, StructuralScheme } from './types';

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

/**
 * Phase 3E — one internal (centre-line) column, at the SAME Z stations `PortalFrame`s use — see
 * `buildInternalColumns`'s own doc comment for why a station is skipped instead of generated
 * through a gate, and for the `ridgeProp` field's own meaning. ALWAYS present when
 * `structuralScheme === 'centerSupport'`, at every station gate geometry allows — which stations
 * were skipped, and why, is not represented here; a renderer that needs to explain that reads
 * `openings` and `bays.stationsM` itself, the same source this function used.
 */
export type InternalColumn = {
  stationM: number;
  index: number;
  /** Grade to eave — the SAME height as the external columns at this station, matching
   *  `PortalFrame.leftColumn`/`rightColumn`'s own span, so isolated footings and material
   *  hierarchy treat it identically (see FootingGeometry's own doc comment). */
  column: Member;
  /**
   * `portalRafter` only: a short prop from the column's own top (eave height) up to the ridge
   * point, where the two rafters already meet — a real, legible detail (a king-post-style prop),
   * not a fabricated one, and the only way this column actually SUPPORTS anything in portal mode
   * (there is no bottom chord there to land on). `null` in truss mode, where the column's own top
   * already lands exactly on the truss's flat bottom chord (see `buildTrussWebs`) — nothing more
   * is needed.
   */
  ridgeProp: Member | null;
};

/**
 * Phase 3E — the steel truss ADDED at a station already carrying a `PortalFrame`: the frame's own
 * `leftRafter`/`rightRafter` already ARE the truss's top chord (same two lines, not duplicated
 * here — see this type's own field comments), so this only carries what a truss has and a plain
 * rafter pair does not: a bottom chord and the web members between the two.
 *
 * ALWAYS computed, at every station, regardless of `roofStructure` — same "geometry is a fact,
 * visibility is the renderer's business" rule `slab`/`footings` already follow (see
 * `ParametricBuildingModel`'s own doc comments on those). Which representation (plain rafters, or
 * rafters + this) a renderer actually shows is `domain.structural.roofStructure`, not a reason to
 * leave this unset.
 */
export type TrussWebs = {
  stationM: number;
  index: number;
  /** Flat, at eave height, spanning the full width — see `buildTrussWebs`'s own doc comment for
   *  why a flat bottom chord (not one shaped to the roof) was the chosen schematic language. */
  bottomChord: Member;
  /** Alternating diagonals between the (implicit, from `PortalFrame`) top chord and this bottom
   *  chord — a simplified Warren pattern; see `buildTrussWebs`'s own doc comment. */
  webs: Member[];
};

/**
 * Phase 3E, brief §13 — one X-brace in a side-wall bay: the two diagonals of the bay's own
 * rectangle, from `WallSegment.corners` verbatim (no bracing-specific geometry rule of its own —
 * see `buildBracing`'s own doc comment). NOT a user control (brief §13's own "this is not a new
 * user control") — always present wherever `buildBracing` selected a bay, same "geometry is a
 * fact, visibility is scope.frame's business" pattern as girts.
 */
export type BraceMember = {
  face: 'left' | 'right';
  bayIndex: number;
  diagonalA: Member;
  diagonalB: Member;
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

/**
 * Phase 3D — a schematic isolated footing under one portal-frame column: a buried pad plus a short
 * pedestal stub the column base actually sits on (ground → pad → pedestal → column, per the
 * brief's own hierarchy). Positioned at the column's own base point — never hand-placed by a
 * renderer — so both the technical and 3D views can key a footing to the exact same column by `id`
 * and never drift apart.
 *
 * EXPLICITLY NOT an engineering output. Every dimension below is a fixed, round, schematic value —
 * this configurator does not run a bearing-capacity or footing-sizing calculation, and these
 * numbers must never be presented as though it did (see FoundationType's own doc comment and
 * FOOTING_* constants below). A real footing's size depends on soil conditions and structural load,
 * neither of which this tool knows.
 */
export type FootingGeometry = {
  /** `col-{frame index}-{left|right}` for a portal-frame column, `col-{internal column
   *  index}-center` for a Phase 3E internal column — matches the column it sits under one-to-one
   *  either way. */
  id: string;
  side: 'left' | 'right' | 'center';
  frameIndex: number;
  /** Column base point, in plan — the pad and pedestal are both centred here. */
  xM: number;
  zM: number;
  padWidthM: number;
  padThicknessM: number;
  pedestalWidthM: number;
  pedestalHeightM: number;
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
    /** How far the roof plane cantilevers past the wall face, at eave height, on the long sides. */
    overhangM: number;
  };
  bays: { count: number; stationsM: number[] };
  frames: PortalFrame[];
  /** Phase 3E — see `InternalColumn`'s own doc comment. Empty for `structuralScheme !==
   *  'centerSupport'` — unlike `slab`/`footings`, there is no "always one per station" baseline
   *  to stay honest about: a clear-span building genuinely has none, so an empty array here IS
   *  the fact, not a placeholder for one being hidden. */
  internalColumns: InternalColumn[];
  /** Phase 3E — see `TrussWebs`'s own doc comment: ALWAYS one per frame station, regardless of
   *  `roofStructure` (same "geometry is a fact" rule as `slab`/`footings`). */
  trusses: TrussWebs[];
  envelope: {
    wallSegments: WallSegment[];
    roofSegments: RoofSegment[];
    gableEnds: GableProfile[];
    walls: EnvelopeChoice;
    roofEnvelope: EnvelopeChoice;
  };
  /** Secondary horizontal members on the side walls (girts) — visual weight only. */
  girts: Member[];
  /** Phase 3E, brief §13 — see `BraceMember`'s own doc comment. Never empty by omission at a
   *  small building size the way `internalColumns` legitimately can be — every supported length
   *  has at least the first/last bay braced. */
  bracing: BraceMember[];
  openings: OpeningGeometry[];
  /**
   * ALWAYS present, never null — even when `scope.foundation` is false.
   * "Invisible ≠ nonexistent for geometry": an earlier refactor omitted the slab
   * primitive when it was out of scope, which silently tightened the SVG viewBox
   * whenever the foundation was toggled off (caught by visual regression, 3792px
   * diff). Visibility is the renderer's business; the footprint is a fact.
   */
  slab: SlabGeometry;
  /**
   * ALWAYS present too, same "invisible ≠ nonexistent" rule as `slab` — one per column,
   * regardless of `foundation.type`. Which foundation representation a renderer actually shows
   * (the continuous slab, or these discrete footings) is a presentation choice driven by
   * `domain.foundation.type`, not a reason to leave either geometry unset.
   */
  footings: FootingGeometry[];
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
 * A single fixed pitch is the wrong abstraction across this configurator's supported width range
 * (10–50 m as of the Phase 3E.1 follow-up brief, which lowered the public maximum from 60 m — see
 * DIMENSION_BOUNDS's own doc comment), and that was verified rather than assumed: a fixed 12° puts
 * the ridge 6.38 m above the eave on a 60 m span, which on the 4 m minimum eave height is a roof
 * 1.6× taller than the walls it sits on. Real wide-span portal frames go the other way — the wider
 * the span, the shallower the pitch.
 *
 * PRODUCT DECISION (settled, not open): `PITCH_MAX_WIDTH_M` below stays 60, not 50 — the curve's
 * internal calibration anchor is deliberately allowed to sit BEYOND the public width range.
 *   • Public configurator max width = 50 (DIMENSION_BOUNDS.width.max).
 *   • This pitch curve's own calibration anchor (PITCH_MAX_WIDTH_M) sits beyond that public
 *     range, at 60.
 *   • That is intentional, not an oversight: re-anchoring the curve to 50 would only buy a
 *     shallower pitch at the single new extreme (7° instead of 8.4° at 50 m, itself not an
 *     obvious problem on its own), at the cost of re-stretching the whole curve and disturbing
 *     the two independently-verified calibration points below, which cover the 18–36 m range
 *     most real requests actually land in. Not every internal mathematical anchor has to line up
 *     with a UI bound — this is that case, deliberately.
 * Not a bug, not a TODO — do not "fix" this without a product decision to revisit it.
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
// Exported (Phase 3E.1) so tests can assert the clamp boundary directly, without hardcoding 60 —
// see roofPitchDegForWidth's own doc comment above for why this deliberately no longer matches
// DIMENSION_BOUNDS.width.max (50).
export const PITCH_MIN_WIDTH_M = 10;
export const PITCH_MAX_WIDTH_M = 60;

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

// Product review, iterated live rather than picked once: the original 0.35 m slab overhang and
// 0 m roof overhang both read as too subtle to see at a glance — a hangar's foundation and eave
// overhang are supposed to be a visible "the roof sheds water clear of the wall, the slab sits
// clear of the drip line" cue, not a detail you have to zoom in to find. First pass landed on
// 1.0–1.5 m slab / 0.7 m roof; current values push both further after a second live look. Treat
// these two constants as the place a further adjustment lands, not values to rederive — they are
// a design call, not something computed from the building's own dimensions.
const SLAB_OVERHANG_M = 2;
const SLAB_THICKNESS_M = 0.3;
/** How far the roof plane cantilevers past the wall face, at eave height, on the long sides.
 *  Zero before this change — the roof plane used to stop exactly flush with the wall. See the
 *  slab overhang comment above — same iterative live-comparison process, same "design call"
 *  caveat. */
const ROOF_OVERHANG_M = 1.5;

// Phase 3D — isolated-footing schematic dimensions. Fixed and round on purpose (see
// FootingGeometry's own doc comment: this is a visualisation, never an engineering output).
// Sized to read clearly next to the column sections below without ever touching a neighbouring
// footing at the tightest bay spacing this configurator allows (FRAME_TARGET_SPACING_M = 6 m,
// clamped to a 2-bay minimum — even a 10 m-long building still spaces columns 5 m apart, well
// clear of even the larger pad below).
//
// The pedestal specifically was tuned up from an initial 0.6×0.3 m after live comparison against
// the slab representation: at that size the ONLY visible part (the pad is buried; only the
// pedestal stub shows above grade) measurably changed the render — confirmed by pixel-diffing
// isolated against slab, not assumed — but read as indistinguishable from the building's own
// contact shadow at the default camera distance, which fails the brief's own "does this visually
// explain how the frame meets the ground" bar. Taller/wider reads as a real pedestal a column
// base plate could sit on; still visually modest next to an 8 m+ eave, and still explicitly not
// an engineered dimension.
const FOOTING_PAD_WIDTH_M = 1.6;
const FOOTING_PAD_THICKNESS_M = 0.4;
const FOOTING_PEDESTAL_WIDTH_M = 0.8;
const FOOTING_PEDESTAL_HEIGHT_M = 0.6;

/** Side-wall girt heights, as a fraction of eave height. Stylised "secondary
 *  structure exists here", matching the previous model's two levels. */
const GIRT_LEVELS = [1 / 3, 2 / 3] as const;

// ── Phase 3E — structural systems ───────────────────────────────────────────
// All of the constants in this section are the SAME kind of thing as the visual-rhythm rules
// above: UX/visual heuristics, never engineering calculations. See
// `STRUCTURAL_VISUALIZATION_THRESHOLDS`'s own doc comment and the brief's own "engineering
// honesty" requirement — none of this may be presented as a structural determination.

/** Believable real-world truss panel width, used only to pick a panel COUNT that looks right at
 *  a given span — see `buildTrussWebs`. Clamped so neither a narrow nor a very wide supported
 *  span can produce a degenerate (too sparse or too dense) web pattern. */
const TRUSS_PANEL_TARGET_WIDTH_M = 1.8;
const TRUSS_PANELS_MIN_PER_HALF = 3;
const TRUSS_PANELS_MAX_PER_HALF = 8;

/** Half-width safety margin around a gate opening's own rect that an internal column's centreline
 *  must clear — generous relative to any column's own real section, so "does this conflict"
 *  never comes down to sub-decimetre rounding. */
const INTERNAL_COLUMN_GATE_CLEARANCE_M = 0.3;

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

/**
 * Phase 3E.1 (the "structural auto-derivation" follow-up brief) — PRODUCT / VISUALIZATION
 * heuristics, explicitly NOT engineering limits (see the brief's own §5 "THIS IS NOT AN
 * ENGINEERING RULE"). These two width thresholds pick which of the structural representations this
 * configurator already knows how to draw — portal/rafter clear-span, truss clear-span, or truss
 * with a centre-support line — a given span shows BY DEFAULT, purely so the preliminary
 * visualization looks plausible at a glance. This is never a claim that a shorter span "does not
 * need" a truss, or that a wider one "requires" a centre column: a real structural engineer may
 * reach a completely different conclusion for the same building, off information (loads, soil,
 * code) this tool has no access to.
 *
 * Deliberately NOT named `ENGINEERING_LIMIT` / `REQUIRED_TRUSS_SPAN` / `MAX_CLEAR_SPAN` — see this
 * module's own header on why naming matters here as much as the numbers do. Consumed by exactly
 * one function, `deriveStructuralVisualization` below — see its own doc comment for the single
 * authoritative call site this whole derivation resolves through.
 *
 * `CENTER_SUPPORT_FROM_WIDTH_M` is always >= `TRUSS_FROM_WIDTH_M`: centre support never appears
 * before truss does, so this heuristic never produces the portal-frame + centre-support
 * combination. The geometry layer underneath (`buildInternalColumns`, `buildTrussWebs`) still
 * supports that combination fully — it is just not one this width-only heuristic ever selects; see
 * this module's own tests for how it is still exercised directly.
 */
export const STRUCTURAL_VISUALIZATION_THRESHOLDS = {
  /** Below this width: portal/rafter roof. At or above: truss. */
  TRUSS_FROM_WIDTH_M: 18,
  /** Below this width: clear span (no internal columns). At or above: one internal centre-column
   *  line, at every frame station gate geometry allows (see `buildInternalColumns`). */
  CENTER_SUPPORT_FROM_WIDTH_M: 24,
} as const;

/**
 * Phase 3E.1 — THE single authoritative derivation path from width to a preliminary structural
 * visualization (brief §6's own "one authoritative derivation path... renderers consume derived
 * structural data"). Called exactly once, from `domainModel.ts`'s `deriveDomainModel`; every
 * renderer, the summary, and the read-only control-panel info line all consume its OUTPUT
 * (`HangarDomainModel.structural`) — none of them re-implements these thresholds, which is the
 * entire point of this function existing as a single named export rather than inline arithmetic
 * wherever a scheme/roofStructure value was previously read from state.
 *
 * Deliberately width-only, even though the brief frames the derivation conceptually as
 * "width + gates/openings + foundation configuration → derived structural visualization": gates
 * and foundation do not change WHICH representation is selected here (the classification itself),
 * they change how that already-selected representation is realised downstream — a gate can still
 * cause one station's column to be skipped (`buildInternalColumns`'s own gate-conflict check,
 * unchanged by this phase), and a foundation type still decides whether a footing is drawn under
 * it (`buildInternalColumnFootings`, also unchanged) — both of which already run *after* this
 * function's result is known, on inputs this function does not need. Adding unused parameters here
 * to *look* more complete would be the wrong kind of honesty for a function whose whole job is to
 * say plainly what actually drives it.
 */
export function deriveStructuralVisualization(widthM: number): { scheme: StructuralScheme; roofStructure: RoofStructure } {
  const roofStructure: RoofStructure = widthM < STRUCTURAL_VISUALIZATION_THRESHOLDS.TRUSS_FROM_WIDTH_M ? 'portalRafter' : 'truss';
  const scheme: StructuralScheme = widthM < STRUCTURAL_VISUALIZATION_THRESHOLDS.CENTER_SUPPORT_FROM_WIDTH_M ? 'clearSpan' : 'centerSupport';
  return { scheme, roofStructure };
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
  pitchDeg: number,
  overhangM: number,
): RoofSegment[] {
  const segmentCount = stationsM.length - 1;
  const midX = widthM / 2;
  const segments: RoofSegment[] = [];

  // The overhang is the SAME roof plane continued past the wall, not a separate flat lip kinked on
  // at eave height — a real rafter tail keeps the same slope past the wall face. So the outer edge
  // sits `overhangM` further out in X, and correspondingly lower in Y by however much that slope
  // drops over that run; the eave point itself (x = wall face, y = eaveM) is not a corner of the
  // quad any more, but it stays exactly on the line between the outer tip and the ridge by
  // construction, so the wall still reads as meeting the underside of the roof at the same height
  // as before.
  const overhangDropM = overhangM * Math.tan(pitchDeg * DEG);
  const outerEaveYM = round(eaveM - overhangDropM);

  for (const slope of ['left', 'right'] as const) {
    const outerX = slope === 'left' ? -overhangM : widthM + overhangM;
    for (let i = 0; i < segmentCount; i += 1) {
      const z0 = stationsM[i];
      const z1 = stationsM[i + 1];
      segments.push({
        slope,
        index: i,
        segmentCount,
        corners: quad(
          v3(outerX, outerEaveYM, z0),
          v3(outerX, outerEaveYM, z1),
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

/**
 * Phase 3E, brief §12 — audited and extended: this used to run girts along X = widthM only (one
 * side wall), which read as too sparse once the frame itself gained a centre column line and a
 * visible truss web (brief's own "too sparse or generic, refine them"). Both side walls now get
 * the same two levels — still exactly the visual-rhythm stand-in `GIRT_LEVELS`'s own doc comment
 * already describes, just no longer missing from half the building.
 */
function buildGirts(widthM: number, lengthM: number, eaveM: number): Member[] {
  const members: Member[] = [];
  for (const x of [0, widthM]) {
    for (const level of GIRT_LEVELS) {
      const y = round(eaveM * level);
      members.push({ a: v3(x, y, 0), b: v3(x, y, lengthM) });
    }
  }
  return members;
}

/**
 * Phase 3E, brief §13 — a few strategically placed side-wall braces, deterministic and NOT a user
 * control (see BraceMember's own doc comment). Deliberately side walls only, never the gable ends:
 * gates only ever cut into the front gable (`buildOpenings`'s own `face: 'front'` literal), so
 * restricting bracing to the side walls means it can never geometrically overlap a gate opening AT
 * ALL — brief §13's own "braces must avoid gate openings" requirement, satisfied by construction
 * rather than by a conflict check this function would otherwise need (compare `buildInternalColumns`,
 * which DOES need one, because its centreline genuinely can land on the one face gates use).
 *
 * Bay selection: first bay, last bay ("near one end, near the opposite end" — brief's own words),
 * plus the middle bay once there are enough of them for a third braced zone to read as "a middle
 * zone" rather than "the same end again" — six bays is the point `frameBayCount` itself starts
 * meaning a genuinely long building (its own target spacing is 6 m, so six bays is a ~36 m run).
 * Both side walls get the same bay indices, for the plan-symmetry a real building would have.
 */
function buildBracing(wallSegments: WallSegment[]): BraceMember[] {
  const segmentCount = wallSegments[0]?.segmentCount ?? 0;
  if (segmentCount === 0) return [];

  const bracedIndices = new Set<number>([0, segmentCount - 1]);
  const LONG_BUILDING_BAY_THRESHOLD = 6;
  if (segmentCount >= LONG_BUILDING_BAY_THRESHOLD) bracedIndices.add(Math.floor(segmentCount / 2));

  return wallSegments
    .filter((s) => bracedIndices.has(s.index))
    .map((s) => ({
      face: s.face as 'left' | 'right',
      bayIndex: s.index,
      // corners = [top-z0, top-z1, bottom-z1, bottom-z0] (buildWallSegments' own order) — the two
      // diagonals of that rectangle are 0↔2 and 1↔3.
      diagonalA: { a: s.corners[0], b: s.corners[2] },
      diagonalB: { a: s.corners[1], b: s.corners[3] },
    }));
}

// Gate placement ratios. `standard` is carried over unchanged from the previous scene model so
// existing gate positions do not silently move; `double` is the wide, tall opening for driving
// equipment in — proportionally wider AND taller, because a vehicle opening that is only wider
// still reads as a personnel door.
//
// Both remain visual proportions, not opening schedules: the drawing shows a hole in a wall.
const GATE_PROPORTIONS: Record<GateType, { widthRatio: number; heightRatio: number }> = {
  standard: { widthRatio: 0.22, heightRatio: 0.72 },
  double: { widthRatio: 0.34, heightRatio: 0.85 },
};
const GATE_GAP_RATIO = 0.08;
const GATE_MARGIN_RATIO = 0.06;

function buildOpenings(
  gates: number,
  gateType: GateType,
  widthM: number,
  eaveM: number,
): OpeningGeometry[] {
  if (gates === 0) return [];

  const { widthRatio, heightRatio } = GATE_PROPORTIONS[gateType];
  const gateHeightM = round(eaveM * heightRatio);
  const gateWidthM = round(widthM * widthRatio);
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

/**
 * Phase 3E — the centre support line (brief §3-4): one column at X = widthM/2 for every frame
 * station EXCEPT one that would sit inside a gate opening — skipped entirely rather than faked
 * (brief §4: "do not fake a transfer structure"), continuing the line at every OTHER station
 * regardless. Gates only ever sit on the front face today (`buildOpenings`'s own `face: 'front'`
 * literal), so in practice only the z=0 station can ever conflict — this checks generally, by
 * X-range against z=0, rather than assuming that, so a future gate placement cannot silently
 * reintroduce a column-through-a-door bug this function exists to prevent.
 *
 * Returns `[]` for anything other than `centerSupport` — see `InternalColumn`'s own doc comment
 * on why an empty array here is a genuine fact, not a hidden placeholder the way `slab`/`footings`
 * staying populated-but-invisible is.
 */
function buildInternalColumns(
  widthM: number,
  eaveM: number,
  ridgeM: number,
  stationsM: number[],
  openings: OpeningGeometry[],
  scheme: StructuralScheme,
  roofStructure: RoofStructure,
): InternalColumn[] {
  if (scheme !== 'centerSupport') return [];
  const midX = widthM / 2;
  // portalRafter needs a king-post prop up to the ridge point; truss is the only case where the
  // column instead meets a real bottom chord directly (see InternalColumn's own doc comment).
  const needsKingPost = roofStructure !== 'truss';

  const columns: InternalColumn[] = [];
  let index = 0;
  for (const z of stationsM) {
    const conflictsWithGate = z === 0 && openings.some((o) => {
      const loX = o.rect.xM - INTERNAL_COLUMN_GATE_CLEARANCE_M;
      const hiX = o.rect.xM + o.rect.widthM + INTERNAL_COLUMN_GATE_CLEARANCE_M;
      return midX >= loX && midX <= hiX;
    });
    if (conflictsWithGate) continue;

    columns.push({
      stationM: z,
      index,
      column: { a: v3(midX, 0, z), b: v3(midX, eaveM, z) },
      ridgeProp: needsKingPost ? { a: v3(midX, eaveM, z), b: v3(midX, ridgeM, z) } : null,
    });
    index += 1;
  }
  return columns;
}

/**
 * Phase 3E — the steel truss's own web (brief §7-10): a flat bottom chord and a repeating,
 * alternating-diagonal ("Warren") pattern between it and the frame's own rafter lines — those
 * already ARE the truss's top chord, so they are not duplicated here; see `TrussWebs`'s own doc
 * comment.
 *
 * Schematic assumptions, spelled out because none of them is an engineering calculation (brief
 * §8-9, §20):
 *   - the bottom chord is FLAT, at eave height, the full width — not shaped to mirror the roof
 *     slope. A flat bottom chord is the immediately-recognisable "this is a truss, not a pair of
 *     rafters" cue from every angle (a shaped one would still read as "two rafters" from a
 *     distance), and is also what most real long-span gable trusses of this kind actually use.
 *   - panel count is derived from span alone (`TRUSS_PANEL_TARGET_WIDTH_M`, clamped both ends —
 *     see that constant's own doc comment), never from any load or member-capacity calculation.
 *   - panel count is always EVEN: two mirrored halves meeting at X = widthM / 2, specifically so a
 *     panel POINT — not a panel's midpoint — always lands exactly on the centreline. That is the
 *     exact point `buildInternalColumns`'s own centre column meets in truss mode, so the two stay
 *     geometrically consistent by construction, not by a separate alignment check.
 *   - the web is a plain alternating (Warren) zigzag, no verticals. A specific NAMED engineered
 *     pattern (Fink/Pratt/Howe…) would claim a precision this tool does not have; Warren is the
 *     simplest pattern that still reads unambiguously as "chords + diagonal webs" from every
 *     camera angle this configurator uses, with no near-zero-length member risk directly under
 *     the ridge the way a verticals-included pattern would have there.
 */
function buildTrussWebs(widthM: number, eaveM: number, ridgeM: number, stationsM: number[]): TrussWebs[] {
  const halfSpanM = widthM / 2;
  const panelsPerHalf = Math.min(
    TRUSS_PANELS_MAX_PER_HALF,
    Math.max(TRUSS_PANELS_MIN_PER_HALF, Math.round(halfSpanM / TRUSS_PANEL_TARGET_WIDTH_M)),
  );
  const panelCount = panelsPerHalf * 2;
  const panelWidthM = widthM / panelCount;

  // Top-chord Y at a given X — the SAME two lines PortalFrame's own rafters already trace.
  const topChordY = (x: number): number => {
    if (x <= halfSpanM) return eaveM + (ridgeM - eaveM) * (x / halfSpanM);
    return ridgeM - (ridgeM - eaveM) * ((x - halfSpanM) / halfSpanM);
  };

  return stationsM.map((z, index) => {
    const webs: Member[] = [];
    for (let i = 0; i < panelCount; i += 1) {
      const x0 = i * panelWidthM;
      const x1 = (i + 1) * panelWidthM;
      const bottom0 = v3(x0, eaveM, z);
      const bottom1 = v3(x1, eaveM, z);
      const top0 = v3(x0, topChordY(x0), z);
      const top1 = v3(x1, topChordY(x1), z);
      // Alternating zigzag, symmetric about the centreline by construction (panelCount is always
      // even — see this function's own doc comment): even panels rise bottom-to-next-top, odd
      // panels fall top-to-next-bottom.
      webs.push(i % 2 === 0 ? { a: bottom0, b: top1 } : { a: top0, b: bottom1 });
    }
    return {
      stationM: z,
      index,
      bottomChord: { a: v3(0, eaveM, z), b: v3(widthM, eaveM, z) },
      webs,
    };
  });
}

/** One footing per column (two per frame) — see FootingGeometry's own doc comment for what this
 *  is and, just as importantly, what it deliberately is not. */
function buildFootings(frames: PortalFrame[]): FootingGeometry[] {
  return frames.flatMap((frame) => [
    {
      id: `col-${frame.index}-left`,
      side: 'left' as const,
      frameIndex: frame.index,
      xM: frame.leftColumn.a.x,
      zM: frame.leftColumn.a.z,
      padWidthM: FOOTING_PAD_WIDTH_M,
      padThicknessM: FOOTING_PAD_THICKNESS_M,
      pedestalWidthM: FOOTING_PEDESTAL_WIDTH_M,
      pedestalHeightM: FOOTING_PEDESTAL_HEIGHT_M,
    },
    {
      id: `col-${frame.index}-right`,
      side: 'right' as const,
      frameIndex: frame.index,
      xM: frame.rightColumn.a.x,
      zM: frame.rightColumn.a.z,
      padWidthM: FOOTING_PAD_WIDTH_M,
      padThicknessM: FOOTING_PAD_THICKNESS_M,
      pedestalWidthM: FOOTING_PEDESTAL_WIDTH_M,
      pedestalHeightM: FOOTING_PEDESTAL_HEIGHT_M,
    },
  ]);
}

/**
 * Phase 3E, brief §5 — one footing per internal column, same schematic dimensions as the external
 * ones (`FOOTING_*` above): "do not create different engineered footing dimensions... unless
 * there is a compelling visual reason" — there is not one here, an internal column is drawn at
 * the same section as an external one, so it gets the same footing. Positions come straight from
 * `buildInternalColumns`'s own output, which has already resolved the gate-conflict skip — this
 * function adds no column-placement logic of its own, so an orphan footing (one with no column
 * above it) cannot occur by construction, not by a separate check.
 */
function buildInternalColumnFootings(internalColumns: InternalColumn[]): FootingGeometry[] {
  return internalColumns.map((col) => ({
    id: `col-${col.index}-center`,
    side: 'center' as const,
    frameIndex: col.index,
    xM: col.column.a.x,
    zM: col.column.a.z,
    padWidthM: FOOTING_PAD_WIDTH_M,
    padThicknessM: FOOTING_PAD_THICKNESS_M,
    pedestalWidthM: FOOTING_PEDESTAL_WIDTH_M,
    pedestalHeightM: FOOTING_PEDESTAL_HEIGHT_M,
  }));
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
  const frames = buildFrames(widthM, eaveHeightM, ridgeM, stationsM);
  // Hoisted: buildInternalColumns needs the real gate rectangles to resolve its own conflict
  // check (brief §4) — never a reason for a renderer to invent its own copy of this call.
  const openings = buildOpenings(domain.gates, domain.gateType, widthM, eaveHeightM);
  const internalColumns = buildInternalColumns(
    widthM, eaveHeightM, ridgeM, stationsM, openings, domain.structural.scheme, domain.structural.roofStructure,
  );
  const wallSegments = buildWallSegments(widthM, lengthM, eaveHeightM, stationsM);

  return {
    footprint: { widthM, lengthM },
    heights: { eaveM: eaveHeightM, ridgeM },
    roof: {
      type: 'gable',
      pitchDeg,
      halfSpanM: round(widthM / 2),
      riseM: round(ridgeM - eaveHeightM),
      overhangM: ROOF_OVERHANG_M,
    },
    bays: { count, stationsM },
    frames,
    internalColumns,
    trusses: buildTrussWebs(widthM, eaveHeightM, ridgeM, stationsM),
    envelope: {
      wallSegments,
      roofSegments: buildRoofSegments(widthM, eaveHeightM, ridgeM, stationsM, pitchDeg, ROOF_OVERHANG_M),
      gableEnds: buildGableEnds(widthM, lengthM, eaveHeightM, ridgeM),
      walls: domain.envelope.walls,
      roofEnvelope: domain.envelope.roof,
    },
    girts: buildGirts(widthM, lengthM, eaveHeightM),
    bracing: buildBracing(wallSegments),
    openings,
    slab: buildSlab(widthM, lengthM),
    // External + internal column footings merged into one array — see FootingGeometry's own doc
    // comment: both are "one footing per column", distinguished by `side`, not by which array
    // they live in, so a renderer that iterates `footings` picks up internal ones for free.
    footings: [...buildFootings(frames), ...buildInternalColumnFootings(internalColumns)],
  };
}
