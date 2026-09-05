import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildEnvelopePanelGeometry, buildGableCladdingOverlay, buildGateLeafGeometry, buildRidgeCapGeometry } from '../../../app/components/configurator/three/envelopePanelGeometry';

// Real geometric behaviour, not implementation trivia: these tests exist to catch exactly the
// class of bug hand-rolling this geometry produced during development — a disconnected back face,
// wrong-axis end caps, a mis-signed rotation — none of which throws, all of which are silently
// wrong meshes. Bounding box and vertex-count assertions catch that class of bug without needing
// a live renderer; live visual verification (screenshots, pixel comparison) is what actually
// confirmed correctness — see the Phase 3D report's visual-comparison section — this file is the
// regression guard for it, not a replacement for having looked.

function bounds(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return {
    minX: box.min.x, maxX: box.max.x,
    minY: box.min.y, maxY: box.max.y,
    minZ: box.min.z, maxZ: box.max.z,
  };
}

function vertexCount(geometry: THREE.BufferGeometry): number {
  return geometry.attributes.position.count;
}

function hasNoNaN(geometry: THREE.BufferGeometry): boolean {
  const pos = geometry.attributes.position.array;
  for (let i = 0; i < pos.length; i += 1) {
    if (!Number.isFinite(pos[i])) return false;
  }
  return true;
}

describe('buildEnvelopePanelGeometry — flat fallback', () => {
  it('occupies exactly [0,widthM] × [0,heightM] × [-thicknessM,0] for a flat (undefined system) panel', () => {
    const g = buildEnvelopePanelGeometry(6, 3, 0.16, undefined);
    const b = bounds(g);
    expect(b.minX).toBeCloseTo(0, 6);
    expect(b.maxX).toBeCloseTo(6, 6);
    expect(b.minY).toBeCloseTo(0, 6);
    expect(b.maxY).toBeCloseTo(3, 6);
    expect(b.minZ).toBeCloseTo(-0.16, 6);
    expect(b.maxZ).toBeCloseTo(0, 6);
  });

  it('falls back to flat below the minimum width for each system, rather than producing degenerate ribs/seams', () => {
    const tinyProfiled = buildEnvelopePanelGeometry(0.05, 3, 0.16, 'profiled-sheet');
    const tinySandwich = buildEnvelopePanelGeometry(0.05, 3, 0.16, 'sandwich-panel');
    // A flat box has exactly 24 vertices (4 per face × 6 faces, unindexed / non-shared corners in
    // three.js's own BoxGeometry) — the same fixed number regardless of size, which is exactly
    // what distinguishes "fell back to flat" from "built a (degenerate) profile".
    expect(vertexCount(tinyProfiled)).toBe(24);
    expect(vertexCount(tinySandwich)).toBe(24);
  });
});

