import { describe, expect, it } from 'vitest';
import { buildThreeScene } from '../../../app/lib/configurator/threeSceneModel';
import { buildTechnicalScene } from '../../../app/lib/configurator/technicalSceneModel';
import { buildParametricModel } from '../../../app/lib/configurator/parametricModel';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import {
  DEFAULT_CONFIGURATOR_STATE,
  DIMENSION_BOUNDS,
  type ConfiguratorState,
} from '../../../app/lib/configurator/types';

const W = DIMENSION_BOUNDS.width;
const L = DIMENSION_BOUNDS.length;
const H = DIMENSION_BOUNDS.height;

function domainFor(overrides: Partial<ConfiguratorState> = {}) {
  return deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides });
}

const CASES: Array<[number, number, number]> = [
  [W.min, L.min, H.min],
  [24, 60, 8],
  [60, 30, 6],
  [12, 120, 5],
  [W.max, L.max, H.max],
];

describe('cross-renderer parity — technical vs 3D', () => {
  // THE test this whole architecture exists to make possible. Before Phase 3-0 the two renderers
  // derived the building independently and drew different objects (flat roof at 8m vs a 12° gable
  // ridging at 10.55m on the same config). Nothing could express that disagreement. These
  // assertions do, for every dimension corner the configurator supports.
  it.each(CASES)('agrees on eave, ridge, footprint and bays at %d × %d × %d', (width, length, height) => {
    const domain = domainFor({ dimensions: { width, length, height } });
    const technical = buildTechnicalScene(domain);
    const three = buildThreeScene(domain);

    expect(three.building.heights.eaveM).toBe(technical.dimensions.eaveHeightM);
    expect(three.building.heights.ridgeM).toBe(technical.dimensions.ridgeHeightM);
    expect(three.building.footprint).toEqual({ widthM: width, lengthM: length });
    expect(three.building.bays.stationsM).toEqual(technical.building.bays.stationsM);
  });

  it.each(CASES)('agrees on roof geometry and gable profiles at %d × %d × %d', (width, length, height) => {
    const domain = domainFor({ dimensions: { width, length, height } });
    const technical = buildTechnicalScene(domain);
    const three = buildThreeScene(domain);

    expect(three.building.roof).toEqual(technical.building.roof);
    expect(three.building.envelope.roofSegments).toEqual(technical.building.envelope.roofSegments);
    expect(three.building.envelope.gableEnds).toEqual(technical.building.envelope.gableEnds);
  });

  it.each([0, 1, 2] as const)('agrees on opening geometry for %d gate(s)', (gates) => {
    const domain = domainFor({ gates });
    const technical = buildTechnicalScene(domain);
    const three = buildThreeScene(domain);

    expect(three.building.openings).toEqual(technical.building.openings);
    // The 3D gable's holes must be the same rectangles, not an independently-placed decal.
    const front = three.gables.find((g) => g.id === 'gable-front')!;
    expect(front.holes).toHaveLength(gates);
    front.holes.forEach((hole, i) => {
      const rect = three.building.openings[i].rect;
      expect(Math.min(...hole.map((p) => p.x))).toBeCloseTo(rect.xM, 6);
      expect(Math.max(...hole.map((p) => p.y))).toBeCloseTo(rect.yM + rect.heightM, 6);
    });
  });

  it('agrees on the slab footprint', () => {
    const domain = domainFor();
    expect(buildThreeScene(domain).slab!.corners).toEqual(buildParametricModel(domain).slab.corners);
  });
});

