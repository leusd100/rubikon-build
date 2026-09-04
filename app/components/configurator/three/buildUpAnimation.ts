import type { LifecyclePhase } from '../../../lib/configurator/layerLifecycle';

// Phase 3B — the maths behind 3D build-up, deliberately pure and framework-free so it is
// unit-testable without a WebGL context, a DOM, or React. `ThreeHangarView.tsx` is the only
// consumer, and it supplies wall-clock time and drives `useFrame`/`invalidate()` around this.
//
// This file does NOT introduce a second animation state machine. `layerLifecycle.ts` (hidden →
// materializing → visible → dematerializing, with its own interruption rules) is the only
// authority on WHICH phase a layer is in and HOW LONG its transition takes
// (`useLayerLifecycle`'s `transitionDurationMs`/`transitionDelayMs`, sourced from
// `buildUpSequence.ts` — the same numbers the SVG renderer uses). What lives here is strictly
// "given that phase and those numbers, what does a continuous 0..1 progress value do on any
// given frame" — the 3D-specific question, because a WebGL mesh has no CSS `transition` property
// to hand this off to.

/** The steady-state progress a phase is currently moving toward. Mirrors the CSS build-up's own
 *  opacity rule (`.hc-phase-hidden/dematerializing` → 0, `.hc-phase-materializing/visible` → 1) —
 *  see configurator.css. */
export function targetProgressForPhase(phase: LifecyclePhase): 0 | 1 {
  return phase === 'hidden' || phase === 'dematerializing' ? 0 : 1;
}

/** The progress a layer should render at the instant its OWN React state first mounts — i.e.
 *  before any animation frame has run. A layer that starts 'visible' or 'hidden' (the page just
 *  loaded, or a later scope toggle produced a steady state with no transition in flight) needs no
 *  animation at all: render it fully settled immediately. A layer whose very first render is
 *  already 'materializing' (a scope checkbox was just ticked) has no prior on-screen state to
 *  preserve, so it starts from the empty end and animates up — never pre-drawn at full size for
 *  one frame and then "caught" by the animation. 'dematerializing' on a first mount is the
 *  mirror-image edge case (rare — would need a layer to mount already mid-hide) and assumes it
 *  was fully there a moment ago, which is the only state a hide could have started from. */
export function initialProgressForFreshMount(phase: LifecyclePhase): number {
  if (phase === 'materializing') return 0;
  if (phase === 'dematerializing') return 1;
  return targetProgressForPhase(phase);
}

/**
 * One frame of interruption-safe progress interpolation — the WebGL equivalent of a CSS
 * `transition: opacity var(--duration) var(--delay)`. Two properties a naive
 * `elapsed / duration` calculation would NOT have:
 *
 * 1. `fromProgress` is wherever the layer's progress visually WAS the instant `phase` last
 *    changed — not hardcoded to 0 or 1. A CSS transition interrupted mid-flight interpolates from
 *    its current computed value, never snaps back to the old target first; this replicates that,
 *    which is what makes rapid ON → OFF → ON safe (brief §25 — no stale snap, no queued replay).
 * 2. `durationMs <= 0` (reduced motion, or a layer with no configured animation at all) resolves
 *    straight to the target with no interpolation — the caller's job is to have already zeroed
 *    `durationMs` for reduced motion (useLayerLifecycle already does this), not this function's.
 */
export function computeProgress(
  phase: LifecyclePhase,
  elapsedSincePhaseChangeMs: number,
  delayMs: number,
  durationMs: number,
  fromProgress: number,
): number {
  const target = targetProgressForPhase(phase);
  if (durationMs <= 0) return target;
  const t = clamp01((elapsedSincePhaseChangeMs - delayMs) / durationMs);
  return fromProgress + (target - fromProgress) * t;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** True while progress has not yet settled at its phase's target — the signal a demand-mode
 *  renderer uses to decide whether to keep requesting frames (`invalidate()`) or let the canvas
 *  go idle. Exact equality is safe here: `computeProgress` clamps its own interpolation
 *  parameter to [0, 1], so it returns the literal target value once elapsed time reaches
 *  `delayMs + durationMs`, not an asymptotic approach that never quite arrives. */
export function isAnimating(progress: number, phase: LifecyclePhase): boolean {
  return progress !== targetProgressForPhase(phase);
}
