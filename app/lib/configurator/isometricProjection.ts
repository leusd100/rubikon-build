import type { ScenePrimitive, TechnicalSceneModel, Vec3 } from './technicalSceneModel';
import { projectToView } from './viewProjection';
import type { EnvelopeChoice } from './types';

// The SVG renderer's projection step: takes the TechnicalSceneModel's real metre points and
// produces plain {x,y} pixel points.
//
// Phase 3-0 reduced this module's job to exactly that. It used to *derive the building* —
// computing every corner from `dimensions` and lerping primitives between them — which meant
// the shape of the hangar lived in the SVG renderer. It doesn't any more: `project()` below is
// a pure axonometric transform, and the only thing this file still authors is annotation
// placement, which is genuinely 2D-drawing-specific and does not transfer to a 3D renderer.

// One shared scale for width, length AND height — a true axonometric, not a fudged one.
export const PX_PER_METRE = 8;

export type Point = { x: number; y: number };

/**
 * Building space (metres, Y-up) → screen space (pixels, Y-down).
 *
 * The angle is NOT defined here: it comes from viewProjection.ts, the one camera definition the
 * 3D renderer also uses. This module only applies the metre-to-pixel scale. Before that module
 * existed the drawing used its own oblique projection and the two views were subtly mirrored
 * against each other along the width axis.
 */
export function project(v: Vec3): Point {
  const p = projectToView(v);
  return { x: p.x * PX_PER_METRE, y: p.y * PX_PER_METRE };
}

function projectAll(points: Vec3[]): Point[] {
  return points.map(project);
}

