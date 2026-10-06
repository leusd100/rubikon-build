import { describe, expect, it } from 'vitest';
import { stageTransform } from '../../app/components/useDrawingTour';
import { directionPages } from '../../app/data/directionPages';
import { grainPage } from '../../app/data/grainPage';
import { drawingTransform, drawingView, FRAME_MARGIN, type DrawingView, type FrameSize, type PictureBox } from '../../app/lib/drawingCamera';
import type { DirectionNode } from '../../app/types/directionPage';

// The «Вузол напряму» drawings' camera (06.10). Measured on main bdc16c4: the frame beside the text is half as wide as
// it is tall at 768 px and 1.1–1.4 at 1280–1920, while the drawings are 3:2, so cover cropped the concrete overview's
// «03» (x −80 … −66 px against a frame from 58 px at 768), the steel end view's labels, and the steps' marks (up to
// 340 px outside at 768; the grain store's third at every width, on main de05275). These tests hold the camera to its
// promise: what a view must show is whole in the frame and
// FRAME_MARGIN clear of its edges (unless the picture itself ends closer), and where the tours' own camera already
// shows it, the view is exactly that camera's.

type Case = { name: string; node: DirectionNode; overview: PictureBox; steps: readonly PictureBox[] };

/** What DirectionNode's useNeed measures on each drawing (Chrome, the site's fonts), rounded outward: every mark with
 *  its number, every part and every label for the overview; a step's mark and its parts' labels for a step */
const CASES: readonly Case[] = [
  {
    name: 'metalokonstruktsii',
    node: directionPages.metalokonstruktsii.editorial.node!,
    overview: [304, 246, 1646, 952],
    steps: [[1270, 300, 1591, 900], [346, 316, 505, 884], [400, 246, 769, 468]],
  },
  {
    name: 'betonni-roboty',
    node: directionPages['betonni-roboty'].editorial.node!,
    overview: [201, 127, 1640, 972],
    steps: [[639, 429, 1160, 951], [769, 129, 1030, 370], [243, 591, 424, 972]],
  },
  {
    name: 'pokrivelni-roboty',
    node: directionPages['pokrivelni-roboty'].editorial.node!,
    overview: [130, 127, 1620, 1200],
    steps: [[800, 399, 1100, 700], [1370, 154, 1620, 405], [130, 649, 480, 1190]],
  },
  {
    name: 'zernoskhovyshcha',
    node: grainPage.complexDirection.editorial.node!,
    overview: [128, 56, 1664, 1141],
    steps: [[330, 640, 660, 1080], [380, 290, 760, 600], [420, 840, 1290, 992], [196, 114, 1664, 988]],
  },
];

/** Frame sizes measured on the pages: a 390 px phone (3:2), 768 and 1024 px tablets, a 1280 px laptop, a 1920 px screen */
const FRAMES: readonly FrameSize[] = [
  { width: 324, height: 216 },
  { width: 258.3, height: 508.4 },
  { width: 441.2, height: 503.5 },
  { width: 573.5, height: 504.5 },
  { width: 706.4, height: 524.2 },
];

const coverOf = (size: FrameSize, picture: FrameSize) => Math.max(size.width / picture.width, size.height / picture.height);
const numbers = (transform: string | undefined) => (transform ? transform.match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number) : []);

/** The view a transform in stageTransform's form shows. translate(W/2, H/2) scale(k) translate(−x, −y): the stage's
 *  pixel (x, y) sits at the frame's centre, and the stage holds the picture by cover, centred */
function viewOf(transform: string | undefined, size: FrameSize, picture: FrameSize): DrawingView {
  const cover = coverOf(size, picture);
  if (!transform) return { scale: cover, centre: [picture.width / 2, picture.height / 2] };
  const [, , k, minusX, minusY] = numbers(transform);
  return {
    scale: cover * k,
    centre: [picture.width / 2 + (-minusX - size.width / 2) / cover, picture.height / 2 + (-minusY - size.height / 2) / cover],
  };
}

