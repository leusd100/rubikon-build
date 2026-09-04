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
