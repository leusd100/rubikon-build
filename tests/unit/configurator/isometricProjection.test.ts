import { describe, expect, it } from 'vitest';
import {
  pointsAttr,
  project,
  projectIsometricScene,
  type Point,
} from '../../../app/lib/configurator/isometricProjection';
import { buildTechnicalScene } from '../../../app/lib/configurator/technicalSceneModel';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import {
  DEFAULT_CONFIGURATOR_STATE,
  DIMENSION_BOUNDS,
  type ConfiguratorState,
  type RoofStructure,
  type StructuralScheme,
} from '../../../app/lib/configurator/types';

function projectFor(overrides: Partial<ConfiguratorState> = {}) {
  return projectIsometricScene(buildTechnicalScene(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides })));
}

/** Phase 3E.1: structural scheme/roof structure are derived from width now, not stored state —
 *  see parametricModel.test.ts's own `modelForStructural` for the same pattern applied here. */
function projectForStructural(structural: { scheme: StructuralScheme; roofStructure: RoofStructure }, overrides: Partial<ConfiguratorState> = {}) {
  const domain = deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides });
  return projectIsometricScene(buildTechnicalScene({ ...domain, structural }));
}

function span(points: { x: number; y: number }[], axis: 'x' | 'y') {
  const vs = points.map((p) => p[axis]);
  return Math.max(...vs) - Math.min(...vs);
}

describe('pointsAttr', () => {
  it('formats points as an SVG "x,y x,y" list, rounded to 2 decimals', () => {
    expect(pointsAttr([{ x: 1.006, y: -2.5 }, { x: 3, y: 4 }])).toBe('1.01,-2.5 3,4');
  });
});

