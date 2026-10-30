'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { createFirstViewWalk, WALK_VIEW_RATIO, type FirstViewWalk } from '../lib/firstViewWalk';

/**
 * One auto-show on one block, by the site's rule (app/lib/firstViewWalk.ts). Off under reduced motion and when `enabled`
 * is false. A person's action on the block stops it for good: a press, a key, focus, or a mouse pointing at it. `steps`
 * must keep its identity between renders: a new array is a new walk. The callbacks may change freely.
 */
export function useFirstViewWalk<T>(
  ref: RefObject<HTMLElement | null>,
  options: Readonly<{
    steps: readonly T[];
    onStep: (step: T) => void;
    onDone?: () => void;
    startDelayMs?: number;
    stepMs?: number;
    enabled?: boolean;
  }>,
) {
  const { steps, startDelayMs, stepMs, enabled = true } = options;
  const latest = useRef(options);
  const walk = useRef<FirstViewWalk | null>(null);
  // A stop can come before the walk exists (a format the browser restored) or between two of them (new steps)
  const stopped = useRef(false);

  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled || stopped.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const current = createFirstViewWalk({
      steps,
      startDelayMs,
      stepMs,
      onStep: (step) => latest.current.onStep(step),
      onDone: () => latest.current.onDone?.(),
    });
    walk.current = current;
    const stop = () => {
      stopped.current = true;
      current.stop();
    };
    const mouse = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') stop();
    };
    const observer = new IntersectionObserver(([entry]) => {
      current.see(entry?.isIntersecting ? entry.intersectionRatio : 0);
    }, { threshold: [0, WALK_VIEW_RATIO] });
    observer.observe(root);
    root.addEventListener('pointerdown', stop);
    root.addEventListener('focusin', stop);
    root.addEventListener('keydown', stop);
    root.addEventListener('pointerenter', mouse);
    return () => {
      observer.disconnect();
      root.removeEventListener('pointerdown', stop);
      root.removeEventListener('focusin', stop);
      root.removeEventListener('keydown', stop);
      root.removeEventListener('pointerenter', mouse);
      current.dispose();
      walk.current = null;
    };
  }, [ref, steps, enabled, startDelayMs, stepMs]);

  const stop = useCallback(() => {
    stopped.current = true;
    walk.current?.stop();
  }, []);

  return { stop };
}
