// /angary «Каркас вашого ангара» (FrameTour.tsx): the near end wall's framing — its posts (стійки фахверку) and wall
// purlins — read from the configurator's own openings (04.10). The tour used to space the posts evenly whatever the
// visitor chose, so at 10–17 m with the default gate a full-height post stood in the middle of the 4 m gate, and the
// lower wall purlin ran across it. Now each gate is framed by a post at either jamb (or by the column standing next to
// it), the other posts keep the old rhythm in what is left of the wall, clear of the gates and the door, and the wall
// purlins stop at an opening they would cross. A drawing rule, as the old spacing was — not a design of the wall.

export type EndWallOpening = { kind: 'gate' | 'door'; xM: number; widthM: number; heightM: number };
export type GirtRun = { z: number; from: number; to: number };

export type EndWallFraming = {
  /** The posts across the end wall, ascending: at the gates' jambs and between them */
  postXs: number[];
  /** The columns and the posts — what the wall purlins span between — ascending */
  verticals: number[];
  /** The wall purlins at both levels, broken where an opening is */
  girts: GirtRun[];
};

/** The wall purlins' levels, as the side walls' (parametricModel GIRT_LEVELS) */
const GIRT_LEVELS = [1 / 3, 2 / 3] as const;
/** A gate's jamb this close to a column is framed by the column: a post there would stand on the column's footing
 *  (their half-widths in the drawing are 0.5 and 0.75 m) */
const JAMB_TO_COLUMN_M = 1.3;
/** A post between the gates stands at least this far from a column or a jamb… */
const POST_TO_VERTICAL_M = 1;
/** …and this far clear of an opening's edge */
const POST_CLEAR_M = 0.3;
/** A piece of wall purlin shorter than this, between a column and an opening, is left out */
const GIRT_PIECE_MIN_M = 0.8;
const EPS = 1e-6;

/** The posts' rhythm on a wall with no openings: about one every 7 m of a clear span, at most three; with a centre row
 *  its column stands in the middle and a post halves each span (03.10) */
export function postSpacingM(widthM: number, centre: boolean): number {
  if (centre) return widthM / 4;
  const count = Math.min(Math.max(Math.round(widthM / 7) - 1, 1), 3);
  return widthM / (count + 1);
}

/** [from, to] less the ranges taken, as the free ranges left */
function subtract([from, to]: readonly [number, number], taken: readonly (readonly [number, number])[]) {
  let free: [number, number][] = [[from, to]];
  for (const [a, b] of taken) {
    free = free.flatMap(([x, y]): [number, number][] => {
      if (b <= x || a >= y) return [[x, y]];
      return [[x, Math.min(a, y)], [Math.max(b, x), y]].filter(([p, q]) => q - p > EPS) as [number, number][];
    });
  }
  return free;
}

/** The point of the free ranges nearest to `x`, or none */
function nearestFree(x: number, free: readonly (readonly [number, number])[]) {
  const candidates = free.map(([a, b]) => Math.min(Math.max(x, a), b));
  if (!candidates.length) return undefined;
  return candidates.reduce((best, value) => (Math.abs(value - x) < Math.abs(best - x) - EPS ? value : best), candidates[0]);
}

export function endWallFraming({ widthM: W, eaveM: E, centre, openings }: Readonly<{
  widthM: number;
  eaveM: number;
  centre: boolean;
  openings: readonly EndWallOpening[];
}>): EndWallFraming {
  const columns = centre ? [0, W / 2, W] : [0, W];
  const gates = openings.filter((opening) => opening.kind === 'gate');
  const jambs = gates
    .flatMap((gate) => [gate.xM, gate.xM + gate.widthM])
    .filter((x) => columns.every((column) => Math.abs(column - x) > JAMB_TO_COLUMN_M));
  const fixed = [...new Set([...columns, ...jambs])].sort((a, b) => a - b);
  const spacing = postSpacingM(W, centre);
  const clearOfOpenings = openings.map((opening) => [opening.xM - POST_CLEAR_M, opening.xM + opening.widthM + POST_CLEAR_M] as const);

  // Between two fixed verticals: as many posts as the rhythm asks for, each moved to the nearest place clear of the
  // openings and of the verticals either side — or left out where there is none (a gate's own width)
  const between = fixed.slice(1).flatMap((to, index) => {
    const from = fixed[index];
    const wanted = Math.ceil((to - from) / spacing - EPS) - 1;
    const free = subtract([from + POST_TO_VERTICAL_M, to - POST_TO_VERTICAL_M], clearOfOpenings);
    return Array.from({ length: Math.max(wanted, 0) }, (_, k) => nearestFree(from + ((k + 1) * (to - from)) / (wanted + 1), free))
      .filter((x): x is number => x !== undefined)
      // two moved to the same side of a door would stand together: one is enough
      .filter((x, k, all) => k === 0 || x - all[k - 1] >= POST_TO_VERTICAL_M - EPS);
  });
  const postXs = [...jambs, ...between].sort((a, b) => a - b);
  const verticals = [...new Set([...columns, ...postXs])].sort((a, b) => a - b);

  // The wall purlins from vertical to vertical, stopping at an opening that reaches their level
  const girts = GIRT_LEVELS.flatMap((level) => {
    const z = E * level;
    const crossed = openings.filter((opening) => opening.heightM > z).map((opening) => [opening.xM, opening.xM + opening.widthM] as const);
    return verticals.slice(1).flatMap((to, index) => subtract([verticals[index], to], crossed)
      .filter(([a, b]) => b - a >= GIRT_PIECE_MIN_M - EPS)
      .map(([from, end]) => ({ z, from, to: end })));
  });

  return { postXs, verticals, girts };
}
