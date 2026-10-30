'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { createFirstViewWalk, WALK_VIEW_RATIO, type FirstViewWalk } from '../lib/firstViewWalk';

/**
 * One auto-show on one block, by the site's rule (app/lib/firstViewWalk.ts). Off under reduced motion and when `enabled`
 * is false. A person's action on the block stops it for good: a press, a tap, a key, focus, or a mouse that really moves
 * over it. Passing by is not an action: a cursor the page scrolls under (as in useHoverStep) and a finger that lands on the
 * block to swipe past it both leave the walk alone, or most visitors would never see it (30.10, first-view-walks.spec.ts).
 * Actions count on `actionsRef` when the block that reacts is wider than the one that is watched. `onStop` runs once, when
 * a person stops the walk: what the walk left on show is the component's to clear. `steps` must keep its identity between
 * renders: a new array is a new walk. The callbacks may change freely.
 */
export function useFirstViewWalk<T>(
  ref: RefObject<HTMLElement | null>,
  options: Readonly<{
    steps: readonly T[];
    onStep: (step: T) => void;
    onDone?: () => void;
    onStop?: () => void;
    startDelayMs?: number;
    stepMs?: number;
    enabled?: boolean;
    actionsRef?: RefObject<HTMLElement | null>;
  }>,
) {
  const { steps, startDelayMs, stepMs, enabled = true, actionsRef } = options;
  const latest = useRef(options);
  const walk = useRef<FirstViewWalk | null>(null);
  // A stop can come before the walk exists (a format the browser restored) or between two of them (new steps)
  const stopped = useRef(false);

  useEffect(() => {
    latest.current = options;
  });

  const stop = useCallback(() => {
    if (stopped.current) return;
    stopped.current = true;
    walk.current?.stop();
    latest.current.onStop?.();
  }, []);

  useEffect(() => {
    const watched = ref.current;
    const root = actionsRef?.current ?? watched;
    if (!watched || !root || !enabled || stopped.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const current = createFirstViewWalk({
      steps,
      startDelayMs,
      stepMs,
      onStep: (step) => latest.current.onStep(step),
      onDone: () => latest.current.onDone?.(),
    });
    walk.current = current;
    const press = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') stop();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && (event.movementX !== 0 || event.movementY !== 0)) stop();
    };
    const observer = new IntersectionObserver(([entry]) => {
      current.see(entry?.isIntersecting ? entry.intersectionRatio : 0);
    }, { threshold: [0, WALK_VIEW_RATIO] });
    observer.observe(watched);
    root.addEventListener('pointerdown', press);
    root.addEventListener('click', stop);
    root.addEventListener('focusin', stop);
    root.addEventListener('keydown', stop);
    root.addEventListener('pointermove', move);
    return () => {
      observer.disconnect();
      root.removeEventListener('pointerdown', press);
      root.removeEventListener('click', stop);
      root.removeEventListener('focusin', stop);
      root.removeEventListener('keydown', stop);
      root.removeEventListener('pointermove', move);
      current.dispose();
      walk.current = null;
    };
  }, [ref, actionsRef, steps, enabled, startDelayMs, stepMs, stop]);

  return { stop };
}
