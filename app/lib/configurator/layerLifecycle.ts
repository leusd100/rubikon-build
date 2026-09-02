// A tiny, pure, fully-tested state machine for "is this layer on screen right now, and what
// phase of getting there is it in" — deliberately separate from timing/DOM concerns (see
// useLayerLifecycle.ts, the React hook that drives real transitions with this reducer). Kept
// pure specifically so the interruption/convergence rules can be unit-tested deterministically
// without fake timers or a DOM, per the brief's own instruction not to couple state-machine
// tests too tightly to implementation internals.
//
// The rule this exists to implement: if the user toggles a layer's scope quickly, never queue a
// stale animation and never snap back to front — the next transition starts from wherever the
// layer visually is right now and converges to whatever was most recently requested.

export type LifecyclePhase = 'hidden' | 'materializing' | 'visible' | 'dematerializing';

export type LayerLifecycleState = {
  phase: LifecyclePhase;
  /** The most recently requested target — read when a transition finishes to decide whether to
   * settle or immediately reverse into the opposite transition (the "converge to latest
   * requested state" rule). */
  requestedVisible: boolean;
};

export type LifecycleEvent =
  | { type: 'REQUEST_VISIBLE' }
  | { type: 'REQUEST_HIDDEN' }
  | { type: 'TRANSITION_COMPLETE' };

export function initialLifecycleState(visible: boolean): LayerLifecycleState {
  return { phase: visible ? 'visible' : 'hidden', requestedVisible: visible };
}

/**
 * Deterministic: the same (state, event) pair always produces the same result — no randomness,
 * no wall-clock reads, no DOM. `TRANSITION_COMPLETE` is dispatched by the timing layer (the React
 * hook) once its own animation/timeout finishes; this function only knows "a transition just
 * finished," never how long it took.
 */
export function layerLifecycleReducer(state: LayerLifecycleState, event: LifecycleEvent): LayerLifecycleState {
  switch (event.type) {
    case 'REQUEST_VISIBLE': {
      if (state.phase === 'visible' || state.phase === 'materializing') {
        return state.requestedVisible ? state : { ...state, requestedVisible: true };
      }
      // From hidden or mid-dematerialize: start (or reverse into) materializing.
      return { phase: 'materializing', requestedVisible: true };
    }
    case 'REQUEST_HIDDEN': {
      if (state.phase === 'hidden' || state.phase === 'dematerializing') {
        return state.requestedVisible ? { ...state, requestedVisible: false } : state;
      }
      return { phase: 'dematerializing', requestedVisible: false };
    }
    case 'TRANSITION_COMPLETE': {
      if (state.phase === 'materializing') {
        // Did a hide request arrive while materializing? Converge to the latest one instead of
        // settling on a state nobody wants anymore.
        return state.requestedVisible
          ? { phase: 'visible', requestedVisible: true }
          : { phase: 'dematerializing', requestedVisible: false };
      }
      if (state.phase === 'dematerializing') {
        return state.requestedVisible
          ? { phase: 'materializing', requestedVisible: true }
          : { phase: 'hidden', requestedVisible: false };
      }
      // hidden/visible are terminal with respect to this event — nothing is in flight.
      return state;
    }
    default:
      return state;
  }
}

/** Convenience for callers that just want "should this request visible or hidden right now,"
 * without hand-rolling the two-event dispatch. */
export function requestVisibility(
  state: LayerLifecycleState,
  visible: boolean,
): LayerLifecycleState {
  return layerLifecycleReducer(state, visible ? { type: 'REQUEST_VISIBLE' } : { type: 'REQUEST_HIDDEN' });
}

/** True while a layer needs to be present in the DOM at all — hidden layers render nothing. */
export function isLayerMounted(phase: LifecyclePhase): boolean {
  return phase !== 'hidden';
}
