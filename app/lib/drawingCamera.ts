// The camera for a «Вузол напряму» drawing (DirectionNode) and the /pro-nas practice drawing (PracticeSteps), through
// useDrawingCamera. The tours' own camera (stageTransform, useDrawingTour.ts) works inside what cover shows of the
// picture, so a frame narrower than the drawing loses its sides: the frame beside the text is 0.5–1.4 times as wide as
// it is tall from a 768 px tablet up to a wide screen, the drawings are 3:2, and the third number of the concrete
// overview, the end view's labels and whole steps' marks lay outside it (06.10); the practice's tablet frame, wider than
// its 4:5 drawing, lost its top and bottom the same way. A drawing's boxes hold the whole drawing past the frame's edges
// (direction-node.css, about.css), so this camera can go further: what each view must show stays whole in view,
// FRAME_MARGIN clear of the edges. Where it already is, the view is stageTransform's own (none in the overview);
// otherwise the camera moves over to it, and pulls back from the step's zoom (in the overview, below cover) only as far
// as it must. Past the picture's own edges it never needs to look.

/** The frame's (or the picture's) size: pixels, or the picture's own units */
export type FrameSize = { width: number; height: number };
/** Where a step points the camera: a point in the picture's units, and its push-in over cover */
export type CameraFocus = { focus: readonly [number, number]; zoom: number };
/** A box in the picture's own units: left, top, right, bottom */
export type PictureBox = readonly [number, number, number, number];
/** What the camera shows: pixels per unit, and the picture's point at the frame's centre */
export type DrawingView = { scale: number; centre: readonly [number, number] };

/** Room between what must be seen and the frame's edge, in pixels */
export const FRAME_MARGIN = 8;

/** The largest scale at which [low, high] and its margins fit in `frame` pixels — no margin is asked for past the
 *  picture's own edge (0 … extent): the span is min(high + m, extent) − max(low − m, 0), m = margin / scale */
function fitScale(frame: number, extent: number, low: number, high: number) {
  return Math.max(
    (frame - 2 * FRAME_MARGIN) / (high - low),
    (frame - FRAME_MARGIN) / high,
    (frame - FRAME_MARGIN) / (extent - low),
    frame / extent,
  );
}

export function drawingView(size: FrameSize, picture: FrameSize, step: CameraFocus | undefined, need: PictureBox): DrawingView {
  const { width, height } = size;
  const cover = Math.max(width / picture.width, height / picture.height);
  const fit = Math.min(fitScale(width, picture.width, need[0], need[2]), fitScale(height, picture.height, need[1], need[3]));
  const scale = Math.min(cover * (step?.zoom ?? 1), fit);
  const margin = FRAME_MARGIN / scale;
  const centre = (frame: number, extent: number, focus: number, low: number, high: number) => {
    const half = frame / (2 * scale);
    const shown = frame / (2 * cover); // half of what cover shows
    // stageTransform's centre: the focus, with the window inside what cover shows
    const at = half >= shown ? extent / 2 : Math.min(Math.max(focus, extent / 2 - shown + half), extent / 2 + shown - half);
    return Math.min(Math.max(at, Math.min(high + margin, extent) - half), Math.max(low - margin, 0) + half);
  };
  return {
    scale,
    centre: [
      centre(width, picture.width, step ? step.focus[0] : picture.width / 2, need[0], need[2]),
      centre(height, picture.height, step ? step.focus[1] : picture.height / 2, need[1], need[3]),
    ],
  };
}

/** drawingView as the stage's transform, in stageTransform's form (the stage is the frame, the picture laid in it by
 *  cover); undefined before the frame is measured, and for an overview that is cover itself */
export function drawingTransform(size: FrameSize | null, picture: FrameSize, step: CameraFocus | undefined, need: PictureBox) {
  if (!size) return undefined;
  const { width, height } = size;
  const cover = Math.max(width / picture.width, height / picture.height);
  const { scale, centre } = drawingView(size, picture, step, need);
  const zoom = scale / cover;
  // the centre in the stage's pixels
  const x = (centre[0] - picture.width / 2) * cover + width / 2;
  const y = (centre[1] - picture.height / 2) * cover + height / 2;
  if (!step && Math.abs(zoom - 1) < 1e-6 && Math.abs(x - width / 2) < 0.01 && Math.abs(y - height / 2) < 0.01) return undefined;
  return `translate(${width / 2}px, ${height / 2}px) scale(${zoom}) translate(${-x}px, ${-y}px)`;
}
