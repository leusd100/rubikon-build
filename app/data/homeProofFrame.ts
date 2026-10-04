/**
 * «Схема каркаса» — the frame HOME draws INSIDE the measured silhouette of its one real photo (ProofContour, layers
 * «Каркас» and «Навантаження»). ILLUSTRATIVE, NOT MEASURED (04.10): a scheme of a frame of the structural type the
 * owner names for this object — light trapezoidal trusses with a vertical at every panel point and one diagonal per
 * panel falling to the middle, purlins on the top-chord nodes, the trusses bearing on load-bearing walls and a middle
 * support, bracing in the first bay, strip footings under the walls — drawn in this photo's perspective. Nothing here is
 * this building's structure (unknown: its drawings were not kept) and nothing comes from any drawing's sizes, marks or
 * levels: the type only, fitted to the silhouette the photos give (app/data/homeProofContour.ts). The page says so on
 * the sheet («Схема · без розмірів», «каркас такого типу, як на цьому об’єкті»).
 *
 * How it was drawn (the frame-layer geometry pass, 04.10, outside the repo): the gable plane is the drawn contour itself
 * — its rakes and apex mapped back through the gable plane of the photo study's frozen camera, so the front truss sits
 * under the copper outline (top chord under the rakes, ridge under the drawn apex); the depth direction is the long
 * wall's vanishing point measured in this photo (its eave and base lines, ±2 px); how fast the trusses recede is not
 * given by the photo and is borrowed from a camera refit — so the bays are illustrative too. The type is adapted to the
 * rakes measured here (≈ 10,5°), not to any drawn slope.
 *
 * Photo pixels of the 1536 × 788 frame, x right, y down. `depth` 0 is the gable's own plane, 1 and 2 the bays behind it
 * (drawn fainter). tests/unit/home-proof-frame.test.ts keeps every point inside the drawn silhouette (footings: in a band
 * under the base), the top chord under the rakes, the names in words, and this file tied to the photo's sha256.
 */
import { homeProofContour } from './homeProofContour';

type Pt = readonly [number, number];

/** truss: chords and end posts; web: diagonals and verticals; wall: bearing lines and lintels; support: the middle pier */
export type FrameGroup = 'truss' | 'web' | 'wall' | 'support' | 'purlin' | 'bracing' | 'footing';

export type FrameMember = { group: FrameGroup; depth: 0 | 1 | 2; points: readonly Pt[]; closed?: boolean };

export type FrameTag = { id: string; text: string; anchor: Pt; at: Pt; align: 'start' | 'end' };

