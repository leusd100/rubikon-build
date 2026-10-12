import { describe, expect, it } from 'vitest';
import {
  computeProgress,
  initialProgressForFreshMount,
  isAnimating,
  phaseChangeNeedsFrame,
  targetProgressForPhase,
} from '../../../app/components/configurator/three/buildUpAnimation';

describe('targetProgressForPhase', () => {
  it('hidden and dematerializing aim at 0; materializing and visible aim at 1 — mirrors configurator.css .hc-phase-* opacity rules', () => {
    expect(targetProgressForPhase('hidden')).toBe(0);
    expect(targetProgressForPhase('dematerializing')).toBe(0);
    expect(targetProgressForPhase('materializing')).toBe(1);
    expect(targetProgressForPhase('visible')).toBe(1);
  });
});

describe('initialProgressForFreshMount', () => {
  it('a layer born already visible or hidden starts fully settled — no animation on first paint', () => {
    expect(initialProgressForFreshMount('visible')).toBe(1);
    expect(initialProgressForFreshMount('hidden')).toBe(0);
  });

  it('a layer born materializing starts from empty, not pre-drawn at full size', () => {
    expect(initialProgressForFreshMount('materializing')).toBe(0);
  });

  it('a layer born dematerializing starts from full — the only state a hide could begin from', () => {
    expect(initialProgressForFreshMount('dematerializing')).toBe(1);
  });
});

describe('computeProgress', () => {
  it('1. materializing: holds at fromProgress through the delay window, then ramps to 1 over duration', () => {
    // delay 100ms, duration 300ms, starting from 0 (a fresh materialize)
    expect(computeProgress('materializing', 0, 100, 300, 0)).toBe(0);
    expect(computeProgress('materializing', 100, 100, 300, 0)).toBe(0); // delay just elapsed
    expect(computeProgress('materializing', 250, 100, 300, 0)).toBeCloseTo(0.5, 5);
    expect(computeProgress('materializing', 400, 100, 300, 0)).toBe(1); // delay + duration elapsed
    expect(computeProgress('materializing', 10_000, 100, 300, 0)).toBe(1); // long after — clamped, not overshooting
  });

  it('2. dematerializing: ramps from fromProgress down to 0 over duration, after the delay', () => {
    expect(computeProgress('dematerializing', 0, 0, 250, 1)).toBe(1);
    expect(computeProgress('dematerializing', 125, 0, 250, 1)).toBeCloseTo(0.5, 5);
    expect(computeProgress('dematerializing', 250, 0, 250, 1)).toBe(0);
  });

  it('3. interruption mid-materialize: reversing does NOT snap to 1 first — it continues from wherever progress currently is', () => {
    // Materializing was 40% of the way there when the user un-toggled the layer.
    const midFlightProgress = 0.4;
    // The instant the phase flips to dematerializing, elapsed-since-phase-change resets to 0 —
    // computeProgress must return exactly the interruption point, not the old phase's target (1)
    // and not the new phase's target (0).
    expect(computeProgress('dematerializing', 0, 0, 250, midFlightProgress)).toBeCloseTo(0.4, 5);
    // Then it continues smoothly down to 0 over the SAME configured duration — same shape as any
    // other dematerialize, just starting from a different point.
    expect(computeProgress('dematerializing', 250, 0, 250, midFlightProgress)).toBe(0);
  });

  it('4. interruption mid-dematerialize: reversing does not snap to 0 first', () => {
    const midFlightProgress = 0.7;
    expect(computeProgress('materializing', 0, 0, 250, midFlightProgress)).toBeCloseTo(0.7, 5);
    expect(computeProgress('materializing', 250, 0, 250, midFlightProgress)).toBe(1);
  });

  it('5. reduced motion (durationMs = 0) resolves straight to the target, regardless of elapsed time or starting point', () => {
    expect(computeProgress('materializing', 0, 0, 0, 0)).toBe(1);
    expect(computeProgress('dematerializing', 0, 0, 0, 1)).toBe(0);
    expect(computeProgress('materializing', 0, 0, 0, 0.5)).toBe(1);
  });

  it('6. never overshoots past [0, 1] even with a negative elapsed (a frame that lands before the recorded phase-change timestamp)', () => {
    expect(computeProgress('materializing', -50, 0, 300, 0)).toBe(0);
    expect(computeProgress('dematerializing', -50, 0, 300, 1)).toBe(1);
  });

  it('7. at rest (visible / hidden) it is the target at once: what the last drawn frame was short of is dropped, not replayed', () => {
    // The lifecycle timer ends a transition a moment after the last frame drew it, so the resting phase starts a hair
    // short of its target (≤ 0.9 % on a GPU, 12.10). Replaying that remainder took the layer's whole delay + duration
    // again: rafters 700 + 300 ms, girts 1150 + 150 ms.
    expect(computeProgress('visible', 0, 0, 250, 0.997)).toBe(1);
    expect(computeProgress('hidden', 0, 0, 250, 0.003)).toBe(0);
    expect(computeProgress('visible', 16, 700, 300, 0.991)).toBe(1); // inside the rafters' delay window
    expect(computeProgress('hidden', 16, 1150, 150, 0.009)).toBe(0); // inside the girts' delay window
  });
});

describe('isAnimating', () => {
  it('is false once progress has reached the phase\'s own target — the signal to stop invalidating frames', () => {
    expect(isAnimating(1, 'visible')).toBe(false);
    expect(isAnimating(0, 'hidden')).toBe(false);
    expect(isAnimating(0.6, 'materializing')).toBe(true);
    expect(isAnimating(1, 'materializing')).toBe(false); // just settled
  });

  it('is false from the first frame at rest, whatever the transition left over — the demand loop stops there', () => {
    expect(isAnimating(computeProgress('visible', 0, 700, 300, 0.991), 'visible')).toBe(false);
    expect(isAnimating(computeProgress('hidden', 0, 1150, 150, 0.009), 'hidden')).toBe(false);
  });
});

describe('phaseChangeNeedsFrame', () => {
  it('a transition starting or reversing always asks for a frame', () => {
    expect(phaseChangeNeedsFrame(1, 'dematerializing')).toBe(true);
    expect(phaseChangeNeedsFrame(0, 'materializing')).toBe(true);
    expect(phaseChangeNeedsFrame(0.4, 'materializing')).toBe(true);
  });

  it('coming to rest on the target asks for none — that picture is already drawn', () => {
    expect(phaseChangeNeedsFrame(1, 'visible')).toBe(false);
    expect(phaseChangeNeedsFrame(0, 'hidden')).toBe(false);
  });

  it('coming to rest short of the target still asks, so the frame that lands it on the target is drawn', () => {
    expect(phaseChangeNeedsFrame(0.991, 'visible')).toBe(true);
    expect(phaseChangeNeedsFrame(0.009, 'hidden')).toBe(true);
  });
});
