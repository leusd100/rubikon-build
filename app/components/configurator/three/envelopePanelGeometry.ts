import * as THREE from 'three';
import type { CladdingSystem } from '../../../lib/configurator/types';

// Phase 3D — real geometric surface character for wall/roof panels, replacing the flat scaled box
// every panel used before. See the Phase 3D report's "material strategy investigation" section for
// the full reasoning; the short version:
//
// GEOMETRY, not a shader/normal-map, was chosen for the repeating profile. A bump-mapped flat
// panel still has a flat SILHOUETTE — at the eave, ridge and gable edges, where you see a panel's
// EDGE-ON profile rather than its face, real corrugated sheet reads by its wavy outline as much as
// by its face shading, and a normal map cannot produce that. Real geometry also sidesteps a
// correctness trap a shader/UV approach would have to solve separately: every panel here used to
// share ONE unit box, scaled per-instance by a matrix, which means a naive UV- or local-position-
// driven rib pattern would STRETCH — a 12 m bay would show the same rib COUNT as a 4 m one, wider
// and wrong, instead of more ribs at the same real pitch. Building geometry directly from the
// panel's own real width/height in metres has no such trap: pitch is correct by construction.
//
// Built via THREE.ExtrudeGeometry — the SAME primitive `Gable` (in ThreeHangarView.tsx) already
// uses for its own pentagon-with-holes shape — rather than hand-assembled triangle strips: a
// swept 2D cross-section is exactly what a corrugated or seamed panel IS (one profile, constant
// along the panel's height), and Three's own extruder already gets every side wall and both end
// caps topologically right (no stray gaps at the wave's own left/right edges, no disconnected
// back face), which hand-rolled vertex assembly had to be re-derived and re-debugged for. See the
// coordinate-mapping note on `extrudeCrossSection` below for the one non-obvious part: the
// cross-section is authored in (X, depth) and extruded along Three's own local Z, then rotated
// into this file's (X, height, depth) convention.
//
// Cost is bounded and was measured, not assumed — see the Phase 3D report's performance section.
// Panels are still one draw call each (same as before); only their own triangle count grew, and
// only for the two envelope surfaces this phase actually targets (gable ends stay flat — see
// ThreeHangarView's own note on why).

/** Real corrugated ("профнастил") sheet — a repeating trapezoidal wave: flat crest, sloped
 *  transition, flat trough, sloped transition back up. Deliberately trapezoidal, not sinusoidal:
 *  that is what the actual product looks like, and it is also cheaper (4 X-samples per period
 *  instead of a smoothly sampled curve). */
const PROFILED_RIB_PITCH_M = 0.2;
const PROFILED_RIB_HEIGHT_M = 0.016;
/** Fraction of one pitch spent on the flat crest (the rest splits between trough and the two
 *  sloped transitions) — a real profiled sheet's crest is narrower than its trough. */
const PROFILED_CREST_FRACTION = 0.32;
const PROFILED_SLOPE_FRACTION = 0.1;

/** Sandwich panel — large flat modules with a shallow seam groove between them. Module width is a
 *  common real product width band, not this specific brand's own spec. */
const SANDWICH_MODULE_WIDTH_M = 1.15;
const SANDWICH_SEAM_DEPTH_M = 0.006;
const SANDWICH_SEAM_WIDTH_M = 0.05;

/** Below this real panel width, neither profile reads as anything but noise (sub-pitch geometry),
 *  so both generators fall back to a flat panel — see `buildEnvelopePanelGeometry`'s own guard. */
const MIN_PROFILED_WIDTH_M = PROFILED_RIB_PITCH_M * 1.5;
const MIN_SANDWICH_WIDTH_M = SANDWICH_MODULE_WIDTH_M * 0.6;

function buildFlatPanel(widthM: number, heightM: number, thicknessM: number): THREE.BufferGeometry {
  // Equivalent to the pre-Phase-3D scaled unit box, just built directly at real size so it
  // composes with the ribbed/seamed generators' own [0,widthM]×[0,heightM]×[-thicknessM,0]
  // convention — see buildEnvelopePanelGeometry's own call sites for why that convention matters.
  const geometry = new THREE.BoxGeometry(widthM, heightM, thicknessM);
  geometry.translate(widthM / 2, heightM / 2, -thicknessM / 2);
  return geometry;
}

