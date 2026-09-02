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

  it('always emits exactly one foundation-slab, visible following scope.foundation', () => {
    // Present-but-invisible (not omitted) on purpose, matching envelope-panel/roof-plane below —
    // its footprint must still participate in scene bounds even when hidden (see the comment on
    // the ScenePrimitive type). A future renderer that only cares about visible geometry can
    // filter on `.visible` itself; the scene model always describes the full object.
    const withFoundation = buildHangarScene(domainFor({ scope: ['foundation'], dimensions: { width: 20, length: 40, height: 8 } }));
    const withoutFoundation = buildHangarScene(domainFor({ scope: ['frame', 'walls', 'roof'], dimensions: { width: 20, length: 40, height: 8 } }));

    expect(primitivesOfKind(withFoundation, 'foundation-slab')).toEqual([
      { kind: 'foundation-slab', visible: true, widthM: 20, lengthM: 40 },
    ]);
    expect(primitivesOfKind(withoutFoundation, 'foundation-slab')).toEqual([
      { kind: 'foundation-slab', visible: false, widthM: 20, lengthM: 40 },
    ]);
  });

  it('emits zero frame-column and frame-truss primitives when frame is not in scope', () => {
    const scene = buildHangarScene(domainFor({ scope: ['foundation', 'walls', 'roof'] }));
    expect(primitivesOfKind(scene, 'frame-column')).toHaveLength(0);
    expect(primitivesOfKind(scene, 'frame-truss')).toHaveLength(0);
  });

  it('emits one truss per side-bay position, matching the side column count', () => {
    const scene = buildHangarScene(domainFor({ scope: ['frame'], dimensions: { width: 24, length: 60, height: 8 } }));
    const sideColumns = primitivesOfKind(scene, 'frame-column').filter((c) => c.face === 'side');
    const trusses = primitivesOfKind(scene, 'frame-truss');
    expect(trusses).toHaveLength(sideColumns.length);
  });

  it('always emits front and side envelope-panel primitives, fill following scope.walls', () => {
    const withWalls = buildHangarScene(domainFor({ scope: ['walls'] }));
    const withoutWalls = buildHangarScene(domainFor({ scope: [] }));

    expect(primitivesOfKind(withWalls, 'envelope-panel').every((p) => p.hasFill)).toBe(true);
    expect(primitivesOfKind(withoutWalls, 'envelope-panel').every((p) => !p.hasFill)).toBe(true);
  });

  it('always emits exactly one roof-plane, fill following scope.roof', () => {
    const withRoof = buildHangarScene(domainFor({ scope: ['roof'] }));
    const withoutRoof = buildHangarScene(domainFor({ scope: [] }));

    expect(primitivesOfKind(withRoof, 'roof-plane')).toHaveLength(1);
    expect(primitivesOfKind(withRoof, 'roof-plane')[0].hasFill).toBe(true);
    expect(primitivesOfKind(withoutRoof, 'roof-plane')[0].hasFill).toBe(false);
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
