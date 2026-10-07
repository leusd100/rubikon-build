import type { ParametricBuildingModel, Vec3 } from './parametricModel';
import type { CladdingSystem } from './types';

// The cladding's lines on the technical drawing (07.10): until now «Профнастил» and «Сендвіч-панель» drew the same grey
// surfaces, so a visitor who picked one saw nothing change. A profiled sheet is hung with its ribs upright on the walls;
// wall sandwich panels lie across the wall, one joint every panel; on the roof both run down the slope. Schematic, like
// the rest of the drawing: the ribs are spaced so they stay apart on screen, not at a real sheet's pitch.

export type CladdingLine = [Vec3, Vec3];

export type CladdingLines = {
  /** The long wall the camera sees (x = width) */
  side: CladdingLine[];
  /** The front gable (z = 0), under its openings */
  front: CladdingLine[];
  roof: CladdingLine[];
};

/** A sandwich panel's cover width, metres — the joints across the wall */
const PANEL_WIDTH_M = 1;

/** One rib or joint every this many metres along the building: about forty along its longest side, whole metres */
export function claddingStepM(widthM: number, lengthM: number): number {
  return Math.max(1, Math.round(Math.max(widthM, lengthM) / 40));
}

/** Evenly spaced stations strictly inside (0, span) */
function stations(span: number, step: number): number[] {
  const out: number[] = [];
  for (let at = step; at < span - step / 4; at += step) out.push(Math.round(at * 1000) / 1000);
  return out;
}

export function buildCladdingLines(
  building: ParametricBuildingModel,
  wallSystem: CladdingSystem,
  roofSystem: CladdingSystem,
): CladdingLines {
  const { widthM: W, lengthM: L } = building.footprint;
  const { eaveM, ridgeM } = building.heights;
  const step = claddingStepM(W, L);
  const half = W / 2;
  // The gable's top at x: the eave at the corners, the ridge at the middle
  const gableTop = (x: number) => eaveM + (ridgeM - eaveM) * (1 - Math.abs(x - half) / half);
  // The gable's half-width at height y: the whole width up to the eave, closing to the ridge
  const gableHalf = (y: number) => (y <= eaveM ? half : half * (1 - (y - eaveM) / (ridgeM - eaveM)));

  const side: CladdingLine[] = [];
  const front: CladdingLine[] = [];
  if (wallSystem === 'profiled-sheet') {
    for (const z of stations(L, step)) side.push([{ x: W, y: 0, z }, { x: W, y: eaveM, z }]);
    for (const x of stations(W, step)) front.push([{ x, y: 0, z: 0 }, { x, y: gableTop(x), z: 0 }]);
  } else {
    for (const y of stations(eaveM, PANEL_WIDTH_M)) side.push([{ x: W, y, z: 0 }, { x: W, y, z: L }]);
    for (const y of stations(ridgeM, PANEL_WIDTH_M)) {
      const h = gableHalf(y);
      if (h > 0.2) front.push([{ x: half - h, y, z: 0 }, { x: half + h, y, z: 0 }]);
    }
  }

  // Down both slopes, eave to ridge: the sheet's ribs at the drawing's step, the panels' joints twice as far apart — on a
  // roof the sheet is the finer of the two, as it is on the building
  const roof: CladdingLine[] = [];
  for (const z of stations(L, roofSystem === 'sandwich-panel' ? step * 2 : step)) {
    roof.push([{ x: 0, y: eaveM, z }, { x: half, y: ridgeM, z }]);
    roof.push([{ x: W, y: eaveM, z }, { x: half, y: ridgeM, z }]);
  }
  return { side, front, roof };
}
