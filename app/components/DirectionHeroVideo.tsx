'use client';

import { useEffect, useRef, useState } from 'react';

type DirectionHeroVideoProps = {
  sources: string[];
  poster: string;
  className?: string;
  clipDurationMs?: number;
};

const FADE_DURATION_MS = 1100;

export function DirectionHeroVideo({
  sources,
  poster,
  className,
  clipDurationMs = 6000,
}: DirectionHeroVideoProps) {
  const [activeSource, setActiveSource] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [canLoadVideo, setCanLoadVideo] = useState(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const activeSourceRef = useRef(0);
  const sourceKey = sources.join('|');

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
    if (reduceMotion || saveData || !isVisible) return;

    let timeoutId: number | undefined;
    let idleId: number | undefined;
    const enableVideo = () => setCanLoadVideo(true);
    const requestIdle = window.requestIdleCallback;

    if (requestIdle) {
      idleId = requestIdle(enableVideo, { timeout: 900 });
    } else {
      timeoutId = window.setTimeout(enableVideo, 450);
    }

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [isVisible, reduceMotion, saveData]);

  const shouldAttachVideo = canLoadVideo && !reduceMotion && !saveData && isVisible;

  useEffect(() => {
    const target = videoRefs.current[0];
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '160px 0px', threshold: 0.01 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [sourceKey]);

  useEffect(() => {
    activeSourceRef.current = 0;

    const firstVideo = videoRefs.current[0];
    const shouldPlay = shouldAttachVideo;
    if (!shouldPlay) {
      videoRefs.current.forEach((video) => video?.pause());
      return;
    }

    const playActiveVideo = () => {
      const activeVideo = videoRefs.current[activeSourceRef.current] || firstVideo;
      if (document.visibilityState !== 'visible') {
        videoRefs.current.forEach((video) => video?.pause());
        return;
      }
      void activeVideo?.play().catch(() => undefined);
    };

    playActiveVideo();

    if (sources.length < 2) {
      document.addEventListener('visibilitychange', playActiveVideo);
      return () => document.removeEventListener('visibilitychange', playActiveVideo);
    }

    let pauseTimer: ReturnType<typeof setTimeout> | undefined;
    const cycleTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const previousIndex = activeSourceRef.current;
      const nextIndex = (previousIndex + 1) % sources.length;
      const nextVideo = videoRefs.current[nextIndex];

      if (!nextVideo) return;

      nextVideo.currentTime = 0;
      void nextVideo.play().catch(() => undefined);
      activeSourceRef.current = nextIndex;
      setActiveSource(nextIndex);

      pauseTimer = setTimeout(() => {
        videoRefs.current[previousIndex]?.pause();
      }, FADE_DURATION_MS);
    }, clipDurationMs);

    document.addEventListener('visibilitychange', playActiveVideo);

    return () => {
      window.clearInterval(cycleTimer);
      if (pauseTimer) clearTimeout(pauseTimer);
      document.removeEventListener('visibilitychange', playActiveVideo);
    };
  }, [clipDurationMs, isVisible, reduceMotion, saveData, shouldAttachVideo, sourceKey, sources.length]);

  if (!sources.length) return null;

  return sources.map((source, index) => (
    <video
      key={source}
      ref={(video) => { videoRefs.current[index] = video; }}
      className={[className, 'direction-hero-video', index === activeSource ? 'is-active' : ''].filter(Boolean).join(' ')}
      src={shouldAttachVideo ? source : undefined}
      poster={poster}
      autoPlay={shouldAttachVideo && index === 0}
      muted
      playsInline
      preload={shouldAttachVideo && index === activeSource ? 'auto' : 'none'}
      loop={sources.length === 1}
      aria-hidden="true"
    />
  ));
}
