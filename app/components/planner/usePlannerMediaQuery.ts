'use client';

import { useSyncExternalStore } from 'react';

/**
 * A media query as React state. Used where the DOM order itself must change with the breakpoint
 * (result block order), so keyboard and screen-reader order match what is on screen — CSS `order`
 * would reorder only the pixels.
 */
export function usePlannerMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
