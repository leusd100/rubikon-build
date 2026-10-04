/**
 * «Контур за фото» — the lines HOME draws over its one real photo (EngineeringSignature → ProofContour). Owner's
 * decision (04.10): publish what was measured from the photos of this hangar — the gable's outline, both gates and the
 * gable's cladding-strip boundaries — on the photo's own «калька», with nothing invented behind the cladding.
 *
 * The lines come from the photo study of this hangar (eight photos of it; the owner's report of 04.10), registered
 * onto this exact frame and written here in its own pixels: x to the right, y down, origin at the top-left corner.
 * The files are the owner's 4416 px retouch of the same frame (04.10), laid onto this frame by one similarity fit
 * (scale and a 1 px shift, no rotation: rms 0.68 px; the retouch matches the RAW master within 0.38 px) and resized —
 * up to 3840 px wide, so a retina screen draws it sharp; nothing in the picture changed.
 * They are tied to the file byte for byte: replace or
 * re-crop the photo (or its WebP copies) and tests/unit/home-proof-contour.test.ts fails the build until the lines are
 * registered again.
 *
 * `approximate`: in the study the line lies further from its edge in the photo than the study's pass mark, or it was
 * never checked against an edge — drawn dashed and called «наближено»; every other line is solid, «виміряно». Nothing here is a size: no scale, no
 * proportions, no internal register ids — only where each line sits on this frame.
 */
export type ContourLineKind = 'outline' | 'gate' | 'cladding';

export type ContourLine = {
  id: string;
  kind: ContourLineKind;
  /** Photo pixels, in drawing order */
  points: readonly (readonly [number, number])[];
  approximate: boolean;
  /** Short and in words (the SVG <title>): what the line is, never a figure */
  title: string;
};

export type HomeProofContour = {
  photo: { src: string; sha256: string; width: number; height: number };
  /** The WebP copies the page draws (same frame, resized only), hashed for the same reason */
  variants: readonly { src: string; sha256: string; width: number }[];
  lines: readonly ContourLine[];
  /** The lines' accessible name: what is drawn and which lines are approximate. Under role="img" the per-line titles
   *  reach no one, so this is the only place a screen reader learns where the dashes are */
  label: string;
};

export const homeProofContour: HomeProofContour = {
  photo: {
    src: '/photos/serhii-prior-hangar-retouched.jpeg',
    sha256: '7a0407ab691ef2458e128905938f7ab9f95ffc1edd9ead3ed4c828ab5b96c86a',
    width: 1536,
    height: 788,
  },
  variants: [
    { src: '/media/home-v2/hangar-retouched-960w.webp', sha256: '3e2b84c34a81745521dce490f34ba693c7f612ac9d4b9bc309364dd8194a4ff9', width: 960 },
    { src: '/media/home-v2/hangar-retouched-1536w.webp', sha256: '74bca5ee6600543311346d09af0cb702be5be3554a7908ef0bad26e1b2330b21', width: 1536 },
    { src: '/media/home-v2/hangar-retouched-2304w.webp', sha256: 'e9b1a6b2fb53b12fb827f769c6f727765fc68d22735d61c97989e3953c1d6d8a', width: 2304 },
    { src: '/media/home-v2/hangar-retouched-3072w.webp', sha256: 'cd68ee061cbea98e943217a3473c95de6351738acf036303c3f5d21f80fae43d', width: 3072 },
    { src: '/media/home-v2/hangar-retouched-3840w.webp', sha256: '2a2754b09b3d432346c4a4be60e924cc7b762da957c685114a74ba9824091c2b', width: 3840 },
  ],
  lines: [
    // The outline, drawn round from the apex: the right rake, the right corner, the base with the left corner, the left
    // rake back up. It is split where a part sits off its edge or was never checked against one. The right corner: the
    // study finds the photo's edge outside it, on the trim, past the pass mark — so approximate (review of 04.10; the
    // first cut had taken the cladding-corner figures for the outline's corners). The two short fascia ends have no edge
    // check at all, so each rides with its dashed neighbour. The left corner, checked on this photo with the study's own
    // colour-step scan, sits on its edge.
    {
      id: 'gable-rake-right',
      kind: 'outline',
      points: [[1004.9, 128.6], [1483.7, 295.2]],
      approximate: false,
      title: 'Правий скат фронтона',
    },
    {
      id: 'gable-corner-right',
      kind: 'outline',
      points: [[1483.7, 295.2], [1484.2, 309.1], [1470.4, 310.6], [1478.6, 551.7]],
      approximate: true,
      title: 'Правий кут фронтона, наближено',
    },
    {
      id: 'gable-base',
      kind: 'outline',
      points: [[1478.6, 551.7], [263.3, 582.2], [277.7, 217.9]],
      approximate: false,
      title: 'Низ облицювання фронтона й лівий кут',
    },
    {
      id: 'gable-rake-left',
      kind: 'outline',
      points: [[277.7, 217.9], [280.5, 214.3], [281.4, 193.3], [1004.9, 128.6]],
      approximate: true,
      title: 'Лівий скат фронтона, наближено',
    },
    {
      id: 'gate-left',
      kind: 'gate',
      points: [[731.4, 570.4], [734.3, 311.1], [925.9, 322.4], [926.1, 565.5]],
      approximate: false,
      title: 'Ліві ворота: одвірки й верх прорізу',
    },
    {
      id: 'gate-right',
      kind: 'gate',
      points: [[1055.7, 562.3], [1053.8, 330.9], [1213.4, 340.2], [1217.4, 558.2]],
      approximate: false,
      title: 'Праві ворота: одвірки й верх прорізу',
    },
    { id: 'cladding-corner-left', kind: 'cladding', points: [[273.3, 581.9], [287.4, 218.7]], approximate: false, title: 'Межа облицювання біля лівого кута' },
    { id: 'cladding-corner-right', kind: 'cladding', points: [[1459.5, 552.2], [1451.5, 309.1]], approximate: false, title: 'Межа облицювання біля правого кута' },
    // The strip boundaries, left to right
    { id: 'strip-a', kind: 'cladding', points: [[463.9, 577.2], [474.2, 199.0]], approximate: true, title: 'Межа смуг облицювання, наближено' },
    { id: 'strip-b', kind: 'cladding', points: [[708.8, 571.0], [713.7, 175.9]], approximate: true, title: 'Межа смуг облицювання, наближено' },
    { id: 'strip-c', kind: 'cladding', points: [[919.5, 322.0], [919.4, 156.0]], approximate: true, title: 'Межа смуг облицювання, наближено' },
    { id: 'strip-d', kind: 'cladding', points: [[1156.8, 336.9], [1154.8, 203.4]], approximate: false, title: 'Межа смуг облицювання' },
    { id: 'strip-e', kind: 'cladding', points: [[1266.3, 557.0], [1259.5, 238.9]], approximate: false, title: 'Межа смуг облицювання' },
  ],
  // Names the approximate set in words; tests/unit/home-proof-contour.test.ts pins that set, so a changed flag fails
  // until this sentence is changed with it
  label:
    'Контур за фото: обрис фронтона, ворота й межі смуг облицювання. Суцільні лінії виміряно, пунктирні наближено — це лівий скат і правий кут фронтона та три ліві межі смуг облицювання.',
};
