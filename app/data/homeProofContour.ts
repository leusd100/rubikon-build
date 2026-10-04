/**
 * «Контур за фото» — the lines HOME draws over its one real photo (EngineeringSignature → ProofContour). Owner's
 * decision (04.10): publish what was measured from the photos of this hangar — the gable's outline, both gates and the
 * gable's cladding-strip boundaries — on the photo's own «калька», with nothing invented behind the cladding.
 *
 * The lines come from the photo study of this hangar (eight photos of it; the owner's report of 04.10), registered
 * onto this exact frame and written here in its own pixels: x to the right, y down, origin at the top-left corner.
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
    sha256: '365a578211db897d886f6aeeb7de22546843be59db517c6c57ed794b1cce4567',
    width: 1536,
    height: 788,
  },
  variants: [
    { src: '/media/home-v2/hangar-retouched-960w.webp', sha256: '7cc3998599409754ff2c0fbdc1540d570d47f9966be59c01bac4aa7cbff9a704', width: 960 },
    { src: '/media/home-v2/hangar-retouched-1536w.webp', sha256: 'f2c6fa09ecb04befceffc16fb61aee5fc1c158bc01fad1fccc5723f4b9590e6f', width: 1536 },
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