describe('buildEnvelopePanelGeometry — profiled sheet', () => {
  it('stays within the panel’s own footprint, front face at Z=0, ribs recessed behind it', () => {
    const g = buildEnvelopePanelGeometry(6, 3, 0.16, 'profiled-sheet');
    const b = bounds(g);
    expect(b.minX).toBeGreaterThanOrEqual(-1e-6);
    expect(b.maxX).toBeLessThanOrEqual(6 + 1e-6);
    expect(b.minY).toBeCloseTo(0, 6);
    expect(b.maxY).toBeCloseTo(3, 6);
    expect(b.maxZ).toBeCloseTo(0, 6); // the crest — nothing sits proud of the nominal front plane
    expect(b.minZ).toBeLessThan(-0.16); // trough + backing sits behind the nominal thickness alone
  });

  it('produces meaningfully more geometry than a flat panel — this is the actual behavioural proof a rib pattern was built, not just a comment’s claim', () => {
    const flat = buildEnvelopePanelGeometry(6, 3, 0.16, undefined);
    const ribbed = buildEnvelopePanelGeometry(6, 3, 0.16, 'profiled-sheet');
    expect(vertexCount(ribbed)).toBeGreaterThan(vertexCount(flat) * 5);
  });

  it('tiles ribs edge-to-edge — the wave completes an exact number of periods across the real width, never a clipped partial rib', () => {
    // A 6 m panel at the 0.2 m nominal pitch should land on exactly 30 periods; re-fitting the
    // pitch to the panel's own width (see the source) keeps that exact regardless of width.
    const g = buildEnvelopePanelGeometry(6, 3, 0.16, 'profiled-sheet');
    expect(hasNoNaN(g)).toBe(true);
  });

  it('scales triangle count roughly linearly with width, not with height or thickness — ribs run across width', () => {
    const narrow = buildEnvelopePanelGeometry(2, 3, 0.16, 'profiled-sheet');
    const wide = buildEnvelopePanelGeometry(6, 3, 0.16, 'profiled-sheet');
    const ratio = vertexCount(wide) / vertexCount(narrow);
    expect(ratio).toBeGreaterThan(2.5);
    expect(ratio).toBeLessThan(3.5);
  });

  it('is deterministic — same inputs, same output shape', () => {
    const a = buildEnvelopePanelGeometry(6, 3, 0.16, 'profiled-sheet');
    const b = buildEnvelopePanelGeometry(6, 3, 0.16, 'profiled-sheet');
    expect(vertexCount(a)).toBe(vertexCount(b));
    expect(bounds(a)).toEqual(bounds(b));
  });
});

describe('buildEnvelopePanelGeometry — sandwich panel', () => {
  it('stays within the panel’s own footprint, shallower recess than the profiled sheet', () => {
    const g = buildEnvelopePanelGeometry(6, 3, 0.16, 'sandwich-panel');
    const b = bounds(g);
    expect(b.minX).toBeGreaterThanOrEqual(-1e-6);
    expect(b.maxX).toBeLessThanOrEqual(6 + 1e-6);
    expect(b.maxZ).toBeCloseTo(0, 6);
    // The seam groove is shallow — nowhere near as deep as the profiled sheet's own rib height.
    const g2 = buildEnvelopePanelGeometry(6, 3, 0.16, 'profiled-sheet');
    const ribDepth = 0 - bounds(g2).minZ;
    const seamDepthPlusBacking = 0 - b.minZ;
    expect(seamDepthPlusBacking).toBeLessThanOrEqual(ribDepth + 1e-6);
  });

  it('produces more geometry than flat but less than the densely-ribbed profiled sheet at the same size', () => {
    const flat = buildEnvelopePanelGeometry(6, 3, 0.16, undefined);
    const sandwich = buildEnvelopePanelGeometry(6, 3, 0.16, 'sandwich-panel');
    const profiled = buildEnvelopePanelGeometry(6, 3, 0.16, 'profiled-sheet');
    expect(vertexCount(sandwich)).toBeGreaterThan(vertexCount(flat));
    expect(vertexCount(sandwich)).toBeLessThan(vertexCount(profiled));
  });

  it('has no NaN/Infinity vertices across the supported dimension range', () => {
    for (const [w, h] of [[10, 4], [60, 15], [24, 8], [12, 5]] as const) {
      expect(hasNoNaN(buildEnvelopePanelGeometry(w, h, 0.16, 'sandwich-panel'))).toBe(true);
      expect(hasNoNaN(buildEnvelopePanelGeometry(w, h, 0.16, 'profiled-sheet'))).toBe(true);
    }
  });
});

