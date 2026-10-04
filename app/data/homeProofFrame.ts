/**
 * «Схема каркаса» — the frame HOME draws INSIDE the measured silhouette of its one real photo (ProofContour, layers
 * «Каркас» and «Навантаження»). ILLUSTRATIVE, NOT MEASURED (04.10): a scheme drawn in this photo's perspective. Nothing
 * here is this building's structure (unknown: its drawings were not kept, and the photo study suspects brick walls
 * under the new cladding) and nothing comes from any drawing's sizes, marks or levels. The page says so on the sheet
 * («Схема · без розмірів», «каркас такого типу, як на цьому об’єкті») and in the scheme's accessible name.
 *
 * What is the TYPE the owner names for this object (a private reference of the same construction, read for the type
 * only): light trapezoidal trusses with a vertical at every panel point and one diagonal per panel falling to the
 * middle, purlins on the top-chord nodes, the trusses bearing on load-bearing walls wall to wall, bracing in the first
 * bay. What is OUR ADAPTATION, not the reference's: the slope — fitted to the rakes measured here (≈ 10,5°; the
 * reference is a low-slope truss), the panel count, the bays and the depth they recede to, and the footings —
 * schematic, «умовно» on the page.
 *
 * What the owner remembers of THIS building (Dmytro, 04.10 — «на цьому етапі важливіше показати вау, а ніж точність»):
 * the perimeter walls were aerated concrete blocks, and a central row of columns stood under the ridge. So the walls are
 * drawn as blockwork on their faces and, where the scheme's plane cuts the long walls at both corners, in section — their
 * thickness hatched; the columns stand under the ridge of each truss, the gable's one in the pier between the gates, each
 * on its own pad. Thicknesses, the column's width and every footing are drawn for reading, not taken from anywhere.
 *
 * How it was drawn (the frame-layer geometry pass, 04.10, outside the repo): the gable plane is the drawn contour itself
 * — its rakes and apex mapped back through the gable plane of the photo study's frozen camera, so the front truss sits
 * under the copper outline (top chord under the rakes, ridge under the drawn apex); the depth direction is the long
 * wall's vanishing point measured in this photo (its eave and base lines, ±2 px); how fast the trusses recede is not
 * given by the photo and is borrowed from a camera refit — so the bays are illustrative too. Everything ends above the
 * photo's row 644, which the laptop crop always keeps (home-v2.css).
 *
 * Photo pixels of the 1536 × 788 frame, x right, y down. `depth` 0 is the gable's own plane, 1 and 2 the bays behind it
 * (`hidden`: behind the plane in front — owner, 04.10: solid, in copper, thinner and fainter with depth, not dashed).
 * tests/unit/home-proof-frame.test.ts keeps every point inside the drawn silhouette (footings: in a band under the base),
 * the top chord under the rakes, the names in words, and this file tied to the photo's sha256.
 */
import { homeProofContour } from './homeProofContour';

type Pt = readonly [number, number];

/** The snow's comb: arrows at an even step over the strip one truss carries (its top edge: left eave, ridge, right
 *  eave), each standing a little over the roof, their tails on one line that follows the roof. The tails stay below the
 *  photo's row 84, which the laptop crop keeps (home-v2.css) */
const ROOF_TOP: readonly Pt[] = [[300.2, 191.6], [1004.9, 128.6], [1460.1, 287]];
const COMB_RISE = 42;
const COMB_GAP = 7;
const roofTopY = (x: number) => {
  const [a, b] = x <= ROOF_TOP[1][0] ? [ROOF_TOP[0], ROOF_TOP[1]] : [ROOF_TOP[1], ROOF_TOP[2]];
  return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
};
const round1 = (value: number) => Math.round(value * 10) / 10;
const COMB_XS = Array.from({ length: 13 }, (_, index) => 330 + index * ((1432 - 330) / 12));
const COMB_ARROWS = COMB_XS.map((x): readonly [Pt, Pt] => [[round1(x), round1(roofTopY(x) - COMB_RISE)], [round1(x), round1(roofTopY(x) - COMB_GAP)]]);
const COMB_LINE: readonly Pt[] = [COMB_ARROWS[0][0], [ROOF_TOP[1][0], round1(ROOF_TOP[1][1] - COMB_RISE)], COMB_ARROWS.at(-1)![0]];

