'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { LifecyclePhase } from '../../../lib/configurator/layerLifecycle';
import type { LayerTransitionStyle } from '../useLayerLifecycle';
import { computeProgress, initialProgressForFreshMount, isAnimating } from './buildUpAnimation';

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
 * Timing is measured against R3F's own `clock.elapsedTime`, read only inside an effect or
 * `useFrame` — never in the render body. Two things depend on that discipline, not just style:
 * `performance.now()` is an impure call the render body must not make (this codebase lints for
 * exactly that), and reading `someOtherRef.current` during render risks tearing under concurrent
 * rendering. `prevPhaseRef` starts at the sentinel `null`, which no real `LifecyclePhase` string
 * ever equals — so the effect below re-anchors on the very first mount exactly the same way it
 * re-anchors on every later phase change, including a strut that mounts *already* materializing
 * (the most common case: a layer's very first build-up, the instant its scope checkbox is
 * ticked). Anchoring only on a genuine phase transition, rather than unconditionally on every
 * mount, is what was originally missing and would otherwise have made that first transition skip
 * straight to its target with no visible growth at all.
 *
 * Owns the demand-mode invalidation contract: calls `invalidate()` once when a transition starts
 * (or reverses), and once per frame for as long as progress has not yet reached its phase's
 * target. The moment it settles, it stops — `frameloop="demand"` has nothing left asking for a
 * frame, so idle rendering returns to zero exactly as it does today when nothing is animating.
 */
export function useBuildProgress(layer: LayerTransitionStyle): React.RefObject<number> {
  const progressRef = useRef(initialProgressForFreshMount(layer.phase));
  const fromRef = useRef(initialProgressForFreshMount(layer.phase));
  const phaseStartRef = useRef<number | null>(null); // seconds on the R3F clock; null = unanchored
  const prevPhaseRef = useRef<LifecyclePhase | null>(null); // null = "never anchored yet" sentinel
  const invalidate = useThree((s) => s.invalidate);
  const clock = useThree((s) => s.clock);

  // A phase change — including an interruption that reverses direction mid-flight, AND the very
  // first mount (see the sentinel note above) — re-anchors the interpolation at wherever progress
  // visually is right now (never at a hardcoded endpoint) and restarts the clock. See
  // buildUpAnimation.ts's computeProgress doc for why "wherever it currently is" matters.
  useEffect(() => {
    if (prevPhaseRef.current === layer.phase) return;
    fromRef.current = progressRef.current;
    phaseStartRef.current = clock.elapsedTime;
    prevPhaseRef.current = layer.phase;
    invalidate();
  }, [layer.phase, invalidate, clock]);

  useFrame((state) => {
    if (phaseStartRef.current === null) return; // this tick's mount effect hasn't landed yet
    const elapsedMs = (state.clock.elapsedTime - phaseStartRef.current) * 1000;
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