/** Where a picture's point lands in the frame, in pixels */
const toFrame = (view: DrawingView, size: FrameSize, [u, v]: readonly [number, number]) =>
  [size.width / 2 + (u - view.centre[0]) * view.scale, size.height / 2 + (v - view.centre[1]) * view.scale] as const;

/** `need` whole in the frame, FRAME_MARGIN clear of each edge — or as clear as the picture's own edge allows */
function holds(view: DrawingView, size: FrameSize, picture: FrameSize, need: PictureBox) {
  const [left, top] = toFrame(view, size, [need[0], need[1]]);
  const [right, bottom] = toFrame(view, size, [need[2], need[3]]);
  const room = (units: number) => Math.min(FRAME_MARGIN, units * view.scale) - 1e-6;
  return left >= room(need[0]) && top >= room(need[1])
    && size.width - right >= room(picture.width - need[2]) && size.height - bottom >= room(picture.height - need[3]);
}

describe('the «Вузол напряму» drawing camera', () => {
  it('reads a transform back as the view it shows (the test helper itself)', () => {
    for (const size of FRAMES) {
      for (const { node, overview, steps } of CASES) {
        for (const [step, need] of [[undefined, overview], ...node.steps.map((item, index) => [item, steps[index]] as const)] as const) {
          const view = drawingView(size, node, step, need);
          const back = viewOf(drawingTransform(size, node, step, need), size, node);
          expect(back.scale).toBeCloseTo(view.scale, 9);
          expect(back.centre[0]).toBeCloseTo(view.centre[0], 6);
          expect(back.centre[1]).toBeCloseTo(view.centre[1], 6);
        }
      }
    }
  });

  for (const { name, node, overview, steps } of CASES) {
    it(`${name}: every view holds what it must show, in every frame`, () => {
      for (const size of FRAMES) {
        expect(holds(drawingView(size, node, undefined, overview), size, node, overview), `${name} overview ${size.width}×${size.height}`).toBe(true);
        node.steps.forEach((step, index) => {
          expect(holds(drawingView(size, node, step, steps[index]), size, node, steps[index]), `${name} step ${index + 1} ${size.width}×${size.height}`).toBe(true);
        });
      }
    });

    it(`${name}: where the tours' own camera already shows it, the view is that camera's`, () => {
      let kept = 0;
      for (const size of FRAMES) {
        node.steps.forEach((step, index) => {
          const own = stageTransform(size, node, step);
          if (!holds(viewOf(own, size, node), size, node, steps[index])) return;
          kept += 1;
          const ours = numbers(drawingTransform(size, node, step, steps[index]));
          numbers(own).forEach((value, at) => expect(ours[at], `${name} step ${index + 1} ${size.width}×${size.height}`).toBeCloseTo(value, 6));
        });
        // the overview: cover itself — no transform at all — wherever cover shows everything
        if (holds(viewOf(undefined, size, node), size, node, overview)) expect(drawingTransform(size, node, undefined, overview)).toBeUndefined();
      }
      expect(kept).toBeGreaterThan(0);
    });

    it(`${name}: on a 3:2 phone frame the overview is cover itself — no transform`, () => {
      expect(drawingTransform(FRAMES[0], node, undefined, overview)).toBeUndefined();
    });

    it(`${name}: in a tablet's tall frame the overview pulls back below cover, the drawing centred top to bottom`, () => {
      const tablet = FRAMES[1];
      const view = drawingView(tablet, node, undefined, overview);
      expect(view.scale).toBeLessThan(coverOf(tablet, node));
      expect(view.centre[1]).toBeCloseTo(node.height / 2, 9);
    });
  }

  it('the concrete overview: the third number, cut at 768, 1024 and 1280 px by cover, is in the frame', () => {
    const { node, overview } = CASES[1];
    const badge = node.steps[2].mark.badge;
    for (const size of [FRAMES[1], FRAMES[2], FRAMES[3]]) {
      const [x] = toFrame(viewOf(undefined, size, node), size, [badge[0] - 42, badge[1]]);
      expect(x, `cover ${size.width}`).toBeLessThan(0);
      const [ours] = toFrame(drawingView(size, node, undefined, overview), size, [badge[0] - 42, badge[1]]);
      expect(ours, `camera ${size.width}`).toBeGreaterThanOrEqual(FRAME_MARGIN - 1e-6);
    }
  });

  it('the steel end view at 768 px: the tours\' own camera cannot reach step 1\'s mark, this one shows it at the step\'s zoom', () => {
    const { node, steps } = CASES[0];
    const tablet = FRAMES[1];
    expect(holds(viewOf(stageTransform(tablet, node, node.steps[0]), tablet, node), tablet, node, steps[0])).toBe(false);
    const view = drawingView(tablet, node, node.steps[0], steps[0]);
    expect(holds(view, tablet, node, steps[0])).toBe(true);
    expect(view.scale / coverOf(tablet, node)).toBeCloseTo(node.steps[0].zoom, 9);
  });

  it('the three direction pages\' steps do not move on a phone: the tours\' own camera already shows them there', () => {
    const phone = FRAMES[0];
    for (const { node, steps } of CASES.slice(0, 3)) {
      node.steps.forEach((step, index) => {
        const ours = numbers(drawingTransform(phone, node, step, steps[index]));
        numbers(stageTransform(phone, node, step)).forEach((value, at) => expect(ours[at]).toBeCloseTo(value, 6));
      });
    }
  });

  it('the grain store\'s third step: its mark, too wide to sit off-centre in the zoomed window, was cut in every frame', () => {
    const { node, steps } = CASES[3];
    for (const size of FRAMES) {
      expect(holds(viewOf(stageTransform(size, node, node.steps[2]), size, node), size, node, steps[2]), `own ${size.width}`).toBe(false);
      expect(holds(drawingView(size, node, node.steps[2], steps[2]), size, node, steps[2]), `camera ${size.width}`).toBe(true);
    }
  });

  it('pulls back from a step\'s zoom only as far as it must: the weld and its label just fill a 768 px frame', () => {
    const { node, steps } = CASES[0];
    const tablet = FRAMES[1];
    const view = drawingView(tablet, node, node.steps[2], steps[2]);
    expect(view.scale / coverOf(tablet, node)).toBeLessThan(node.steps[2].zoom);
    expect((steps[2][2] - steps[2][0]) * view.scale).toBeCloseTo(tablet.width - 2 * FRAME_MARGIN, 9);
  });

  it('asks no margin past the picture\'s own edge: the roofing downpipe ends at the drawing\'s foot, and nothing moves', () => {
    const { node, overview } = CASES[2];
    expect(overview[3]).toBe(node.height);
    const phone = FRAMES[0];
    expect(drawingView(phone, node, undefined, overview).scale).toBeCloseTo(coverOf(phone, node), 12);
    expect(drawingTransform(phone, node, undefined, overview)).toBeUndefined();
    // a part from the drawing's top to its foot in a 3:2 frame: margins there would shrink the drawing for nothing
    const sheet = { width: 300, height: 200 };
    expect(drawingView(sheet, node, undefined, [100, 0, 1700, 1200]).scale).toBeCloseTo(coverOf(sheet, node), 12);
    expect(drawingTransform(sheet, node, undefined, [100, 0, 1700, 1200])).toBeUndefined();
  });

  it('waits for the frame: no transform before it is measured', () => {
    const { node, overview } = CASES[0];
    expect(drawingTransform(null, node, undefined, overview)).toBeUndefined();
    expect(drawingTransform(null, node, node.steps[0], overview)).toBeUndefined();
  });
});
