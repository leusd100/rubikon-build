import { describe, expect, it } from 'vitest';
import {
  buildTechnicalScene,
  frameBayCount,
  type ScenePrimitive,
} from '../../../app/lib/configurator/technicalSceneModel';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { buildParametricModel } from '../../../app/lib/configurator/parametricModel';
import {
  DEFAULT_CONFIGURATOR_STATE,
  DIMENSION_BOUNDS,
  type ConfiguratorState,
  type RoofStructure,
  type StructuralScheme,
} from '../../../app/lib/configurator/types';

function sceneFor(overrides: Partial<ConfiguratorState> = {}) {
  return buildTechnicalScene(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides }));
}

/** Phase 3E.1: same rationale as parametricModel.test.ts's own `modelForStructural` — structural
 *  scheme/roof structure are derived from width now, not stored state, so a test that needs a
 *  SPECIFIC combination (including portalRafter + centerSupport, which the width-only derivation
 *  itself never produces) overrides `structural` directly on the domain model instead. */
function sceneForStructural(structural: { scheme: StructuralScheme; roofStructure: RoofStructure }, overrides: Partial<ConfiguratorState> = {}) {
  const domain = deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides });
  return buildTechnicalScene({ ...domain, structural });
}

function buildingForStructural(structural: { scheme: StructuralScheme; roofStructure: RoofStructure }, overrides: Partial<ConfiguratorState> = {}) {
  const domain = deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides });
  return buildParametricModel({ ...domain, structural });
}

function kinds<K extends ScenePrimitive['kind']>(scene: ReturnType<typeof sceneFor>, kind: K) {
  return scene.primitives.filter((p): p is Extract<ScenePrimitive, { kind: K }> => p.kind === kind);
}

describe('frameBayCount', () => {
  it('clamps to the minimum for a small span', () => {
    expect(frameBayCount(DIMENSION_BOUNDS.width.min)).toBe(2);
  });

  it('clamps to the maximum for a very large span', () => {
    expect(frameBayCount(DIMENSION_BOUNDS.length.max)).toBe(10);
  });

  it('targets roughly one bay per 6 metres in between', () => {
    expect(frameBayCount(36)).toBe(6);
  });
});

