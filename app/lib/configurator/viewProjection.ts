import type { Vec3 } from './parametricModel';

// ─────────────────────────────────────────────────────────────────────────────
// THE SINGLE SOURCE OF VIEWING TRUTH
//
// One camera definition, consumed by both renderers: the SVG technical view projects through
// `projectToView()` below, and the R3F camera is positioned along `cameraDirection()`. Neither
// defines an angle of its own.
//
// This module exists for the same reason ParametricBuildingModel does. The two views previously
// agreed on the object but not on how to look at it: the technical drawing used an OBLIQUE
// projection (+X straight to the right, +Z receding up-right) while the 3D used a real camera.
// Those cannot be reconciled by tuning numbers — an oblique projection corresponds to no actual
// viewpoint. With a real camera positioned to see the front facade (z = 0), the width and length
// axes necessarily fall to opposite sides of the screen; an oblique projection simply ignores
// that. The result was a subtly mirrored width axis: the technical view showed the x = widthM
// wall, the 3D showed the x = 0 wall.
//
// Unifying meant making the technical view a TRUE axonometric. It is also the more honest
// drawing: every point now corresponds to a viewpoint a person could actually stand at.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The camera of the drawing office's rectangular dimetric (12.10), the projection /angary's drawings are made in —
 * «Загальний вигляд» and «Каркас» (app/components/angary/dimetric.ts: the span at 7°10′ in true size, the length at
 * 41°25′ in half size, the height upright). That dimetric is an orthographic view from a real place: the span and the
 * height foreshortened alike, the length twice as much, which an elevation of asin(1/3) and an azimuth of asin(1/√8)
 * give. Until 12.10 the 3D looked from 45° and 28°, and «Подивитися в 3D» turned the hangar the drawings had just shown
 * — the front end wall went from nearly face-on to a narrow side, the gates with it; now the 3D is the same picture in
 * volume. (28° was chosen between the old drawing's 24° and a true isometric's 35.3° to keep the bays apart; the
 * dimetric's 19.5° still parts them, as «Каркас» draws them.)
 */
export const VIEW_ELEVATION_DEG = Math.asin(1 / 3) / (Math.PI / 180);

/**
 * Rotation about the vertical axis. Negative keeps the camera on the FRONT side (the domain's
 * front facade is at z = 0) and makes the length axis recede to the upper right, which is the
 * composition the drawing has always had. Getting this sign wrong hid the front wall behind the
 * building's own volume in an earlier spike. −20.7° (12.10, was −45°): the front end wall nearly face-on, as the
 * dimetric draws it.
 */
export const VIEW_AZIMUTH_DEG = -Math.asin(1 / Math.sqrt(8)) / (Math.PI / 180);

const DEG = Math.PI / 180;

export type ScreenPoint = { x: number; y: number };

/** Unit vector from the look-at target toward the camera. */
export function cameraDirection(): Vec3 {
  const el = VIEW_ELEVATION_DEG * DEG;
  const az = VIEW_AZIMUTH_DEG * DEG;
  const horizontal = Math.cos(el);
  return {
    x: horizontal * Math.sin(az),
    y: Math.sin(el),
    z: -horizontal * Math.cos(az),
  };
}

function normalise(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** The camera's right and up axes in world space — the basis both renderers share. */
export function viewBasis(): { right: Vec3; up: Vec3 } {
  const dir = cameraDirection();
  const forward = { x: -dir.x, y: -dir.y, z: -dir.z };
  const right = normalise(cross(forward, { x: 0, y: 1, z: 0 }));
  return { right, up: cross(right, forward) };
}

const BASIS = viewBasis();

/**
 * Orthographic projection of a metre-space point into screen space, still in metres. Screen Y is
 * negated because world Y is up while SVG's Y grows downward; a renderer applies its own scale.
 *
 * `+ 0` normalises negative zero, which would otherwise serialise as `-0` and compare unequal to
 * `0` for any consumer using strict equality.
 */
export function projectToView(point: Vec3): ScreenPoint {
  return {
    x: dot(point, BASIS.right) + 0,
    y: -dot(point, BASIS.up) + 0,
  };
}
