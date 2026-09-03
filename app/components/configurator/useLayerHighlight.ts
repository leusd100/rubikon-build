'use client';

import { useEffect, useRef, useState } from 'react';

const HIGHLIGHT_DURATION_MS = 260;

/**
 * True for a short window right after `value` changes (never on first mount). Purely a class
 * toggle — the actual visual duration is a CSS transition, which the sitewide
 * `prefers-reduced-motion` rule (globals.css) already collapses to ~0ms, so this hook needs no
 * reduced-motion branching of its own.
 */
export function useLayerHighlight(value: unknown): boolean {
  const [active, setActive] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setActive(true);
    const timer = window.setTimeout(() => setActive(false), HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  return active;
}
