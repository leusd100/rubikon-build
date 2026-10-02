'use client';

import { useEffect, useRef, useState } from 'react';
import { useHoverStep } from './useHoverStep';

// The step tour shared by /pro-nas practice (PracticeSteps) and a direction page's node (DirectionNode). It measures
// the picture for the camera, follows the reduced-motion preference, starts once when the picture is at least half in
// view and pauses when it leaves the view entirely — not sooner: the control sits under the picture, so reaching for it
// on a phone can scroll most of the picture away, and pausing there flipped the button so the tap meant to pause
// resumed the tour. Each step is held for STEP_MS; after the last the tour returns to the overview. Reduced motion: no
// tour, and a chosen step switches at once.

const STEP_MS = 5200; // room for each step to build what it names (UX pass 2026-10)

export type StageSize = { width: number; height: number };
export type TourFocus = { focus: readonly [number, number]; zoom: number };

/** The camera: centres the step's focus (in the picture's own units; the picture is cropped by cover) at its zoom,
 *  never closer to an edge than half the zoomed window, so the pushed-in frame stays covered. */
export function stageTransform(size: StageSize | null, picture: StageSize, step: TourFocus | undefined) {
  if (!size || !step) return undefined;
  const { width, height } = size;
  const cover = Math.max(width / picture.width, height / picture.height);
  const fx = step.focus[0] * cover - (picture.width * cover - width) / 2;
  const fy = step.focus[1] * cover - (picture.height * cover - height) / 2;
  const halfW = width / (2 * step.zoom);
  const halfH = height / (2 * step.zoom);
  const cx = Math.min(Math.max(fx, halfW), width - halfW);
  const cy = Math.min(Math.max(fy, halfH), height - halfH);
  return `translate(${width / 2}px, ${height / 2}px) scale(${step.zoom}) translate(${-cx}px, ${-cy}px)`;
}

export function useDrawingTour(stepCount: number) {
  const visualRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [step, setStep] = useState(0);
  const [touring, setTouring] = useState(false);
  const [run, setRun] = useState(0);
  const [size, setSize] = useState<StageSize | null>(null);
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(visual);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotion(!query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual || !motion) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.5 && !started.current) {
        started.current = true;
        setStep(1);
        setRun((value) => value + 1);
        setTouring(true);
      } else if (!entry.isIntersecting) {
        setTouring(false);
      }
    }, { threshold: [0, 0.5] });
    observer.observe(visual);
    return () => observer.disconnect();
  }, [motion]);

  useEffect(() => {
    if (!touring) return;
    const timer = window.setTimeout(() => {
      if (step < stepCount) {
        setStep(step + 1);
        setRun((value) => value + 1);
      } else {
        setTouring(false);
        setStep(0);
      }
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [touring, step, run, stepCount]);

  /** Shows a step and stops the tour (a pressed item, or one pointed at — useHoverStep) */
  const choose = (value: number) => {
    started.current = true;
    setTouring(false);
    setStep(value);
  };
  const hover = useHoverStep(step, choose);
  /** The round control: pauses the tour, or plays it from the shown step (from the first, on the overview) */
  const toggle = () => {
    started.current = true;
    if (touring) {
      setTouring(false);
      return;
    }
    setStep(step === 0 ? 1 : step);
    setRun((value) => value + 1);
    setTouring(true);
  };

  return { visualRef, step, touring, run, size, motion, choose, toggle, hover };
}