/**
 * Sweeps a front-face cross-section (given as (x, depth) points, depth ≤ 0, from x=0 to
 * x=widthM) into a solid panel: closes it into a polygon against a flat back at `backDepth`,
 * extrudes that polygon by `heightM`, and re-orients the result into this file's own (X=width,
 * Y=height, Z=depth) convention — front face at Z=0, matching `Panel`'s placement matrix in
 * ThreeHangarView.tsx exactly the way the pre-Phase-3D flat box already did.
 *
 * The coordinate mapping is the one part of this file that is not obvious from the shape alone:
 * `THREE.ExtrudeGeometry` extrudes a shape authored in its own local (x, y) along local +Z by
 * `depth`. This function authors the cross-section's own DEPTH axis on the shape's local Y (using
 * `-depth`, not `+depth` — see below), so that local Z becomes this panel's HEIGHT once extruded.
 * `rotateX(-Math.PI / 2)` then maps local (x, y, z) → world (x, z, -y): local Z (the extrusion,
 * i.e. this panel's height) lands on world Y as intended, and world Z = -localY = -(-depth) =
 * depth — the sign flip in the shape's own authoring and the sign flip in the rotation cancel,
 * which is why the shape is built with `-depth` rather than `depth`. Verified against the visible
 * result, not just this derivation — see the Phase 3D report's visual-comparison section.
 */
