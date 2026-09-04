import { describe, expect, it } from 'vitest';
import {
  computeProgress,
  initialProgressForFreshMount,
  isAnimating,
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
});

describe('isAnimating', () => {
  it('is false once progress has reached the phase\'s own target — the signal to stop invalidating frames', () => {
    expect(isAnimating(1, 'visible')).toBe(false);
    expect(isAnimating(0, 'hidden')).toBe(false);
    expect(isAnimating(0.6, 'materializing')).toBe(true);
    expect(isAnimating(1, 'materializing')).toBe(false); // just settled
  });
});
