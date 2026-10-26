/** The part of Lenis the loop drives (`isScrolling` is typed as Lenis types it, `boolean` included; the loop reads only 'smooth') */
export interface LoopTarget {
  raf(time: number): void;
  time: number;
  readonly isScrolling: 'smooth' | 'native' | boolean;
}

/** Where frames come from: the browser's, unless a test steps them by hand */
export interface FrameClock {
  request(callback: (time: number) => void): number;
  cancel(id: number): void;
}

/** One display refresh at 60 Hz, in ms: the step Lenis takes on the first frame after a rest */
const FRAME_MS = 1000 / 60;

// The globals are looked up when a frame is asked for, not when this module loads
const browserClock: FrameClock = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

/**
 * Lenis's frame loop that rests with the page. Lenis's own (`autoRaf`) asks for a frame on every display refresh for as
 * long as the page is open, about 60 calls a second at rest on every desktop page, for an animation that runs only
 * while a wheel or an anchor scroll is being smoothed. This loop asks for frames only then: `wake()` (a wheel or a
 * click) starts it, and it ends with the frame after which Lenis is no longer smoothing.
 *
 * Lenis measures a frame as the time since its last `raf`; after a rest that gap is the whole rest, and the smoothing
 * would jump to its end in one step. So the first frame after a rest is measured as one frame long.
 */
export function startLenisLoop(lenis: LoopTarget, clock: FrameClock = browserClock): { wake(): void; destroy(): void } {
  let frame: number | null = null;
  let resting = true;
  let destroyed = false;

  const tick = (time: number) => {
    frame = null;
    if (resting) {
      lenis.time = time - FRAME_MS;
      resting = false;
    }
    lenis.raf(time);
    if (lenis.isScrolling === 'smooth') frame = clock.request(tick);
    else resting = true;
  };

  return {
    wake() {
      if (destroyed || frame !== null) return;
      frame = clock.request(tick);
    },
    destroy() {
      destroyed = true;
      if (frame !== null) clock.cancel(frame);
      frame = null;
    },
  };
}
