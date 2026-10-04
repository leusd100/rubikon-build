/**
 * «Виміряно за фото · без масштабу» — the figures HOME writes on its one real photo (ProofContour). MEASURED (04.10):
 * each one comes from the frozen photo study of this hangar (eight photos, its geometry register) and is scale-free — an
 * angle, a ratio, an equality. No length, area or level: the photos give no scale, and the page says so.
 *
 * Which register records: the slope — PG006 (the roof's pitch by the frozen shell, 10.52 ± 0.6°); the gates — PG012–
 * PG019 (both openings' jambs, widths and heights, equal and mirrored about the gable's middle within their
 * uncertainties); the proportion — PG003 (the ridge over the cladding's bottom, 0.3154 ± 0.0029 of the gable's width).
 * The ids stay here and in tests/unit/home-proof-frame.test.ts, never in the shipped data.
 *
 * Not a figure (review, 04.10): «the ridge in the middle». PG011 is the test bound of the two eaves' height difference,
 * not a ridge offset; the frozen shell builds the ridge at the middle (x = 0.5) and never measures it, and in this
 * frame the left rake sits ≈ 12.7 px off the shell's line, cause unproven. Nor «both rakes» on the slope: the shell
 * forces them equal; the slope is one profile figure.
 *
 * The words are made from the values by the formatters below, so a figure on the page can only be the register's own,
 * with its «≈» and «±»: 10.52 ± 0.6 is «≈ 10,5° ± 0,6°» (decimal comma, a no-break space after the sign).
 * tests/unit/home-proof-frame.test.ts pins the values and the grammar.
 *
 * The geometry (photo pixels of the 1536 × 788 frame, x right, y down) is drawn on the contour's own lines: the slope's
 * arc between the drawn right rake (solid, measured) and a level line through its foot, «=» marks on the head and the
 * outer jamb of both gates, and the gable's width with the ridge's height.
 */

type Pt = readonly [number, number];

const NBSP = ' ';
/** «≈ 10,5»: the value to `digits` decimals, decimal comma */
export const approx = (value: number, digits = 1) => `≈${NBSP}${value.toFixed(digits).replace('.', ',')}`;
/** «± 0,6» */
export const plusMinus = (value: number, digits = 1) => `±${NBSP}${value.toFixed(digits).replace('.', ',')}`;

export type MeasureId = 'slope' | 'gates' | 'proportion';

export type Measure = {
  id: MeasureId;
  /** The register's value and its practical uncertainty, as recorded */
  value?: number;
  u?: number;
  /** On the sheet: the title (copper) and, in the «Контур» layer, the line under it */
  title: string;
  detail: string;
  /** What a screen reader hears, figures in words where a sign would be read oddly */
  spoken: string;
  /** The phone's chip under the note */
  chip?: string;
  /** Where the label sits and which way it runs from there; in «Контур», where the frame's scheme leaves the gable
   *  free, it may sit elsewhere (`atContour`) */
  at: Pt;
  align: 'start' | 'middle' | 'end';
  atContour?: Pt;
  alignContour?: 'start' | 'middle' | 'end';
  /** Shown in the «Каркас» layer too (titles only); the rest only in «Контур» */
  onFrame: boolean;
};

// PG006: the roof's pitch by the frozen shell, atan(rise / 0.5) — one profile figure
const PITCH = 10.52;
const PITCH_U = 0.6;
const comma = (value: number) => value.toFixed(1).replace('.', ',');
// PG003: the ridge's height over the cladding's bottom, the gable's width = 1
const RIDGE = 0.3154;
const RIDGE_U = 0.0029;
const WIDTH_PER_HEIGHT = 1 / RIDGE;
const WIDTH_PER_HEIGHT_U = (RIDGE_U / RIDGE) * WIDTH_PER_HEIGHT;

export const homeProofMeasures: readonly Measure[] = [
  {
    id: 'slope',
    value: PITCH,
    u: PITCH_U,
    // The uncertainty is part of the figure, on every layer and on a phone (review, 04.10)
    title: `Схил даху ${approx(PITCH)}° ${plusMinus(PITCH_U)}°`,
    detail: 'для кута масштаб не потрібен',
    spoken: `Схил даху приблизно ${comma(PITCH)} градуса, похибка ${comma(PITCH_U)} градуса; для кута масштаб не потрібен`,
    chip: `Схил ${approx(PITCH)}° ${plusMinus(PITCH_U)}°`,
    at: [1240, 150],
    align: 'end',
    atContour: [1330, 330],
    alignContour: 'middle',
    onFrame: true,
  },
  {
    id: 'gates',
    title: 'Ворота однакові',
    detail: 'ширина й висота, дзеркально',
    spoken: 'Двоє воріт однакові за шириною й висотою і стоять дзеркально від середини фронтона, у межах похибки',
    chip: 'Ворота однакові',
    at: [1135, 422],
    align: 'middle',
    // With the line under it, from the gate's left jamb, over the jamb's «=» marks: centred, it met the handle on a
    // tablet
    atContour: [1065, 405],
    alignContour: 'start',
    onFrame: true,
  },
  {
    id: 'proportion',
    value: WIDTH_PER_HEIGHT,
    u: WIDTH_PER_HEIGHT_U,
    title: `Ширина торця ${approx(WIDTH_PER_HEIGHT)} висоти`,
    detail: 'висота — від низу облицювання до гребеня',
    spoken: `Ширина торця — приблизно ${comma(WIDTH_PER_HEIGHT)} його висоти до гребеня`,
    at: [1180, 586],
    align: 'middle',
    onFrame: false,
  },
];

/** The marks the labels point at, on the contour's own lines */
export const homeProofMarks = {
  slope: {
    arc: [[1377.6, 286.2], [1377.5, 281.1], [1377.5, 276.1], [1377.7, 271.1], [1378, 266.1], [1378.4, 261.1], [1378.6, 258.6]] as readonly Pt[],
    level: [[1483.7, 295.2], [1349.5, 283.8]] as readonly Pt[],
    anchor: [1377.7, 271.1] as Pt,
  },
  gates: [
    [[825.4, 333.8], [830.7, 299.4]], [[835.7, 334.3], [840.9, 300.1]], [[908.9, 455.6], [942.9, 447.6]], [[908.9, 438.5], [942.9, 430.7]],
    [[1129.9, 351], [1133.7, 320]], [[1138.3, 351.4], [1142, 320.6]], [[1201.8, 459.8], [1229.2, 452.6]], [[1201.5, 444.4], [1228.9, 437.3]],
  ] as readonly (readonly Pt[])[],
  width: [[260.2, 662.3], [1480.4, 604.2]] as readonly Pt[],
  widthTicks: [[[248.3, 680.7], [272, 643.9]], [[1476, 616.2], [1484.8, 592.3]], [[261.9, 617.7], [259.3, 683.7]], [[1479.4, 575], [1480.9, 618.2]]] as readonly (readonly Pt[])[],
  height: [[1007.3, 563.5], [1004.9, 128.6]] as readonly Pt[],
  heightTicks: [[[998.1, 572.2], [1016.5, 554.9]], [[995.9, 135.4], [1013.8, 121.8]]] as readonly (readonly Pt[])[],
};
