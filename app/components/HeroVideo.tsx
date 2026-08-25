'use client';

import { useEffect, useRef, useState } from 'react';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [canLoadVideo, setCanLoadVideo] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const preferenceTimer = window.setTimeout(() => {
      updateMotionPreference();
      setSaveData(Boolean(connection?.saveData));
    }, 0);

    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => {
      window.clearTimeout(preferenceTimer);
      mediaQuery.removeEventListener('change', updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '160px 0px', threshold: 0.01 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion || saveData || !isVisible) return;

    let timeoutId: number | undefined;
    let idleId: number | undefined;
    const enableVideo = () => setCanLoadVideo(true);

    if (window.requestIdleCallback) {
      idleId = window.requestIdleCallback(enableVideo, { timeout: 900 });
    } else {
      timeoutId = window.setTimeout(enableVideo, 350);
    }

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [isVisible, reduceMotion, saveData]);

  const shouldAttachVideo = canLoadVideo && !reduceMotion && !saveData;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const startPlayback = () => {
      if (!shouldAttachVideo || !isVisible || document.visibilityState !== 'visible') {
        video.pause();
        return;
      }
      void video.play().catch(() => undefined);
    };

    startPlayback();
    video.addEventListener('canplay', startPlayback);
    window.addEventListener('pageshow', startPlayback);
    document.addEventListener('visibilitychange', startPlayback);

    return () => {
      video.removeEventListener('canplay', startPlayback);
      window.removeEventListener('pageshow', startPlayback);
      document.removeEventListener('visibilitychange', startPlayback);
    };
  }, [isVisible, shouldAttachVideo]);

  return (
    <video
      ref={videoRef}
      src={shouldAttachVideo ? '/media/hero-steel-frame.mp4' : undefined}
      poster="/media/hero-steel-frame.jpg"
      autoPlay={shouldAttachVideo}
      muted
      loop
      playsInline
      preload={shouldAttachVideo ? 'metadata' : 'none'}
      aria-hidden="true"
    />
  );
}
