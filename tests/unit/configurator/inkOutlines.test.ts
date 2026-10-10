import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  boxEdges, creaseEdges, faceRectangle, outlineSides, polygonAtZ, pushSegments, surfaceOutline,
} from '../../../app/components/configurator/three/inkOutlines';

// The 3D's ink (10.10): every part outlined in the drawings' language
describe('ink outlines', () => {
  it('outlines a box by its twelve edges', () => {
    const segments = boxEdges(new THREE.Matrix4().makeScale(2, 3, 4));
    expect(segments).toHaveLength(12 * 6);
    expect(Math.max(...segments.filter((_, index) => index % 3 === 1))).toBeCloseTo(1.5);
  });

  it('draws a face as its rectangle and a surface without the joints between its bays', () => {
    const bay = (x: number) => faceRectangle(new THREE.Matrix4().makeTranslation(x, 0, 0), 6, 8);
    expect(bay(0)).toHaveLength(4);
    const outline = surfaceOutline([...bay(0), ...bay(6), ...bay(12)]);
    // three bays of 6 × 8: the shared jambs cancel, the outline keeps the long top and bottom and the two ends
    const length = outline.reduce((sum, [a, b]) => sum + a.distanceTo(b), 0);
    expect(length).toBeCloseTo(18 * 2 + 8 * 2);
    const sides = outlineSides(outline);
    expect(new Set(sides.map((edge) => edge.side))).toEqual(new Set(['top', 'bottom', 'end']));
    const segments = pushSegments([], sides.filter((edge) => edge.side !== 'top'));
    expect(segments.length % 6).toBe(0);
    expect(segments.length).toBeLessThan(pushSegments([], sides).length);
  });

  it('draws a polygon at a depth, edges skipped as asked', () => {
    const square = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    expect(polygonAtZ(square, 2)).toHaveLength(4 * 6);
    const skipped = polygonAtZ(square, 2, 10, [], (index) => index === 0);
    expect(skipped).toHaveLength(3 * 6);
    expect(skipped[0]).toBe(11);
    expect(skipped[2]).toBe(2);
  });

  it('draws a geometry by its creases, not its flat diagonals', () => {
    const box = creaseEdges(new THREE.BoxGeometry(1, 1, 1), 30);
    expect(box).toHaveLength(12 * 6);
    const shifted = creaseEdges(new THREE.BoxGeometry(1, 1, 1), 30, new THREE.Vector3(5, 0, 0));
    expect(Math.min(...shifted.filter((_, index) => index % 3 === 0))).toBeCloseTo(4.5);
  });
});
