import type { ScenePrimitive, TechnicalSceneModel, Vec3 } from './technicalSceneModel';
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
// 24°, not the textbook 30° (Visual Refinement Pass v1): a shallower angle spends less of the
// vertical rise on the receding depth axis, leaving more of the frame for the front elevation.
const ISO_ANGLE_RAD = (24 * Math.PI) / 180;

const ISO_COS = Math.cos(ISO_ANGLE_RAD);
const ISO_SIN = Math.sin(ISO_ANGLE_RAD);

export type Point = { x: number; y: number };

/**
 * Building space (metres, Y-up, Z into the scene) → screen space (pixels, Y-down).
 *
 * The ONE place a 3D point becomes a 2D point. Screen Y is negated because building Y is up
 * while SVG Y grows downward; the bounds-fitted viewBox absorbs the resulting offset, so the
 * drawing is framed identically regardless of the building's absolute height.
 */
export function project(v: Vec3): Point {
  return {
    // `+ 0` normalises negative zero: the Y term negates, so a point on the ground line would
    // otherwise serialise as -0 and compare unequal to 0 for any consumer using strict equality.
    x: v.x * PX_PER_METRE + ISO_COS * v.z * PX_PER_METRE + 0,
    y: -v.y * PX_PER_METRE - ISO_SIN * v.z * PX_PER_METRE + 0,
  };
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
  const terrain = terrainPrimitive ? projectAll(terrainPrimitive.corners) : [];

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

  const dims = {
    width: widthGuide(widthM, eaveHeightM),
    length: lengthGuide(widthM, lengthM, eaveHeightM),
    eave: heightGuide(eaveHeightM, -28, false),
    ridge: heightGuide(ridgeHeightM, -62, true),
  };

  const allPoints = [
    ...terrain,
    ...foundationPoints,
    ...columns.flatMap((f) => f.points),
    ...rafters.flatMap((f) => f.points),
    ...purlins.flatMap((f) => f.points),
    ...(ridge ? ridge.points : []),
    ...wallSegments.flatMap((s) => s.points),
    ...gableEnds.flatMap((s) => s.points),
    ...roofSegments.flatMap((s) => s.points),
    ...gates.flatMap((g) => g.points),
    ...Object.values(dims).flatMap((d) => [d.line[0], d.line[1], d.label, ...labelExtent(d)]),
  ];

  return {
    terrain,
    foundation,
    frame: { columns, rafters, purlins, ridge },
    wallSegments,
    gableEnds,
    roofSegments,
    gates,
    dimensions: dims,
    bounds: boundsOf(allPoints),
  };
}

/** Below the front elevation, running along the width. */
function widthGuide(widthM: number, eaveHeightM: number): DimensionGuide {
  const a = project({ x: 0, y: 0, z: 0 });
  const b = project({ x: widthM, y: 0, z: 0 });
  const offset = eaveHeightM * PX_PER_METRE * 0.28 + 20;
  const A = { x: a.x, y: a.y + offset };
  const B = { x: b.x, y: b.y + offset };
  return {
    line: [A, B],
    ticks: [
      [{ x: A.x, y: A.y - 6 }, { x: A.x, y: A.y + 6 }],
      [{ x: B.x, y: B.y - 6 }, { x: B.x, y: B.y + 6 }],
    ],
    label: { x: (A.x + B.x) / 2, y: A.y + 20 },
    anchor: 'middle',
    text: labelText(widthM, false),
    valueM: widthM,
    derived: false,
  };
}

/** Offset perpendicular to the receding side wall. Scales with eave height — a flat offset put
 *  the guide inside the side-wall polygon at every hangar size (confirmed by point-in-polygon
 *  testing, not a bounding-box approximation, which under-reports this class of overlap). */
function lengthGuide(widthM: number, lengthM: number, eaveHeightM: number): DimensionGuide {
  const a = project({ x: widthM, y: 0, z: 0 });
  const b = project({ x: widthM, y: 0, z: lengthM });
  const dir = { x: b.x - a.x, y: b.y - a.y };
  const perpendicular = { x: dir.y, y: -dir.x };
  const norm = Math.hypot(perpendicular.x, perpendicular.y) || 1;
  const offsetDist = eaveHeightM * PX_PER_METRE * 0.9 + 40;
  const off = { x: (perpendicular.x / norm) * offsetDist, y: (perpendicular.y / norm) * offsetDist };
  const A = { x: a.x + off.x, y: a.y + off.y };
  const B = { x: b.x + off.x, y: b.y + off.y };
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  const labelOff = { x: (perpendicular.x / norm) * 16, y: (perpendicular.y / norm) * 16 };
  return {
    line: [A, B],
    ticks: [
      [{ x: A.x - 6, y: A.y }, { x: A.x + 6, y: A.y }],
      [{ x: B.x - 6, y: B.y }, { x: B.x + 6, y: B.y }],
    ],
    label: { x: mid.x + labelOff.x, y: mid.y + labelOff.y },
    anchor: 'middle',
    text: labelText(lengthM, false),
    valueM: lengthM,
    derived: false,
  };
}

/**
 * A vertical guide at the front-left corner. Two of these stack as a nested dimension chain —
 * eave inside, ridge outside — which is ordinary technical-drawing practice and keeps the
 * derived ridge value visually subordinate to the height the user actually chose.
 */
function heightGuide(valueM: number, offsetPx: number, derived: boolean): DimensionGuide {
  const base = project({ x: 0, y: 0, z: 0 });
  const top = project({ x: 0, y: valueM, z: 0 });
  const A = { x: top.x + offsetPx, y: top.y };
  const B = { x: base.x + offsetPx, y: base.y };
  return {
    line: [A, B],
    ticks: [
      [{ x: A.x - 6, y: A.y }, { x: A.x + 6, y: A.y }],
      [{ x: B.x - 6, y: B.y }, { x: B.x + 6, y: B.y }],
    ],
    // A nested chain puts two labels on the same short stretch of drawing, and centring both
    // collides them (confirmed on screen: "Коник ~10.6 м" ran straight into "8 м"). The derived
    // outer guide is annotated at its own top tick — beside the ridge height it actually marks —
    // while the user-set inner guide keeps the conventional centred position.
    label: derived ? { x: A.x - 10, y: A.y + 5 } : { x: A.x - 10, y: (A.y + B.y) / 2 },
    anchor: 'end',
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
