import { describe, expect, it } from 'vitest';
import { deriveDomainModel, type HangarDomainModel } from '../../../app/lib/configurator/domainModel';
import { PX_PER_METRE, pointsAttr, projectIsometricScene } from '../../../app/lib/configurator/isometricProjection';
import { buildHangarScene } from '../../../app/lib/configurator/sceneModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

function domainFor(overrides: Partial<ConfiguratorState>): HangarDomainModel {
  return deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides });
}

function sceneFor(overrides: Partial<ConfiguratorState>) {
  return projectIsometricScene(buildHangarScene(domainFor(overrides)));
}

describe('pointsAttr', () => {
  it('formats points as an SVG "x,y x,y" list, rounded to 2 decimals', () => {
    expect(pointsAttr([{ x: 1, y: 2 }, { x: 3.14159, y: 4 }])).toBe('1,2 3.14,4');
  });
});

describe('projectIsometricScene — box faces', () => {
  it('gives every face exactly 4 points (front/side/top) and the foundation slab 6', () => {
    const scene = sceneFor({ gates: 1 });

    expect(scene.box.front.points).toHaveLength(4);
    expect(scene.box.side.points).toHaveLength(4);
    expect(scene.box.top.points).toHaveLength(4);
    expect(scene.foundation).toHaveLength(6);
  });

  it('scales the front face width proportionally with the width input', () => {
    const narrow = sceneFor({ dimensions: { width: 10, length: 60, height: 8 } });
    const wide = sceneFor({ dimensions: { width: 40, length: 60, height: 8 } });

    const widthOf = (points: { x: number }[]) => Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));

    expect(widthOf(narrow.box.front.points)).toBeCloseTo(10 * PX_PER_METRE, 1);
    expect(widthOf(wide.box.front.points)).toBeCloseTo(40 * PX_PER_METRE, 1);
    expect(widthOf(wide.box.front.points)).toBeGreaterThan(widthOf(narrow.box.front.points));
  });

  it('scales the front face height proportionally with the height input', () => {
    const short = sceneFor({ dimensions: { width: 24, length: 60, height: 4 } });
    const tall = sceneFor({ dimensions: { width: 24, length: 60, height: 15 } });

    const heightOf = (points: { y: number }[]) => Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));

    expect(heightOf(tall.box.front.points)).toBeGreaterThan(heightOf(short.box.front.points));
    expect(heightOf(short.box.front.points)).toBeCloseTo(4 * PX_PER_METRE, 1);
  });

  it('recedes the side face further as length grows, without changing the front face', () => {
    const short = sceneFor({ dimensions: { width: 24, length: 10, height: 8 } });
    const long = sceneFor({ dimensions: { width: 24, length: 120, height: 8 } });

    expect(long.box.front.points).toEqual(short.box.front.points);

    const depthOf = (scene: ReturnType<typeof sceneFor>) => scene.box.side.points[1].x - scene.box.side.points[0].x;
    expect(depthOf(long)).toBeGreaterThan(depthOf(short));
  });

  it('is a true isometric cube — the same scale applies to width, length and height', () => {
    const scene = sceneFor({ dimensions: { width: 10, length: 10, height: 10 }, gates: 0 });
    const frontWidthPx = scene.box.front.points[1].x - scene.box.front.points[0].x;
    const frontHeightPx = scene.box.front.points[3].y - scene.box.front.points[0].y;
    const depthPx = Math.hypot(
      scene.box.side.points[1].x - scene.box.side.points[0].x,
      scene.box.side.points[1].y - scene.box.side.points[0].y,
    );

    expect(frontWidthPx).toBeCloseTo(frontHeightPx, 1);
    expect(depthPx).toBeCloseTo(frontWidthPx, 1);
  });

  it('reflects hasFill/envelope from the scene model on each face', () => {
    const filled = sceneFor({ scope: ['walls', 'roof'], envelope: 'cold' });
    const empty = sceneFor({ scope: [], envelope: 'cold' });

    expect(filled.box.front.hasFill).toBe(true);
    expect(filled.box.top.hasFill).toBe(true);
    expect(filled.box.front.envelope).toBe('cold');
    expect(empty.box.front.hasFill).toBe(false);
    expect(empty.box.top.hasFill).toBe(false);
  });
});