export function pointsAttr(points: Point[]): string {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A projected envelope surface. `face`/`slope` are carried through from the scene model so
 *  consumers can pick surfaces by identity instead of re-correlating them by array index. */
export type ProjectedSegment = {
  points: Point[];
  hasFill: boolean;
  envelope: EnvelopeChoice | undefined;
  face?: 'front' | 'rear' | 'left' | 'right';
  slope?: 'left' | 'right';
};

/** One structural member's projected line, plus whether its scope is currently on — carried
 *  through rather than filtered out so the renderer can animate a member fading out. */
export type FrameLine = { points: [Point, Point]; visible: boolean };

export type FrameLines = {
  columns: FrameLine[];
  rafters: FrameLine[];
  purlins: FrameLine[];
  ridge: FrameLine | null;
};

export type DimensionGuide = {
  line: [Point, Point];
  ticks: [[Point, Point], [Point, Point]];
  label: Point;
  anchor: 'middle' | 'start' | 'end';
  /** The exact string the renderer draws. Owned here, not in the component, because the bounds
   *  calculation has to know how wide the label will be — see `labelExtent()`. */
  text: string;
  valueM: number;
  derived: boolean;
};

/** Font sizes the stylesheet gives dimension labels, mirrored here only to estimate extents. */
const LABEL_FONT_PX = 16;
const DERIVED_LABEL_FONT_PX = 14;
/** Condensed 600-weight averages well under 0.6em per glyph; 0.62 leaves deliberate headroom. */
const LABEL_CHAR_WIDTH_EM = 0.62;

function formatMetres(value: number): string {
  // Ukrainian decimal comma, matching the control panel's own readouts — the drawing and the
  // fields must not print the same number two different ways.
  return value.toLocaleString('uk-UA', { maximumFractionDigits: 1 });
}

function labelText(valueM: number, derived: boolean): string {
  // The ridge keeps its name (it labels *which* height) but no longer carries a "~": since the
  // ridge became a user-adjustable value rather than an output of the span rule, an approximation
  // marker would misrepresent it as something the tool guessed.
  return derived ? `Коник ${formatMetres(valueM)} м` : `${formatMetres(valueM)} м`;
}

/**
 * The horizontal span a label will actually occupy once rendered.
 *
 * Bounds used to include only the label's anchor POINT, which silently clipped any label wider
 * than the margin the terrain happened to provide. It went unnoticed because the default 24×60
 * hangar has a terrain polygon reaching x≈-138 — far past the labels — while a narrow 14×20 one
 * reaches only x≈-46 and cut the leading digit off the ridge value ("15.7 м" rendered as "5.7 м").
 * Estimated rather than measured on purpose: this module is pure and has no DOM to measure with.
 */
function labelExtent(guide: Omit<DimensionGuide, 'ticks' | 'line'>): Point[] {
  const fontPx = guide.derived ? DERIVED_LABEL_FONT_PX : LABEL_FONT_PX;
  const width = guide.text.length * fontPx * LABEL_CHAR_WIDTH_EM;
  const { x, y } = guide.label;
  const left = guide.anchor === 'end' ? x - width : guide.anchor === 'middle' ? x - width / 2 : x;
  return [
    { x: left, y: y - fontPx },
    { x: left + width, y: y + fontPx * 0.35 },
  ];
}

export type IsometricScene = {
  terrain: Point[];
  foundation: { points: Point[]; visible: boolean };
  frame: FrameLines;
  wallSegments: ProjectedSegment[];
  gableEnds: ProjectedSegment[];
  roofSegments: ProjectedSegment[];
  gates: { points: Point[] }[];
  dimensions: {
    width: DimensionGuide;
    length: DimensionGuide;
    eave: DimensionGuide;
    ridge: DimensionGuide;
  };
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

function findPrimitives<K extends ScenePrimitive['kind']>(
  scene: TechnicalSceneModel,
  kind: K,
): Extract<ScenePrimitive, { kind: K }>[] {
  return scene.primitives.filter((p): p is Extract<ScenePrimitive, { kind: K }> => p.kind === kind);
}

/**
 * Slab silhouette: the top face plus the two side faces the camera can see, so the foundation
 * still reads as a slab with thickness rather than a flat outline. Derived from the slab's real
 * corners — the thickness extrusion direction is the only rendering choice here.
 */
function foundationSilhouette(corners: Vec3[], thicknessM: number): Point[] {
  const [fl, fr, br] = [corners[0], corners[1], corners[2]];
  const drop = (v: Vec3): Vec3 => ({ x: v.x, y: v.y - thicknessM, z: v.z });
  return projectAll([fl, fr, br, drop(br), drop(fr), drop(fl)]);
}

/**
 * Pure: a TechnicalSceneModel in, an isometric scene of plain {x,y} points out. No React, no
 * DOM — `HangarPreview` is the only thing that turns this into actual SVG markup.
 */
export function projectIsometricScene(scene: TechnicalSceneModel): IsometricScene {
  const { widthM, lengthM, eaveHeightM, ridgeHeightM } = scene.dimensions;

  const terrainPrimitive = findPrimitives(scene, 'terrain-plane')[0];
  const rawTerrain = terrainPrimitive ? projectAll(terrainPrimitive.corners) : [];

  const slabPrimitive = findPrimitives(scene, 'foundation-slab')[0];
  const foundationPoints = slabPrimitive
    ? foundationSilhouette(slabPrimitive.corners, slabPrimitive.thicknessM)
    : [];
  const foundation = { points: foundationPoints, visible: slabPrimitive?.visible ?? false };

  const asLine = (p: { a: Vec3; b: Vec3; visible: boolean }): FrameLine => ({
    points: [project(p.a), project(p.b)],
    visible: p.visible,
  });

  const columns = findPrimitives(scene, 'frame-column').map(asLine);
  const rafters = findPrimitives(scene, 'frame-rafter').map(asLine);
  const purlins = findPrimitives(scene, 'frame-purlin').map(asLine);
  const ridgePrimitive = findPrimitives(scene, 'ridge-line')[0];
  const ridge = ridgePrimitive ? asLine(ridgePrimitive) : null;

  const wallSegments: ProjectedSegment[] = findPrimitives(scene, 'wall-segment').map((s) => ({
    points: projectAll(s.corners),
    hasFill: s.hasFill,
    envelope: s.envelope,
    face: s.face,
  }));

  const gableEnds: ProjectedSegment[] = findPrimitives(scene, 'gable-end').map((g) => ({
    points: projectAll(g.outline),
    hasFill: g.hasFill,
    envelope: g.envelope,
    face: g.face,
  }));

  const roofSegments: ProjectedSegment[] = findPrimitives(scene, 'roof-segment').map((s) => ({
    points: projectAll(s.corners),
    hasFill: s.hasFill,
    envelope: s.envelope,
    slope: s.slope,
  }));

  const gates = findPrimitives(scene, 'opening-cutout').map((g) => ({ points: projectAll(g.corners) }));

  // The building's own projected extent drives guide placement and framing. The terrain is
  // deliberately NOT part of it: it is staging, and letting it set the bounds is what made the
  // hangar occupy a fraction of the viewport while the 3D view filled its frame.
  const buildingPoints = [
    ...foundationPoints,
    ...wallSegments.flatMap((s) => s.points),
    ...gableEnds.flatMap((s) => s.points),
    ...roofSegments.flatMap((s) => s.points),
    ...columns.flatMap((f) => f.points),
    ...rafters.flatMap((f) => f.points),
  ];
  const buildingBounds = boundsOf(buildingPoints);
  const centroid = {
    x: (buildingBounds.minX + buildingBounds.maxX) / 2,
    y: (buildingBounds.minY + buildingBounds.maxY) / 2,
  };

  // Offsets scale with the building so guides clear it at every size instead of at one.
  const footprintPx = Math.max(buildingBounds.maxX - buildingBounds.minX, 1);
  const edgeOffset = Math.max(26, Math.min(footprintPx * 0.06, 54));
  const heightOffset = Math.max(30, Math.min(footprintPx * 0.05, 46));

  const dims = {
    width: edgeGuide({ x: 0, y: 0, z: 0 }, { x: widthM, y: 0, z: 0 }, centroid, edgeOffset, widthM),
    length: edgeGuide({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: lengthM }, centroid, edgeOffset, lengthM),
    // Both height chains hang off the same corner — the one the width edge ends at, which the
    // camera basis puts on the outside of the drawing.
    eave: heightGuide({ x: widthM, y: 0, z: 0 }, centroid, eaveHeightM, heightOffset, false),
    ridge: heightGuide({ x: widthM, y: 0, z: 0 }, centroid, ridgeHeightM, heightOffset + 34, true),
  };

  const allPoints = [
    ...buildingPoints,
    ...(ridge ? ridge.points : []),
    ...gates.flatMap((g) => g.points),
    ...Object.values(dims).flatMap((d) => [d.line[0], d.line[1], d.label, ...labelExtent(d)]),
  ];

  // Framing centres on the BUILDING, not on the naive box around building+annotations combined.
  //
  // The eave/ridge height guides both hang off one corner and extend outward on ONE side only
  // (see the comment above `dims.eave`/`dims.ridge`) — a real, deliberate asymmetry in the
  // drawing's own annotation layout, not a bug. But `boundsOf(allPoints)` folding that straight
  // into the viewBox WAS one: SVG centres the viewBox inside its container by default (`xMidYMid`,
  // unset here), so a box that already leans toward one side because of a one-sided label put the
  // BUILDING itself well off-centre — measured on the default 24×60m hangar: ~174px of the box's
  // own width was the empty margin the label needed on its side, ~12px on the other, so the
  // building's own midpoint sat ~81px right of the box's midpoint. Caught live, not by this
  // module's own tests, which check clipping and building/guide relationships but never asserted
  // where the building ends up sitting inside its own frame.
  //
  // Fix: find how far annotations extend past the building's own edge on EACH side, then apply
  // the LARGER of each opposing pair symmetrically around the building's own bounds — guaranteeing
  // every label still has at least as much room as it needed (nothing new can clip), while the
  // building's own midpoint becomes the frame's midpoint on both axes. The side that needed less
  // room accepts a bit of unused margin; that trade is exactly what "the building is the subject"
  // means in practice.
  const rawBounds = boundsOf(allPoints);
  const marginLeft = Math.max(buildingBounds.minX - rawBounds.minX, 0);
  const marginRight = Math.max(rawBounds.maxX - buildingBounds.maxX, 0);
  const marginTop = Math.max(buildingBounds.minY - rawBounds.minY, 0);
  const marginBottom = Math.max(rawBounds.maxY - buildingBounds.maxY, 0);
  const marginX = Math.max(marginLeft, marginRight);
  const marginY = Math.max(marginTop, marginBottom);

  const bounds = {
    minX: buildingBounds.minX - marginX,
    maxX: buildingBounds.maxX + marginX,
    minY: buildingBounds.minY - marginY,
    maxY: buildingBounds.maxY + marginY,
  };

  // The terrain plane's own corners are a fixed margin in METRE space (terrainCorners in
  // technicalSceneModel.ts), but this projection is oblique — a uniform world-space margin does
  // NOT produce a uniform screen-space margin, because each corner's excess can land along either
  // screen axis depending on the building's own aspect ratio. On a long, narrow hangar this let
  // one corner's projected position land outside `bounds` (confirmed: a 24×80m hangar projects a
  // terrain corner to x≈588, ~89px past the ~500px right edge `bounds` itself computes) — visible
  // on screen as the terrain's stroke outline running off the edge of the drawing and getting hard
  // -clipped there, exactly the "territory exceeds the scene" a live check caught. `bounds`
  // deliberately excludes the terrain (see the comment above `buildingPoints`) so terrain must
  // never be allowed to WIDEN it — instead, clamp terrain's own points to fit inside whatever
  // `bounds` the building+guides already produced. Terrain is staging, not a technical claim, so
  // a corner landing exactly on the boundary rather than slightly past it costs nothing real.
  const terrain = rawTerrain.map((p) => ({
    x: Math.min(Math.max(p.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(p.y, bounds.minY), bounds.maxY),
  }));

  return {
    terrain,
    foundation,
    frame: { columns, rafters, purlins, ridge },
    wallSegments,
    gableEnds,
    roofSegments,
    gates,
    dimensions: dims,
    bounds,
  };
}

/**
 * Guide placement is computed RELATIVE TO THE DRAWING, not to a hard-coded axis direction.
 *
 * Which way is "outward" depends on the camera basis, and that basis now lives in one shared
 * module — so a guide that assumed "+X is screen-right" would silently point into the building
 * the moment the view changed. Each guide offsets perpendicular to its own edge, away from the
 * building's projected centroid, and picks its text anchor from the direction it ended up facing.
 */
function offsetAway(a: Point, b: Point, centroid: Point, distance: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  let px = dy / length;
  let py = -dx / length;

  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const towards = (sx: number, sy: number) => (mid.x + sx - centroid.x) ** 2 + (mid.y + sy - centroid.y) ** 2;
  if (towards(px, py) < towards(-px, -py)) {
    px = -px;
    py = -py;
  }

  return {
    A: { x: a.x + px * distance, y: a.y + py * distance },
    B: { x: b.x + px * distance, y: b.y + py * distance },
    nx: px,
    ny: py,
  };
}

/** Ticks sit along the guide's own direction, so they read as end stops whatever its angle. */
function ticksFor(A: Point, B: Point): [[Point, Point], [Point, Point]] {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const length = Math.hypot(dx, dy) || 1;
  const tx = (dy / length) * 6;
  const ty = (-dx / length) * 6;
  return [
    [{ x: A.x - tx, y: A.y - ty }, { x: A.x + tx, y: A.y + ty }],
    [{ x: B.x - tx, y: B.y - ty }, { x: B.x + tx, y: B.y + ty }],
  ];
}

function anchorFor(nx: number): DimensionGuide['anchor'] {
  if (nx < -0.4) return 'end';
  if (nx > 0.4) return 'start';
  return 'middle';
}

/** A guide along one edge of the footprint — used for both width and length. */
function edgeGuide(
  from: Vec3,
  to: Vec3,
  centroid: Point,
  distancePx: number,
  valueM: number,
): DimensionGuide {
  const { A, B, nx, ny } = offsetAway(project(from), project(to), centroid, distancePx);
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  return {
    line: [A, B],
    ticks: ticksFor(A, B),
    label: { x: mid.x + nx * 16, y: mid.y + ny * 16 + 5 },
    anchor: anchorFor(nx),
    text: labelText(valueM, false),
    valueM,
    derived: false,
  };
}

/**
 * A vertical guide, anchored at whichever front corner sits furthest from the drawing's centre —
 * so the height chain always lands in open space rather than across the building.
 */
function heightGuide(
  anchor: Vec3,
  centroid: Point,
  valueM: number,
  offsetPx: number,
  derived: boolean,
): DimensionGuide {
  const base = project({ x: anchor.x, y: 0, z: anchor.z });
  const top = project({ x: anchor.x, y: valueM, z: anchor.z });
  const direction = base.x <= centroid.x ? -1 : 1;
  const A = { x: top.x + offsetPx * direction, y: top.y };
  const B = { x: base.x + offsetPx * direction, y: base.y };
  return {
    line: [A, B],
    ticks: [
      [{ x: A.x - 6, y: A.y }, { x: A.x + 6, y: A.y }],
      [{ x: B.x - 6, y: B.y }, { x: B.x + 6, y: B.y }],
    ],
    // The derived ridge is annotated at its own top tick; centring both labels on such a short
    // shared stretch collided them.
    label: {
      x: A.x + 10 * direction,
      y: derived ? A.y + 5 : (A.y + B.y) / 2,
    },
    anchor: direction < 0 ? 'end' : 'start',
    text: labelText(valueM, derived),
    valueM,
    derived,
  };
}

function boundsOf(points: Point[]) {
  return points.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxX: Math.max(acc.maxX, p.x),
      maxY: Math.max(acc.maxY, p.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}
