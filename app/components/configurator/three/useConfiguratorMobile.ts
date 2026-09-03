'use client';

import { useSyncExternalStore } from 'react';

/** Matches the configurator's own mobile breakpoint in configurator.css, so "mobile" means the
 *  same thing to the layout and to the renderer policy. */
const MOBILE_QUERY = '(max-width: 759px)';

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener('change', onStoreChange);
  return () => media.removeEventListener('change', onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Drives two mobile policies, and nothing about geometry: Technical is the initial mode, and the
 * 3D renderer lowers presentation density (no dynamic shadows, DPR capped lower). The building
 * model itself is identical on every device — there is deliberately no separate mobile geometry.
 *
 * Same useSyncExternalStore rationale as app/hooks/useViewportVariant.ts.
 */
export function useConfiguratorMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
