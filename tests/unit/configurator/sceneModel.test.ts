import { describe, expect, it } from 'vitest';
import { deriveDomainModel, type HangarDomainModel } from '../../../app/lib/configurator/domainModel';
import { buildHangarScene, frameBayCount, type ScenePrimitive } from '../../../app/lib/configurator/sceneModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

function domainFor(overrides: Partial<ConfiguratorState>): HangarDomainModel {
  return deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides });
}

function primitivesOfKind<K extends ScenePrimitive['kind']>(
  scene: ReturnType<typeof buildHangarScene>,
  kind: K,
) {
  return scene.primitives.filter((p): p is Extract<ScenePrimitive, { kind: K }> => p.kind === kind);
}

describe('frameBayCount', () => {
  it('clamps to the minimum for a small span', () => {
    expect(frameBayCount(1)).toBe(2);
  });

  it('clamps to the maximum for a very large span', () => {
    expect(frameBayCount(1000)).toBe(10);
  });

  it('targets roughly one bay per 6 metres in between', () => {
    expect(frameBayCount(24)).toBe(4);
  });
});

describe('buildHangarScene — renderer-neutral, all in metres', () => {
  it('contains no pixel/SVG-specific fields — every numeric field is *M (metres)', () => {
    const scene = buildHangarScene(domainFor({}));
    const json = JSON.stringify(scene);

    expect(json).not.toMatch(/"x":|"y":|points/);
  });

  it('always emits exactly one foundation-slab, visible following scope.foundation, geometry-safe (present but invisible) when out of scope', () => {
    // Present-but-invisible (not omitted) on purpose — its footprint must still participate in
    // scene bounds even when hidden, and a build-up dematerialize transition needs somewhere to
    // fade *from* (see the comment on the ScenePrimitive type). A future renderer that only cares
    // about visible geometry can filter on `.visible` itself; the scene model always describes
    // the full object.
    const withFoundation = buildHangarScene(domainFor({ scope: ['foundation'], dimensions: { width: 20, length: 40, height: 8 } }));
    const withoutFoundation = buildHangarScene(domainFor({ scope: ['frame', 'walls', 'roof'], dimensions: { width: 20, length: 40, height: 8 } }));

    expect(primitivesOfKind(withFoundation, 'foundation-slab')).toEqual([
      { kind: 'foundation-slab', visible: true, widthM: 20, lengthM: 40 },
    ]);
    expect(primitivesOfKind(withoutFoundation, 'foundation-slab')).toEqual([
      { kind: 'foundation-slab', visible: false, widthM: 20, lengthM: 40 },
    ]);
  });

  it('always emits a terrain-plane, independent of scope', () => {
    const withNothing = buildHangarScene(domainFor({ scope: [], dimensions: { width: 20, length: 40, height: 8 } }));
    expect(primitivesOfKind(withNothing, 'terrain-plane')).toEqual([{ kind: 'terrain-plane', widthM: 20, lengthM: 40 }]);
  });

  it('always emits frame-column/frame-truss/frame-purlin primitives, geometry-safe: `visible` follows scope.frame but the members are never omitted', () => {
    const withFrame = buildHangarScene(domainFor({ scope: ['frame'] }));
    const withoutFrame = buildHangarScene(domainFor({ scope: ['foundation', 'walls', 'roof'] }));

    expect(primitivesOfKind(withFrame, 'frame-column').length).toBeGreaterThan(0);
    expect(primitivesOfKind(withFrame, 'frame-column').every((c) => c.visible)).toBe(true);
    expect(primitivesOfKind(withFrame, 'frame-truss').every((t) => t.visible)).toBe(true);
    expect(primitivesOfKind(withFrame, 'frame-purlin').every((p) => p.visible)).toBe(true);

    // Same counts either way — only `visible` changes, never presence, so a dematerialize
    // transition always has real geometry to fade from.
    expect(primitivesOfKind(withoutFrame, 'frame-column')).toHaveLength(primitivesOfKind(withFrame, 'frame-column').length);
    expect(primitivesOfKind(withoutFrame, 'frame-truss')).toHaveLength(primitivesOfKind(withFrame, 'frame-truss').length);
    expect(primitivesOfKind(withoutFrame, 'frame-purlin')).toHaveLength(primitivesOfKind(withFrame, 'frame-purlin').length);
    expect(primitivesOfKind(withoutFrame, 'frame-column').every((c) => !c.visible)).toBe(true);
    expect(primitivesOfKind(withoutFrame, 'frame-truss').every((t) => !t.visible)).toBe(true);
    expect(primitivesOfKind(withoutFrame, 'frame-purlin').every((p) => !p.visible)).toBe(true);
  });

  it('emits exactly 2 frame-purlin primitives (the two stylised height levels), regardless of scope', () => {
    const scene = buildHangarScene(domainFor({ scope: [] }));
    expect(primitivesOfKind(scene, 'frame-purlin')).toHaveLength(2);
  });

  it('emits one truss per side-bay position, matching the side column count', () => {
    const scene = buildHangarScene(domainFor({ scope: ['frame'], dimensions: { width: 24, length: 60, height: 8 } }));
    const sideColumns = primitivesOfKind(scene, 'frame-column').filter((c) => c.face === 'side');
    const trusses = primitivesOfKind(scene, 'frame-truss');
    expect(trusses).toHaveLength(sideColumns.length);
  });

  it('always emits front and side wall-segment primitives, segmented by structural bay, fill following scope.walls', () => {
    const withWalls = buildHangarScene(domainFor({ scope: ['walls'], dimensions: { width: 24, length: 60, height: 8 } }));
    const withoutWalls = buildHangarScene(domainFor({ scope: [], dimensions: { width: 24, length: 60, height: 8 } }));

    const frontSegments = primitivesOfKind(withWalls, 'wall-segment').filter((s) => s.face === 'front');
    expect(frontSegments).toHaveLength(frameBayCount(24));
    expect(frontSegments.every((s) => s.hasFill)).toBe(true);
    expect(primitivesOfKind(withoutWalls, 'wall-segment').every((s) => !s.hasFill)).toBe(true);
  });

  it('always emits roof-segment primitives, segmented along the length, fill following scope.roof', () => {
    const withRoof = buildHangarScene(domainFor({ scope: ['roof'], dimensions: { width: 24, length: 60, height: 8 } }));
    const withoutRoof = buildHangarScene(domainFor({ scope: [], dimensions: { width: 24, length: 60, height: 8 } }));

    const roofSegments = primitivesOfKind(withRoof, 'roof-segment');
    expect(roofSegments).toHaveLength(frameBayCount(60));
    expect(roofSegments.every((s) => s.hasFill)).toBe(true);
    expect(primitivesOfKind(withoutRoof, 'roof-segment').every((s) => !s.hasFill)).toBe(true);
  });

  it('emits exactly `gates` opening-cutout primitives, all within the facade width', () => {
    const scene = buildHangarScene(domainFor({ gates: 2, dimensions: { width: 24, length: 60, height: 8 } }));
    const gates = primitivesOfKind(scene, 'opening-cutout');

    expect(gates).toHaveLength(2);
    for (const gate of gates) {
      expect(gate.positionM).toBeGreaterThanOrEqual(0);
      expect(gate.positionM + gate.widthM).toBeLessThanOrEqual(24);
    }
  });

  it('places gates side by side without overlap', () => {
    const scene = buildHangarScene(domainFor({ gates: 2 }));
    const [a, b] = primitivesOfKind(scene, 'opening-cutout').sort((x, y) => x.positionM - y.positionM);

    expect(a.positionM + a.widthM).toBeLessThanOrEqual(b.positionM);
  });

  it('always emits exactly 3 dimension-guide primitives, one per axis, matching the domain values', () => {
    const scene = buildHangarScene(domainFor({ dimensions: { width: 15, length: 45, height: 9 } }));
    const guides = primitivesOfKind(scene, 'dimension-guide');

    expect(guides).toHaveLength(3);
    expect(guides.find((g) => g.axis === 'width')?.valueM).toBe(15);
    expect(guides.find((g) => g.axis === 'length')?.valueM).toBe(45);
    expect(guides.find((g) => g.axis === 'height')?.valueM).toBe(9);
  });
});
