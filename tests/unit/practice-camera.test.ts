import { describe, expect, it } from 'vitest';
import { cameraTransform, type DrawingNeed } from '../../app/components/useDrawingCamera';
import { stageTransform } from '../../app/components/useDrawingTour';
import { drawingView, FRAME_MARGIN, type DrawingView, type FrameSize, type PictureBox } from '../../app/lib/drawingCamera';

// The /pro-nas practice drawing's camera (PracticeSteps, 06.10). Measured on main de05275: the frame has the 4:5
// drawing's own shape only on a phone; a tablet caps the 4:5 at 640 px (1.04 times as wide as tall at 768, 1.41 at
// 1024) and cover cut the dimension's «L» off the top (11, 40.5 and 128.8 px at 768, 834 and 1024), with the bracket of
// 01 in the overview and in step 1 (768–1280: the bracket is wider than step 1's zoomed window beside the text) and the
// frame step 2 lights (1024, 1180). These tests hold the camera to its promise: what a view must show is whole in the
// frame, FRAME_MARGIN clear of its edges — a step's also FRAME_MARGIN below the step bars — and where the tours' own
// camera already shows it so, the view is exactly that camera's.

const PICTURE = { width: 1440, height: 1800 };
/** The page's steps (BEFORE_SITE, app/pro-nas/page.tsx): the working drawing, the erection order, the bolted joint */
const STEPS = [
  { focus: [720, 1330], zoom: 1.4 },
  { focus: [655, 600], zoom: 1.35 },
  { focus: [1016, 530], zoom: 3.4 },
] as const;
/** The step bars' bottom edge in the frame (.ps-progress: 16 px from the top, 3 px tall) — PracticeSteps' stepTop */
const BARS = 19;

/** What useDrawingCamera measures (Chrome, the site's fonts), rounded outward: every mark with its number, every part
 *  and both letters for the overview; a step's mark, circles and parts for a step. On a phone the marks' numbers are
 *  drawn larger (about.css: badges × 1.6, circles × 1.45). */
const NEED: DrawingNeed = {
  overview: [200, 182, 1240, 1620],
  steps: [[240, 1040, 1200, 1620], [200, 300, 1110, 914], [896, 410, 1136, 650]],
};
const PHONE_NEED: DrawingNeed = {
  overview: [176, 181, 1264, 1620],
  steps: [[240, 1040, 1200, 1620], [200, 300, 1110, 928], [896, 410, 1136, 650]],
};
/** The dimension's «L» (its text box) */
const L: PictureBox = [640, 182, 661, 239];

/** Frames measured on the page: phones (the drawing's own 4:5, then 640 px tall at 600), tablets, beside the text */
const PHONES: readonly FrameSize[] = [{ width: 254, height: 317.5 }, { width: 324, height: 405 }, { width: 534, height: 640 }];
const TABLETS: readonly FrameSize[] = [{ width: 664.4, height: 640 }, { width: 725.4, height: 640 }, { width: 901.2, height: 640 }];
const LAPTOPS: readonly FrameSize[] = [{ width: 372.5, height: 560 }, { width: 408, height: 560 }, { width: 508.3, height: 560 }];
const CASES = [
  ...PHONES.map((size) => ({ size, need: PHONE_NEED })),
  ...[...TABLETS, ...LAPTOPS].map((size) => ({ size, need: NEED })),
];

const coverOf = (size: FrameSize) => Math.max(size.width / PICTURE.width, size.height / PICTURE.height);
const numbers = (transform: string | undefined) => (transform ? transform.match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number) : []);

/** The view a transform in stageTransform's form shows. translate(W/2, H/2) scale(k) translate(−x, −y): the stage's
 *  pixel (x, y) sits at the frame's centre, and the stage holds the picture by cover, centred */
function viewOf(transform: string | undefined, size: FrameSize): DrawingView {
  const cover = coverOf(size);
  if (!transform) return { scale: cover, centre: [PICTURE.width / 2, PICTURE.height / 2] };
  const [, , k, minusX, minusY] = numbers(transform);
  return {
    scale: cover * k,
    centre: [PICTURE.width / 2 + (-minusX - size.width / 2) / cover, PICTURE.height / 2 + (-minusY - size.height / 2) / cover],
  };
}

/** Where a picture's point lands in the frame, in pixels */
const toFrame = (view: DrawingView, size: FrameSize, [u, v]: readonly [number, number]) =>
  [size.width / 2 + (u - view.centre[0]) * view.scale, size.height / 2 + (v - view.centre[1]) * view.scale] as const;

/** `need` whole in the frame and FRAME_MARGIN clear of each edge, its top FRAME_MARGIN below `top` pixels */
function holds(view: DrawingView, size: FrameSize, need: PictureBox, top = 0) {
  const [left, high] = toFrame(view, size, [need[0], need[1]]);
  const [right, low] = toFrame(view, size, [need[2], need[3]]);
  const room = FRAME_MARGIN - 1e-6;
  return left >= room && high >= top + room && size.width - right >= room && size.height - low >= room;
}

const view = (size: FrameSize, need: DrawingNeed | null, step: number) => viewOf(cameraTransform(size, PICTURE, STEPS, step, need, BARS), size);