describe('project', () => {
  // Phase 3-0 reduced this module to one transform. These assertions pin the axis convention it
  // implements, so a future 3D camera can be checked against the same rules.
  it('maps the building origin to the screen origin', () => {
    expect(project({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('sends building Y straight up the screen, with no horizontal drift', () => {
    const up = project({ x: 0, y: 5, z: 0 });
    expect(up.x).toBeCloseTo(0, 9);
    expect(up.y).toBeLessThan(0); // screen Y grows downward
  });

  it('recedes +Z up and to the right — the composition the drawing has always had', () => {
    const far = project({ x: 0, y: 0, z: 10 });
    expect(far.x).toBeGreaterThan(0);
    expect(far.y).toBeLessThan(0);
  });

  it('sends +X to the opposite horizontal side from +Z — the mark of a real viewpoint', () => {
    // An oblique projection can put both axes on the same side; a camera that actually sees the
    // front facade cannot. This is the property that was silently mirroring the two views against
    // each other before the shared basis existed.
    const alongWidth = project({ x: 10, y: 0, z: 0 });
    const alongLength = project({ x: 0, y: 0, z: 10 });
    expect(Math.sign(alongWidth.x)).toBe(-Math.sign(alongLength.x));
  });

  it('preserves equal metres as equal screen distance on each axis (orthographic, not perspective)', () => {
    const near = project({ x: 0, y: 0, z: 0 });
    const mid = project({ x: 0, y: 0, z: 20 });
    const far = project({ x: 0, y: 0, z: 40 });
    expect(Math.hypot(mid.x - near.x, mid.y - near.y)).toBeCloseTo(
      Math.hypot(far.x - mid.x, far.y - mid.y), 9,
    );
  });

  it('is linear, so equal metre steps project to equal screen steps', () => {
    const a = project({ x: 0, y: 0, z: 0 });
    const b = project({ x: 1, y: 0, z: 1 });
    const c = project({ x: 2, y: 0, z: 2 });
    expect(b.x - a.x).toBeCloseTo(c.x - b.x, 9);
    expect(b.y - a.y).toBeCloseTo(c.y - b.y, 9);
  });
});

describe('projectIsometricScene', () => {
  it('always returns the 4 flat footprint points, `visible` following scope.foundation (never omitted)', () => {
    // Flat, deliberately — the technical view draws the slab as a footprint line, not an extruded
    // box (see isometricProjection.ts's own comment at the call site this exercises). The 3D
    // view is where the slab's real thickness is actually rendered.
    const on = projectFor({ scope: ['foundation'] });
    const off = projectFor({ scope: ['frame'] });

    expect(on.foundation.points).toHaveLength(4);
    expect(on.foundation.visible).toBe(true);
    expect(off.foundation.points).toEqual(on.foundation.points);
    expect(off.foundation.visible).toBe(false);
  });

  it('scales the front elevation proportionally with the width input', () => {
    const narrow = projectFor({ dimensions: { width: 12, length: 60, height: 8 } });
    const wide = projectFor({ dimensions: { width: 36, length: 60, height: 8 } });
    const front = (s: ReturnType<typeof projectFor>) => s.gableEnds.find((g) => g.face === 'front')!.points;

    expect(span(front(wide), 'x')).toBeCloseTo(span(front(narrow), 'x') * 3, 6);
  });

  it('renders the front gable as a 5-point pentagon whose apex sits above the eave corners', () => {
    const scene = projectFor();
    const front = scene.gableEnds.find((g) => g.face === 'front')!;

    expect(front.points).toHaveLength(5);
    // Screen Y grows downward, so the apex is the MINIMUM y.
    const apex = front.points.reduce((a, b) => (b.y < a.y ? b : a));
    const others = front.points.filter((p) => p !== apex);
    expect(others.every((p) => p.y > apex.y)).toBe(true);
  });

  it('projects both roof slopes, meeting at a common ridge height on screen', () => {
    const scene = projectFor();
    const left = scene.roofSegments.filter((s) => s.slope === 'left');
    const right = scene.roofSegments.filter((s) => s.slope === 'right');

    expect(left.length).toBeGreaterThan(0);
    expect(left).toHaveLength(right.length);
    expect(scene.frame.ridge).not.toBeNull();
  });

  it('segments each side wall and each roof slope into one quad per structural bay', () => {
    const scene = projectFor();
    const bays = buildTechnicalScene(deriveDomainModel(DEFAULT_CONFIGURATOR_STATE)).building.bays.count;

    expect(scene.wallSegments.filter((w) => w.face === 'left')).toHaveLength(bays);
    expect(scene.roofSegments.filter((s) => s.slope === 'right')).toHaveLength(bays);
    expect(scene.wallSegments.every((s) => s.points.length === 4)).toBe(true);
  });

  it('reflects hasFill/envelope from the scene model on wall and roof surfaces', () => {
    const scene = projectFor({ scope: ['walls'], envelope: 'cold' });

    expect(scene.wallSegments.every((s) => s.hasFill && s.envelope === 'cold')).toBe(true);
    expect(scene.roofSegments.every((s) => !s.hasFill)).toBe(true);
  });

  it('renders no gate rectangles when gates is 0, and one 4-point rect per gate otherwise', () => {
    expect(projectFor({ gates: 0 }).gates).toHaveLength(0);
    expect(projectFor({ gates: 1 }).gates).toHaveLength(1);
    expect(projectFor({ gates: 2 }).gates).toHaveLength(2);
    expect(projectFor({ gates: 1 }).gates[0].points).toHaveLength(4);
  });

  it("keeps every gate within the front gable's own projected width", () => {
    const scene = projectFor({ gates: 2 });
    const front = scene.gableEnds.find((g) => g.face === 'front')!.points;
    const minX = Math.min(...front.map((p) => p.x));
    const maxX = Math.max(...front.map((p) => p.x));

    for (const gate of scene.gates) {
      for (const p of gate.points) {
        expect(p.x).toBeGreaterThanOrEqual(minX);
        expect(p.x).toBeLessThanOrEqual(maxX);
      }
    }
  });

  it('never omits frame lines when frame is out of scope — `visible` goes false instead', () => {
    const on = projectFor({ scope: ['frame'] });
    const off = projectFor({ scope: [] });

    expect(off.frame.columns).toHaveLength(on.frame.columns.length);
    expect(off.frame.rafters).toHaveLength(on.frame.rafters.length);
    expect(off.frame.columns.every((l) => !l.visible)).toBe(true);
    expect(on.frame.rafters.every((l) => l.visible)).toBe(true);
  });

  it('emits four dimension guides, with the ridge one flagged derived', () => {
    const dims = projectFor().dimensions;

    expect(dims.width.derived).toBe(false);
    expect(dims.eave.derived).toBe(false);
    expect(dims.ridge.derived).toBe(true);
    expect(dims.ridge.valueM).toBeGreaterThan(dims.eave.valueM);
    // Nested dimension chain: the derived ridge guide sits outside the eave guide.
    expect(dims.ridge.line[0].x).toBeLessThan(dims.eave.line[0].x);
  });
});

describe('bounds', () => {
  it('encloses every envelope surface, the foundation and every dimension label', () => {
    const scene = projectFor();
    const { minX, minY, maxX, maxY } = scene.bounds;
    const inside = (p: { x: number; y: number }) =>
      p.x >= minX - 1e-6 && p.x <= maxX + 1e-6 && p.y >= minY - 1e-6 && p.y <= maxY + 1e-6;

    for (const p of [
      ...scene.foundation.points,
      ...scene.wallSegments.flatMap((s) => s.points),
      ...scene.gableEnds.flatMap((s) => s.points),
      ...scene.roofSegments.flatMap((s) => s.points),
      ...Object.values(scene.dimensions).map((d) => d.label),
    ]) {
      expect(inside(p)).toBe(true);
    }
  });

  it('excludes the terrain from framing so the building stays the subject, but keeps it inside the frame', () => {
    // The terrain is staging. Letting it drive the bounds is what left the hangar occupying a
    // fraction of the viewport while the 3D view filled its frame — so `bounds` is still computed
    // from the building + guides alone, terrain excluded. But the terrain's OWN points must not
    // be allowed to fall outside the bounds that decision produces: this projection is oblique, so
    // a uniform world-space margin (terrainCorners in technicalSceneModel.ts) does not project to
    // a uniform screen-space one, and on a long/narrow hangar one corner genuinely landed past the
    // frame — visible on screen as the terrain's stroke outline running off the edge of the
    // drawing and getting hard-clipped there (caught live, not by this suite, on a 24×80m hangar:
    // a terrain corner projected to x≈588 against a bounds right edge at x≈500). Terrain is
    // staging, not a technical claim, so clamping a corner onto the boundary rather than letting
    // it sit past it costs nothing real.
    for (const [width, length] of [[24, 60], [24, 80], [24, 120], [60, 24], [10, 10], [60, 120]] as const) {
      const scene = projectFor({ dimensions: { width, length, height: 8 } });
      const { minX, minY, maxX, maxY } = scene.bounds;
      const outside = scene.terrain.filter(
        (p) => p.x < minX - 1e-6 || p.x > maxX + 1e-6 || p.y < minY - 1e-6 || p.y > maxY + 1e-6,
      );

      expect(outside, `terrain corner escaped bounds at ${width}×${length}`).toHaveLength(0);
    }
  });

  it('keeps dimension guides clear of the building at every size', () => {
    // "Розміри не мають залазити на будівлю."
    //
    // Tested against the ACTUAL projected polygons, not their bounding box: the building is a
    // diagonal mass, so its axis-aligned box covers a great deal of empty screen that a guide is
    // perfectly entitled to occupy. A box check here reports overlaps that do not exist — the
    // mirror image of the mistake noted in lengthGuide's own history, where a box check missed
    // overlaps that did.
    const inPolygon = (p: Point, poly: Point[]) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i];
        const b = poly[j];
        if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
          inside = !inside;
        }
      }
      return inside;
    };

    for (const dims of [
      { width: 10, length: 10, height: 4 },
      { width: 24, length: 60, height: 8 },
      { width: 50, length: 120, height: 15 },
      { width: 12, length: 110, height: 5 },
      { width: 50, length: 30, height: 6 },
    ]) {
      const scene = projectFor({ dimensions: dims });
      const shell = [
        ...scene.wallSegments.map((s) => s.points),
        ...scene.gableEnds.map((s) => s.points),
        ...scene.roofSegments.map((s) => s.points),
      ];

      for (const [name, guide] of Object.entries(scene.dimensions)) {
        // Sample along the guide line as well as its ends — a line can clear both endpoints and
        // still cut across a surface in between.
        const [a, b] = guide.line;
        const samples = [guide.label];
        for (let t = 0; t <= 1.0001; t += 0.1) {
          samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }

        for (const point of samples) {
          const overlaps = shell.some((poly) => inPolygon(point, poly));
          expect(
            overlaps,
            `${name} guide crosses the building at ${dims.width}×${dims.length}×${dims.height}`,
          ).toBe(false);
        }
      }
    }
  });

  it('grows vertically when the roof is pitched — the ridge is above the eave in the framing', () => {
    const scene = projectFor();
    const ridgeY = scene.frame.ridge!.points[0].y;
    const eaveY = project({ x: 0, y: DEFAULT_CONFIGURATOR_STATE.dimensions.height, z: 0 }).y;

    expect(ridgeY).toBeLessThan(eaveY); // screen Y grows downward
    expect(scene.bounds.minY).toBeLessThanOrEqual(ridgeY);
  });

  it('keeps bounds stable whether or not foundation is in scope — the exact regression the always-present + `visible` pattern exists to prevent', () => {
    const withF = projectFor({ scope: ['foundation', 'frame', 'walls', 'roof'] }).bounds;
    const withoutF = projectFor({ scope: ['frame', 'walls', 'roof'] }).bounds;

    expect(withoutF).toEqual(withF);
  });

  it('keeps bounds stable whether or not frame is in scope', () => {
    const withFrame = projectFor({ scope: ['foundation', 'frame', 'walls', 'roof'] }).bounds;
    const withoutFrame = projectFor({ scope: ['foundation', 'walls', 'roof'] }).bounds;

    expect(withoutFrame).toEqual(withFrame);
  });

  it('produces finite, non-degenerate bounds at both DIMENSION_BOUNDS extremes', () => {
    for (const dims of [
      { width: DIMENSION_BOUNDS.width.min, length: DIMENSION_BOUNDS.length.min, height: DIMENSION_BOUNDS.height.min },
      { width: DIMENSION_BOUNDS.width.max, length: DIMENSION_BOUNDS.length.max, height: DIMENSION_BOUNDS.height.max },
    ]) {
      const { minX, minY, maxX, maxY } = projectFor({ dimensions: dims }).bounds;
      for (const v of [minX, minY, maxX, maxY]) expect(Number.isFinite(v)).toBe(true);
      expect(maxX).toBeGreaterThan(minX);
      expect(maxY).toBeGreaterThan(minY);
    }
  });
});

describe('dimension label framing', () => {
  // Regression: bounds used to include only a label's anchor POINT, so a label wider than the
  // margin the terrain happened to supply was clipped by the viewBox. The default 24×60 hangar
  // hid it (its terrain reaches x≈-138); a narrow 14×20 one cut the leading digit off the ridge
  // value, rendering "15.7 м" as "5.7 м".
  it('keeps every dimension label fully inside the bounds, including narrow hangars', () => {
    for (const dims of [
      { width: 14, length: 20, height: 14 },
      { width: DIMENSION_BOUNDS.width.min, length: DIMENSION_BOUNDS.length.min, height: DIMENSION_BOUNDS.height.max },
      { width: 24, length: 60, height: 8 },
      { width: DIMENSION_BOUNDS.width.max, length: DIMENSION_BOUNDS.length.max, height: DIMENSION_BOUNDS.height.max },
    ]) {
      const scene = projectFor({ dimensions: dims });
      const { minX, maxX } = scene.bounds;

      for (const guide of Object.values(scene.dimensions)) {
        // Conservative estimate of the rendered run, matching the projection's own model.
        const fontPx = guide.derived ? 14 : 16;
        const width = guide.text.length * fontPx * 0.62;
        const left = guide.anchor === 'end' ? guide.label.x - width : guide.label.x - width / 2;

        expect(left).toBeGreaterThanOrEqual(minX);
        expect(left + width).toBeLessThanOrEqual(maxX);
      }
    }
  });

  it('labels the derived ridge distinctly from the user-set dimensions', () => {
    const dims = projectFor().dimensions;

    expect(dims.eave.text).toMatch(/^\d/);
    // The ridge keeps its name so the reader knows WHICH height it is, but carries no "~": it is
    // a value the user sets now, not one the span rule guessed.
    expect(dims.ridge.text).toContain('Коник');
    expect(dims.ridge.text).not.toContain('~');
  });
});

describe('Phase 3E structural line projections', () => {
  it('projects exactly as many internal-column lines as the technical scene has primitives (1:1, no drops/dupes)', () => {
    const domain = deriveDomainModel(DEFAULT_CONFIGURATOR_STATE);
    const structural = { scheme: 'centerSupport' as const, roofStructure: 'truss' as const };
    const scene = buildTechnicalScene({ ...domain, structural });
    const projected = projectIsometricScene(scene);
    const primitiveCount = scene.primitives.filter((p) => p.kind === 'internal-column').length;
    expect(projected.frame.internalColumns).toHaveLength(primitiveCount);
    expect(primitiveCount).toBeGreaterThan(0);
  });

  it('every projected structural line is a well-formed 2-point line', () => {
    const projected = projectForStructural({ scheme: 'centerSupport', roofStructure: 'truss' });
    for (const group of [projected.frame.internalColumns, projected.frame.internalColumnProps, projected.frame.trussChords, projected.frame.trussWebs]) {
      for (const line of group) {
        expect(line.points).toHaveLength(2);
        for (const p of line.points) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
        }
      }
    }
  });

  it('truss chord/web visibility carries through the projection unchanged', () => {
    const portalProjected = projectForStructural({ scheme: 'clearSpan', roofStructure: 'portalRafter' });
    expect(portalProjected.frame.trussChords.every((l) => !l.visible)).toBe(true);

    const trussProjected = projectForStructural({ scheme: 'clearSpan', roofStructure: 'truss' });
    expect(trussProjected.frame.trussChords.every((l) => l.visible)).toBe(true);
    expect(trussProjected.frame.trussWebs.every((l) => l.visible)).toBe(true);
  });
});
