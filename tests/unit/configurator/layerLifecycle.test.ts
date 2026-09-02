import { describe, expect, it } from 'vitest';
import {
  initialLifecycleState,
  isLayerMounted,
  layerLifecycleReducer,
  requestVisibility,
  type LayerLifecycleState,
} from '../../../app/lib/configurator/layerLifecycle';

function complete(state: LayerLifecycleState): LayerLifecycleState {
  return layerLifecycleReducer(state, { type: 'TRANSITION_COMPLETE' });
}

describe('layerLifecycleReducer', () => {
  it('1. hidden → materializing → visible on a visible request, then completion', () => {
    let state = initialLifecycleState(false);
    expect(state.phase).toBe('hidden');

    state = requestVisibility(state, true);
    expect(state.phase).toBe('materializing');

    state = complete(state);
    expect(state.phase).toBe('visible');
  });

  it('2. visible → dematerializing → hidden on a hidden request, then completion', () => {
    let state = initialLifecycleState(true);
    expect(state.phase).toBe('visible');

    state = requestVisibility(state, false);
    expect(state.phase).toBe('dematerializing');

    state = complete(state);
    expect(state.phase).toBe('hidden');
  });

  it('3. interruption mid-materialization: a hidden request reverses direction immediately (no queued stale animation, no waiting for the in-flight transition to finish first)', () => {
    let state = initialLifecycleState(false);
    state = requestVisibility(state, true);
    expect(state.phase).toBe('materializing');

    state = requestVisibility(state, false); // interrupt before it ever finished
    expect(state.phase).toBe('dematerializing'); // reverses now, from wherever it visually is
    expect(state.requestedVisible).toBe(false);

    state = complete(state);
    expect(state.phase).toBe('hidden'); // converges on the latest request
  });

  it('4. interruption mid-dematerialization: a visible request reverses direction immediately', () => {
    let state = initialLifecycleState(true);
    state = requestVisibility(state, false);
    expect(state.phase).toBe('dematerializing');

    state = requestVisibility(state, true);
    expect(state.phase).toBe('materializing'); // reverses now, not queued behind the hide
    expect(state.requestedVisible).toBe(true);

    state = complete(state);
    expect(state.phase).toBe('visible');
  });

  it('5. rapid ON/OFF/ON settles on visible without ever getting stuck', () => {
    let state = initialLifecycleState(false);
    state = requestVisibility(state, true);
    state = requestVisibility(state, false);
    state = requestVisibility(state, true);
    expect(state.requestedVisible).toBe(true);

    // Drain transitions until settled — never more than 2 completions needed for a 3-flip burst.
    state = complete(state);
    if (state.phase === 'materializing' || state.phase === 'dematerializing') state = complete(state);
    expect(state.phase).toBe('visible');
  });

  it('6. the latest requested state always wins, however many times it flips before completion', () => {
    let state = initialLifecycleState(false);
    for (const visible of [true, false, true, false, true, false]) {
      state = requestVisibility(state, visible);
    }
    expect(state.requestedVisible).toBe(false);

    // Whatever phase it's mid-transition in, draining completions must land on hidden.
    let guard = 0;
    while (state.phase !== 'hidden' && guard < 5) {
      state = complete(state);
      guard += 1;
    }
    expect(state.phase).toBe('hidden');
  });

  it('a redundant request in the same direction is a no-op, not a restarted transition', () => {
    let state = initialLifecycleState(false);
    state = requestVisibility(state, true);
    const afterFirst = state;

    state = requestVisibility(state, true); // already materializing toward visible
    expect(state).toEqual(afterFirst);
  });

  it('TRANSITION_COMPLETE on an already-settled state (hidden/visible) is a no-op', () => {
    const hidden = initialLifecycleState(false);
    expect(complete(hidden)).toEqual(hidden);

    const visible = initialLifecycleState(true);
    expect(complete(visible)).toEqual(visible);
  });

  it('is deterministic: the same state+event always produces the same result', () => {
    const state = requestVisibility(initialLifecycleState(false), true);
    const a = complete(state);
    const b = complete(state);
    expect(a).toEqual(b);
  });
});

describe('isLayerMounted', () => {
  it('is false only for hidden — every other phase needs to render something', () => {
    expect(isLayerMounted('hidden')).toBe(false);
    expect(isLayerMounted('materializing')).toBe(true);
    expect(isLayerMounted('visible')).toBe(true);
    expect(isLayerMounted('dematerializing')).toBe(true);
  });
});
