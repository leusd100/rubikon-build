import { describe, expect, it } from 'vitest';
import {
  VIEW_AZIMUTH_DEG,
  VIEW_ELEVATION_DEG,
  cameraDirection,
  projectToView,
  viewBasis,
} from '../../../app/lib/configurator/viewProjection';
import { PX_PER_METRE, project } from '../../../app/lib/configurator/isometricProjection';
import { AD, AX } from '../../../app/components/angary/dimetric';

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
    // The rectangular dimetric's camera (12.10): sin(elevation) = 1/3, sin(azimuth) = −1/√8
    expect(Math.sin((VIEW_ELEVATION_DEG * Math.PI) / 180)).toBeCloseTo(1 / 3, 12);
    expect(Math.sin((VIEW_AZIMUTH_DEG * Math.PI) / 180)).toBeCloseTo(-1 / Math.sqrt(8), 12);
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

// 12.10: the 3D looked at /angary's hangar from 45° and 28°, while «Загальний вигляд» and «Каркас» draw it in the
// drawing office's rectangular dimetric (app/components/angary/dimetric.ts) — «Подивитися в 3D» turned the building.
// The camera is now that dimetric's: the same picture, in volume.
describe('the camera is the drawings\' rectangular dimetric', () => {
  const degrees = (p: { x: number; y: number }) => (Math.atan2(p.y, p.x) * 180) / Math.PI;
  const length = (p: { x: number; y: number }) => Math.hypot(p.x, p.y);
  // the sheet's x runs across the span towards the side wall the camera sees: the model's −x (camera's right is −x)
  const span = projectToView({ x: -1, y: 0, z: 0 });
  const along = projectToView({ x: 0, y: 0, z: 1 });
  const up = projectToView({ x: 0, y: 1, z: 0 });

  it('draws the span and the length at the drawings\' angles', () => {
    expect(degrees(span)).toBeCloseTo(degrees({ x: AX[0], y: AX[1] }), 1);
    expect(degrees(along)).toBeCloseTo(degrees({ x: AD[0], y: AD[1] }), 1);
  });

  it('keeps the dimetric\'s scales: the length at half the span and the height', () => {
    expect(length(along) / length(span)).toBeCloseTo(0.5, 9);
    expect(length(up) / length(span)).toBeCloseTo(1, 9);
  });
});