/** The wind across the building (owner review, 04.10: «навантаження від вітру», in its own colour): it presses on the
 *  right long wall — arrows along the gable's horizontals (they run to the gable plane's vanishing point), longer higher
 *  up, as wind grows with height — and lifts the low roof on both slopes. A scheme of where it goes, no figures */
const GABLE_VP: Pt = [3817.9, 493];
const RIGHT_FACE: readonly [Pt, Pt] = [[1478.6, 551.7], [1471.1, 332.5]];
const WIND_GUSTS = [0.12, 0.31, 0.5, 0.69, 0.88].map((share): readonly [Pt, Pt] => {
  const [[x0, y0], [x1, y1]] = RIGHT_FACE;
  const at: Pt = [x0 + (x1 - x0) * share, y0 + (y1 - y0) * share];
  const run = Math.hypot(GABLE_VP[0] - at[0], GABLE_VP[1] - at[1]);
  const along = (length: number): Pt => [round1(at[0] + ((GABLE_VP[0] - at[0]) * length) / run), round1(at[1] + ((GABLE_VP[1] - at[1]) * length) / run)];
  return [along(4 + 26 + 22 * share), along(4)];
});
const WIND_LIFT = [430, 580, 730, 870, 1090, 1200, 1310, 1410].map((x): readonly [Pt, Pt] => [[x, round1(roofTopY(x) - 6)], [x, round1(roofTopY(x) - 30)]]);

/** truss: chords and end posts; web: diagonals and verticals; wall: bearing lines and lintels; column: the central row */
export type FrameGroup = 'truss' | 'web' | 'wall' | 'column' | 'purlin' | 'bracing' | 'footing';

export type FrameMember = {
  group: FrameGroup;
  depth: 0 | 1 | 2;
  /** Behind the gable's plane: drawn in copper, fainter with depth — never as a member on the gable wall */
  hidden?: true;
  points: readonly Pt[];
  closed?: boolean;
};

export type FrameTag = { id: string; text: string; anchor: Pt; at: Pt; align: 'start' | 'end' };

export type HomeProofFrame = {
  /** The frame it is drawn on: the contour's own photo, byte for byte */
  photoSha256: string;
  /** Not a measurement: the page labels it as a scheme */
  status: 'illustrative';
  /** The drawn gable and the long wall: the frame stays inside them (clip and test) */
  silhouette: readonly (readonly Pt[])[];
  /** The blockwork's faces — the gable wall less its gates, and the near long wall, each corner-ordered base near, base
   *  far, top far, top near — and `cuts`: the long walls in section where the scheme's plane cuts them, hatched */
  walls: { gable: readonly Pt[]; holes: readonly (readonly Pt[])[]; long: readonly Pt[]; cuts: readonly (readonly Pt[])[] };
  members: readonly FrameMember[];
  /** Where the purlins bear on the front truss: its top-chord nodes */
  nodes: readonly Pt[];
  /** The way the snow goes: a comb of even arrows under one line, as a drawing writes a load spread over the roof (owner
   *  review, 04.10: «вага, а не неон»), the strip of roof one truss carries, the lit links (3 the truss, 4 the walls and
   *  the column, 5 the footings), the three legs the drops run along, the ground under them */
  load: {
    arrows: readonly (readonly [Pt, Pt])[];
    comb: readonly Pt[];
    roof: readonly Pt[];
    links: readonly { link: 3 | 4 | 5; points: readonly Pt[] }[];
    legs: readonly (readonly Pt[])[];
    ground: readonly (readonly [Pt, Pt])[];
  };
  /** The wind's way (the «Вітер» layer): the gusts on the windward wall, the lift off the roof, the lit links (2 the wall,
   *  3 the truss carrying it across, 4 the other wall and the column, 5 the footings), the two legs its drops run, and
   *  the ground's answer at each footing, against the wind */
  wind: {
    gusts: readonly (readonly [Pt, Pt])[];
    lift: readonly (readonly [Pt, Pt])[];
    links: readonly { link: 2 | 3 | 4 | 5; points: readonly Pt[] }[];
    legs: readonly (readonly Pt[])[];
    reactions: readonly (readonly [Pt, Pt])[];
  };
  /** The names on the scheme, in words (desktop only): a dot on the member, a leader, the word at `at` */
  tags: readonly FrameTag[];
  /** The scheme's accessible name: what it is and what it is not */
  label: string;
};

