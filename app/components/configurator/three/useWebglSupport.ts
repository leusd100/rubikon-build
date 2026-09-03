'use client';

import { useSyncExternalStore } from 'react';

export type WebglSupport = 'probing' | 'available' | 'unavailable';

/**
 * Whether a WebGL context can actually be created — not whether the browser claims to know the
 * API. A context that fails to instantiate (blocked by policy, blacklisted driver, exhausted
 * context count) is the realistic failure mode, and it has to be known before the 3D toggle is
 * offered rather than after the renderer chunk has already been downloaded.
 *
 * Uses useSyncExternalStore for the same reason app/hooks/useViewportVariant.ts does: it renders
 * the server-safe value during SSR/hydration and synchronises to the real client value within
 * that same pass, instead of painting a wrong value and correcting it from an effect.
 *
 * Probed once and cached — GPU capability does not change during a session, so `subscribe` has
 * nothing to listen to. The probe canvas is discarded and its context explicitly released, so it
 * never holds one of the browser's limited WebGL context slots.
 */
let cachedSupport: Exclude<WebglSupport, 'probing'> | null = null;

function probe(): Exclude<WebglSupport, 'probing'> {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return 'unavailable';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return 'available';
  } catch {
    return 'unavailable';
  }
}

function subscribe() {
  return () => {};
}

function getSnapshot(): WebglSupport {
  if (cachedSupport === null) cachedSupport = probe();
  return cachedSupport;
}

function getServerSnapshot(): WebglSupport {
  return 'probing';
}

export function useWebglSupport(): WebglSupport {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
