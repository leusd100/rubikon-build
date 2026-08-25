'use client';

import { useEffect, useState, type RefObject } from 'react';

type UseDeferredMediaOptions = {
  fallbackDelayMs?: number;
  idleTimeoutMs?: number;
  observeKey?: string;
  rootMargin?: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

export function useDeferredMedia(
  targetRef: RefObject<HTMLElement | null>,
  {
    fallbackDelayMs = 350,
    idleTimeoutMs = 900,
    observeKey = '',
    rootMargin = '160px 0px',
  }: UseDeferredMediaOptions = {},
) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [canLoadMedia, setCanLoadMedia] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreferences = () => {
      setReduceMotion(mediaQuery.matches);
      setSaveData(Boolean((navigator as NavigatorWithConnection).connection?.saveData));
    };
    const preferenceTimer = window.setTimeout(updatePreferences, 0);

    mediaQuery.addEventListener('change', updatePreferences);
    return () => {
      window.clearTimeout(preferenceTimer);
      mediaQuery.removeEventListener('change', updatePreferences);
    };
  }, []);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin, threshold: 0.01 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [observeKey, rootMargin, targetRef]);

  useEffect(() => {
    if (reduceMotion || saveData || !isVisible || canLoadMedia) return;

    let timeoutId: number | undefined;
    let idleId: number | undefined;
    const enableMedia = () => setCanLoadMedia(true);

    if (window.requestIdleCallback) {
      idleId = window.requestIdleCallback(enableMedia, { timeout: idleTimeoutMs });
    } else {
      timeoutId = window.setTimeout(enableMedia, fallbackDelayMs);
    }

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [canLoadMedia, fallbackDelayMs, idleTimeoutMs, isVisible, reduceMotion, saveData]);

  return {
    isVisible,
    shouldLoadMedia: canLoadMedia && !reduceMotion && !saveData,
  };
}
