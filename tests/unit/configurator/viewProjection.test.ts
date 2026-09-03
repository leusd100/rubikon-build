import { describe, expect, it } from 'vitest';
import {
  VIEW_AZIMUTH_DEG,
  VIEW_ELEVATION_DEG,
  cameraDirection,
  projectToView,
  viewBasis,
} from '../../../app/lib/configurator/viewProjection';
import { PX_PER_METRE, project } from '../../../app/lib/configurator/isometricProjection';

// The viewing counterpart to the geometry parity tests. Those stop the two renderers drawing
// different buildings; these stop them looking at the same building from different places.

describe('shared view basis', () => {
  it('places the camera on the FRONT side, so the z = 0 facade is the one you see', () => {
    // Getting this sign wrong hid the front wall behind the building's own volume in an earlier
    // spike — the wall rendered perfectly and simply faced away.
    expect(cameraDirection().z).toBeLessThan(0);
    expect(cameraDirection().y).toBeGreaterThan(0);
  });

  it('is a right-handed orthonormal basis', () => {
    const { right, up } = viewBasis();
    const len = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);
    const dot = (a: typeof right, b: typeof right) => a.x * b.x + a.y * b.y + a.z * b.z;

    expect(len(right)).toBeCloseTo(1, 9);
    expect(len(up)).toBeCloseTo(1, 9);
    expect(dot(right, up)).toBeCloseTo(0, 9);
  });

  it('keeps the world vertical vertical on screen', () => {
    expect(projectToView({ x: 0, y: 1, z: 0 }).x).toBeCloseTo(0, 9);
  });

  it('is a parallel projection — no depth-dependent scaling', () => {
    const a = projectToView({ x: 0, y: 0, z: 0 });
    const b = projectToView({ x: 0, y: 0, z: 50 });
    const c = projectToView({ x: 0, y: 0, z: 100 });

    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(Math.hypot(c.x - b.x, c.y - b.y), 9);
  });
});

describe('technical view and 3D camera share one perspective', () => {
  it('projects through the shared basis, not a private angle of its own', () => {
    // The SVG renderer must be the shared projection times a scale, and nothing else. If someone
    // reintroduces a local angle here, these stop matching.
    for (const point of [
      { x: 0, y: 0, z: 0 },
      { x: 24, y: 8, z: 60 },
      { x: 60, y: 15, z: 120 },
      { x: 12, y: 10.6, z: 37 },
    ]) {
      const shared = projectToView(point);
      const drawn = project(point);

      expect(drawn.x).toBeCloseTo(shared.x * PX_PER_METRE, 9);
      expect(drawn.y).toBeCloseTo(shared.y * PX_PER_METRE, 9);
    }
  });

  it('pins the angles both renderers are built around', () => {
    // Changing either of these changes BOTH views together, which is the point. They are asserted
    // so the change is a deliberate edit to a test rather than a silent drift in one renderer.
    expect(VIEW_ELEVATION_DEG).toBe(28);
    expect(VIEW_AZIMUTH_DEG).toBe(-45);
  });

  it('recedes the length axis to the upper right and the width axis to the upper left', () => {
    const alongLength = projectToView({ x: 0, y: 0, z: 10 });
    const alongWidth = projectToView({ x: 10, y: 0, z: 0 });

    expect(alongLength.x).toBeGreaterThan(0);
    expect(alongWidth.x).toBeLessThan(0);
    // Both recede upward: the camera looks down at the object.
    expect(alongLength.y).toBeLessThan(0);
    expect(alongWidth.y).toBeLessThan(0);
  });
});
