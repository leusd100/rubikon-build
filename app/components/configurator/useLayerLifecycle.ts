'use client';

import { useEffect, useReducer, useState } from 'react';
import {
  initialLifecycleState,
  isLayerMounted,
  layerLifecycleReducer,
  type LifecyclePhase,
} from '../../lib/configurator/layerLifecycle';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export type LayerTransitionStyle = {
  /** `false` means this layer should render nothing at all right now. */
  mounted: boolean;
  phase: LifecyclePhase;
  /** Ready to hand straight to an inline `transitionDuration` — already zeroed under reduced
   * motion, so no consumer of this hook needs its own `matchMedia` check. */
  transitionDurationMs: number;
  /** Same zeroing for the caller-supplied stagger delay — see the doc comment below for why the
   * sitewide CSS reduced-motion rule alone can't be trusted to zero this. */
  transitionDelayMs: number;
  /** The same resolved `prefers-reduced-motion` flag this hook already computed — exposed so a
   * caller adding its *own* per-instance stagger on top of `transitionDelayMs` (bay-by-bay
   * reveal, say) can zero that extra delay too, without re-running its own `matchMedia` check.
   * One source of truth for the flag, however many extra numbers get derived from it. */
  reducedMotion: boolean;
};

/**
 * Drives one build-up layer's `LayerLifecycleState` with real timer-based transition timing, on
 * top of the pure, unit-tested `layerLifecycleReducer` (layerLifecycle.ts). `visible` is the
 * layer's *requested* state this render — derived upstream from DomainModel/scope — this hook
 * owns no business logic; it only turns "what's requested now" plus "how much time has passed"
 * into a phase (and ready-to-use transition numbers) the renderer can key off of.
 *
 * Interruption safety comes for free from the reducer: re-invoking this hook with a flipped
 * `visible` mid-transition dispatches straight into `layerLifecycleReducer`, which reverses
 * direction immediately rather than queuing a second animation behind the first (see
 * layerLifecycle.test.ts, scenarios 3/4). The effect below only ever holds one pending timer at a
 * time — its cleanup fires whenever `state.phase` changes again before the timer does, so a stale
 * `TRANSITION_COMPLETE` from an interrupted transition can never land after the fact.
 *
 * Reduced motion is resolved here, at the JS orchestration level, deliberately not left to CSS:
 * the sitewide `prefers-reduced-motion` rule (globals.css, see docs/ui-system-v1.md §6) only
 * zeroes CSS `transition-duration`/`animation-duration`. It cannot zero a `setTimeout` delay, and
 * it does not zero an inline `transition-delay` either — left alone, a reduced-motion user would
 * still watch every column pop in one after another, just faster, which is still a staged
 * sequence. So under reduced motion this hook dispatches `TRANSITION_COMPLETE` synchronously (no
 * timer at all) and reports both transition numbers as 0 — a layer that's just been requested
 * visible simply *is* visible on the next paint, with no fade and no stagger, regardless of how
 * many sibling instances exist.
 *
 * `delayMs` (default 0) is the caller-supplied stagger offset — see buildUpSequence.ts's
 * `staggerDelayMs` — folded into the same timer as `durationMs` so the JS phase-completion and
 * the CSS transition it visually drives can never drift out of sync: both read from this one
 * hook's return value, never computed twice.
 */
export function useLayerLifecycle(
  visible: boolean,
  durationMs: number,
  delayMs = 0,
): LayerTransitionStyle {
  const [state, dispatch] = useReducer(layerLifecycleReducer, visible, initialLifecycleState);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  // Sync to the latest requested visibility whenever it actually changes (a discrete scope
  // toggle). This only fires when the boolean this specific layer cares about flips — never on a
  // re-render triggered by an unrelated scope change elsewhere — so one layer's transition can
  // never be replayed by a sibling layer's toggle.
  useEffect(() => {
    dispatch(visible ? { type: 'REQUEST_VISIBLE' } : { type: 'REQUEST_HIDDEN' });
  }, [visible]);

  useEffect(() => {
    if (state.phase !== 'materializing' && state.phase !== 'dematerializing') return undefined;

    if (reducedMotion) {
      dispatch({ type: 'TRANSITION_COMPLETE' });
      return undefined;
    }

    const timer = window.setTimeout(() => dispatch({ type: 'TRANSITION_COMPLETE' }), delayMs + durationMs);
    return () => window.clearTimeout(timer);
  }, [state.phase, reducedMotion, delayMs, durationMs]);

  return {
    mounted: isLayerMounted(state.phase),
    phase: state.phase,
    transitionDurationMs: reducedMotion ? 0 : durationMs,
    transitionDelayMs: reducedMotion ? 0 : delayMs,
    reducedMotion,
  };
}