export type HomeProofFrame = {
  /** The frame it is drawn on: the contour's own photo, byte for byte */
  photoSha256: string;
  /** Not a measurement: the page labels it as a scheme */
  status: 'illustrative';
  /** The drawn gable and the long wall: the frame stays inside them (clip and test) */
  silhouette: readonly (readonly Pt[])[];
  /** Hatched as bearing walls: the gable wall less its gates, and the near long wall */
  walls: { gable: readonly Pt[]; holes: readonly (readonly Pt[])[]; long: readonly Pt[] };
  members: readonly FrameMember[];
  /** Where the purlins bear on the front truss: its top-chord nodes */
  nodes: readonly Pt[];
  /** The way the snow goes: arrows, the strip of roof one truss carries, the lit links (3 the truss, 4 the walls and the
   *  middle support, 5 the footings), the three legs the drops run along, the ground under them */
  load: {
    arrows: readonly (readonly [Pt, Pt])[];
    roof: readonly Pt[];
    links: readonly { link: 3 | 4 | 5; points: readonly Pt[] }[];
    legs: readonly (readonly Pt[])[];
    ground: readonly (readonly [Pt, Pt])[];
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
    { group: 'truss', depth: 1, points: [[263.8, 250.2], [913.3, 181.7], [1347.3, 320.5]] },
    { group: 'truss', depth: 1, points: [[262.6, 280.3], [1348, 345.2]] },
    { group: 'truss', depth: 1, points: [[262.6, 280.3], [263.8, 250.2]] },
    { group: 'truss', depth: 1, points: [[1348, 345.2], [1347.3, 320.5]] },
    { group: 'truss', depth: 2, points: [[235.5, 275.6], [836.7, 208.3], [1250.1, 333.7]] },
    { group: 'truss', depth: 2, points: [[234.3, 302.7], [1250.6, 356.6]] },
    { group: 'truss', depth: 2, points: [[234.3, 302.7], [235.5, 275.6]] },
    { group: 'truss', depth: 2, points: [[1250.6, 356.6], [1250.1, 333.7]] },
    { group: 'wall', depth: 0, points: [[276.4, 250.8], [1471.1, 332.5]] },
    { group: 'wall', depth: 1, points: [[276.4, 250.8], [45.6, 448.3]] },
    { group: 'wall', depth: 1, points: [[1471.1, 332.5], [1259.5, 357.1]] },
    { group: 'wall', depth: 0, points: [[717.8, 310.1], [940.3, 323.2], [940.3, 306.5], [718, 292.2]], closed: true },
    { group: 'wall', depth: 0, points: [[1040.5, 330.1], [1225.1, 340.9], [1224.8, 325.9], [1040.4, 314]], closed: true },
    { group: 'support', depth: 0, points: [[993.4, 563.9], [992.2, 299.7]] },
    { group: 'support', depth: 0, points: [[1021.1, 563.2], [1019.4, 301.6]] },
    { group: 'purlin', depth: 0, points: [[299.6, 208.4], [264.2, 241.2]] },
    { group: 'purlin', depth: 1, points: [[264.2, 241.2], [235.8, 267.5]] },
    { group: 'purlin', depth: 2, points: [[235.8, 267.5], [212.6, 289]] },
    { group: 'purlin', depth: 0, points: [[407.2, 198.3], [361.4, 231.2]] },
    { group: 'purlin', depth: 1, points: [[361.4, 231.2], [324.3, 257.8]] },
    { group: 'purlin', depth: 2, points: [[324.3, 257.8], [293.8, 279.6]] },
    { group: 'purlin', depth: 0, points: [[508.3, 188.7], [453.2, 221.7]] },
    { group: 'purlin', depth: 1, points: [[453.2, 221.7], [408.4, 248.5]] },
    { group: 'purlin', depth: 2, points: [[408.4, 248.5], [371.4, 270.7]] },
    { group: 'purlin', depth: 0, points: [[603.4, 179.8], [540.1, 212.8]] },
    { group: 'purlin', depth: 1, points: [[540.1, 212.8], [488.5, 239.8]] },
    { group: 'purlin', depth: 2, points: [[488.5, 239.8], [445.5, 262.2]] },
    { group: 'purlin', depth: 0, points: [[693, 171.3], [622.5, 204.3]] },
    { group: 'purlin', depth: 1, points: [[622.5, 204.3], [564.7, 231.4]] },
    { group: 'purlin', depth: 2, points: [[564.7, 231.4], [516.4, 254]] },
    { group: 'purlin', depth: 0, points: [[777.5, 163.3], [700.7, 196.3]] },
    { group: 'purlin', depth: 1, points: [[700.7, 196.3], [637.4, 223.4]] },
    { group: 'purlin', depth: 2, points: [[637.4, 223.4], [584.3, 246.2]] },
    { group: 'purlin', depth: 0, points: [[857.5, 155.8], [775.1, 188.6]] },
    { group: 'purlin', depth: 1, points: [[775.1, 188.6], [706.9, 215.8]] },
    { group: 'purlin', depth: 2, points: [[706.9, 215.8], [649.4, 238.8]] },
    { group: 'purlin', depth: 0, points: [[933.2, 148.6], [845.9, 181.3]] },
    { group: 'purlin', depth: 1, points: [[845.9, 181.3], [773.2, 208.6]] },
    { group: 'purlin', depth: 2, points: [[773.2, 208.6], [711.8, 231.6]] },
    { group: 'purlin', depth: 0, points: [[1005, 141.9], [913.3, 174.4]] },
    { group: 'purlin', depth: 1, points: [[913.3, 174.4], [836.7, 201.6]] },
    { group: 'purlin', depth: 2, points: [[836.7, 201.6], [771.7, 224.7]] },
    { group: 'purlin', depth: 0, points: [[1070.9, 164.5], [975.4, 194.4]] },
    { group: 'purlin', depth: 1, points: [[975.4, 194.4], [895.2, 219.5]] },
    { group: 'purlin', depth: 2, points: [[895.2, 219.5], [827, 240.8]] },
    { group: 'purlin', depth: 0, points: [[1133.9, 186.1], [1034.9, 213.6]] },
    { group: 'purlin', depth: 1, points: [[1034.9, 213.6], [951.5, 236.7]] },
    { group: 'purlin', depth: 2, points: [[951.5, 236.7], [880.3, 256.4]] },
    { group: 'purlin', depth: 0, points: [[1194.2, 206.8], [1092.1, 232]] },
    { group: 'purlin', depth: 1, points: [[1092.1, 232], [1005.8, 253.3]] },
    { group: 'purlin', depth: 2, points: [[1005.8, 253.3], [931.9, 271.5]] },
    { group: 'purlin', depth: 0, points: [[1251.9, 226.7], [1147, 249.7]] },
    { group: 'purlin', depth: 1, points: [[1147, 249.7], [1058.1, 269.2]] },
    { group: 'purlin', depth: 2, points: [[1058.1, 269.2], [981.8, 286]] },
    { group: 'purlin', depth: 0, points: [[1307.3, 245.7], [1199.9, 266.7]] },
    { group: 'purlin', depth: 1, points: [[1199.9, 266.7], [1108.6, 284.7]] },
    { group: 'purlin', depth: 2, points: [[1108.6, 284.7], [1030, 300.1]] },
    { group: 'purlin', depth: 0, points: [[1360.4, 263.9], [1250.8, 283.2]] },
    { group: 'purlin', depth: 1, points: [[1250.8, 283.2], [1157.4, 299.6]] },
    { group: 'purlin', depth: 2, points: [[1157.4, 299.6], [1076.7, 313.7]] },
    { group: 'purlin', depth: 0, points: [[1411.4, 281.5], [1299.9, 299]] },
    { group: 'purlin', depth: 1, points: [[1299.9, 299], [1204.5, 313.9]] },
    { group: 'purlin', depth: 2, points: [[1204.5, 313.9], [1121.9, 326.9]] },
    { group: 'purlin', depth: 0, points: [[1460.4, 298.3], [1347.2, 314.2]] },
    { group: 'purlin', depth: 1, points: [[1347.2, 314.2], [1250, 327.9]] },
    { group: 'purlin', depth: 2, points: [[1250, 327.9], [1165.7, 339.7]] },
    { group: 'bracing', depth: 1, points: [[297.9, 252.2], [451.2, 291.5], [691.5, 279.1], [774.1, 310.8], [1005.9, 300.6], [1035.7, 326.5], [1253.8, 317.6], [1252, 339.4], [1461.6, 331.8]] },
    { group: 'bracing', depth: 1, points: [[1005.9, 300.6], [913.3, 181.7]] },
    { group: 'bracing', depth: 1, points: [[913.3, 319.2], [1005, 149.8]] },
    { group: 'bracing', depth: 2, points: [[1005.9, 300.6], [770.6, 347.8]] },
    { group: 'footing', depth: 0, points: [[239.4, 622], [1489, 577], [1490.2, 609.6], [1058.9, 631.2], [1059.1, 650.6], [954.6, 656.5], [954.6, 636.4], [237.4, 672.3]], closed: true },
    { group: 'footing', depth: 1, points: [[237.4, 672.3], [105.6, 588.3]] },
    { group: 'footing', depth: 1, points: [[239.4, 622], [106.8, 563.6]] },
  ],
  nodes: [[299.2, 218.5], [406.9, 208], [508.1, 198.2], [603.2, 188.9], [692.8, 180.2], [777.4, 172], [857.4, 164.2], [933.2, 156.8], [1005, 149.8], [1071, 172.3], [1134, 193.8], [1194.3, 214.3], [1252.1, 234], [1307.4, 252.9], [1360.6, 271], [1411.6, 288.4], [1460.7, 305.1]],
  load: {
    arrows: [[[440.8, 56.3], [438, 150.3]], [[633.6, 46.3], [632, 134.7]], [[805, 37.4], [804.4, 120.8]], [[1116.9, 80.2], [1117.9, 155.1]], [[1241.4, 127.4], [1242.8, 199.2]], [[1355.3, 170.6], [1357.2, 239.5]]],
    roof: [[300.2, 191.6], [1004.9, 128.6], [1460.1, 287], [1401.2, 295.7], [957, 146.2], [281.5, 209.9]],
    links: [
      { link: 3, points: [[1005, 149.8], [299.2, 218.5]] },
      { link: 3, points: [[1005, 149.8], [1005.9, 300.6]] },
      { link: 3, points: [[1005, 149.8], [1460.7, 305.1]] },
      { link: 4, points: [[299.2, 218.5], [297.9, 252.2], [284.4, 606.3]] },
      { link: 4, points: [[1005.9, 300.6], [1007.4, 583.1]] },
      { link: 4, points: [[1460.7, 305.1], [1461.6, 331.8], [1469.5, 568.3]] },
      { link: 5, points: [[284.4, 606.3], [282, 670.1]] },
      { link: 5, points: [[1007.4, 583.1], [1007.8, 653.5]] },
      { link: 5, points: [[1469.5, 568.3], [1470.9, 610.5]] },
    ],
    legs: [
      [[1005, 149.8], [299.2, 218.5], [297.9, 252.2], [284.4, 606.3], [282, 670.1]],
      [[1005, 149.8], [1005.9, 300.6], [1007.4, 583.1], [1007.8, 653.5]],
      [[1005, 149.8], [1460.7, 305.1], [1461.6, 331.8], [1469.5, 568.3], [1470.9, 610.5]],
    ],
    ground: [[[171.3, 609.9], [390.7, 602.9]], [[936.3, 585.4], [1075.1, 580.9]], [[1420.1, 569.9], [1517, 566.8]]],
  },
  tags: [
    { id: 'truss', text: 'Ферма', anchor: [1252.9, 275.7], at: [1300, 395], align: 'start' },
    { id: 'bracing', text: 'Прогони й в’язі', anchor: [1060.9, 206.4], at: [1045, 262], align: 'start' },
    { id: 'wall', text: 'Несуча стіна', anchor: [1358, 445.4], at: [1395, 470], align: 'start' },
    { id: 'support', text: 'Середня опора', anchor: [1006.9, 480], at: [1032, 500], align: 'start' },
    { id: 'footing', text: 'Фундаменти — умовно', anchor: [1422.6, 596.1], at: [1390, 630], align: 'end' },
  ],
  label:
    'Схема каркаса такого типу, як на цьому об’єкті, вписана в силует із фото: ферми, прогони, в’язі, несучі стіни, середня опора й фундаменти; навантаження з покрівлі йде через прогони й ферми на стіни й середню опору, а з них — на фундаменти. Не креслення цього ангара: розмірів і перерізів тут немає.',
};
