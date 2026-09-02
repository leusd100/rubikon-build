import type { ScenePrimitive, SceneModel } from './sceneModel';
import type { EnvelopeChoice } from './types';

// The SVG renderer's own projection step: takes a renderer-neutral SceneModel (metres) and
// produces plain {x,y} pixel points. This is the *only* place isometric trigonometry, pixel
// scale, and rendering-only choices like "how much ground to show around the footprint" live —
// a future renderer (R3F, etc.) consumes the same SceneModel and does its own projection (or
// none, if it works in real 3D space directly), never this module.

// One shared scale for width, length AND height on purpose — a true isometric cube, not a
// fudged one. A much longer building should genuinely look elongated; the SVG's viewBox (see
// `bounds` below) auto-fits around whatever shape results, so an extreme aspect ratio never
// clips instead of being visually dishonest.
export const PX_PER_METRE = 8;
const ISO_ANGLE_RAD = Math.PI / 6; // 30°, the standard isometric receding angle
const FOUNDATION_OVERHANG_PX = 10;
const FOUNDATION_THICKNESS_PX = 10;
const TERRAIN_MARGIN_RATIO = 0.3; // how far the ground reference extends past the footprint —
                                   // a rendering/framing choice, not a fact about the object.

export type Point = { x: number; y: number };

