// The drawing office's dimetric of the /angary configurator's sheet (10.10): «Каркас» (FrameTour.tsx) and «Загальний
// вигляд» (generalViewGeometry.ts) are one set of drawings, so they share one projection and one frame — the span at
// 7°, true size; the length at 41°, half size, so the gable keeps its shape. Until 10.10 the general view had a camera
// of its own (viewProjection.ts, the 3D's), and the two pictures of one hangar sat at different angles.
//
// Sheet space, in metres: x across the span from axis А (left) to the side wall the camera sees (x = W), d along the
// building from the near end wall (d = 0), z up from the ground. The configurator's model has its x mirrored on this
// sheet; only its openings are not symmetric, and sheetOpenings (endWallFraming.ts) mirrors them.

export type P3 = readonly [number, number, number];
export type Pt = readonly [number, number];

/** Dimetric axes on the sheet: x — across the span, right and a little down; d — along the building, right and up */
export const AX = [Math.cos((7.18 * Math.PI) / 180), Math.sin((7.18 * Math.PI) / 180)] as const;
export const AD = [0.5 * Math.cos((41.42 * Math.PI) / 180), -0.5 * Math.sin((41.42 * Math.PI) / 180)] as const;
/** The unit along +d on the sheet */
export const DIR = [AD[0] / 0.5, AD[1] / 0.5] as const;
/** A point of sheet space on the sheet, in metres of the drawing's scale */
export const unit = ([x, d, z]: P3): Pt => [x * AX[0] + d * AD[0], x * AX[1] + d * AD[1] - z];

/** The roof's height over the span at x: the eave at the walls, the ridge in the middle */
export const roofHeight = (W: number, E: number, R: number) => (x: number) => E + (R - E) * (1 - Math.abs(x - W / 2) / (W / 2));

export type FrameSpec = Readonly<{
  W: number;
  E: number;
  R: number;
  truss: boolean;
  /** The truss's panel points across the span (parametricModel trussPanelNodesM) */
  panelXs: readonly number[];
}>;

/**
 * One frame's roof members at station d, as polylines in sheet space: a truss's top chord, bottom chord, its web — odd
 * panel points on the top chord, even ones on the bottom chord (the centre among them, where a centre column lands),
 * from the first panel point to the last, the heel's lying on the chords — and a vertical under the ridge, which makes
 * the ridge a node; or a portal frame's two rafters with a haunch at each knee. The frame drawing draws its frames with
 * them, and the general view the frame it shows where a surface is not clad.
 */
export function roofMembersAt(d: number, { W, E, R, truss, panelXs }: FrameSpec): P3[][] {
  const roofZ = roofHeight(W, E, R);
  if (truss) {
    return [
      [[0, d, E], [W / 2, d, R], [W, d, E]],
      [[0, d, E], [W, d, E]],
      panelXs.slice(1, -1).map((x, index): P3 => [x, d, index % 2 === 0 ? roofZ(x) : E]),
      [[W / 2, d, E], [W / 2, d, R]],
    ];
  }
  const knee = Math.min(1.6, W / 8);
  return [
    [[0, d, E], [W / 2, d, R], [W, d, E]],
    [[0, d, E - knee * 0.75], [knee, d, roofZ(knee)]],
    [[W, d, E - knee * 0.75], [W - knee, d, roofZ(W - knee)]],
  ];
}

// ── Boxes and segments on the sheet: what the drawings' labels keep clear of (FrameTour's names, the general view's
//    sizes and the chips laid on its picture) ──

/** A box on the sheet: left, top, right, bottom */
export type Box = readonly [number, number, number, number];
export type Segment = readonly [Pt, Pt];

export const union = (boxes: readonly Box[]): Box => [
  Math.min(...boxes.map((box) => box[0])), Math.min(...boxes.map((box) => box[1])),
  Math.max(...boxes.map((box) => box[2])), Math.max(...boxes.map((box) => box[3])),
];
export const around = ([x, y]: Pt, rx: number, ry = rx): Box => [x - rx, y - ry, x + rx, y + ry];
export const overlaps = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
export const within = (a: Box, b: Box) => a[0] >= b[0] && a[1] >= b[1] && a[2] <= b[2] && a[3] <= b[3];
/** Whether a segment runs through a box (Liang–Barsky) */
export function crosses([[x0, y0], [x1, y1]]: Segment, [left, top, right, bottom]: Box) {
  const [dx, dy] = [x1 - x0, y1 - y0];
  let [low, high] = [0, 1];
  for (const [p, q] of [[-dx, x0 - left], [dx, right - x0], [-dy, y0 - top], [dy, bottom - y0]] as const) {
    if (p === 0) {
      if (q < 0) return false;
    } else if (p < 0) low = Math.max(low, q / p);
    else high = Math.min(high, q / p);
    if (low > high) return false;
  }
  return true;
}
