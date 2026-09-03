import { describe, expect, it } from 'vitest';
import {
  PX_PER_METRE,
  pointsAttr,
  project,
  projectIsometricScene,
} from '../../../app/lib/configurator/isometricProjection';
import { buildTechnicalScene } from '../../../app/lib/configurator/technicalSceneModel';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import {
  DEFAULT_CONFIGURATOR_STATE,
  DIMENSION_BOUNDS,
  type ConfiguratorState,
} from '../../../app/lib/configurator/types';

function projectFor(overrides: Partial<ConfiguratorState> = {}) {
  return projectIsometricScene(buildTechnicalScene(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides })));
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

  it('maps building X to screen X at the shared metre scale', () => {
    expect(project({ x: 3, y: 0, z: 0 })).toEqual({ x: 3 * PX_PER_METRE, y: 0 });
  });

  it('sends building Y (up) to negative screen Y (SVG grows downward)', () => {
    expect(project({ x: 0, y: 5, z: 0 }).y).toBe(-5 * PX_PER_METRE);
  });

  it('recedes +Z up and to the right — the fixed axonometric direction', () => {
    const far = project({ x: 0, y: 0, z: 10 });
    expect(far.x).toBeGreaterThan(0);
    expect(far.y).toBeLessThan(0);
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
  it('always returns 6 foundation points, `visible` following scope.foundation (never omitted)', () => {
    const on = projectFor({ scope: ['foundation'] });
    const off = projectFor({ scope: ['frame'] });

    expect(on.foundation.points).toHaveLength(6);
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
  it('encloses the terrain, every envelope surface, the foundation and every dimension label', () => {
    const scene = projectFor();
    const { minX, minY, maxX, maxY } = scene.bounds;
    const inside = (p: { x: number; y: number }) =>
      p.x >= minX - 1e-6 && p.x <= maxX + 1e-6 && p.y >= minY - 1e-6 && p.y <= maxY + 1e-6;

    for (const p of [
      ...scene.terrain,
      ...scene.foundation.points,
      ...scene.wallSegments.flatMap((s) => s.points),
      ...scene.gableEnds.flatMap((s) => s.points),
      ...scene.roofSegments.flatMap((s) => s.points),
      ...Object.values(scene.dimensions).map((d) => d.label),
    ]) {
      expect(inside(p)).toBe(true);
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
    expect(dims.ridge.text).toContain('Коник');
    expect(dims.ridge.text).toContain('~');
  });
});
