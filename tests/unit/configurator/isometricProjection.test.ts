import { describe, expect, it } from 'vitest';
import { deriveDomainModel, type HangarDomainModel } from '../../../app/lib/configurator/domainModel';
import { PX_PER_METRE, pointsAttr, projectIsometricScene, type Point } from '../../../app/lib/configurator/isometricProjection';
import { buildHangarScene } from '../../../app/lib/configurator/sceneModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

function domainFor(overrides: Partial<ConfiguratorState>): HangarDomainModel {
  return deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides });
}

function sceneFor(overrides: Partial<ConfiguratorState>) {
  return projectIsometricScene(buildHangarScene(domainFor(overrides)));
}

function widthOf(points: Point[]): number {
  return Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
}

function heightOf(points: Point[]): number {
  return Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
}

describe('pointsAttr', () => {
  it('formats points as an SVG "x,y x,y" list, rounded to 2 decimals', () => {
    expect(pointsAttr([{ x: 1, y: 2 }, { x: 3.14159, y: 4 }])).toBe('1,2 3.14,4');
  });
});

describe('projectIsometricScene — foundation', () => {
  it('always returns 6 foundation points, `visible` following scope.foundation (never omitted)', () => {
    const withFoundation = sceneFor({ scope: ['foundation'] });
    const withoutFoundation = sceneFor({ scope: [] });

    expect(withFoundation.foundation.points).toHaveLength(6);
    expect(withFoundation.foundation.visible).toBe(true);
    // Same geometry either way — only `visible` changes — so a dematerialize transition always
    // has real points to fade from instead of the slab just disappearing.
    expect(withoutFoundation.foundation.points).toHaveLength(6);
    expect(withoutFoundation.foundation.visible).toBe(false);
  });
});

describe('projectIsometricScene — wall/roof segments', () => {
  it('scales the combined front wall span proportionally with the width input', () => {
    const narrow = sceneFor({ dimensions: { width: 10, length: 60, height: 8 } });
    const wide = sceneFor({ dimensions: { width: 40, length: 60, height: 8 } });

    const frontPoints = (s: ReturnType<typeof sceneFor>) => s.wallSegments.front.flatMap((seg) => seg.points);

    expect(widthOf(frontPoints(narrow))).toBeCloseTo(10 * PX_PER_METRE, 1);
    expect(widthOf(frontPoints(wide))).toBeCloseTo(40 * PX_PER_METRE, 1);
    expect(widthOf(frontPoints(wide))).toBeGreaterThan(widthOf(frontPoints(narrow)));
  });

  it('scales the front wall height proportionally with the height input', () => {
    const short = sceneFor({ dimensions: { width: 24, length: 60, height: 4 } });
    const tall = sceneFor({ dimensions: { width: 24, length: 60, height: 15 } });

    const frontPoints = (s: ReturnType<typeof sceneFor>) => s.wallSegments.front.flatMap((seg) => seg.points);

    expect(heightOf(frontPoints(tall))).toBeGreaterThan(heightOf(frontPoints(short)));
    expect(heightOf(frontPoints(short))).toBeCloseTo(4 * PX_PER_METRE, 1);
  });

  it('recedes the side wall further as length grows, without changing the front wall', () => {
    const short = sceneFor({ dimensions: { width: 24, length: 10, height: 8 } });
    const long = sceneFor({ dimensions: { width: 24, length: 120, height: 8 } });

    expect(long.wallSegments.front.flatMap((s) => s.points)).toEqual(short.wallSegments.front.flatMap((s) => s.points));

    const depthOf = (s: ReturnType<typeof sceneFor>) => {
      const points = s.wallSegments.side.flatMap((seg) => seg.points);
      return Math.hypot(widthOf(points), heightOf(points));
    };
    expect(depthOf(long)).toBeGreaterThan(depthOf(short));
  });

  it('segments the front wall into exactly frameBayCount(width) quads', () => {
    const scene = sceneFor({ dimensions: { width: 24, length: 60, height: 8 } }); // 24/6 = 4 bays
    expect(scene.wallSegments.front).toHaveLength(4);
    for (const segment of scene.wallSegments.front) {
      expect(segment.points).toHaveLength(4);
    }
  });

  it('segments the roof into exactly frameBayCount(length) quads', () => {
    const scene = sceneFor({ dimensions: { width: 24, length: 60, height: 8 } }); // 60/6 = 10 bays
    expect(scene.roofSegments).toHaveLength(10);
  });

  it('reflects hasFill/envelope from the scene model on wall and roof segments', () => {
    const filled = sceneFor({ scope: ['walls', 'roof'], envelope: 'cold' });
    const empty = sceneFor({ scope: [], envelope: 'cold' });

    expect(filled.wallSegments.front.every((s) => s.hasFill)).toBe(true);
    expect(filled.roofSegments.every((s) => s.hasFill)).toBe(true);
    expect(filled.wallSegments.front[0].envelope).toBe('cold');
    expect(empty.wallSegments.front.every((s) => !s.hasFill)).toBe(true);
    expect(empty.roofSegments.every((s) => !s.hasFill)).toBe(true);
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
    const frontPoints = scene.wallSegments.front.flatMap((s) => s.points);
    const facadeMaxX = Math.max(...frontPoints.map((p) => p.x));
    const facadeMinX = Math.min(...frontPoints.map((p) => p.x));

    for (const gate of scene.gates) {
      for (const point of gate.points) {
        expect(point.x).toBeGreaterThanOrEqual(facadeMinX);
        expect(point.x).toBeLessThanOrEqual(facadeMaxX);
      }
    }
  });
});