describe('the /pro-nas practice drawing camera', () => {
  it('reads a transform back as the view it shows (the test helper itself)', () => {
    for (const { size, need } of CASES) {
      const back = viewOf(cameraTransform(size, PICTURE, STEPS, 2, need), size);
      const ours = drawingView(size, PICTURE, STEPS[1], need.steps[1]);
      expect(back.scale).toBeCloseTo(ours.scale, 9);
      expect(back.centre[0]).toBeCloseTo(ours.centre[0], 6);
      expect(back.centre[1]).toBeCloseTo(ours.centre[1], 6);
    }
  });

  it('every view holds what it must show, in every frame — a step\'s clear of the step bars', () => {
    for (const { size, need } of CASES) {
      const frame = `${size.width}×${size.height}`;
      expect(holds(view(size, need, 0), size, need.overview), `overview ${frame}`).toBe(true);
      need.steps.forEach((box, index) => expect(holds(view(size, need, index + 1), size, box, BARS), `step ${index + 1} ${frame}`).toBe(true));
    }
  });

  it('where the tours\' own camera already shows it so, the view is that camera\'s: no view on a phone moves', () => {
    const kept: string[] = [];
    for (const { size, need } of CASES) {
      // the overview: cover itself — no transform at all — wherever cover shows everything
      if (holds(viewOf(undefined, size), size, need.overview)) {
        kept.push(`${size.width} overview`);
        expect(cameraTransform(size, PICTURE, STEPS, 0, need, BARS), `overview ${size.width}`).toBeUndefined();
      }
      STEPS.forEach((step, index) => {
        const own = stageTransform(size, PICTURE, step);
        if (!holds(viewOf(own, size), size, need.steps[index], BARS)) return;
        kept.push(`${size.width} step ${index + 1}`);
        const ours = numbers(cameraTransform(size, PICTURE, STEPS, index + 1, need, BARS));
        numbers(own).forEach((value, at) => expect(ours[at], `step ${index + 1} ${size.width}`).toBeCloseTo(value, 6));
      });
    }
    for (const size of PHONES) expect(kept.filter((name) => name.startsWith(`${size.width} `)), `${size.width}`).toHaveLength(4);
    // the rest: the tablets' steps 2 (768) and 3; beside the text every overview, step 3, step 2 from 1280 and step 1 at 1920
    expect(kept).toHaveLength(PHONES.length * 4 + 4 + 9);
  });

  it('the dimension\'s «L»: cover cut it off the top on every tablet; the overview pulls back and shows it', () => {
    for (const size of TABLETS) {
      const [, coverTop] = toFrame(viewOf(undefined, size), size, [L[0], L[1]]);
      expect(coverTop, `cover ${size.width}`).toBeLessThan(0);
      const ours = view(size, NEED, 0);
      expect(ours.scale, `${size.width}`).toBeLessThan(coverOf(size));
      expect(toFrame(ours, size, [L[0], L[1]])[1], `camera ${size.width}`).toBeGreaterThanOrEqual(FRAME_MARGIN - 1e-6);
    }
  });

  it('step 1\'s bracket, wider than the zoomed window beside the text: pulled back only as far as it must', () => {
    const [bracket] = NEED.steps;
    for (const size of LAPTOPS.slice(0, 2)) {
      expect(holds(viewOf(stageTransform(size, PICTURE, STEPS[0]), size), size, bracket), `own ${size.width}`).toBe(false);
      const ours = view(size, NEED, 1);
      expect(ours.scale / coverOf(size)).toBeLessThan(STEPS[0].zoom);
      expect((bracket[2] - bracket[0]) * ours.scale).toBeCloseTo(size.width - 2 * FRAME_MARGIN, 9);
    }
  });

  it('step 2 on a 1024 px tablet: the whole frame it lights, its columns\' heads FRAME_MARGIN below the step bars', () => {
    const tablet = TABLETS[2];
    const own = viewOf(stageTransform(tablet, PICTURE, STEPS[1]), tablet);
    expect(toFrame(own, tablet, [0, NEED.steps[1][1]])[1]).toBeLessThan(0);
    const ours = view(tablet, NEED, 2);
    expect(ours.scale / coverOf(tablet)).toBeCloseTo(STEPS[1].zoom, 9);
    expect(toFrame(ours, tablet, [0, NEED.steps[1][1]])[1]).toBeCloseTo(BARS + FRAME_MARGIN, 9);
  });

  it('is the tours\' own camera until the needs are measured, and nothing before the frame is', () => {
    const tablet = TABLETS[2];
    expect(cameraTransform(tablet, PICTURE, STEPS, 0, null, BARS)).toBeUndefined();
    STEPS.forEach((step, index) => expect(cameraTransform(tablet, PICTURE, STEPS, index + 1, null, BARS)).toBe(stageTransform(tablet, PICTURE, step)));
    expect(cameraTransform(null, PICTURE, STEPS, 0, NEED, BARS)).toBeUndefined();
    expect(cameraTransform(null, PICTURE, STEPS, 2, NEED, BARS)).toBeUndefined();
  });
});
