import { crosses, overlaps, type Box, type Pt } from '../angary/dimetric';

// The sheet's one-time callout to its 3D chip (owner, 19.11: «3D можна легко пропустити»; variant C «виноска»): once the
// first view has built the drawing, a copper leader runs from the roof to a name beside the chip, in the drawing's own
// language — as «Каркас» names its members — and steps back after a few seconds, the chip keeping its copper. It must
// never lie on anything (owner: «щоб не налазило»): the name is placed in the first of a few places that stays clear of
// the drawing, its sizes, the legend and the chip; its leader keeps off the sizes' values, the legend and the chip. With
// no clear place there is no callout at all — only the chip's copper.

/** The name: in full on a wide drawing, short on a phone's, where it stands beside the chip in the toolbar's row */
export const HINT_TEXT = 'ТОЙ САМИЙ АНГАР У 3D';
export const HINT_TEXT_SHORT = 'ОБ’ЄМ У 3D';

/** What the name keeps clear of, px: round the drawing and the boxes, between it and the chip */
const CLEAR = 4;
const GAP = 10;
/** Beside the chip the name stands further off, for the short arrow between them */
const BESIDE = 24;
/** …and how far further left it may go, px */
const SLIDE = [0, 40, 80, 120, 160, 200];

export type Hint3dLayout = {
  /** The name: where its text stands, how it is anchored, and the box it takes */
  tag: { x: number; y: number; anchor: 'start' | 'end'; box: Box };
  /** From the roof to the name — none on a phone's small drawing, where the name stands beside the chip alone */
  leader: { from: Pt; to: Pt } | null;
  /** The short line from the name to the chip, when the name stands beside it */
  connector: { from: Pt; to: Pt } | null;
};

export type Hint3dInput = {
  /** The chip's box, in the drawing's px, and the picture's: the chip stands in the picture's padding, above the drawing's
   *  box, so the name may too */
  chip: Box;
  bounds: Box;
  /** The name's measured size */
  size: { width: number; height: number };
  /** What lies on the picture besides the drawing: the chip's toolbar, a held legend */
  keepClear: readonly Box[];
  /** Whether a box meets the drawing (generalViewGeometry meets) */
  meets: (box: Box) => boolean;
  /** The sizes' values, for the leader to keep off */
  sizeBoxes: readonly Box[];
  /** Where the leader leaves the roof */
  anchor: Pt;
  /** Whether to draw a leader at all */
  withLeader: boolean;
};

const grow = ([l, t, r, b]: Box, by: number): Box => [l - by, t - by, r + by, b + by];
const inside = ([l, t, r, b]: Box, [bl, bt, br, bb]: Box) => l >= bl + CLEAR && t >= bt + CLEAR && r <= br - CLEAR && b <= bb - CLEAR;

/** The callout's layout, or null when no place is clear */
export function placeHint3d({ chip, bounds, size, keepClear, meets, sizeBoxes, anchor, withLeader }: Hint3dInput): Hint3dLayout | null {
  const [cl, ct, cr, cb] = chip;
  const cy = (ct + cb) / 2;
  const { width: w, height: h } = size;
  // beside the chip, on its left — on its line, or on its top edge where the drawing fills its box up to the chip (a short
  // laptop's) — and further left in steps where the roof's far end stands under the chip (1280 × 800): the arrow grows
  const beside = SLIDE.flatMap((slide) => [cy - h / 2, ct].map((top) => ({
    box: [cl - BESIDE - slide - w, top, cl - BESIDE - slide, top + h] as Box,
    x: cl - BESIDE - slide,
    y: top + h / 2,
    anchor: 'end' as const,
    beside: true,
  })));
  const places: { box: Box; x: number; y: number; anchor: 'start' | 'end'; beside: boolean }[] = [
    ...beside,
    // under it, on its right edge, then on its left edge
    { box: [cr - w, cb + GAP, cr, cb + GAP + h], x: cr, y: cb + GAP + h / 2, anchor: 'end', beside: false },
    { box: [cl, cb + GAP, cl + w, cb + GAP + h], x: cl, y: cb + GAP + h / 2, anchor: 'start', beside: false },
  ];
  const clearOf = (box: Box) => inside(box, bounds)
    && !meets(grow(box, CLEAR))
    && !keepClear.some((other) => overlaps(other, grow(box, CLEAR)))
    && !overlaps(chip, grow(box, CLEAR / 2));
  // the leader lands just under the name, at the point of it nearest the roof
  const leaderTo = (box: Box): Pt => [Math.min(Math.max(anchor[0], box[0] + 8), box[2] - 8), box[3] + 3];
  const leaderClear = (to: Pt) => {
    const segment = [anchor, to] as const;
    return ![chip, ...keepClear, ...sizeBoxes].some((box) => crosses(segment, grow(box, CLEAR / 2)));
  };
  for (const leader of withLeader ? [true, false] : [false]) {
    for (const place of places) {
      if (!clearOf(place.box)) continue;
      const to = leaderTo(place.box);
      if (leader && !leaderClear(to)) continue;
      return {
        tag: { x: place.x, y: place.y, anchor: place.anchor, box: place.box },
        leader: leader ? { from: anchor, to } : null,
        connector: place.beside ? { from: [place.x + 5, place.y], to: [cl - 4, place.y] } : null,
      };
    }
  }
  return null;
}
