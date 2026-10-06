'use client';

import { useEffect, useRef, useState } from 'react';
import { drawingTransform, drawingView, type PictureBox } from '../lib/drawingCamera';
import { stageTransform, type StageSize, type TourFocus } from './useDrawingTour';

// The camera of a drawing tour that keeps what each view must show whole in its frame (drawingTransform,
// lib/drawingCamera.ts): the «Вузол напряму» drawings (DirectionNode) and the /pro-nas practice (PracticeSteps). Their
// frames have the drawings' own shapes only on a phone, and cover alone cut numbers, labels, marks and lit parts off
// the frames' edges on tablets and laptops (06.10). What each view must show is measured on the drawing itself, once
// its fonts are in; until then, and wherever it already fits, the view is the tours' own camera (stageTransform), and
// a picture that is not a drawing (no needs) keeps that camera. The first measured view takes its place at once, not
// in a camera move: the stage's transition waits until it is drawn (`placed`).

/** What each view must show whole: selectors inside the stage — the overview's, and a step's (from 1). Keep it a
 *  constant: a new object measures again. */
export type ViewNeeds = {
  overview: string;
  step: (index: number) => string;
  /** Pixels at the frame's top that are covered while a step shows (its progress bars): a step's view keeps what it
   *  must show clear of them, FRAME_MARGIN below */
  stepTop?: number;
};

/** What each view must show, measured, in the drawing's own units: the overview's box and each step's */
export type DrawingNeed = { overview: PictureBox; steps: readonly PictureBox[] };

/** The stage's transform for the shown step (0: the overview): the tours' own camera until the needs are measured,
 *  then drawingTransform's. A step's need reaches `stepTop` pixels further up, at the scale its view takes. */
export function cameraTransform(
  size: StageSize | null,
  picture: StageSize,
  steps: readonly TourFocus[],
  step: number,
  need: DrawingNeed | null,
  stepTop = 0,
) {
  const active = step ? steps[step - 1] : undefined;
  if (!need) return stageTransform(size, picture, active);
  if (!active) return drawingTransform(size, picture, undefined, need.overview);
  const box = need.steps[step - 1];
  const scale = size && stepTop ? drawingView(size, picture, active, box).scale : 0;
  return drawingTransform(size, picture, active, scale ? [box[0], box[1] - stepTop / scale, box[2], box[3]] : box);
}

/** An element's box in its svg's own units (the drawing's), whatever the stage's transform is */
function unitBox(element: SVGGraphicsElement): PictureBox | null {
  const toUnits = element.ownerSVGElement?.getScreenCTM()?.inverse();
  const own = element.getScreenCTM();
  if (!toUnits || !own) return null;
  const matrix = toUnits.multiply(own);
  const { x, y, width, height } = element.getBBox();
  const corners = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([px, py]) => new DOMPoint(px, py).matrixTransform(matrix));
  return [Math.min(...corners.map((p) => p.x)), Math.min(...corners.map((p) => p.y)), Math.max(...corners.map((p) => p.x)), Math.max(...corners.map((p) => p.y))];
}

function union(elements: Iterable<SVGGraphicsElement>): PictureBox | null {
  let box: PictureBox | null = null;
  for (const element of elements) {
    const next = unitBox(element);
    if (next) box = box ? [Math.min(box[0], next[0]), Math.min(box[1], next[1]), Math.max(box[2], next[2]), Math.max(box[3], next[3])] : next;
  }
  return box;
}

/** The stage's ref, its transform for the shown step (0: the overview), and whether the measured view is in place —
 *  until then the stage takes no transition */
export function useDrawingCamera(size: StageSize | null, picture: StageSize, steps: readonly TourFocus[], step: number, needs: ViewNeeds | null) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [need, setNeed] = useState<DrawingNeed | null>(null);
  const [placed, setPlaced] = useState(false);
  const count = steps.length;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !needs) return;
    let live = true;
    void document.fonts.ready.then(() => {
      const overview = union(stage.querySelectorAll<SVGGraphicsElement>(needs.overview));
      const shown = Array.from({ length: count }, (_, index) => union(stage.querySelectorAll<SVGGraphicsElement>(needs.step(index + 1))));
      if (live && overview && shown.every((box): box is PictureBox => box !== null)) setNeed({ overview, steps: shown });
    });
    return () => {
      live = false;
    };
  }, [needs, count]);

  const ready = Boolean(size && need);
  useEffect(() => {
    if (!ready || placed) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setPlaced(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, placed]);

  return { stageRef, transform: cameraTransform(size, picture, steps, step, need, needs?.stepTop), placed: placed || !needs };
}
