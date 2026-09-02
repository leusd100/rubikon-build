import type { Dimensions, GatesCount } from './types';

// One shared scale for width, length AND height on purpose — a true isometric cube, not a
// fudged one. A much longer building should genuinely look elongated; the SVG's viewBox (see
// `computeScene`) auto-fits around whatever shape results, so an extreme aspect ratio never
// clips instead of being visually dishonest.
export const PX_PER_METRE = 8;
const ISO_ANGLE_RAD = Math.PI / 6; // 30°, the standard isometric receding angle
const FOUNDATION_OVERHANG_PX = 10;
const FOUNDATION_THICKNESS_PX = 10;
const FRAME_TARGET_SPACING_M = 6;
const FRAME_MIN_BAYS = 2;
const FRAME_MAX_BAYS = 10;
const GATE_HEIGHT_RATIO = 0.72;
const GATE_WIDTH_RATIO = 0.22;
const GATE_GAP_RATIO = 0.08;
const GATE_MARGIN_RATIO = 0.06;

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

export type BoxFaces = {
  /** Facade — the only face gates cut into. */
  front: Point[];
  /** Receding side face, depicts `length`. */
  side: Point[];
  /** Top face — doubles as the roof plane. */
  top: Point[];
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

function frameBayCount(spanMetres: number): number {
    const raw = Math.round(spanMetres / FRAME_TARGET_SPACING_M);
    return Math.min(FRAME_MAX_BAYS, Math.max(FRAME_MIN_BAYS, raw));
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Pure geometry: dimensions in, an isometric scene of plain {x,y} points out. No React, no DOM
 * — `HangarPreview` is the only thing that turns this into actual SVG markup, and this stays
 * unit-testable on its own (see tests/unit/configurator/isometricGeometry.test.ts).
 */
export function computeScene(dimensions: Dimensions, gates: GatesCount): IsometricScene {
  const W = dimensions.width * PX_PER_METRE;
  const H = dimensions.height * PX_PER_METRE;
  const depthPx = dimensions.length * PX_PER_METRE;
  const iso = isoOffset(depthPx);

  const FTL: Point = { x: 0, y: 0 };
  const FTR: Point = { x: W, y: 0 };
  const FBL: Point = { x: 0, y: H };
  const FBR: Point = { x: W, y: H };
  const BTL = translate(FTL, iso);
  const BTR = translate(FTR, iso);
  const BBR = translate(FBR, iso);

  const box: BoxFaces = {
    front: [FTL, FTR, FBR, FBL],
    side: [FTR, BTR, BBR, FBR],
    top: [FTL, FTR, BTR, BTL],
  };

  const foundationIso = isoOffset(depthPx + FOUNDATION_OVERHANG_PX * 2);
  const fFTL: Point = { x: -FOUNDATION_OVERHANG_PX, y: H };
  const fFTR: Point = { x: W + FOUNDATION_OVERHANG_PX, y: H };
  const fFBL: Point = { x: -FOUNDATION_OVERHANG_PX, y: H + FOUNDATION_THICKNESS_PX };
  const fFBR: Point = { x: W + FOUNDATION_OVERHANG_PX, y: H + FOUNDATION_THICKNESS_PX };
  const fBTR = translate(fFTR, foundationIso);
  const fBBR = translate(fFBR, foundationIso);
  const foundation: Point[] = [fFTL, fFTR, fBTR, fBBR, fFBR, fFBL];

  const frontBays = frameBayCount(dimensions.width);
  const frontColumns: [Point, Point][] = Array.from({ length: frontBays + 1 }, (_, i) => {
    const t = i / frontBays;
    return [lerp(FTL, FTR, t), lerp(FBL, FBR, t)] as [Point, Point];
  });
  const sideBays = frameBayCount(dimensions.length);
  const sideColumns: [Point, Point][] = Array.from({ length: sideBays + 1 }, (_, i) => {
    const t = i / sideBays;
    return [lerp(FTR, BTR, t), lerp(FBR, BBR, t)] as [Point, Point];
  });

  const gateRects: GateRect[] = buildGateRects(gates, W, H);

  const dims = {
    width: widthGuide(FBL, FBR, H),
    length: lengthGuide(FBR, BBR, iso),
    height: heightGuide(FTL, FBL),
  };

  const allPoints = [
    ...box.front,
    ...box.side,
    ...box.top,
    ...foundation,
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

function buildGateRects(gates: GatesCount, W: number, H: number): GateRect[] {
  if (gates === 0) return [];
  const gateHeight = H * GATE_HEIGHT_RATIO;
  const gateTop = H - gateHeight;
  const gateWidth = W * GATE_WIDTH_RATIO;
  const gap = W * GATE_GAP_RATIO;
  const margin = W * GATE_MARGIN_RATIO;

  const usable = W - margin * 2;
  const totalWidth = gates * gateWidth + (gates - 1) * gap;
  const startX = margin + Math.max(0, (usable - totalWidth) / 2);

  return Array.from({ length: gates }, (_, i) => {
    const left = startX + i * (gateWidth + gap);
    const right = left + gateWidth;
    return {
      points: [
        { x: left, y: gateTop },
        { x: right, y: gateTop },
        { x: right, y: H },
        { x: left, y: H },
      ],
    };
  });
}

function widthGuide(FBL: Point, FBR: Point, wallHeightPx: number): DimensionGuide {
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
  };
}

function lengthGuide(FBR: Point, BBR: Point, iso: Point): DimensionGuide {
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
  };
}

function heightGuide(FTL: Point, FBL: Point): DimensionGuide {
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