describe('projectIsometricScene — gates', () => {
  it('renders no gate rectangles when gates is 0', () => {
    expect(sceneFor({ gates: 0 }).gates).toHaveLength(0);
  });

  it('renders exactly one gate rectangle (4 points) when gates is 1', () => {
    const scene = sceneFor({ gates: 1 });
    expect(scene.gates).toHaveLength(1);
    expect(scene.gates[0].points).toHaveLength(4);
  });

  it('renders two non-overlapping gate rectangles when gates is 2', () => {
    const scene = sceneFor({ gates: 2 });
    expect(scene.gates).toHaveLength(2);

    const [left, right] = scene.gates
      .map((gate) => ({
        minX: Math.min(...gate.points.map((p) => p.x)),
        maxX: Math.max(...gate.points.map((p) => p.x)),
      }))
      .sort((a, b) => a.minX - b.minX);

    expect(left.maxX).toBeLessThanOrEqual(right.minX);
  });

  it('keeps every gate within the front facade\'s own width', () => {
    const scene = sceneFor({ gates: 2 });
    const facadeMaxX = Math.max(...scene.box.front.points.map((p) => p.x));
    const facadeMinX = Math.min(...scene.box.front.points.map((p) => p.x));

    for (const gate of scene.gates) {
      for (const point of gate.points) {
        expect(point.x).toBeGreaterThanOrEqual(facadeMinX);
        expect(point.x).toBeLessThanOrEqual(facadeMaxX);
      }
    }
  });
});

describe('projectIsometricScene — frame density', () => {
  it('ignores frame-truss primitives (no visual redesign — SVG has no truss concept)', () => {
    const scene = sceneFor({ scope: ['frame'] });
    expect(scene).not.toHaveProperty('trusses');
  });

  it('adds more column bays for a wider facade, within the clamped 2-10 range', () => {
    const narrow = sceneFor({ scope: ['frame'], dimensions: { width: 10, length: 60, height: 8 } });
    const wide = sceneFor({ scope: ['frame'], dimensions: { width: 60, length: 60, height: 8 } });

    expect(narrow.frame.frontColumns.length).toBeGreaterThanOrEqual(3); // 2 bays + 1
    expect(wide.frame.frontColumns.length).toBeGreaterThan(narrow.frame.frontColumns.length);
    expect(wide.frame.frontColumns.length).toBeLessThanOrEqual(11); // 10 bays + 1
  });

  it('emits no column lines at all when frame is not in scope', () => {
    const scene = sceneFor({ scope: [] });
    expect(scene.frame.frontColumns).toHaveLength(0);
    expect(scene.frame.sideColumns).toHaveLength(0);
  });
});

describe('projectIsometricScene — bounds', () => {
  it('encloses every face, the foundation, and every dimension label', () => {
    const scene = sceneFor({ scope: ['foundation', 'frame', 'walls', 'roof'], gates: 2 });
    const allPoints = [
      ...scene.box.front.points, ...scene.box.side.points, ...scene.box.top.points,
      ...(scene.foundation ?? []),
      scene.dimensions.width.label, scene.dimensions.length.label, scene.dimensions.height.label,
    ];

    for (const point of allPoints) {
      expect(point.x).toBeGreaterThanOrEqual(scene.bounds.minX);
      expect(point.x).toBeLessThanOrEqual(scene.bounds.maxX);
      expect(point.y).toBeGreaterThanOrEqual(scene.bounds.minY);
      expect(point.y).toBeLessThanOrEqual(scene.bounds.maxY);
    }
  });
});
