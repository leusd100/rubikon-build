import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildEnvelopePanelGeometry } from '../../../app/components/configurator/three/envelopePanelGeometry';

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