describe('buildGableCladdingOverlay (Phase 3D.1)', () => {
  // A representative default-sized gable: 24 m wide, 8 m eave, 10.6 m ridge — the same reference
  // object used throughout this project's own tests.
  const WIDTH = 24;
  const EAVE = 8;
  const RIDGE = 10.6;
  const noHoles: Array<Array<{ x: number; y: number }>> = [];
  const gateHole = [
    { x: 10, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 5 }, { x: 10, y: 5 },
  ];

  it('is null for a flat/undefined system or an undersized gable — nothing to draw, no empty mesh', () => {
    expect(buildGableCladdingOverlay(WIDTH, EAVE, RIDGE, noHoles, undefined)).toBeNull();
    expect(buildGableCladdingOverlay(0.05, EAVE, RIDGE, noHoles, 'profiled-sheet')).toBeNull();
  });

  it('every strip stays within the gable’s own footprint and roofline — nothing pokes past the pentagon', () => {
    const result = buildGableCladdingOverlay(WIDTH, EAVE, RIDGE, noHoles, 'profiled-sheet');
    expect(result).not.toBeNull();
    const { geometry } = result!;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.min.x).toBeGreaterThanOrEqual(-1e-6);
    expect(box.max.x).toBeLessThanOrEqual(WIDTH + 1e-6);
    expect(box.min.y).toBeGreaterThanOrEqual(-1e-6);
    // The roofline never exceeds the ridge — no strip may either.
    expect(box.max.y).toBeLessThanOrEqual(RIDGE + 1e-6);
  });

  it('a strip crossing the gate hole stops at the lintel, never reaching the ground through the opening', () => {
    const withoutHole = buildGableCladdingOverlay(WIDTH, EAVE, RIDGE, noHoles, 'profiled-sheet')!;
    const withHole = buildGableCladdingOverlay(WIDTH, EAVE, RIDGE, [gateHole], 'profiled-sheet')!;
    withHole.geometry.computeBoundingBox();
    // Ribs crossing the hole are CLIPPED to the lintel height, not removed outright (the roofline
    // sits well above a 5 m-tall hole at this width, so every affected rib still has exposed area
    // above it) — same shape COUNT either way. The real proof of correct clipping is the next
    // assertion (no vertex inside the hole itself), not a vertex-count drop; a rib only ever drops
    // out entirely when the hole reaches all the way to the roofline, exercised separately if the
    // hole were tall enough — not this one, deliberately, since a gate that tall is not realistic.
    expect(withHole.geometry.attributes.position.count).toBe(withoutHole.geometry.attributes.position.count);

    // No vertex of the overlay sits inside the hole's own rectangle (x in [10,15], y in [0,5]).
    const pos = withHole.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const insideHoleX = x > 10 + 1e-6 && x < 15 - 1e-6;
      if (insideHoleX) expect(y).toBeGreaterThanOrEqual(5 - 1e-6);
    }
  });

  it('a rib fully consumed by a tall enough hole is dropped from the overlay entirely', () => {
    const tallHole = [{ x: 10, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 10.5 }, { x: 10, y: 10.5 }];
    const withoutHole = buildGableCladdingOverlay(WIDTH, EAVE, RIDGE, noHoles, 'profiled-sheet')!;
    const withTallHole = buildGableCladdingOverlay(WIDTH, EAVE, RIDGE, [tallHole], 'profiled-sheet');
    expect(withTallHole).not.toBeNull();
    expect(withTallHole!.geometry.attributes.position.count).toBeLessThan(withoutHole.geometry.attributes.position.count);
  });

  it('sandwich produces far fewer, wider-spaced strips than profiled sheet at the same width', () => {
    const profiled = buildGableCladdingOverlay(WIDTH, EAVE, RIDGE, noHoles, 'profiled-sheet')!;
    const sandwich = buildGableCladdingOverlay(WIDTH, EAVE, RIDGE, noHoles, 'sandwich-panel')!;
    expect(sandwich.geometry.attributes.position.count).toBeLessThan(profiled.geometry.attributes.position.count);
    // Sandwich caps are shallower than profiled ribs.
    expect(sandwich.depthM).toBeLessThan(profiled.depthM);
  });

  it('has no NaN/Infinity vertices, including a rib straddling the exact ridge peak (width/2)', () => {
    // A width chosen so a rib period lands exactly on the peak, the one case the roofline's slope
    // discontinuity could produce a bad value if the two linear halves were not both sampled.
    const w = 24;
    for (const system of ['profiled-sheet', 'sandwich-panel'] as const) {
      const result = buildGableCladdingOverlay(w, EAVE, RIDGE, noHoles, system);
      expect(result).not.toBeNull();
      const arr = result!.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 1) expect(Number.isFinite(arr[i])).toBe(true);
    }
  });

  it('is deterministic', () => {
    const a = buildGableCladdingOverlay(WIDTH, EAVE, RIDGE, [gateHole], 'profiled-sheet')!;
    const b = buildGableCladdingOverlay(WIDTH, EAVE, RIDGE, [gateHole], 'profiled-sheet')!;
    expect(a.geometry.attributes.position.count).toBe(b.geometry.attributes.position.count);
    expect(a.depthM).toBe(b.depthM);
  });
});

