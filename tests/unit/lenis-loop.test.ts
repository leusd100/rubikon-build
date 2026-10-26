import { describe, expect, it } from 'vitest';
import { startLenisLoop, type FrameClock, type LoopTarget } from '../../app/components/lenisLoop';

// Lenis's own frame loop (autoRaf) asks for a frame for as long as the page is open, scrolling or not: about 60 calls
// a second at rest on every desktop page. The loop under test asks only while Lenis is smoothing, and wakes on a wheel
// or a click.

/** A clock the test steps by hand: one request is pending at a time, `tick(t)` runs it as the frame at time t */
function fakeClock() {
  const pending = new Map<number, (time: number) => void>();
  let next = 1;
  let requested = 0;
  let cancelled = 0;
  const clock: FrameClock = {
    request(callback) {
      requested += 1;
      const id = next++;
      pending.set(id, callback);
      return id;
    },
    cancel(id) {
      if (pending.delete(id)) cancelled += 1;
    },
  };
  return {
    clock,
    get pending() { return pending.size; },
    get requested() { return requested; },
    get cancelled() { return cancelled; },
    tick(time: number) {
      const [id, callback] = [...pending.entries()][0] ?? [];
      if (id === undefined || !callback) throw new Error('no frame is pending');
      pending.delete(id);
      callback(time);
    },
  };
}

/** The part of Lenis the loop drives: `raf` logs the `time` it found, then lets the test decide what Lenis is doing */
function fakeLenis(after: () => LoopTarget['isScrolling'] = () => false) {
  const seen: Array<{ passed: number; timeBefore: number }> = [];
  let state: LoopTarget['isScrolling'] = false;
  const lenis: LoopTarget = {
    time: 0,
    get isScrolling() { return state; },
    raf(time) {
      seen.push({ passed: time, timeBefore: lenis.time });
      lenis.time = time;
      state = after();
    },
  };
  return { lenis, seen, set(value: LoopTarget['isScrolling']) { state = value; } };
}

describe('startLenisLoop', () => {
  it('wake schedules one frame and a second wake does not double it', () => {
    const clock = fakeClock();
    const { lenis } = fakeLenis();
    const loop = startLenisLoop(lenis, clock.clock);
    expect(clock.requested).toBe(0);

    loop.wake();
    loop.wake();
    expect(clock.requested).toBe(1);
    expect(clock.pending).toBe(1);
  });

  it('the first frame after rest sets time one frame back', () => {
    const clock = fakeClock();
    const { lenis, seen } = fakeLenis();
    lenis.time = 100; // the stale time of the last frame of an earlier scroll
    const loop = startLenisLoop(lenis, clock.clock);

    loop.wake();
    clock.tick(60_000);

    expect(seen).toEqual([{ passed: 60_000, timeBefore: 60_000 - 1000 / 60 }]);
  });

  it('keeps going while smooth and stops when not', () => {
    const clock = fakeClock();
    let frames = 0;
    // smooth for the first two frames, then the animation completes
    const { lenis, seen } = fakeLenis(() => (++frames < 3 ? 'smooth' : false));
    const loop = startLenisLoop(lenis, clock.clock);

    loop.wake();
    clock.tick(1000);
    expect(clock.pending).toBe(1);
    clock.tick(1016);
    expect(clock.pending).toBe(1);
    clock.tick(1033);
    expect(clock.pending).toBe(0);
    expect(seen.map((entry) => entry.passed)).toEqual([1000, 1016, 1033]);
    // the frames in between keep Lenis's own clock: only the first one follows a rest
    expect(seen[1].timeBefore).toBe(1000);
    expect(seen[2].timeBefore).toBe(1016);

    // and the page is at rest: nothing more is asked for
    expect(clock.requested).toBe(3);
  });

  it('a native scroll does not keep the loop alive', () => {
    const clock = fakeClock();
    const { lenis } = fakeLenis(() => 'native');
    const loop = startLenisLoop(lenis, clock.clock);

    loop.wake();
    clock.tick(500);

    expect(clock.pending).toBe(0);
  });

  it('wakes again after a rest, and again sets time one frame back', () => {
    const clock = fakeClock();
    let smooth = true;
    const { lenis, seen } = fakeLenis(() => (smooth ? 'smooth' : false));
    const loop = startLenisLoop(lenis, clock.clock);

    loop.wake();
    clock.tick(1000);
    smooth = false;
    clock.tick(1016);
    expect(clock.pending).toBe(0);

    smooth = true;
    loop.wake();
    clock.tick(9000);
    expect(clock.pending).toBe(1);
    expect(seen[2]).toEqual({ passed: 9000, timeBefore: 9000 - 1000 / 60 });
  });

  it('destroy cancels the pending frame', () => {
    const clock = fakeClock();
    const { lenis, seen } = fakeLenis();
    const loop = startLenisLoop(lenis, clock.clock);

    loop.wake();
    expect(clock.pending).toBe(1);
    loop.destroy();

    expect(clock.pending).toBe(0);
    expect(clock.cancelled).toBe(1);
    expect(seen).toEqual([]);
  });

  it('after destroy a wake asks for nothing', () => {
    const clock = fakeClock();
    const { lenis } = fakeLenis();
    const loop = startLenisLoop(lenis, clock.clock);

    loop.destroy();
    loop.wake();

    expect(clock.requested).toBe(0);
    expect(clock.cancelled).toBe(0);
  });
});