function extrudeCrossSection(
  frontProfile: Array<[number, number]>,
  widthM: number,
  backDepth: number,
  heightM: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  frontProfile.forEach(([x, depth], i) => {
    if (i === 0) shape.moveTo(x, -depth);
    else shape.lineTo(x, -depth);
  });
  shape.lineTo(widthM, -backDepth);
  shape.lineTo(0, -backDepth);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: heightM, bevelEnabled: false, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function buildProfiledSheetPanel(widthM: number, heightM: number, thicknessM: number): THREE.BufferGeometry {
  const periods = Math.max(1, Math.round(widthM / PROFILED_RIB_PITCH_M));
  const pitch = widthM / periods; // re-fit so ribs tile edge-to-edge with no clipped partial rib
  const crestW = pitch * PROFILED_CREST_FRACTION;
  const slopeW = pitch * PROFILED_SLOPE_FRACTION;
  const troughW = pitch - crestW - 2 * slopeW;
  const crestZ = 0;
  const troughZ = -PROFILED_RIB_HEIGHT_M;

  const profile: Array<[number, number]> = [];
  let x = 0;
  for (let i = 0; i < periods; i += 1) {
    const crestStart = x;
    const crestEnd = crestStart + crestW;
    const troughStart = crestEnd + slopeW;
    const troughEnd = troughStart + troughW;
    const nextCrestStart = troughEnd + slopeW;

    if (i === 0) profile.push([crestStart, crestZ]);
    profile.push([crestEnd, crestZ], [troughStart, troughZ], [troughEnd, troughZ], [nextCrestStart, crestZ]);
    x = nextCrestStart;
  }

  return extrudeCrossSection(profile, widthM, troughZ - thicknessM, heightM);
}

function buildSandwichPanel(widthM: number, heightM: number, thicknessM: number): THREE.BufferGeometry {
  const modules = Math.max(1, Math.round(widthM / SANDWICH_MODULE_WIDTH_M));
  const moduleWidth = widthM / modules;
  const seamHalf = SANDWICH_SEAM_WIDTH_M / 2;
  const faceZ = 0;
  const seamZ = -SANDWICH_SEAM_DEPTH_M;

  const profile: Array<[number, number]> = [[0, faceZ]];
  let x = 0;
  for (let i = 0; i < modules; i += 1) {
    const isLast = i === modules - 1;
    const moduleEnd = isLast ? widthM : x + moduleWidth; // absorb rounding into the final module
    if (isLast) {
      profile.push([moduleEnd, faceZ]);
    } else {
      const seamCentre = moduleEnd;
      profile.push([seamCentre - seamHalf, faceZ], [seamCentre, seamZ], [seamCentre + seamHalf, faceZ]);
    }
    x = moduleEnd;
  }

  return extrudeCrossSection(profile, widthM, faceZ - thicknessM, heightM);
}

/**
 * The single entry point every envelope panel (wall and roof alike) builds its geometry through.
 * Always returns geometry occupying local [0,widthM] × [0,heightM] × [-thicknessM,0] — the front
 * face sits at local Z=0, matching the convention `ThreeHangarView`'s own panel-placement matrix
 * already expects (see that file's `Panel` component). `widthM`/`heightM` MUST be the panel's own
 * real dimensions in metres, never a unit box scaled afterwards — that is the entire reason this
 * module exists rather than a shader: real dimensions in means correct, un-stretched rib pitch out.
 *
 * Falls back to a flat panel below `MIN_PROFILED_WIDTH_M`/`MIN_SANDWICH_WIDTH_M` — a panel wide
 * enough for barely one rib or seam reads as a rendering glitch, not as the material; small enough
 * only happens at the narrow end of the supported dimension range and at odd corner-bay
 * remainders, never at the default or typical configuration.
 */
export function buildEnvelopePanelGeometry(
  widthM: number,
  heightM: number,
  thicknessM: number,
  system: CladdingSystem | undefined,
): THREE.BufferGeometry {
  if (widthM <= 0 || heightM <= 0) return buildFlatPanel(Math.max(widthM, 1e-6), Math.max(heightM, 1e-6), thicknessM);
  if (system === 'profiled-sheet' && widthM >= MIN_PROFILED_WIDTH_M) {
    return buildProfiledSheetPanel(widthM, heightM, thicknessM);
  }
  if (system === 'sandwich-panel' && widthM >= MIN_SANDWICH_WIDTH_M) {
    return buildSandwichPanel(widthM, heightM, thicknessM);
  }
  return buildFlatPanel(widthM, heightM, thicknessM);
}

// ── Phase 3D.1 — gable/end-wall cladding overlay ────────────────────────────
//
// The gable is a pentagon (rectangle + triangular peak) with a rectangular gate hole, extruded by
// `THREE.ExtrudeGeometry` in `Gable` (ThreeHangarView.tsx) — unlike a wall/roof bay, its own top
// boundary is not a straight line, it follows the roof slope, so `buildProfiledSheetPanel`'s own
// "swept cross-section" technique does not apply directly: that technique sweeps ONE profile along
// a straight extrusion axis, and the gable's usable height varies with X.
//
// Solution: keep the gable's existing pentagon EXACTLY as it is today — geometry, position,
// everything — as the "field", and add a SEPARATE overlay mesh of thin vertical strips (comb
// teeth), one per rib or seam, each individually clipped to the pentagon's own roofline AND to
// whichever gate hole it might pass over. This sidesteps needing a variable-height sweep or any
// boolean/CSG subtraction (this project adds no CSG dependency): every strip is a simple rectangle,
// `THREE.ExtrudeGeometry` accepts an ARRAY of shapes and merges them into ONE geometry, so the
// whole comb is still one mesh / one draw call, the same discipline as every other envelope panel.
//
// Depth convention, to land the overlay flush with the ADJACENT WALL's own crest at the corner
// (brief's own "no obvious gaps/intersections" requirement): the field is shifted back by the
// overlay's own depth first (see `Gable`'s own call site), so the comb's outer tip — not the flat
// field behind it — lands at local Z=0, exactly where a wall panel's own crest already sits.
//
// Real profiled sheet has PROTRUDING ribs; real sandwich panel has a RECESSED seam groove (already
// modelled that way on the wall/roof, via one continuous swept cross-section — no subtraction
// needed there because the whole face is one profile, not a field-plus-overlay). Reproducing a true
// recess here would need cutting holes in the field and building a second, deeper backing surface
// behind each one — real, but meaningfully more topology for a detail this small. The gable's own
// sandwich treatment is instead a shallow PROTRUDING batten cap at each seam — a legitimate real
// sandwich-panel detail in its own right (a cover strip over the seam), not a fabricated one, and
// visually reads as "a seam is here" at normal viewing distance just as the wall's recessed groove
// does. Documented as a deliberate simplification, not an inconsistency overlooked — see the
// Phase 3D.1 report.

const GABLE_SANDWICH_CAP_HEIGHT_M = 0.006;
const GABLE_SANDWICH_CAP_WIDTH_M = 0.06;

type Rect = { minX: number; maxX: number; maxY: number };

/** The gable's own roofline height at a given X — eave-to-ridge on one side, ridge-to-eave on the
 *  other, meeting at the peak (`widthM / 2`). Mirrors `buildGableEnds`'s pentagon exactly (see
 *  parametricModel.ts) — not re-derived from anywhere else, so a future roof-shape change cannot
 *  silently make this module clip against a boundary the actual gable no longer has. */
function gableRooflineY(xM: number, widthM: number, eaveM: number, ridgeM: number): number {
  const midX = widthM / 2;
  if (xM <= midX) return eaveM + (ridgeM - eaveM) * (xM / midX);
  return ridgeM - (ridgeM - eaveM) * ((xM - midX) / midX);
}

function holeBoundsFrom(holes: Array<Array<{ x: number; y: number }>>): Rect[] {
  return holes.map((hole) => {
    const xs = hole.map((p) => p.x);
    const ys = hole.map((p) => p.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  });
}

/** A strip that would pass over a gate hole stops at the hole's own top (a lintel), not at the
 *  ground — the hole is real geometry cut through the gable, not a decal, so nothing may cross it. */
function stripBottomY(x0: number, x1: number, holes: Rect[]): number {
  let bottom = 0;
  for (const hole of holes) {
    if (x1 > hole.minX && x0 < hole.maxX) bottom = Math.max(bottom, hole.maxY);
  }
  return bottom;
}

/**
 * The gable's cladding overlay — see the module note above for the full design. Returns `null`
 * when there is nothing to draw (flat/undefined system, or every strip fell entirely inside a gate
 * hole — e.g. an unrealistically small gable, never the default/typical configuration), so the
 * caller can skip mounting a mesh entirely rather than rendering an empty one.
 *
 * Returns the overlay geometry AND the depth the caller must shift the existing flat pentagon back
 * by, so the two compose into one flush surface — see `Gable`'s own call site.
 */
export function buildGableCladdingOverlay(
  widthM: number,
  eaveM: number,
  ridgeM: number,
  holes: Array<Array<{ x: number; y: number }>>,
  system: CladdingSystem | undefined,
): { geometry: THREE.BufferGeometry; depthM: number } | null {
  if (system !== 'profiled-sheet' && system !== 'sandwich-panel') return null;
  const minWidth = system === 'profiled-sheet' ? MIN_PROFILED_WIDTH_M : MIN_SANDWICH_WIDTH_M;
  if (widthM < minWidth) return null;

  const holeBounds = holeBoundsFrom(holes);
  const shapes: THREE.Shape[] = [];
  const addStrip = (x0: number, x1: number) => {
    const yTop = Math.min(gableRooflineY(x0, widthM, eaveM, ridgeM), gableRooflineY(x1, widthM, eaveM, ridgeM));
    const yBottom = stripBottomY(x0, x1, holeBounds);
    if (yTop <= yBottom) return; // entirely consumed by a gate hole or past the roofline
    const shape = new THREE.Shape();
    shape.moveTo(x0, yBottom);
    shape.lineTo(x1, yBottom);
    shape.lineTo(x1, yTop);
    shape.lineTo(x0, yTop);
    shape.closePath();
    shapes.push(shape);
  };

  let depthM: number;
  if (system === 'profiled-sheet') {
    depthM = PROFILED_RIB_HEIGHT_M;
    const periods = Math.max(1, Math.round(widthM / PROFILED_RIB_PITCH_M));
    const pitch = widthM / periods;
    const crestW = pitch * PROFILED_CREST_FRACTION;
    for (let i = 0, x = 0; i < periods; i += 1, x += pitch) addStrip(x, x + crestW);
  } else {
    depthM = GABLE_SANDWICH_CAP_HEIGHT_M;
    const modules = Math.max(1, Math.round(widthM / SANDWICH_MODULE_WIDTH_M));
    const moduleWidth = widthM / modules;
    const capHalf = GABLE_SANDWICH_CAP_WIDTH_M / 2;
    for (let i = 1; i < modules; i += 1) {
      const seamCentre = i * moduleWidth;
      addStrip(seamCentre - capHalf, seamCentre + capHalf);
    }
  }

  if (shapes.length === 0) return null;
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth: depthM, bevelEnabled: false, curveSegments: 1 });
  return { geometry, depthM };
}

