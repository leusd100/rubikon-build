import type { ScenePrimitive, SceneModel } from './sceneModel';
import type { EnvelopeChoice } from './types';

// The SVG renderer's own projection step: takes a renderer-neutral SceneModel (metres) and
// produces plain {x,y} pixel points. This is the *only* place isometric trigonometry and pixel
// scale live — a future renderer (R3F, etc.) consumes the same SceneModel and does its own
// projection (or none, if it works in real 3D space directly), never this module.

// One shared scale for width, length AND height on purpose — a true isometric cube, not a
// fudged one. A much longer building should genuinely look elongated; the SVG's viewBox (see
// `bounds` below) auto-fits around whatever shape results, so an extreme aspect ratio never
// clips instead of being visually dishonest.
export const PX_PER_METRE = 8;
const ISO_ANGLE_RAD = Math.PI / 6; // 30°, the standard isometric receding angle
const FOUNDATION_OVERHANG_PX = 10;
const FOUNDATION_THICKNESS_PX = 10;

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

export type BoxFace = {
  points: Point[];
  hasFill: boolean;
  envelope: EnvelopeChoice | undefined;
};

export type BoxFaces = {
  /** Facade — the only face gates cut into. */
  front: BoxFace;
  /** Receding side face, depicts `length`. */
  side: BoxFace;
  /** Top face — doubles as the roof plane. */
  top: BoxFace;
};

export type FrameLines = {
  /** Vertical column lines on the front facade. */
  frontColumns: [Point, Point][];
  /** Vertical column lines on the side face. */
  sideColumns: [Point, Point][];
};

export type GateRect = { points: Point[] };

export type DimensionGuide = {
  /** The two ends of the dimension line itself (parallel to the measured edge, offset out). */
  line: [Point, Point];
  /** Short perpendicular ticks at each end, technical-drawing style (not arrowheads). */
  ticks: [[Point, Point], [Point, Point]];
  /** Where the numeric label should sit (already offset off the line). */
  label: Point;
  /** Text anchor to use for the label — keeps labels readable regardless of which edge. */
  anchor: 'middle' | 'start' | 'end';
  valueM: number;
};

export type IsometricScene = {
  box: BoxFaces;
  foundation: Point[] | null;
  frame: FrameLines;
  gates: GateRect[];
  dimensions: {
    width: DimensionGuide;
    length: DimensionGuide;
    height: DimensionGuide;
  };
  /** Tight bounding box around every element above, in the same local coordinate space. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

/**
 * Pure: a SceneModel in, an isometric scene of plain {x,y} points out. No React, no DOM —
 * `HangarPreview` is the only thing that turns this into actual SVG markup. Stays
 * unit-testable on its own (see tests/unit/configurator/isometricProjection.test.ts).
 *
 * Note this deliberately ignores `frame-truss` primitives — the current SVG rendering has no
 * visual concept of a truss distinct from a column line, and this batch's brief is "adapt to
 * SceneModel without a visual redesign". The R3F spike is the renderer that does render trusses.
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

  const frontPanel = findPrimitive(scene, 'envelope-panel', (p) => p.face === 'front');
  const sidePanel = findPrimitive(scene, 'envelope-panel', (p) => p.face === 'side');
  const roofPlane = findPrimitive(scene, 'roof-plane');

  const box: BoxFaces = {
    front: { points: [FTL, FTR, FBR, FBL], hasFill: frontPanel?.hasFill ?? false, envelope: frontPanel?.envelope },
    side: { points: [FTR, BTR, BBR, FBR], hasFill: sidePanel?.hasFill ?? false, envelope: sidePanel?.envelope },
    top: { points: [FTL, FTR, BTR, BTL], hasFill: roofPlane?.hasFill ?? false, envelope: roofPlane?.envelope },
  };

  // Computed unconditionally, same as the box faces above — its footprint always participates
  // in bounds/framing (see the comment on ScenePrimitive's foundation-slab variant). Only
  // whether HangarPreview actually draws it depends on `visible`.
  const foundationPrimitive = findPrimitive(scene, 'foundation-slab');
  const foundationPolygon = buildFoundationPolygon(W, H, depthPx);
  const foundation = foundationPrimitive?.visible ? foundationPolygon : null;

  const frontColumns: [Point, Point][] = scene.primitives
    .filter((p): p is Extract<ScenePrimitive, { kind: 'frame-column' }> => p.kind === 'frame-column' && p.face === 'front')
    .map((p) => {
      const t = p.positionM / widthM;
      return [lerp(FTL, FTR, t), lerp(FBL, FBR, t)] as [Point, Point];
    });
  const sideColumns: [Point, Point][] = scene.primitives
    .filter((p): p is Extract<ScenePrimitive, { kind: 'frame-column' }> => p.kind === 'frame-column' && p.face === 'side')
    .map((p) => {
      const t = p.positionM / lengthM;
      return [lerp(FTR, BTR, t), lerp(FBR, BBR, t)] as [Point, Point];
    });

  const gates = scene.primitives.filter((p): p is Extract<ScenePrimitive, { kind: 'opening-cutout' }> => p.kind === 'opening-cutout');
  const gateRects: GateRect[] = gates.map((gate) => {
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
    ...box.front.points,
    ...box.side.points,
    ...box.top.points,
    ...foundationPolygon,
    ...frontColumns.flat(),
    ...sideColumns.flat(),
    ...gateRects.flatMap((g) => g.points),
    dims.width.line[0], dims.width.line[1], dims.width.label,
    dims.length.line[0], dims.length.line[1], dims.length.label,
    dims.height.line[0], dims.height.line[1], dims.height.label,
  ];

  return {
    box,
    foundation,
    frame: { frontColumns, sideColumns },
    gates: gateRects,
    dimensions: dims,
    bounds: boundsOf(allPoints),
  };
}

function findPrimitive<K extends ScenePrimitive['kind']>(
  scene: SceneModel,
  kind: K,
  extra?: (p: Extract<ScenePrimitive, { kind: K }>) => boolean,
): Extract<ScenePrimitive, { kind: K }> | undefined {
  return scene.primitives.find(
    (p): p is Extract<ScenePrimitive, { kind: K }> => p.kind === kind && (!extra || extra(p as Extract<ScenePrimitive, { kind: K }>)),
  );
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