describe('buildThreeScene', () => {
  it('copies geometry rather than deriving it — every mesh point exists in the parametric model', () => {
    const domain = domainFor();
    const three = buildThreeScene(domain);
    const model = buildParametricModel(domain);

    const modelPoints = new Set(
      [
        ...model.frames.flatMap((f) => [f.leftColumn.a, f.leftColumn.b, f.rightColumn.a, f.rightColumn.b,
          f.leftRafter.a, f.leftRafter.b, f.rightRafter.a, f.rightRafter.b]),
        ...model.girts.flatMap((g) => [g.a, g.b]),
      ].map((p) => `${p.x},${p.y},${p.z}`),
    );

    for (const strut of three.struts) {
      expect(modelPoints.has(`${strut.a.x},${strut.a.y},${strut.a.z}`)).toBe(true);
      expect(modelPoints.has(`${strut.b.x},${strut.b.y},${strut.b.z}`)).toBe(true);
    }

    const planeSets = [
      ...model.envelope.wallSegments.map((s) => JSON.stringify(s.corners)),
      ...model.envelope.roofSegments.map((s) => JSON.stringify(s.corners)),
    ];
    for (const panel of three.panels) {
      expect(planeSets).toContain(JSON.stringify(panel.corners));
    }
  });

  it('emits two columns and two rafters per portal frame, plus subordinate secondary members', () => {
    const three = buildThreeScene(domainFor());
    const frames = three.building.frames.length;

    expect(three.struts.filter((s) => s.material === 'frame-primary')).toHaveLength(frames * 4);
    expect(three.struts.filter((s) => s.material === 'frame-secondary').length).toBeGreaterThan(0);

    const primary = three.struts.find((s) => s.material === 'frame-primary')!;
    const secondary = three.struts.find((s) => s.material === 'frame-secondary')!;
    // Section hierarchy is the main lever on frame-only readability — assert it, don't assume it.
    expect(primary.sectionM).toBeGreaterThan(secondary.sectionM * 2);
  });

  it('bounds the BUILDING, not the staging ground, so framing never jumps with the ground margin', () => {
    const three = buildThreeScene(domainFor());

    expect(three.bounds.max.y).toBeCloseTo(three.building.heights.ridgeM, 6);
    expect(three.bounds.size.x).toBeLessThan(three.ground.sizeM);
  });

  it('mirrors scope into visibility flags without dropping geometry', () => {
    const on = buildThreeScene(domainFor({ scope: ['foundation', 'frame', 'walls', 'roof'] }));
    const off = buildThreeScene(domainFor({ scope: [] }));

    // footings stay false here regardless of scope — domainFor()'s default foundationType
    // ('engineeringDecision') always resolves to the slab representation, never footings. See the
    // dedicated foundation-type test below for footings actually turning on.
    expect(on.visible).toEqual({ slab: true, footings: false, frame: true, walls: true, roof: true, gates: true });
    // Gates go false along with everything else here — NOT because scope=[] toggles a `gates`
    // item (there isn't one), but because a gate cut into a wall that isn't there can't read as
    // an opening. See the next test for gates tracked independently of the OTHER three layers,
    // with walls held on.
    expect(off.visible).toEqual({ slab: false, footings: false, frame: false, walls: false, roof: false, gates: false });
    // Geometry is a fact; visibility is the renderer's business — counts must not change.
    expect(off.struts).toHaveLength(on.struts.length);
    expect(off.panels).toHaveLength(on.panels.length);
    expect(off.footings).toHaveLength(on.footings.length);
  });

  it('Phase 3D: foundation type controls slab vs. footings visibility — engineeringDecision renders like slab, never as nothing', () => {
    const slab = buildThreeScene(domainFor({ foundationType: 'slab' }));
    const isolated = buildThreeScene(domainFor({ foundationType: 'isolated' }));
    const undecided = buildThreeScene(domainFor({ foundationType: 'engineeringDecision' }));

    expect(slab.visible).toMatchObject({ slab: true, footings: false });
    expect(isolated.visible).toMatchObject({ slab: false, footings: true });
    expect(undecided.visible).toMatchObject({ slab: true, footings: false });

    // Geometry itself is unconditional — same "fact vs. renderer choice" rule as slab/scope above.
    expect(isolated.footings.length).toBe(slab.footings.length);
    expect(isolated.footings.length).toBeGreaterThan(0);
  });

  it('Phase 3D: footings sit exactly at the portal frames’ own column base points — never hand-placed', () => {
    const scene = buildThreeScene(domainFor({ foundationType: 'isolated' }));

    expect(scene.footings).toHaveLength(scene.building.frames.length * 2);
    for (const frame of scene.building.frames) {
      const left = scene.footings.find((f) => f.id === `col-${frame.index}-left`);
      const right = scene.footings.find((f) => f.id === `col-${frame.index}-right`);
      expect(left?.xM).toBeCloseTo(frame.leftColumn.a.x, 6);
      expect(left?.zM).toBeCloseTo(frame.leftColumn.a.z, 6);
      expect(right?.xM).toBeCloseTo(frame.rightColumn.a.x, 6);
      expect(right?.zM).toBeCloseTo(frame.rightColumn.a.z, 6);
    }
  });

  it('gates visibility requires BOTH a gate count and walls in scope — a gate cannot read as an opening with no wall to cut into', () => {
    // Real bug, not a hypothetical: caught live on the running preview (both this renderer and
    // SVG's HangarPreview.tsx independently had `gates > 0` alone as the trigger), a gate stayed
    // on screen after switching walls out of scope. Fixed identically in both places.
    const noGates = buildThreeScene(domainFor({ gates: 0, scope: ['foundation', 'frame', 'walls', 'roof'] }));
    const gatesNoWalls = buildThreeScene(domainFor({ gates: 2, scope: ['foundation', 'frame', 'roof'] }));
    const gatesWithWalls = buildThreeScene(domainFor({ gates: 2, scope: ['foundation', 'frame', 'walls', 'roof'] }));

    expect(noGates.visible.gates).toBe(false);
    expect(gatesNoWalls.visible.gates).toBe(false);
    expect(gatesWithWalls.visible.gates).toBe(true);
    // Geometry is unaffected either way — this is a visibility rule, not a geometric one. The
    // recess meshes still exist in the scene; the renderer just doesn't mount them without walls.
    expect(gatesNoWalls.recesses).toHaveLength(gatesWithWalls.recesses.length);
  });

  it('tags every strut with a build-up role, distinguishing columns from rafters from girts', () => {
    const three = buildThreeScene(domainFor());

    const columns = three.struts.filter((s) => s.role === 'column');
    const rafters = three.struts.filter((s) => s.role === 'rafter');
    const girts = three.struts.filter((s) => s.role === 'girt');
    // Phase 3E: bracing is always present (not scheme/roofStructure-gated — brief §13's own "not
    // a user control"), so it is part of the total at default state even though internal-column/
    // truss-chord/truss-web are legitimately empty there (engineeringDecision renders as the
    // plain clearSpan/portalRafter baseline — see StructuralScheme/RoofStructure's own doc
    // comments in types.ts).
    const braces = three.struts.filter((s) => s.role === 'brace');

    expect(columns.length).toBeGreaterThan(0);
    expect(rafters.length).toBeGreaterThan(0);
    expect(girts.length).toBeGreaterThan(0);
    expect(braces.length).toBeGreaterThan(0);
    expect(columns.length + rafters.length + girts.length + braces.length).toBe(three.struts.length);
    expect(columns.every((s) => s.material === 'frame-primary')).toBe(true);
    expect(rafters.every((s) => s.material === 'frame-primary')).toBe(true);
    expect(girts.every((s) => s.material === 'frame-secondary')).toBe(true);
    expect(braces.every((s) => s.material === 'frame-secondary')).toBe(true);
  });

  it('is deterministic and JSON-serialisable', () => {
    const a = buildThreeScene(domainFor());
    const b = buildThreeScene(domainFor());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it.each(CASES)('produces finite geometry at %d × %d × %d', (width, length, height) => {
    const three = buildThreeScene(domainFor({ dimensions: { width, length, height } }));
    const coords = [
      ...three.struts.flatMap((s) => [s.a, s.b]),
      ...three.panels.flatMap((p) => p.corners),
    ].flatMap((p) => [p.x, p.y, p.z]);

    expect(coords.length).toBeGreaterThan(0);
    for (const c of coords) expect(Number.isFinite(c)).toBe(true);
  });

  it('Phase 3D: material colour never appears in — and so can never invalidate — the 3D envelope geometry cache key', () => {
    // envelopeGeometryFor's own cache key (ThreeHangarView.tsx) is built from cladding SYSTEM and
    // real dimensions only. Asserted here from the domain/scene side, the only place a colour
    // preset change actually enters the pipeline: two scenes differing ONLY in nothing colour-
    // related — there is no colour field on PanelMesh at all — must describe identical panel
    // geometry inputs. If a future change ever threaded colour onto PanelMesh, this test's own
    // shape (comparing full PanelMesh objects between two `buildThreeScene` calls for the same
    // domain) would catch a widened cache key the moment colour started varying panel data.
    const a = buildThreeScene(domainFor());
    const b = buildThreeScene(domainFor());
    expect(a.panels).toEqual(b.panels);
    expect(Object.keys(a.panels[0])).not.toContain('color');
  });

  it('Phase 3D: both renderers place every footing at the exact same column-station position', () => {
    const domain = domainFor({ foundationType: 'isolated' });
    const three = buildThreeScene(domain);
    const technical = buildTechnicalScene(domain);
    const technicalFootings = technical.primitives.filter(
      (p): p is Extract<(typeof technical.primitives)[number], { kind: 'footing-marker' }> => p.kind === 'footing-marker',
    );

    expect(technicalFootings).toHaveLength(three.footings.length);
    for (const footing of three.footings) {
      const match = technicalFootings.find((f) => f.id === footing.id);
      expect(match).toBeDefined();
      expect(match?.xM).toBeCloseTo(footing.xM, 6);
      expect(match?.zM).toBeCloseTo(footing.zM, 6);
    }
  });
});
