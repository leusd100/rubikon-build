import { describe, expect, it } from 'vitest';
import {
  AD, AX, DIR, around, crosses, overlaps, roofHeight, roofMembersAt, union, unit, within, type Box,
} from '../../../app/components/angary/dimetric';

// The drawings' shared dimetric (10.10): «Каркас» and the general view project and test the same way
describe('dimetric projection', () => {
  it('draws the span at 7° true size, the length at 41° half size, height straight up', () => {
    expect(Math.hypot(...AX)).toBeCloseTo(1);
    expect(Math.hypot(...AD)).toBeCloseTo(0.5);
    expect(Math.hypot(...DIR)).toBeCloseTo(1);
    expect(unit([1, 0, 0])).toEqual([AX[0], AX[1]]);
    expect(unit([0, 0, 2])).toEqual([0, -2]);
    expect(unit([0, 1, 0])[1]).toBeLessThan(0);
  });

  it('gives a gable roof its height across the span', () => {
    const z = roofHeight(24, 8, 10);
    expect(z(0)).toBe(8);
    expect(z(12)).toBe(10);
    expect(z(24)).toBe(8);
    expect(z(6)).toBe(9);
  });

  it('draws a truss with its web, a portal frame with its rafters and haunches', () => {
    const truss = roofMembersAt(0, { W: 24, E: 8, R: 10.6, truss: true, panelXs: [0, 4, 8, 12, 16, 20, 24] });
    const portal = roofMembersAt(6, { W: 12, E: 5, R: 6, truss: false, panelXs: [] });
    expect(truss.length).toBeGreaterThan(portal.length);
    for (const member of [...truss, ...portal]) for (const [x, , z] of member) {
      expect(Number.isFinite(x) && Number.isFinite(z)).toBe(true);
    }
    expect(portal.every((member) => member.every(([, d]) => d === 6))).toBe(true);
  });
});

describe('boxes and segments', () => {
  const a: Box = [0, 0, 10, 10];
  it('unions, grows, and tells overlap and containment', () => {
    expect(union([a, [5, -5, 20, 5]])).toEqual([0, -5, 20, 10]);
    expect(around([5, 5], 2)).toEqual([3, 3, 7, 7]);
    expect(around([5, 5], 2, 1)).toEqual([3, 4, 7, 6]);
    expect(overlaps(a, [9, 9, 12, 12])).toBe(true);
    expect(overlaps(a, [10, 0, 12, 5])).toBe(false);
    expect(within([2, 2, 8, 8], a)).toBe(true);
    expect(within([2, 2, 12, 8], a)).toBe(false);
  });

  it('tells whether a segment runs through a box', () => {
    expect(crosses([[-5, 5], [15, 5]], a)).toBe(true);
    expect(crosses([[-5, -5], [-1, 20]], a)).toBe(false);
    expect(crosses([[2, 2], [3, 3]], a)).toBe(true);
    expect(crosses([[5, -5], [5, -1]], a)).toBe(false);
    expect(crosses([[-5, 15], [15, -5]], a)).toBe(true);
  });
});
