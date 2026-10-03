'use client';

import { useEffect, useRef, useState } from 'react';
import { useHoverStep } from './useHoverStep';

// The step tour shared by /pro-nas practice (PracticeSteps), a direction page's node (DirectionNode) and /angary's frame
// (FrameTour). It measures the picture for the camera, follows the reduced-motion preference, plays when the picture is
// at least half in view and pauses when it leaves the view entirely — not sooner: the control sits under the picture,
// so reaching for it on a phone can scroll most of the picture away, and pausing there flipped the button so the tap
// meant to pause resumed the tour. Back in view it resumes where it stopped. Each step is held for STEP_MS; the tour
// goes round `loops` times (the frame's loads, 03.10: «по колу рази 3–4»), then returns to the overview. A step the
// visitor chooses, or a pause, hands the tour over to them: it no longer resumes by itself. Reduced motion: no tour,
// and a chosen step switches at once.

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

export function useDrawingTour(stepCount: number, { loops = 1 }: { loops?: number } = {}) {
  const visualRef = useRef<HTMLDivElement>(null);
  /** The tour plays by itself until the visitor takes it over */
  const auto = useRef(true);
  const cycles = useRef(0);
  const shown = useRef(0);
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
    shown.current = step;
  }, [step]);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual || !motion) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.5 && auto.current && cycles.current < loops) {
        // from the first step, or again from the one it stopped on (its progress bar restarts with `run`)
        if (shown.current === 0) setStep(1);
        setRun((value) => value + 1);
        setTouring(true);
      } else if (!entry.isIntersecting) {
        setTouring(false);
      }
    }, { threshold: [0, 0.5] });
    observer.observe(visual);
    return () => observer.disconnect();
  }, [motion, loops]);

  useEffect(() => {
    if (!touring) return;
    const timer = window.setTimeout(() => {
      if (step < stepCount) {
        setStep(step + 1);
        setRun((value) => value + 1);
        return;
      }
      cycles.current += 1;
      if (cycles.current < loops) {
        setStep(1);
        setRun((value) => value + 1);
      } else {
        setTouring(false);
        setStep(0);
      }
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [touring, step, run, stepCount, loops]);

  /** Shows a step and stops the tour (a pressed item, or one pointed at — useHoverStep) */
  const choose = (value: number) => {
    auto.current = false;
    setTouring(false);
    setStep(value);
  };
  const hover = useHoverStep(step, choose);
  /** The round control: pauses the tour, or plays it once more from the shown step (from the first, on the overview) */
  const toggle = () => {
    if (touring) {
      auto.current = false;
      setTouring(false);
      return;
    }
    auto.current = true;
    cycles.current = loops - 1;
    setStep(step === 0 ? 1 : step);
    setRun((value) => value + 1);
    setTouring(true);
  };

  return { visualRef, step, touring, run, size, motion, choose, toggle, hover };
}