export function pointsAttr(points: Point[]): string {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function isoOffset(depthPx: number): Point {
  return { x: Math.cos(ISO_ANGLE_RAD) * depthPx, y: -Math.sin(ISO_ANGLE_RAD) * depthPx };
}

function translate(p: Point, offset: Point): Point {
  return { x: p.x + offset.x, y: p.y + offset.y };
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export type BoxFace = { points: Point[]; hasFill: boolean; envelope: EnvelopeChoice | undefined };

/** One structural bay's worth of cladding — a sub-quad of the full front/side/roof plane. */
export type ProjectedSegment = { points: Point[]; hasFill: boolean; envelope: EnvelopeChoice | undefined };

/** One structural member's projected line, plus whether the scope that member belongs to is
 * currently on — carried through rather than filtered out, same as `ProjectedSegment.hasFill`,
 * so the renderer can animate a member fading out instead of it just disappearing the instant
 * `visible` flips false. */
export type FrameLine = { points: [Point, Point]; visible: boolean };

export type FrameLines = {
  frontColumns: FrameLine[];
  sideColumns: FrameLine[];
  trusses: FrameLine[];
  purlins: FrameLine[];
};

export type GateRect = { points: Point[] };

export type DimensionGuide = {
  line: [Point, Point];
  ticks: [[Point, Point], [Point, Point]];
  label: Point;
  anchor: 'middle' | 'start' | 'end';
  valueM: number;
};

export type IsometricScene = {
  terrain: Point[];
  /** Always the slab's real footprint polygon, regardless of `scope.foundation` — never `null`.
   * Geometry is a fact about the object; whether to *show* it (and how to animate that) is the
   * renderer's call, driven by the primitive's own `visible` flag via the build-up lifecycle, not
   * by this module withholding the points. */
  foundation: { points: Point[]; visible: boolean };
  frame: FrameLines;
  wallSegments: { front: ProjectedSegment[]; side: ProjectedSegment[] };
  roofSegments: ProjectedSegment[];
  gates: GateRect[];
  dimensions: { width: DimensionGuide; length: DimensionGuide; height: DimensionGuide };
  /** Tight bounding box around every element above, in the same local coordinate space. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

function findPrimitives<K extends ScenePrimitive['kind']>(
  scene: SceneModel,
  kind: K,
): Extract<ScenePrimitive, { kind: K }>[] {
  return scene.primitives.filter((p): p is Extract<ScenePrimitive, { kind: K }> => p.kind === kind);
}

/**
 * Pure: a SceneModel in, an isometric scene of plain {x,y} points out. No React, no DOM —
 * `HangarPreview` is the only thing that turns this into actual SVG markup. Stays
 * unit-testable on its own (see tests/unit/configurator/isometricProjection.test.ts).
 */
export function projectIsometricScene(scene: SceneModel): IsometricScene {
  const { widthM, lengthM, heightM } = scene.dimensions;
  const W = widthM * PX_PER_METRE;
  const H = heightM * PX_PER_METRE;
  const depthPx = lengthM * PX_PER_METRE;
  const iso = isoOffset(depthPx);

  const FTL: Point = { x: 0, y: 0 };
  const FTR: Point = { x: W, y: 0 };
  const FBL: Point = { x: 0, y: H };
  const FBR: Point = { x: W, y: H };
  const BTL = translate(FTL, iso);
  const BTR = translate(FTR, iso);
  const BBR = translate(FBR, iso);

  const terrain = buildTerrainPolygon(W, H, depthPx);

  const foundationPrimitive = findPrimitives(scene, 'foundation-slab')[0];
  const foundationPolygon = buildFoundationPolygon(W, H, depthPx);
  const foundation = { points: foundationPolygon, visible: foundationPrimitive?.visible ?? false };

  const frontColumns: FrameLine[] = findPrimitives(scene, 'frame-column')
    .filter((p) => p.face === 'front')
    .map((p) => {
      const t = p.positionM / widthM;
      return { points: [lerp(FTL, FTR, t), lerp(FBL, FBR, t)] as [Point, Point], visible: p.visible };
    });
  const sideColumns: FrameLine[] = findPrimitives(scene, 'frame-column')
    .filter((p) => p.face === 'side')
    .map((p) => {
      const t = p.positionM / lengthM;
      return { points: [lerp(FTR, BTR, t), lerp(FBR, BBR, t)] as [Point, Point], visible: p.visible };
    });

  const trusses: FrameLine[] = findPrimitives(scene, 'frame-truss').map((truss) => {
    const depthOffset = isoOffset(truss.positionM * PX_PER_METRE);
    return {
      points: [translate(FTL, depthOffset), translate(FTR, depthOffset)] as [Point, Point],
      visible: truss.visible,
    };
  });

  const purlins: FrameLine[] = findPrimitives(scene, 'frame-purlin').map((purlin) => {
    // heightM here is the purlin's height *level* (already an absolute metre value from the
    // ground), not the building's full height — see sceneModel.ts's PURLIN_LEVELS.
    const levelY = H - purlin.positionM * PX_PER_METRE;
    const near: Point = { x: W, y: levelY };
    const far: Point = translate(near, isoOffset(purlin.lengthM * PX_PER_METRE));
    return { points: [near, far] as [Point, Point], visible: purlin.visible };
  });

  const wallSegments = {
    front: findPrimitives(scene, 'wall-segment')
      .filter((s) => s.face === 'front')
      .map((s) => projectFrontSegment(s, FTL, FTR, FBL, FBR)),
    side: findPrimitives(scene, 'wall-segment')
      .filter((s) => s.face === 'side')
      .map((s) => projectSideSegment(s, FTR, BTR, FBR, BBR)),
  };

  const roofSegments = findPrimitives(scene, 'roof-segment').map((s) => projectRoofSegment(s, FTL, FTR, BTL, BTR));

  const gatePrimitives = findPrimitives(scene, 'opening-cutout');
  const gateRects: GateRect[] = gatePrimitives.map((gate) => {
    const left = gate.positionM * PX_PER_METRE;
    const right = left + gate.widthM * PX_PER_METRE;
    const gateTop = H - gate.heightM * PX_PER_METRE;
    return {
      points: [
        { x: left, y: gateTop },
        { x: right, y: gateTop },
        { x: right, y: H },
        { x: left, y: H },
      ],
    };
  });

  const dims = {
    width: widthGuide(FBL, FBR, H, widthM),
    length: lengthGuide(FBR, BBR, iso, lengthM),
    height: heightGuide(FTL, FBL, heightM),
  };

  const allPoints = [
    ...terrain,
    ...foundationPolygon,
    ...frontColumns.flatMap((f) => f.points),
    ...sideColumns.flatMap((f) => f.points),
    ...trusses.flatMap((f) => f.points),
    ...purlins.flatMap((f) => f.points),
    ...wallSegments.front.flatMap((s) => s.points),
    ...wallSegments.side.flatMap((s) => s.points),
    ...roofSegments.flatMap((s) => s.points),
    ...gateRects.flatMap((g) => g.points),
    dims.width.line[0], dims.width.line[1], dims.width.label,
    dims.length.line[0], dims.length.line[1], dims.length.label,
    dims.height.line[0], dims.height.line[1], dims.height.label,
  ];

  return {
    terrain,
    foundation,
    frame: { frontColumns, sideColumns, trusses, purlins },
    wallSegments,
    roofSegments,
    gates: gateRects,
    dimensions: dims,
    bounds: boundsOf(allPoints),
  };
}

function projectFrontSegment(
  segment: Extract<ScenePrimitive, { kind: 'wall-segment' }>,
  FTL: Point,
  FTR: Point,
  FBL: Point,
  FBR: Point,
): ProjectedSegment {
  const t0 = segment.index / segment.segmentCount;
  const t1 = (segment.index + 1) / segment.segmentCount;
  const points = [lerp(FTL, FTR, t0), lerp(FTL, FTR, t1), lerp(FBL, FBR, t1), lerp(FBL, FBR, t0)];
  return { points, hasFill: segment.hasFill, envelope: segment.envelope };
}

function projectSideSegment(
  segment: Extract<ScenePrimitive, { kind: 'wall-segment' }>,
  FTR: Point,
  BTR: Point,
  FBR: Point,
  BBR: Point,
): ProjectedSegment {
  const t0 = segment.index / segment.segmentCount;
  const t1 = (segment.index + 1) / segment.segmentCount;
  const points = [lerp(FTR, BTR, t0), lerp(FTR, BTR, t1), lerp(FBR, BBR, t1), lerp(FBR, BBR, t0)];
  return { points, hasFill: segment.hasFill, envelope: segment.envelope };
}

function projectRoofSegment(
  segment: Extract<ScenePrimitive, { kind: 'roof-segment' }>,
  FTL: Point,
  FTR: Point,
  BTL: Point,
  BTR: Point,
): ProjectedSegment {
  const t0 = segment.index / segment.segmentCount;
  const t1 = (segment.index + 1) / segment.segmentCount;
  const points = [lerp(FTL, BTL, t0), lerp(FTR, BTR, t0), lerp(FTR, BTR, t1), lerp(FTL, BTL, t1)];
  return { points, hasFill: segment.hasFill, envelope: segment.envelope };
}

function buildFoundationPolygon(W: number, H: number, depthPx: number): Point[] {
  const foundationIso = isoOffset(depthPx + FOUNDATION_OVERHANG_PX * 2);
  const fFTL: Point = { x: -FOUNDATION_OVERHANG_PX, y: H };
  const fFTR: Point = { x: W + FOUNDATION_OVERHANG_PX, y: H };
  const fFBL: Point = { x: -FOUNDATION_OVERHANG_PX, y: H + FOUNDATION_THICKNESS_PX };
  const fFBR: Point = { x: W + FOUNDATION_OVERHANG_PX, y: H + FOUNDATION_THICKNESS_PX };
  const fBTR = translate(fFTR, foundationIso);
  const fBBR = translate(fFBR, foundationIso);
  return [fFTL, fFTR, fBTR, fBBR, fFBR, fFBL];
}

/** A flat ground reference, larger than the footprint by a fixed ratio — framing/context only,
 * never toggled by scope. Deliberately included in scene bounds (see `allPoints` below): a
 * little visible ground around the object is the point, not an accident to exclude. */
function buildTerrainPolygon(W: number, H: number, depthPx: number): Point[] {
  const marginPx = Math.max(W, depthPx) * TERRAIN_MARGIN_RATIO;
  const tFTL: Point = { x: -marginPx, y: H };
  const tFTR: Point = { x: W + marginPx, y: H };
  const tIso = isoOffset(depthPx + marginPx * 2);
  const tBTL = translate(tFTL, tIso);
  const tBTR = translate(tFTR, tIso);
  return [tFTL, tFTR, tBTR, tBTL];
}

function widthGuide(FBL: Point, FBR: Point, wallHeightPx: number, valueM: number): DimensionGuide {
  const offset = wallHeightPx * 0.28 + 20;
  const a = { x: FBL.x, y: FBL.y + offset };
  const b = { x: FBR.x, y: FBR.y + offset };
  return {
    line: [a, b],
    ticks: [
      [{ x: a.x, y: a.y - 6 }, { x: a.x, y: a.y + 6 }],
      [{ x: b.x, y: b.y - 6 }, { x: b.x, y: b.y + 6 }],
    ],
    label: { x: (a.x + b.x) / 2, y: a.y + 20 },
    anchor: 'middle',
    valueM,
  };
}

function lengthGuide(FBR: Point, BBR: Point, iso: Point, valueM: number): DimensionGuide {
  const perpendicular = { x: iso.y, y: -iso.x };
  const norm = Math.hypot(perpendicular.x, perpendicular.y) || 1;
  const offsetDist = 26;
  const offset = { x: (perpendicular.x / norm) * offsetDist, y: (perpendicular.y / norm) * offsetDist };
  const a = translate(FBR, offset);
  const b = translate(BBR, offset);
  const mid = lerp(a, b, 0.5);
  const labelOffset = { x: (perpendicular.x / norm) * 16, y: (perpendicular.y / norm) * 16 };
  return {
    line: [a, b],
    ticks: [
      [{ x: a.x - 6, y: a.y }, { x: a.x + 6, y: a.y }],
      [{ x: b.x - 6, y: b.y }, { x: b.x + 6, y: b.y }],
    ],
    label: translate(mid, labelOffset),
    anchor: 'middle',
    valueM,
  };
}

function heightGuide(FTL: Point, FBL: Point, valueM: number): DimensionGuide {
  const offset = -28;
  const a = { x: FTL.x + offset, y: FTL.y };
  const b = { x: FBL.x + offset, y: FBL.y };
  return {
    line: [a, b],
    ticks: [
      [{ x: a.x - 6, y: a.y }, { x: a.x + 6, y: a.y }],
      [{ x: b.x - 6, y: b.y }, { x: b.x + 6, y: b.y }],
    ],
    label: { x: a.x - 10, y: (a.y + b.y) / 2 },
    anchor: 'end',
    valueM,
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