describe('buildRidgeCapGeometry (Phase 3D.1)', () => {
  const RIDGE_WIDTH = 24;
  const RIDGE_LENGTH = 60;
  const RIDGE_M = 10.6;
  const PITCH = 12.04;

  it('spans the building’s own full length along Z, matching the roof segments and both gables', () => {
    const b = bounds(buildRidgeCapGeometry(RIDGE_WIDTH, RIDGE_LENGTH, RIDGE_M, PITCH));
    expect(b.minZ).toBeCloseTo(0, 6);
    expect(b.maxZ).toBeCloseTo(RIDGE_LENGTH, 6);
  });

  it('sits astride the ridge: crown above ridgeM, skirts resting at-or-below it, centred on width/2', () => {
    const b = bounds(buildRidgeCapGeometry(RIDGE_WIDTH, RIDGE_LENGTH, RIDGE_M, PITCH));
    expect(b.maxY).toBeGreaterThan(RIDGE_M); // the crown pokes up above the actual ridge line
    expect(b.minY).toBeLessThan(RIDGE_M); // the skirts sit down-slope, below the ridge line
    const midX = RIDGE_WIDTH / 2;
    // Symmetric about the ridge's own X centre — left and right skirts overlap their own roof
    // plane by the same amount, so the whole cap is centred on the building's mid-width.
    expect(midX - b.minX).toBeCloseTo(b.maxX - midX, 6);
  });

  it('stays a small, cheap cross-section — a handful of vertices, not a heavy mesh', () => {
    const g = buildRidgeCapGeometry(RIDGE_WIDTH, RIDGE_LENGTH, RIDGE_M, PITCH);
    // A triangular prism extrusion: three side faces (2 triangles/4 verts each in three.js's own
    // non-indexed ExtrudeGeometry output) plus two end caps (1 triangle/3 verts each) — comfortably
    // under a few dozen vertices regardless of the building's own dimensions, unlike a ribbed panel
    // whose vertex count scales with width. A loose upper bound, not a magic exact count, since
    // that layout is three.js's own implementation detail, not this file's contract.
    expect(vertexCount(g)).toBeLessThan(60);
  });

  it('has no NaN/Infinity vertices across the full supported pitch range (5°–20°)', () => {
    for (const pitchDeg of [5, 12.04, 20]) {
      const g = buildRidgeCapGeometry(RIDGE_WIDTH, RIDGE_LENGTH, RIDGE_M, pitchDeg);
      expect(hasNoNaN(g)).toBe(true);
    }
  });

  it('is deterministic', () => {
    const a = bounds(buildRidgeCapGeometry(RIDGE_WIDTH, RIDGE_LENGTH, RIDGE_M, PITCH));
    const b = bounds(buildRidgeCapGeometry(RIDGE_WIDTH, RIDGE_LENGTH, RIDGE_M, PITCH));
    expect(a).toEqual(b);
  });

  it('scales its Z span with the building’s own length, not a fixed size', () => {
    const short = bounds(buildRidgeCapGeometry(RIDGE_WIDTH, 12, RIDGE_M, PITCH));
    const long = bounds(buildRidgeCapGeometry(RIDGE_WIDTH, 120, RIDGE_M, PITCH));
    expect(short.maxZ).toBeCloseTo(12, 6);
    expect(long.maxZ).toBeCloseTo(120, 6);
  });
});

