'use client';

import { useEffect, useRef, type PointerEvent } from 'react';

// Pointing at a step of a drawing tour shows it, as pressing it does (UX pass 2026-10, owner: «перемикання не на
// натискання, а при наведенні»). Only a mouse that really moves onto the item counts, and only once it has been there
// for a moment: a cursor the page scrolls under, or one crossing the list on its way elsewhere, changes nothing — each
// switch moves the camera, so a sweep across the list must not set it swinging. Touch and keyboard keep the press.
const DWELL_MS = 180;

export function useHoverStep(current: number, choose: (value: number) => void) {
  const timer = useRef(0);
  const pending = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cancel = () => {
    window.clearTimeout(timer.current);
    pending.current = 0;
  };

  return (value: number) => ({
    onPointerMove: (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || (event.movementX === 0 && event.movementY === 0)) return;
      if (value === current || value === pending.current) return;
      cancel();
      pending.current = value;
      timer.current = window.setTimeout(() => {
        pending.current = 0;
        choose(value);
      }, DWELL_MS);
    },
    onPointerLeave: cancel,
  });
}