describe('buildTechnicalScene', () => {
  it('contains no pixel/SVG-specific fields — geometry is metres, delegated to the parametric model', () => {
    const scene = sceneFor();
    const json = JSON.stringify(scene);

    expect(json).not.toMatch(/px|viewBox|stroke/i);
    expect(scene.building.heights.ridgeM).toBeGreaterThan(scene.building.heights.eaveM);
  });

  it('derives no geometry of its own — every primitive point comes from the parametric model', () => {
    const scene = sceneFor();
    const gable = kinds(scene, 'gable-end').find((g) => g.face === 'front')!;
    const modelGable = scene.building.envelope.gableEnds.find((g) => g.face === 'front')!;

    expect(gable.outline).toEqual(modelGable.outline);
  });

  it('always emits exactly one foundation-slab, visible following scope.foundation, never omitted', () => {
    const withF = kinds(sceneFor({ scope: ['foundation'] }), 'foundation-slab');
    const withoutF = kinds(sceneFor({ scope: ['frame'] }), 'foundation-slab');

    expect(withF).toHaveLength(1);
    expect(withF[0].visible).toBe(true);
    expect(withoutF).toHaveLength(1);
    expect(withoutF[0].visible).toBe(false);
    expect(withoutF[0].corners).toEqual(withF[0].corners);
  });

  it('always emits a terrain-plane, independent of scope', () => {
    expect(kinds(sceneFor({ scope: [] }), 'terrain-plane')).toHaveLength(1);
  });

  it('never omits frame members when frame is out of scope — `visible` goes false so a fade-out has geometry to animate', () => {
    const on = sceneFor({ scope: ['frame'] });
    const off = sceneFor({ scope: [] });

    for (const kind of ['frame-column', 'frame-rafter', 'frame-purlin'] as const) {
      expect(kinds(off, kind).length).toBe(kinds(on, kind).length);
      expect(kinds(off, kind).length).toBeGreaterThan(0);
      expect(kinds(off, kind).every((p) => p.visible === false)).toBe(true);
      expect(kinds(on, kind).every((p) => p.visible === true)).toBe(true);
    }
  });

  it('emits two columns and two rafters per portal frame — a gable frame, not a flat truss', () => {
    const scene = sceneFor();
    const frames = scene.building.frames.length;

    expect(kinds(scene, 'frame-column')).toHaveLength(frames * 2);
    expect(kinds(scene, 'frame-rafter')).toHaveLength(frames * 2);
    expect(kinds(scene, 'frame-rafter').filter((r) => r.slope === 'left')).toHaveLength(frames);
  });

  it('emits both gable ends as pentagons and both side walls segmented by bay', () => {
    const scene = sceneFor();
    const gables = kinds(scene, 'gable-end');
    const walls = kinds(scene, 'wall-segment');
    const bays = scene.building.bays.count;

    expect(gables.map((g) => g.face).sort()).toEqual(['front', 'rear']);
    expect(gables.every((g) => g.outline.length === 5)).toBe(true);
    expect(walls.filter((w) => w.face === 'left')).toHaveLength(bays);
    expect(walls.filter((w) => w.face === 'right')).toHaveLength(bays);
  });

  it('emits two roof slopes and a ridge line, fill following scope.roof', () => {
    const scene = sceneFor({ scope: ['roof'] });
    const bays = scene.building.bays.count;

    expect(kinds(scene, 'roof-segment').filter((s) => s.slope === 'left')).toHaveLength(bays);
    expect(kinds(scene, 'roof-segment').filter((s) => s.slope === 'right')).toHaveLength(bays);
    expect(kinds(scene, 'roof-segment').every((s) => s.hasFill)).toBe(true);
    expect(kinds(scene, 'ridge-line')).toHaveLength(1);
    expect(kinds(scene, 'ridge-line')[0].visible).toBe(true);
  });

  it('emits exactly `gates` opening-cutout primitives', () => {
    expect(kinds(sceneFor({ gates: 0 }), 'opening-cutout')).toHaveLength(0);
    expect(kinds(sceneFor({ gates: 1 }), 'opening-cutout')).toHaveLength(1);
    expect(kinds(sceneFor({ gates: 2 }), 'opening-cutout')).toHaveLength(2);
  });

  it('emits four dimension guides, with the ridge marked derived and the rest user-chosen', () => {
    const guides = kinds(sceneFor(), 'dimension-guide');
    const byAxis = Object.fromEntries(guides.map((g) => [g.axis, g]));

    expect(guides).toHaveLength(4);
    expect(byAxis.width.valueM).toBe(DEFAULT_CONFIGURATOR_STATE.dimensions.width);
    expect(byAxis.length.valueM).toBe(DEFAULT_CONFIGURATOR_STATE.dimensions.length);
    expect(byAxis.eave.valueM).toBe(DEFAULT_CONFIGURATOR_STATE.dimensions.height);
    expect(byAxis.eave.derived).toBe(false);
    // Ridge is computed from width + pitch, and the renderer must be able to label it as such.
    expect(byAxis.ridge.derived).toBe(true);
    expect(byAxis.ridge.valueM).toBeGreaterThan(byAxis.eave.valueM);
  });

  it('is deterministic: the same domain model always produces an identical scene', () => {
    expect(JSON.stringify(sceneFor())).toBe(JSON.stringify(sceneFor()));
  });

  it('produces a valid scene at both DIMENSION_BOUNDS extremes without NaN', () => {
    for (const dims of [
      { width: DIMENSION_BOUNDS.width.min, length: DIMENSION_BOUNDS.length.min, height: DIMENSION_BOUNDS.height.min },
      { width: DIMENSION_BOUNDS.width.max, length: DIMENSION_BOUNDS.length.max, height: DIMENSION_BOUNDS.height.max },
    ]) {
      const scene = buildTechnicalScene(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, dimensions: dims }));
      expect(scene.primitives.length).toBeGreaterThan(0);
      // Phase 3E.1: NaN only, not "null" — `null` is now a legitimate value in the embedded
      // parametric model (InternalColumn.ridgeProp is null in truss mode, see its own doc
      // comment), which the DIMENSION_BOUNDS.width.max case above genuinely reaches (width 50
      // derives centerSupport + truss). This test's actual concern is numeric corruption at
      // extreme dimensions, which NaN alone already covers.
      expect(JSON.stringify(scene)).not.toMatch(/NaN/);
    }
  });

  it('orders primitives in the confirmed build sequence: terrain, foundation, frame, envelope, gates, dimensions', () => {
    const order = sceneFor().primitives.map((p) => p.kind);
    const firstOf = (k: ScenePrimitive['kind']) => order.indexOf(k);

    expect(firstOf('terrain-plane')).toBeLessThan(firstOf('foundation-slab'));
    expect(firstOf('foundation-slab')).toBeLessThan(firstOf('frame-column'));
    expect(firstOf('frame-column')).toBeLessThan(firstOf('frame-rafter'));
    expect(firstOf('frame-rafter')).toBeLessThan(firstOf('wall-segment'));
    expect(firstOf('wall-segment')).toBeLessThan(firstOf('roof-segment'));
    expect(firstOf('roof-segment')).toBeLessThan(firstOf('opening-cutout'));
    expect(firstOf('opening-cutout')).toBeLessThan(firstOf('dimension-guide'));
  });
});