// ── Phase 3D.1 — ridge cap ───────────────────────────────────────────────────
//
// Chosen as the single highest-payoff finishing piece among the brief's three candidates (ridge
// cap / eave trim / corner flashing) after live comparison, not by default: the ridge is the one
// edge that sits on the building's own top silhouette from every camera angle this configurator
// uses, and before this it was a bare mitred seam — the two roof slopes' own panel geometry simply
// meeting edge-to-edge with no response to it at all, the most visibly "two planes glued together"
// spot on the whole model. The eave edge already reads as a real edge (the roof panel's own
// thickness gives it a lit face), and the wall corners already read cleanly at this render scale
// (see the Phase 3D.1 report's visual-comparison section) — adding trim there too was judged not
// worth the extra geometry for the visible gain, so this file adds ONLY the ridge cap.
//
// Real ridge caps are a folded sheet-metal cap straddling the ridge, overlapping a short distance
// down each roof plane. Modelled here as the simplest solid that shape implies: a triangle (one
// point resting on each roof plane a short distance down from the ridge, one apex above it),
// extruded the building's own length — same "one shape, one extrude, one draw call" discipline as
// every other envelope piece in this file.
const RIDGE_CAP_SKIRT_M = 0.22; // how far down each roof plane the cap overlaps, along the slope
const RIDGE_CAP_RISE_M = 0.05; // how far above the ridge line the cap's own crown sits
const RIDGE_CAP_LIFT_M = 0.003; // tiny stand-off along each slope's own normal, at the two points
// that actually touch the roof surface, so those two edges don't sit exactly coplanar with the
// panel beneath them (the same z-fighting concern `buildGableCladdingOverlay` avoids at its own
// strip edges — see its "Depth convention" note above).