describe('projectIsometricScene — frame', () => {
  it('adds more column bays for a wider facade, within the clamped 2-10 range', () => {
    const narrow = sceneFor({ scope: ['frame'], dimensions: { width: 10, length: 60, height: 8 } });
    const wide = sceneFor({ scope: ['frame'], dimensions: { width: 60, length: 60, height: 8 } });

    expect(narrow.frame.frontColumns.length).toBeGreaterThanOrEqual(3); // 2 bays + 1
    expect(wide.frame.frontColumns.length).toBeGreaterThan(narrow.frame.frontColumns.length);
    expect(wide.frame.frontColumns.length).toBeLessThanOrEqual(11); // 10 bays + 1
  });

  it('one truss per side-bay position, matching the side column count', () => {
    const scene = sceneFor({ scope: ['frame'], dimensions: { width: 24, length: 60, height: 8 } });
    expect(scene.frame.trusses).toHaveLength(scene.frame.sideColumns.length);
  });

  it('emits 2 purlin lines (the two stylised height levels), regardless of scope', () => {
    expect(sceneFor({ scope: [] }).frame.purlins).toHaveLength(2);
  });

  it('never omits column/truss/purlin lines when frame is out of scope — `visible` goes false instead (geometry-safe, so a fade-out has something to animate)', () => {
    const withFrame = sceneFor({ scope: ['frame'] });
    const withoutFrame = sceneFor({ scope: ['foundation', 'walls', 'roof'] });

    expect(withoutFrame.frame.frontColumns).toHaveLength(withFrame.frame.frontColumns.length);
    expect(withoutFrame.frame.sideColumns).toHaveLength(withFrame.frame.sideColumns.length);
    expect(withoutFrame.frame.trusses).toHaveLength(withFrame.frame.trusses.length);
    expect(withoutFrame.frame.frontColumns.every((c) => !c.visible)).toBe(true);
    expect(withFrame.frame.frontColumns.every((c) => c.visible)).toBe(true);
  });
});

describe('projectIsometricScene — bounds', () => {
  it('encloses the terrain, every wall/roof segment, the foundation, and every dimension label', () => {
    const scene = sceneFor({ scope: ['foundation', 'frame', 'walls', 'roof'], gates: 2 });
    const allPoints = [
      ...scene.terrain,
      ...scene.wallSegments.front.flatMap((s) => s.points),
      ...scene.wallSegments.side.flatMap((s) => s.points),
      ...scene.roofSegments.flatMap((s) => s.points),
      ...scene.foundation.points,
      scene.dimensions.width.label, scene.dimensions.length.label, scene.dimensions.height.label,
    ];

    for (const point of allPoints) {
      expect(point.x).toBeGreaterThanOrEqual(scene.bounds.minX);
      expect(point.x).toBeLessThanOrEqual(scene.bounds.maxX);
      expect(point.y).toBeGreaterThanOrEqual(scene.bounds.minY);
      expect(point.y).toBeLessThanOrEqual(scene.bounds.maxY);
    }
  });

  it('keeps bounds stable whether or not frame is in scope (frame sits within the wall/roof extent already in bounds)', () => {
    const withFrame = sceneFor({ scope: ['foundation', 'frame', 'walls', 'roof'] });
    const withoutFrame = sceneFor({ scope: ['foundation', 'walls', 'roof'] });

    expect(withFrame.bounds).toEqual(withoutFrame.bounds);
  });
});