export const homeProofFrame: HomeProofFrame = {
  photoSha256: homeProofContour.photo.sha256,
  status: 'illustrative',
  silhouette: [
    [[1004.9, 128.6], [1483.7, 295.2], [1484.2, 309.1], [1470.4, 310.6], [1478.6, 551.7], [263.3, 582.2], [277.7, 217.9], [280.5, 214.3], [281.4, 193.3]],
    [[281.4, 193.3], [277.7, 217.9], [263.3, 582.2], [41.7, 523.6], [33.1, 435.7]],
  ],
  walls: {
    gable: [[263.3, 582.2], [1478.6, 551.7], [1471.1, 332.5], [276.4, 250.8]],
    holes: [[[731.4, 570.4], [926.1, 565.5], [925.9, 322.4], [734.3, 311.1]], [[1055.7, 562.3], [1217.4, 558.2], [1213.4, 340.2], [1053.8, 330.9]]],
    long: [[263.3, 582.2], [41.7, 523.6], [45.6, 448.3], [276.4, 250.8]],
    // Inward from the drawn corners along the gable's base and its wall top (both run to the gable plane's vanishing
    // point): thicker at the near corner, thinner at the far one, as the perspective has it
    cuts: [
      [[263.3, 582.2], [293.3, 581.4], [306.3, 252.8], [276.4, 250.8]],
      [[1478.6, 551.7], [1471.1, 332.5], [1451.1, 331.1], [1458.6, 552.2]],
    ],
  },
  members: [
    { group: 'truss', depth: 0, points: [[299.2, 218.5], [1005, 149.8], [1460.7, 305.1]] },
    { group: 'truss', depth: 0, points: [[297.9, 252.2], [1461.6, 331.8]] },
    { group: 'truss', depth: 0, points: [[297.9, 252.2], [299.2, 218.5]] },
    { group: 'truss', depth: 0, points: [[1461.6, 331.8], [1460.7, 305.1]] },
    { group: 'web', depth: 0, points: [[299.2, 218.5], [405.3, 259.6]] },
    { group: 'web', depth: 0, points: [[406.9, 208], [506.3, 266.5]] },
    { group: 'web', depth: 0, points: [[508.1, 198.2], [601.6, 273]] },
    { group: 'web', depth: 0, points: [[603.2, 188.9], [691.5, 279.1]] },
    { group: 'web', depth: 0, points: [[692.8, 180.2], [776.5, 285]] },
    { group: 'web', depth: 0, points: [[777.4, 172], [857, 290.5]] },
    { group: 'web', depth: 0, points: [[857.4, 164.2], [933.3, 295.7]] },
    { group: 'web', depth: 0, points: [[933.2, 156.8], [1005.9, 300.6]] },
    { group: 'web', depth: 0, points: [[1005.9, 300.6], [1071, 172.3]] },
    { group: 'web', depth: 0, points: [[1072.2, 305.2], [1134, 193.8]] },
    { group: 'web', depth: 0, points: [[1135.6, 309.5], [1194.3, 214.3]] },
    { group: 'web', depth: 0, points: [[1196, 313.6], [1252.1, 234]] },
    { group: 'web', depth: 0, points: [[1253.8, 317.6], [1307.4, 252.9]] },
    { group: 'web', depth: 0, points: [[1309.1, 321.4], [1360.6, 271]] },
    { group: 'web', depth: 0, points: [[1362.1, 325], [1411.6, 288.4]] },
    { group: 'web', depth: 0, points: [[1412.8, 328.5], [1460.7, 305.1]] },
    { group: 'web', depth: 0, points: [[405.3, 259.6], [406.9, 208]] },
    { group: 'web', depth: 0, points: [[506.3, 266.5], [508.1, 198.2]] },
    { group: 'web', depth: 0, points: [[601.6, 273], [603.2, 188.9]] },
    { group: 'web', depth: 0, points: [[691.5, 279.1], [692.8, 180.2]] },
    { group: 'web', depth: 0, points: [[776.5, 285], [777.4, 172]] },
    { group: 'web', depth: 0, points: [[857, 290.5], [857.4, 164.2]] },
    { group: 'web', depth: 0, points: [[933.3, 295.7], [933.2, 156.8]] },
    { group: 'web', depth: 0, points: [[1005.9, 300.6], [1005, 149.8]] },
    { group: 'web', depth: 0, points: [[1072.2, 305.2], [1071, 172.3]] },
    { group: 'web', depth: 0, points: [[1135.6, 309.5], [1134, 193.8]] },
    { group: 'web', depth: 0, points: [[1196, 313.6], [1194.3, 214.3]] },
    { group: 'web', depth: 0, points: [[1253.8, 317.6], [1252.1, 234]] },
    { group: 'web', depth: 0, points: [[1309.1, 321.4], [1307.4, 252.9]] },
    { group: 'web', depth: 0, points: [[1362.1, 325], [1360.6, 271]] },
    { group: 'web', depth: 0, points: [[1412.8, 328.5], [1411.6, 288.4]] },
    { group: 'truss', depth: 1, hidden: true, points: [[263.8, 250.2], [913.3, 181.7], [1347.3, 320.5]] },
    { group: 'truss', depth: 1, hidden: true, points: [[262.6, 280.3], [1348, 345.2]] },
    { group: 'truss', depth: 1, hidden: true, points: [[262.6, 280.3], [263.8, 250.2]] },
    { group: 'truss', depth: 1, hidden: true, points: [[1348, 345.2], [1347.3, 320.5]] },
    { group: 'truss', depth: 2, hidden: true, points: [[235.5, 275.6], [836.7, 208.3], [1250.1, 333.7]] },
    { group: 'truss', depth: 2, hidden: true, points: [[234.3, 302.7], [1250.6, 356.6]] },
    { group: 'truss', depth: 2, hidden: true, points: [[234.3, 302.7], [235.5, 275.6]] },
    { group: 'truss', depth: 2, hidden: true, points: [[1250.6, 356.6], [1250.1, 333.7]] },
    { group: 'wall', depth: 0, points: [[276.4, 250.8], [1471.1, 332.5]] },
    { group: 'wall', depth: 1, points: [[276.4, 250.8], [45.6, 448.3]] },
    { group: 'wall', depth: 1, hidden: true, points: [[1471.1, 332.5], [1259.5, 357.1]] },
    { group: 'wall', depth: 0, points: [[717.8, 310.1], [940.3, 323.2], [940.3, 306.5], [718, 292.2]], closed: true },
    { group: 'wall', depth: 0, points: [[1040.5, 330.1], [1225.1, 340.9], [1224.8, 325.9], [1040.4, 314]], closed: true },
    // The central row: the gable's column in the pier between the gates, from the truss's ridge post to the floor, and
    // the two behind it under their trusses' ridges, on the lines to the long wall's vanishing point
    { group: 'column', depth: 0, points: [[999.4, 300.2], [1012.4, 301], [1013.8, 563.3], [1000.8, 563.7]], closed: true },
    { group: 'column', depth: 0, points: [[996.3, 563.8], [1018.3, 563.2]] },
    { group: 'column', depth: 1, hidden: true, points: [[913.3, 319.1], [914.6, 558.4]] },
    { group: 'column', depth: 2, hidden: true, points: [[836.7, 334.5], [837.9, 554.1]] },
    { group: 'purlin', depth: 0, points: [[299.2, 218.5], [263.8, 250.2]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[263.8, 250.2], [235.5, 275.6]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[235.5, 275.6], [212.3, 296.3]] },
    { group: 'purlin', depth: 0, points: [[406.9, 208.0], [361.1, 239.8]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[361.1, 239.8], [324.0, 265.6]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[324.0, 265.6], [293.6, 286.8]] },
    { group: 'purlin', depth: 0, points: [[508.1, 198.2], [453.0, 230.2]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[453.0, 230.2], [408.3, 256.2]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[408.3, 256.2], [371.2, 277.7]] },
    { group: 'purlin', depth: 0, points: [[603.2, 188.9], [539.9, 221.0]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[539.9, 221.0], [488.3, 247.2]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[488.3, 247.2], [445.4, 269.0]] },
    { group: 'purlin', depth: 0, points: [[692.8, 180.2], [622.3, 212.4]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[622.3, 212.4], [564.5, 238.7]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[564.5, 238.7], [516.3, 260.8]] },
    { group: 'purlin', depth: 0, points: [[777.4, 172.0], [700.6, 204.1]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[700.6, 204.1], [637.3, 230.6]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[637.3, 230.6], [584.2, 252.8]] },
    { group: 'purlin', depth: 0, points: [[857.4, 164.2], [775.0, 196.3]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[775.0, 196.3], [706.8, 222.8]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[706.8, 222.8], [649.3, 245.2]] },
    { group: 'purlin', depth: 0, points: [[933.2, 156.8], [845.9, 188.8]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[845.9, 188.8], [773.2, 215.4]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[773.2, 215.4], [711.8, 237.8]] },
    { group: 'purlin', depth: 0, points: [[1005.0, 149.8], [913.3, 181.6]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[913.3, 181.6], [836.7, 208.2]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[836.7, 208.2], [771.7, 230.8]] },
    { group: 'purlin', depth: 0, points: [[1071.0, 172.3], [975.5, 201.5]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[975.5, 201.5], [895.3, 226.0]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[895.3, 226.0], [827.1, 246.9]] },
    { group: 'purlin', depth: 0, points: [[1134.0, 193.8], [1035.0, 220.6]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[1035.0, 220.6], [951.6, 243.1]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[951.6, 243.1], [880.4, 262.4]] },
    { group: 'purlin', depth: 0, points: [[1194.3, 214.3], [1092.2, 238.8]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[1092.2, 238.8], [1005.9, 259.6]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[1005.9, 259.6], [932.0, 277.3]] },
    { group: 'purlin', depth: 0, points: [[1252.1, 234.0], [1147.2, 256.4]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[1147.2, 256.4], [1058.3, 275.5]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[1058.3, 275.5], [982.0, 291.8]] },
    { group: 'purlin', depth: 0, points: [[1307.4, 252.9], [1200.0, 273.4]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[1200.0, 273.4], [1108.7, 290.8]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[1108.7, 290.8], [1030.1, 305.8]] },
    { group: 'purlin', depth: 0, points: [[1360.6, 271.0], [1251.0, 289.7]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[1251.0, 289.7], [1157.6, 305.6]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[1157.6, 305.6], [1076.9, 319.3]] },
    { group: 'purlin', depth: 0, points: [[1411.6, 288.4], [1300.1, 305.4]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[1300.1, 305.4], [1204.7, 319.9]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[1204.7, 319.9], [1122.1, 332.5]] },
    { group: 'purlin', depth: 0, points: [[1460.7, 305.1], [1347.5, 320.5]] },
    { group: 'purlin', depth: 1, hidden: true, points: [[1347.5, 320.5], [1250.3, 333.7]] },
    { group: 'purlin', depth: 2, hidden: true, points: [[1250.3, 333.7], [1165.9, 345.1]] },
    { group: 'bracing', depth: 1, hidden: true, points: [[297.9, 252.2], [451.2, 291.5], [691.5, 279.1], [774.1, 310.8], [1005.9, 300.6], [1035.7, 326.5], [1253.8, 317.6], [1252, 339.4], [1461.6, 331.8]] },
    { group: 'bracing', depth: 1, hidden: true, points: [[1005.9, 300.6], [913.3, 181.7]] },
    { group: 'bracing', depth: 1, hidden: true, points: [[913.3, 319.2], [1005, 149.8]] },
    { group: 'bracing', depth: 2, hidden: true, points: [[1005.9, 300.6], [770.6, 347.8]] },
    // In section, under the cut walls and the gable's column: a wall or a neck down to a wider pad
    { group: 'footing', depth: 0, points: [[263.4, 583.2], [293.3, 582.4], [293.5, 599], [305, 598.7], [305.5, 627.7], [251.5, 629.1], [251, 600.3], [263.7, 600]], closed: true },
    { group: 'footing', depth: 0, points: [[1458.6, 553.2], [1478.6, 552.7], [1478.8, 567.5], [1486.5, 567.3], [1487, 589.5], [1449.5, 590.4], [1449.2, 568.2], [1458.8, 568]], closed: true },
    { group: 'footing', depth: 0, points: [[999.5, 564.7], [1015.5, 564.3], [1015.6, 577.6], [1031, 577.2], [1031.4, 603.6], [984.4, 604.8], [984, 578.8], [999.6, 578.4]], closed: true },
    // The long wall's strip, back to the vanishing point
    { group: 'footing', depth: 1, points: [[251.5, 629.1], [106, 564.1]] },
    { group: 'footing', depth: 1, points: [[251, 600.3], [106, 550.6]] },
  ],
  nodes: [[299.2, 218.5], [406.9, 208], [508.1, 198.2], [603.2, 188.9], [692.8, 180.2], [777.4, 172], [857.4, 164.2], [933.2, 156.8], [1005, 149.8], [1071, 172.3], [1134, 193.8], [1194.3, 214.3], [1252.1, 234], [1307.4, 252.9], [1360.6, 271], [1411.6, 288.4], [1460.7, 305.1]],
  load: {
    arrows: COMB_ARROWS,
    comb: COMB_LINE,
    roof: [...ROOF_TOP, [1401.2, 295.7], [957, 146.2], [281.5, 209.9]],
    links: [
      { link: 3, points: [[1005, 149.8], [299.2, 218.5]] },
      { link: 3, points: [[1005, 149.8], [1460.7, 305.1]] },
      { link: 4, points: [[299.2, 218.5], [297.9, 252.2], [284.8, 595.7]] },
      { link: 4, points: [[1460.7, 305.1], [1461.6, 331.8], [1469.3, 561.3]] },
      { link: 4, points: [[1005.9, 300.6], [1007.3, 563.5]] },
      { link: 5, points: [[284.8, 595.7], [283.4, 634.6]] },
      { link: 5, points: [[1469.3, 561.3], [1470.3, 595]] },
      { link: 5, points: [[1007.3, 563.5], [1007.7, 609]] },
    ],
    legs: [
      [[1005, 149.8], [299.2, 218.5], [297.9, 252.2], [284.8, 595.7], [283.4, 634.6]],
      [[1005, 149.8], [1460.7, 305.1], [1461.6, 331.8], [1469.3, 561.3], [1470.3, 595]],
      [[1005, 149.8], [1005.9, 300.6], [1007.3, 563.5], [1007.7, 609]],
    ],
    ground: [[[171.8, 599], [391.1, 592.6]], [[1419.9, 562.7], [1516.7, 559.9]], [[955, 570], [1060, 567.3]]],
  },
  wind: {
    gusts: WIND_GUSTS,
    lift: WIND_LIFT,
    links: [
      { link: 2, points: [[1461.6, 331.8], [1469.3, 561.3]] },
      { link: 3, points: [[1461.6, 331.8], [297.9, 252.2]] },
      { link: 4, points: [[297.9, 252.2], [284.8, 595.7]] },
      { link: 4, points: [[1005.9, 300.6], [1007.3, 563.5]] },
      { link: 5, points: [[284.8, 595.7], [283.4, 634.6]] },
      { link: 5, points: [[1007.3, 563.5], [1007.7, 609]] },
      { link: 5, points: [[1469.3, 561.3], [1470.3, 595]] },
    ],
    legs: [
      [[1466.1, 446.6], [1461.6, 331.8], [1005.9, 300.6], [1007.3, 563.5], [1007.7, 609]],
      [[1466.1, 446.6], [1461.6, 331.8], [297.9, 252.2], [284.8, 595.7], [283.4, 634.6]],
    ],
    reactions: [[[238, 628], [262, 627.4]], [[958, 600], [981, 599.4]], [[1424, 586], [1446, 585.4]]],
  },
  tags: [
    // In the frame's free room (owner review, 04.10: «текст залазить на елемент»): the truss's and the purlins' names in
    // the sky over the right rake, the column's and the footings' on the ground under the base, the walls' on a face that
    // holds only blockwork — each on a backing that masks what runs under it, as a drawing's text does
    { id: 'truss', text: 'Ферма', anchor: [1360.6, 271], at: [1352, 214], align: 'start' },
    { id: 'bracing', text: 'Прогони й в’язі', anchor: [1252.1, 234], at: [1247, 112], align: 'end' },
    { id: 'column', text: 'Центральний ряд колон', anchor: [1008.2, 540], at: [1045, 602], align: 'start' },
    { id: 'wall', text: 'Стіни — газобетон', anchor: [1464.6, 410], at: [1430, 452], align: 'end' },
    { id: 'footing', text: 'Фундаменти — умовно', anchor: [1468, 580], at: [1446, 632], align: 'end' },
  ],
  label:
    'Схема каркаса такого типу, як на цьому об’єкті, вписана в силует із фото: ферми, прогони, в’язі, стіни з газобетонних блоків по контуру й центральний ряд колон, фундаменти — умовно. Навантаження з покрівлі йде через прогони й ферми на стіни й колони, а з них — на фундаменти. Не креслення цього ангара: розмірів і перерізів тут немає.',
};