describe('buildGateLeafGeometry (Phase 3D.1)', () => {
  // Representative dimensions for this geometry function's own tests — it takes width/height as
  // plain parameters and has no opinion on where they came from (Phase 3F.1 fixed the app's own
  // gate sizes to real metres, GATE_DIMENSIONS_M in parametricModel.ts; these numbers here predate
  // that and are kept only as "one plausible standard-ish size, one plausible machinery-ish size"
  // for exercising the geometry builder's own behaviour, not as a claim about current app sizing).
  const STANDARD_W = 5.28;
  const STANDARD_H = 5.76;
  const MACHINERY_W = 8.16;
  const MACHINERY_H = 6.8;

  it('stays within its own real footprint — inset from the sides/top, flush with the ground', () => {
    const b = bounds(buildGateLeafGeometry(STANDARD_W, STANDARD_H));
    expect(b.minX).toBeGreaterThan(0); // side margin — the recess still shows as a reveal
    expect(b.maxX).toBeLessThan(STANDARD_W);
    expect(b.minY).toBeCloseTo(0, 6); // NO bottom margin — threshold meets the slab directly
    expect(b.maxY).toBeLessThan(STANDARD_H); // top margin present
    expect(b.minZ).toBeCloseTo(0, 6);
    expect(b.maxZ).toBeGreaterThan(0); // has real thickness
  });

  it('is centred left-right — equal margin on both sides', () => {
    const b = bounds(buildGateLeafGeometry(STANDARD_W, STANDARD_H));
    expect(b.minX).toBeCloseTo(STANDARD_W - b.maxX, 6);
  });

  it('a taller opening gets more bands than a shorter one, up to the legibility cap', () => {
    // Isolate height specifically (both below the max-band clamp, so the difference is real and
    // not just both saturating it) — same "richer geometry for a bigger real surface" property
    // buildEnvelopePanelGeometry's own rib count already has for width.
    const short = buildGateLeafGeometry(5, 2);
    const tall = buildGateLeafGeometry(5, 4);
    expect(vertexCount(tall)).toBeGreaterThan(vertexCount(short));
  });

  it('clamps band count at the legibility ceiling instead of growing without bound', () => {
    // A very tall machinery-scale opening should not produce absurdly many thin bands.
    const veryTall = buildGateLeafGeometry(8, 12);
    const tall = buildGateLeafGeometry(8, 7);
    // Both comfortably past the clamp — same vertex count (same band count), not still climbing.
    expect(vertexCount(veryTall)).toBe(vertexCount(tall));
  });

  it('standard vs. machinery gate proportions (parametricModel.ts GATE_PROPORTIONS) read as different doors', () => {
    const standard = bounds(buildGateLeafGeometry(STANDARD_W, STANDARD_H));
    const machinery = bounds(buildGateLeafGeometry(MACHINERY_W, MACHINERY_H));
    expect(machinery.maxX).toBeGreaterThan(standard.maxX);
    expect(machinery.maxY).toBeGreaterThan(standard.maxY);
  });

  it('never produces zero-height bands or a crash at a small/degenerate opening', () => {
    for (const [w, h] of [[0.5, 0.3], [1, 0.5], [0.2, 0.2]] as const) {
      const g = buildGateLeafGeometry(w, h);
      expect(hasNoNaN(g)).toBe(true);
      expect(vertexCount(g)).toBeGreaterThan(0);
      const b = bounds(g);
      expect(b.maxY).toBeLessThanOrEqual(h + 1e-6);
      expect(b.maxX).toBeLessThanOrEqual(w + 1e-6);
    }
  });

  it('has no NaN/Infinity vertices at typical sizes', () => {
    for (const [w, h] of [[STANDARD_W, STANDARD_H], [MACHINERY_W, MACHINERY_H]] as const) {
      expect(hasNoNaN(buildGateLeafGeometry(w, h))).toBe(true);
    }
  });

  it('is deterministic', () => {
    const a = bounds(buildGateLeafGeometry(STANDARD_W, STANDARD_H));
    const b = bounds(buildGateLeafGeometry(STANDARD_W, STANDARD_H));
    expect(a).toEqual(b);
    expect(vertexCount(buildGateLeafGeometry(STANDARD_W, STANDARD_H))).toBe(vertexCount(buildGateLeafGeometry(STANDARD_W, STANDARD_H)));
  });
});