describe('Phase 3E structural primitives — parity with ParametricBuildingModel', () => {
  it('internal-column primitives are absent for clearSpan, present (gate-conflict-adjusted) for centerSupport', () => {
    const clearSpan = sceneForStructural({ scheme: 'clearSpan', roofStructure: 'truss' });
    expect(kinds(clearSpan, 'internal-column')).toHaveLength(0);

    const centerSupport = sceneForStructural({ scheme: 'centerSupport', roofStructure: 'truss' });
    const building = buildingForStructural({ scheme: 'centerSupport', roofStructure: 'truss' });
    expect(kinds(centerSupport, 'internal-column')).toHaveLength(building.internalColumns.length);
    expect(building.internalColumns.length).toBeGreaterThan(0);
  });

  it('internal-column-prop exists per column for portalRafter, is absent for truss', () => {
    const portal = sceneForStructural({ scheme: 'centerSupport', roofStructure: 'portalRafter' });
    const truss = sceneForStructural({ scheme: 'centerSupport', roofStructure: 'truss' });
    expect(kinds(portal, 'internal-column-prop').length).toBe(kinds(portal, 'internal-column').length);
    expect(kinds(truss, 'internal-column-prop')).toHaveLength(0);
  });

  it('internal columns respect scope.frame the same way external columns do', () => {
    const scene = sceneForStructural({ scheme: 'centerSupport', roofStructure: 'truss' }, { scope: ['foundation', 'walls', 'roof'] });
    expect(kinds(scene, 'internal-column').every((p) => !p.visible)).toBe(true);
    expect(kinds(scene, 'frame-column').every((p) => !p.visible)).toBe(true);
  });

  it('truss-chord/truss-web are ALWAYS computed (one chord per frame station) regardless of roofStructure — visibility, not omission, gates them', () => {
    for (const roofStructure of ['portalRafter', 'truss'] as const) {
      const scene = sceneForStructural({ scheme: 'clearSpan', roofStructure });
      const building = buildingForStructural({ scheme: 'clearSpan', roofStructure });
      expect(kinds(scene, 'truss-chord')).toHaveLength(building.frames.length);
      const shouldBeVisible = roofStructure === 'truss';
      expect(kinds(scene, 'truss-chord').every((p) => p.visible === shouldBeVisible)).toBe(true);
      expect(kinds(scene, 'truss-web').every((p) => p.visible === shouldBeVisible)).toBe(true);
    }
  });

  it('truss visibility also respects scope.frame — off scope means invisible even in truss mode', () => {
    const scene = sceneForStructural({ scheme: 'clearSpan', roofStructure: 'truss' }, { scope: ['foundation', 'walls', 'roof'] });
    expect(kinds(scene, 'truss-chord').every((p) => !p.visible)).toBe(true);
    expect(kinds(scene, 'truss-web').every((p) => !p.visible)).toBe(true);
  });

  it('wall-brace primitives are always present (2 per brace, one per diagonal) and respect scope.frame', () => {
    const scene = sceneFor();
    const building = buildParametricModel(deriveDomainModel(DEFAULT_CONFIGURATOR_STATE));
    expect(kinds(scene, 'wall-brace')).toHaveLength(building.bracing.length * 2);
    expect(kinds(scene, 'wall-brace').every((p) => p.visible)).toBe(true);

    const frameOff = sceneFor({ scope: ['foundation', 'walls', 'roof'] });
    expect(kinds(frameOff, 'wall-brace').every((p) => !p.visible)).toBe(true);
    expect(kinds(frameOff, 'wall-brace')).toHaveLength(building.bracing.length * 2); // still present, just invisible
  });
});