/**
 * The ridge cap's own geometry, built directly in the building's real (X = width, Y = height)
 * coordinates rather than a per-panel local frame: unlike a wall/roof bay panel, this piece is
 * never re-oriented by a placement basis matrix (see `RidgeCap`'s call site in ThreeHangarView.tsx)
 * — the ridge already runs along the building's own +Z, exactly the direction `ExtrudeGeometry`
 * sweeps a shape by default, so authoring the cross-section in real world (X, Y) and extruding
 * `lengthM` along Z needs no rotation at all, unlike `extrudeCrossSection` above.
 *
 * The cap's cross-section is deliberately just a triangle (skirt point, apex, skirt point — no
 * fourth vertex closing it back through the ridge point itself): the straight edge `closePath`
 * draws from the right skirt point back to the left one is a CHORD across the two roof planes'
 * own "tent" shape, and a chord across a tent always lies at-or-below the tent's own two slopes
 * between the same two points (basic concavity — a peak's chord never rises above the peak's own
 * sides). That guarantees the cap's underside never floats clear of the roof surface anywhere along
 * its width, without needing a fourth point or any explicit gap-closing logic.
 */
function buildRidgeCapGeometry(widthM: number, lengthM: number, ridgeM: number, pitchDeg: number): THREE.BufferGeometry {
  const midX = widthM / 2;
  const pitchRad = pitchDeg * (Math.PI / 180);
  const cos = Math.cos(pitchRad);
  const sin = Math.sin(pitchRad);

  // Unit "down-slope" direction from the ridge, along each roof plane's own surface.
  const downL: [number, number] = [-cos, -sin];
  const downR: [number, number] = [cos, -sin];
  // Each plane's own outward (up-off-the-surface) unit normal, for the tiny stand-off lift.
  const normalL: [number, number] = [-sin, cos];
  const normalR: [number, number] = [sin, cos];

  const pL: [number, number] = [
    midX + downL[0] * RIDGE_CAP_SKIRT_M + normalL[0] * RIDGE_CAP_LIFT_M,
    ridgeM + downL[1] * RIDGE_CAP_SKIRT_M + normalL[1] * RIDGE_CAP_LIFT_M,
  ];
  const pR: [number, number] = [
    midX + downR[0] * RIDGE_CAP_SKIRT_M + normalR[0] * RIDGE_CAP_LIFT_M,
    ridgeM + downR[1] * RIDGE_CAP_SKIRT_M + normalR[1] * RIDGE_CAP_LIFT_M,
  ];
  const apex: [number, number] = [midX, ridgeM + RIDGE_CAP_RISE_M];

  // Winding matters here and nowhere else in this file: every other shape in this file is swept
  // through `extrudeCrossSection`'s own `rotateX(-Math.PI / 2)`, which this one deliberately skips
  // (see this function's own doc comment — the ridge already runs along world +Z, so no rotation
  // is needed). That rotation was quietly fixing the winding along with the axes everywhere else;
  // without it, this shape's two visible sloped side faces need the RIGHT winding directly. Three.js
  // treats a shape's contour as counter-clockwise = front-facing; pL → apex → pR (skirt, up, skirt,
  // the "natural" reading order) is wound CLOCKWISE here because Y decreases from apex to each
  // skirt point, which puts the visible faces' normals INWARD — confirmed live (a double-sided
  // debug material showed the cap in full; the real single-sided roof material showed nothing,
  // silently backface-culled). Visiting the skirts before the apex fixes it without changing the
  // triangle's shape at all.
  const shape = new THREE.Shape();
  shape.moveTo(pL[0], pL[1]);
  shape.lineTo(pR[0], pR[1]);
  shape.lineTo(apex[0], apex[1]);
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, { depth: lengthM, bevelEnabled: false, curveSegments: 1 });
}

export { buildRidgeCapGeometry };
