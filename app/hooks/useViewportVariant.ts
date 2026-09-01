'use client';

import { useSyncExternalStore } from 'react';

export type ViewportVariant = 'desktop' | 'phone' | 'tablet';

const PHONE_QUERY = '(max-width: 600px)';
const TABLET_PORTRAIT_QUERY = '(min-width: 601px) and (max-width: 1100px) and (orientation: portrait)';

function resolveVariant(): ViewportVariant {
  if (window.matchMedia(PHONE_QUERY).matches) return 'phone';
  if (window.matchMedia(TABLET_PORTRAIT_QUERY).matches) return 'tablet';
  return 'desktop';
}

function subscribe(onStoreChange: () => void) {
  const phoneMedia = window.matchMedia(PHONE_QUERY);
  const tabletPortraitMedia = window.matchMedia(TABLET_PORTRAIT_QUERY);
  phoneMedia.addEventListener('change', onStoreChange);
  tabletPortraitMedia.addEventListener('change', onStoreChange);
  return () => {
    phoneMedia.removeEventListener('change', onStoreChange);
    tabletPortraitMedia.removeEventListener('change', onStoreChange);
  };
}

function getVariantSnapshot(): ViewportVariant {
  return resolveVariant();
}

function getVariantServerSnapshot(): ViewportVariant {
  return 'desktop';
}

// A separate primitive (not bundled into one object with variant) specifically so each
// useSyncExternalStore call can return a plain, trivially-stable string/boolean rather than
// a fresh object literal every call -- React requires getSnapshot to return a referentially
// equal result when nothing changed, and hand-rolling that stability for an object is more
// moving parts than just using two primitives.
function getResolvedSnapshot(): boolean {
  return true;
}

function getResolvedServerSnapshot(): boolean {
  return false;
}

/**
 * Resolves which of desktop/phone/tablet-portrait the viewport currently matches, without
 * the flash of the wrong (desktop) variant that a `useState('desktop')` + effect-correction
 * pattern produces: that pattern renders the SSR-safe default, commits it, paints it, and
 * only then (in a separate effect-triggered re-render) corrects to the real value -- so the
 * wrong variant is genuinely painted for one frame, however briefly.
 *
 * useSyncExternalStore is React's own recommended way to read exactly this kind of external,
 * environment-dependent state: it still renders the server-safe default during SSR/hydration
 * (no hydration mismatch -- `getServerSnapshot` matches what the server rendered), but
 * synchronizes to the real client value as part of that same hydration pass rather than a
 * subsequent effect + re-render, so the correct variant is what actually gets painted.
 *
 * `hasResolvedViewport` mirrors the same distinction the previous implementation exposed --
 * true once this has genuinely run on the client (as opposed to still reporting the SSR
 * default) -- for callers that gate something (e.g. video playback) on "we now know the
 * real viewport", not just on which variant it turned out to be.
 */
export function useViewportVariant(): { variant: ViewportVariant; hasResolvedViewport: boolean } {
  const variant = useSyncExternalStore(subscribe, getVariantSnapshot, getVariantServerSnapshot);
  const hasResolvedViewport = useSyncExternalStore(subscribe, getResolvedSnapshot, getResolvedServerSnapshot);
  return { variant, hasResolvedViewport };
}
