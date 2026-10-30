import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFirstViewWalk, resetWalkStage, WALK_STEP_MS } from '../../app/lib/firstViewWalk';

// Motion v1 rule 7 (OD-PX-34 a, owner 30.10): an auto-show starts when half of its block is in view, walks once at no less
// than 2.2 s a step, stops for good on a person's action, pauses out of view, and plays alone.

const timers = {
  set: (callback: () => void, ms: number) => setTimeout(callback, ms) as unknown as number,
  clear: (id: number) => clearTimeout(id),
};

const walkOf = (steps: readonly string[], options: { startDelayMs?: number; stepMs?: number } = {}) => {
  const seen: string[] = [];
  const onDone = vi.fn();
  const walk = createFirstViewWalk({ steps, onStep: (step) => seen.push(step), onDone, timers, ...options });
  return { walk, seen, onDone };
};

beforeEach(() => {
  vi.useFakeTimers();
  resetWalkStage();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createFirstViewWalk', () => {
  it('uses 2.2 s as its step (OD-PX-34 a)', () => {
    expect(WALK_STEP_MS).toBe(2200);
  });

  it('starts only when half of the block is in view', () => {
    const { walk, seen } = walkOf(['a', 'b'], { startDelayMs: 400 });
    walk.see(0.3);
    vi.advanceTimersByTime(10_000);
    expect(seen).toEqual([]);
    walk.see(0.6);
    vi.advanceTimersByTime(399);
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual(['a']);
  });

  it('steps every WALK_STEP_MS and never faster', () => {
    const { walk, seen } = walkOf(['a', 'b', 'c'], { stepMs: 1300 });
    walk.see(1);
    vi.advanceTimersByTime(0);
    expect(seen).toEqual(['a']);
    vi.advanceTimersByTime(2199);
    expect(seen).toEqual(['a']);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual(['a', 'b']);
  });

  it('keeps a longer step of its own', () => {
    const { walk, seen } = walkOf(['a', 'b'], { stepMs: 3600 });
    walk.see(1);
    vi.advanceTimersByTime(3599);
    expect(seen).toEqual(['a']);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual(['a', 'b']);
  });

  it('walks once and calls onDone once', () => {
    const { walk, seen, onDone } = walkOf(['a', 'b', 'c']);
    walk.see(1);
    vi.advanceTimersByTime(3 * WALK_STEP_MS);
    expect(seen).toEqual(['a', 'b', 'c']);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(walk.state).toBe('done');
    walk.see(0);
    walk.see(1);
    vi.advanceTimersByTime(60_000);
    expect(seen).toEqual(['a', 'b', 'c']);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('stop() before the start keeps it from ever stepping', () => {
    const { walk, seen } = walkOf(['a', 'b']);
    walk.stop();
    walk.see(1);
    vi.advanceTimersByTime(10_000);
    expect(seen).toEqual([]);
    expect(walk.state).toBe('stopped');
  });

  it('stop() during the start delay keeps the first step from showing', () => {
    const { walk, seen } = walkOf(['a', 'b'], { startDelayMs: 1000 });
    walk.see(1);
    vi.advanceTimersByTime(500);
    walk.stop();
    vi.advanceTimersByTime(10_000);
    expect(seen).toEqual([]);
  });

  it('stop() mid-walk ends it for good', () => {
    const { walk, seen, onDone } = walkOf(['a', 'b', 'c']);
    walk.see(1);
    vi.advanceTimersByTime(WALK_STEP_MS);
    expect(seen).toEqual(['a', 'b']);
    walk.stop();
    walk.see(1);
    vi.advanceTimersByTime(60_000);
    expect(seen).toEqual(['a', 'b']);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('pauses out of view and resumes with a full step', () => {
    const { walk, seen } = walkOf(['a', 'b', 'c']);
    walk.see(1);
    vi.advanceTimersByTime(WALK_STEP_MS);
    walk.see(0);
    expect(walk.state).toBe('paused');
    vi.advanceTimersByTime(10_000);
    expect(seen).toEqual(['a', 'b']);
    walk.see(1);
    vi.advanceTimersByTime(WALK_STEP_MS - 1);
    expect(seen).toEqual(['a', 'b']);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual(['a', 'b', 'c']);
  });

  it('runs its start delay again when it left the view before the first step', () => {
    const { walk, seen } = walkOf(['a'], { startDelayMs: 1000 });
    walk.see(1);
    vi.advanceTimersByTime(900);
    walk.see(0);
    walk.see(1);
    vi.advanceTimersByTime(999);
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual(['a']);
  });

  it('does not restart when a second ratio over the line arrives', () => {
    const { walk, seen } = walkOf(['a', 'b']);
    walk.see(0.6);
    vi.advanceTimersByTime(1000);
    walk.see(0.9);
    vi.advanceTimersByTime(WALK_STEP_MS - 1000);
    expect(seen).toEqual(['a', 'b']);
  });
});

describe('one walk at a time', () => {
  it('holds a second walk until the first is done', () => {
    const a = walkOf(['a1', 'a2']);
    const b = walkOf(['b1']);
    a.walk.see(1);
    b.walk.see(1);
    expect(b.walk.state).toBe('queued');
    vi.advanceTimersByTime(WALK_STEP_MS);
    expect(a.seen).toEqual(['a1', 'a2']);
    expect(b.seen).toEqual([]);
    vi.advanceTimersByTime(WALK_STEP_MS + 1); // +1: fake timers run a 0 ms timer set during a tick one ms later
    expect(a.walk.state).toBe('done');
    expect(b.seen).toEqual(['b1']);
  });

  it('frees the stage when the walk on it stops', () => {
    const a = walkOf(['a1', 'a2']);
    const b = walkOf(['b1']);
    a.walk.see(1);
    b.walk.see(1);
    a.walk.stop();
    vi.advanceTimersByTime(0);
    expect(b.seen).toEqual(['b1']);
  });

  it('frees the stage when the walk on it leaves the view, and queues it to come back', () => {
    const a = walkOf(['a1', 'a2']);
    const b = walkOf(['b1', 'b2']);
    a.walk.see(1);
    b.walk.see(1);
    a.walk.see(0);
    vi.advanceTimersByTime(0);
    expect(b.seen).toEqual(['b1']);
    a.walk.see(1);
    expect(a.walk.state).toBe('queued');
    vi.advanceTimersByTime(2 * WALK_STEP_MS);
    expect(b.walk.state).toBe('done');
    expect(a.walk.state).toBe('playing');
    vi.advanceTimersByTime(WALK_STEP_MS + 1); // it left before its first step, so it starts from the first (+1 as above)
    expect(a.seen).toEqual(['a1', 'a2']);
  });

  it('drops a queued walk that left the view', () => {
    const a = walkOf(['a1']);
    const b = walkOf(['b1']);
    a.walk.see(1);
    b.walk.see(1);
    b.walk.see(0);
    expect(b.walk.state).toBe('waiting');
    vi.advanceTimersByTime(60_000);
    expect(b.seen).toEqual([]);
  });

  it('frees the stage on dispose without calling onDone', () => {
    const a = walkOf(['a1', 'a2']);
    const b = walkOf(['b1']);
    a.walk.see(1);
    b.walk.see(1);
    a.walk.dispose();
    vi.advanceTimersByTime(0);
    expect(a.onDone).not.toHaveBeenCalled();
    expect(b.seen).toEqual(['b1']);
  });
});
