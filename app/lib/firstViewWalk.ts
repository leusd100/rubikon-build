// Motion v1 rule 7 (docs/ui-system-v1.md §6.4, PDO-55): every auto-show of the site follows one rule. It starts when half of
// its block is in view, walks once, never faster than WALK_STEP_MS (OD-PX-34 a, owner 30.10), stops for good on a person's
// action, pauses out of view, and plays alone: a second block in view waits for the first. Pure and free of the DOM, so
// the rule is tested without a browser; app/hooks/useFirstViewWalk.ts connects it to a block.

export const WALK_STEP_MS = 2200;
export const WALK_VIEW_RATIO = 0.5;

export interface WalkTimers {
  set(callback: () => void, ms: number): number;
  clear(id: number): void;
}

export type WalkState = 'waiting' | 'queued' | 'playing' | 'paused' | 'done' | 'stopped';

export interface FirstViewWalk {
  /** How much of the block is in view, 0 to 1 */
  see(ratio: number): void;
  /** A person acted: this walk never steps again */
  stop(): void;
  /** The block is gone: as stop(), for the clean-up of an effect */
  dispose(): void;
  readonly state: WalkState;
}

interface OnStage {
  play(): void;
}

/** The one walk that plays now, and those in view waiting for it, across every block of the page */
let stage: OnStage | null = null;
let queue: OnStage[] = [];

const freeStage = (walk: OnStage) => {
  if (stage !== walk) return;
  stage = null;
  queue.shift()?.play();
};

export function createFirstViewWalk<T>({
  steps,
  onStep,
  onDone,
  startDelayMs = 0,
  stepMs,
  timers = { set: (callback, ms) => window.setTimeout(callback, ms), clear: (id) => window.clearTimeout(id) },
}: Readonly<{
  steps: readonly T[];
  onStep: (step: T) => void;
  onDone?: () => void;
  startDelayMs?: number;
  /** A longer step of the walk's own; a shorter one is raised to WALK_STEP_MS */
  stepMs?: number;
  timers?: WalkTimers;
}>): FirstViewWalk {
  const interval = Math.max(stepMs ?? WALK_STEP_MS, WALK_STEP_MS);
  let state: WalkState = 'waiting';
  let shown = -1;
  let timer: number | null = null;

  const clearTimer = () => {
    if (timer !== null) timers.clear(timer);
    timer = null;
  };

  const self: OnStage = {
    play() {
      stage = self;
      state = 'playing';
      // Back from a pause the shown step gets a full step more, and is not shown again
      timer = timers.set(advance, shown < 0 ? startDelayMs : interval);
    },
  };

  function advance() {
    timer = null;
    shown += 1;
    if (shown < steps.length) {
      onStep(steps[shown]);
      timer = timers.set(advance, interval);
      return;
    }
    state = 'done';
    onDone?.();
    freeStage(self);
  }

  const leave = () => {
    clearTimer();
    queue = queue.filter((walk) => walk !== self);
    freeStage(self);
  };

  const stop = () => {
    leave();
    state = 'stopped';
  };

  return {
    see(ratio) {
      if (ratio >= WALK_VIEW_RATIO) {
        if (state !== 'waiting' && state !== 'paused') return;
        if (stage) {
          state = 'queued';
          queue.push(self);
        } else self.play();
      } else if (state === 'playing') {
        state = 'paused';
        leave();
      } else if (state === 'queued') {
        state = 'waiting';
        leave();
      }
    },
    stop,
    dispose: stop,
    get state() {
      return state;
    },
  };
}

/** Tests only: forget the walk on stage and the queue */
export function resetWalkStage() {
  stage = null;
  queue = [];
}
