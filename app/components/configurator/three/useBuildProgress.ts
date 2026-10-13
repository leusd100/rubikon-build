'use client';

import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { LifecyclePhase } from '../../../lib/configurator/layerLifecycle';
import type { LayerTransitionStyle } from '../useLayerLifecycle';
import { computeProgress, initialProgressForFreshMount, isAnimating, phaseChangeNeedsFrame } from './buildUpAnimation';

/**
 * The R3F half of 3D build-up: turns one layer's `LayerTransitionStyle` (phase + timing, from the
 * SAME `useLayerLifecycle` hook the SVG renderer uses — no parallel state machine here) into a
 * continuous 0..1 progress value a mesh or material can read every frame.
 *
 * Returned as a ref, not React state — this value changes up to 60×/second while animating, and
 * routing that through `useState` would re-render the whole component tree every frame for
 * something only a handful of `useFrame` callbacks actually need to read. Callers mutate meshes
 * imperatively from this ref inside their own `useFrame`, matching how `FitOrthographicCamera` and
 * `InvalidateOnChange` already treat the R3F scene as imperative, not reactive.
 *
 * Timing is measured with `performance.now()`, the clock `useLayerLifecycle`'s timer runs on, read
 * only inside the anchoring effect or `useFrame` — never in the render body. Two things depend on
 * that discipline, not just style: `performance.now()` is an impure call the render body must not
 * make (this codebase lints for exactly that), and reading `someOtherRef.current` during render
 * risks tearing under concurrent rendering. Not R3F's `clock.elapsedTime`: under
 * `frameloop="demand"` that clock moves only when a frame is drawn, so between frames it holds the
 * time of the last one. A transition anchored there before the first frame after an idle spell
 * started back then, and that first frame counted the whole idle spell as time gone by: the layer
 * was at its target in one frame (12.10). `prevPhaseRef` starts at the sentinel `null`, which no
 * real `LifecyclePhase` string ever equals — so the effect below re-anchors on the very first mount
 * exactly the same way it re-anchors on every later phase change, including a strut that mounts
 * *already* materializing (the most common case: a layer's very first build-up, the instant its
 * scope checkbox is ticked). Anchoring only on a genuine phase transition, rather than
 * unconditionally on every mount, is what was originally missing and would otherwise have made
 * that first transition skip straight to its target with no visible growth at all.
 *
 * Owns the demand-mode invalidation contract: calls `invalidate()` once when a transition starts
 * (or reverses), and once per frame for as long as progress has not yet reached its phase's
 * target. The moment it settles, it stops — `frameloop="demand"` has nothing left asking for a
 * frame, so idle rendering returns to zero exactly as it does today when nothing is animating.
 * A resting phase settles on its first frame (computeProgress puts it straight at its target), and
 * coming to rest asks for no frame of its own once progress is already there
 * (phaseChangeNeedsFrame).
 */
export function useBuildProgress(layer: LayerTransitionStyle): React.RefObject<number> {
  const progressRef = useRef(initialProgressForFreshMount(layer.phase));
  const fromRef = useRef(initialProgressForFreshMount(layer.phase));
  const phaseStartRef = useRef<number | null>(null); // performance.now() ms; null = unanchored
  const prevPhaseRef = useRef<LifecyclePhase | null>(null); // null = "never anchored yet" sentinel
  const invalidate = useThree((s) => s.invalidate);

  // A phase change — including an interruption that reverses direction mid-flight, AND the very
  // first mount (see the sentinel note above) — re-anchors the interpolation at wherever progress
  // visually is right now (never at a hardcoded endpoint) and restarts the clock. See
  // buildUpAnimation.ts's computeProgress doc for why "wherever it currently is" matters.
  //
  // A layout effect, so the anchor moves in the same commit as the phase `useFrame` reads: R3F
  // swaps in a component's new frame callback in a layout effect. A passive effect runs later, and
  // a frame could come in between. That frame read the new phase against the previous phase's
  // anchor, a second or more back on a canvas that had idled, and drew the layer at its target
  // at once; the effect then anchored there. The fade was over in one frame and the canvas stood
  // still until the lifecycle's timer ended the transition: 1 roof toggle in 160 on a GPU (12.10).
  useLayoutEffect(() => {
    if (prevPhaseRef.current === layer.phase) return;
    fromRef.current = progressRef.current;
    phaseStartRef.current = performance.now();
    prevPhaseRef.current = layer.phase;
    if (phaseChangeNeedsFrame(progressRef.current, layer.phase)) invalidate();
  }, [layer.phase, invalidate]);

  useFrame(() => {
    if (phaseStartRef.current === null) return; // unanchored: the layout effect above lands before any frame
    const elapsedMs = performance.now() - phaseStartRef.current;
    progressRef.current = computeProgress(
      layer.phase,
      elapsedMs,
      layer.transitionDelayMs,
      layer.transitionDurationMs,
      fromRef.current,
    );
    if (isAnimating(progressRef.current, layer.phase)) invalidate();
  });

  return progressRef;
}
