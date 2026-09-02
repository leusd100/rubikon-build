import { describe, expect, it } from 'vitest';
import { PX_PER_METRE, computeScene, pointsAttr } from '../../../app/lib/configurator/isometricGeometry';
import type { Dimensions } from '../../../app/lib/configurator/types';

const BASE: Dimensions = { width: 24, length: 60, height: 8 };

describe('pointsAttr', () => {
  it('formats points as an SVG "x,y x,y" list, rounded to 2 decimals', () => {
    expect(pointsAttr([{ x: 1, y: 2 }, { x: 3.14159, y: 4 }])).toBe('1,2 3.14,4');
  });
});

describe('computeScene — box faces', () => {
  it('gives every face exactly 4 points (front/side/top) and the foundation slab 6', () => {
    const scene = computeScene(BASE, 1);

    expect(scene.box.front).toHaveLength(4);
    expect(scene.box.side).toHaveLength(4);
    expect(scene.box.top).toHaveLength(4);
    expect(scene.foundation).toHaveLength(6);
  });

  it('scales the front face width proportionally with the `width` input', () => {
    const narrow = computeScene({ ...BASE, width: 10 }, 1);
    const wide = computeScene({ ...BASE, width: 40 }, 1);

    const narrowWidthPx = Math.max(...narrow.box.front.map((p) => p.x)) - Math.min(...narrow.box.front.map((p) => p.x));
    const wideWidthPx = Math.max(...wide.box.front.map((p) => p.x)) - Math.min(...wide.box.front.map((p) => p.x));

    expect(narrowWidthPx).toBeCloseTo(10 * PX_PER_METRE, 1);
    expect(wideWidthPx).toBeCloseTo(40 * PX_PER_METRE, 1);
    expect(wideWidthPx).toBeGreaterThan(narrowWidthPx);
  });

  it('scales the front face height proportionally with the `height` input', () => {
    const short = computeScene({ ...BASE, height: 4 }, 1);
    const tall = computeScene({ ...BASE, height: 15 }, 1);

    const shortHeightPx = Math.max(...short.box.front.map((p) => p.y)) - Math.min(...short.box.front.map((p) => p.y));
    const tallHeightPx = Math.max(...tall.box.front.map((p) => p.y)) - Math.min(...tall.box.front.map((p) => p.y));

    expect(tallHeightPx).toBeGreaterThan(shortHeightPx);
    expect(shortHeightPx).toBeCloseTo(4 * PX_PER_METRE, 1);
  });

  it('recedes the side face further as `length` grows, without changing the front face', () => {
    const short = computeScene({ ...BASE, length: 10 }, 1);
    const long = computeScene({ ...BASE, length: 120 }, 1);

    expect(long.box.front).toEqual(short.box.front);

    const depthOf = (scene: ReturnType<typeof computeScene>) => {
      const backX = scene.box.side[1].x; // back-top-right corner
      const frontX = scene.box.side[0].x; // front-top-right corner
      return backX - frontX;
    };
    expect(depthOf(long)).toBeGreaterThan(depthOf(short));
  });

  it('is a true isometric cube — the same scale applies to width, length and height', () => {
    const scene = computeScene({ width: 10, length: 10, height: 10 }, 0);
    const frontWidthPx = scene.box.front[1].x - scene.box.front[0].x;
    const frontHeightPx = scene.box.front[3].y - scene.box.front[0].y;
    const depthPx = Math.hypot(scene.box.side[1].x - scene.box.side[0].x, scene.box.side[1].y - scene.box.side[0].y);

    expect(frontWidthPx).toBeCloseTo(frontHeightPx, 1);
    expect(depthPx).toBeCloseTo(frontWidthPx, 1);
  });
});

describe('computeScene — gates', () => {
  it('renders no gate rectangles when gates is 0', () => {
    expect(computeScene(BASE, 0).gates).toHaveLength(0);
  });

  it('renders exactly one gate rectangle (4 points) when gates is 1', () => {
    const scene = computeScene(BASE, 1);
    expect(scene.gates).toHaveLength(1);
    expect(scene.gates[0].points).toHaveLength(4);
  });

  it('renders two non-overlapping gate rectangles when gates is 2', () => {
    const scene = computeScene(BASE, 2);
    expect(scene.gates).toHaveLength(2);

    const [left, right] = scene.gates.map((gate) => ({
      minX: Math.min(...gate.points.map((p) => p.x)),
      maxX: Math.max(...gate.points.map((p) => p.x)),
    })).sort((a, b) => a.minX - b.minX);

    expect(left.maxX).toBeLessThanOrEqual(right.minX);
  });

  it('keeps every gate within the front facade\'s own width', () => {
    const scene = computeScene(BASE, 2);
    const facadeMaxX = Math.max(...scene.box.front.map((p) => p.x));
    const facadeMinX = Math.min(...scene.box.front.map((p) => p.x));

    for (const gate of scene.gates) {
      for (const point of gate.points) {
        expect(point.x).toBeGreaterThanOrEqual(facadeMinX);
        expect(point.x).toBeLessThanOrEqual(facadeMaxX);
      }
    }
  });
});

describe('computeScene — frame density', () => {
  it('adds more column bays for a wider facade, within the clamped 2-10 range', () => {
    const narrow = computeScene({ ...BASE, width: 10 }, 1);
    const wide = computeScene({ ...BASE, width: 60 }, 1);

    expect(narrow.frame.frontColumns.length).toBeGreaterThanOrEqual(3); // 2 bays + 1
    expect(wide.frame.frontColumns.length).toBeGreaterThan(narrow.frame.frontColumns.length);
    expect(wide.frame.frontColumns.length).toBeLessThanOrEqual(11); // 10 bays + 1
  });
});

describe('computeScene — bounds', () => {
  it('encloses every face, the foundation, and every dimension label', () => {
    const scene = computeScene(BASE, 2);
    const allPoints = [
      ...scene.box.front, ...scene.box.side, ...scene.box.top,
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
