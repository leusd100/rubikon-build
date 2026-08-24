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
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const activeSourceRef = useRef(0);
  const sourceKey = sources.join('|');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    activeSourceRef.current = 0;
    setActiveSource(0);

    const firstVideo = videoRefs.current[0];
    if (reduceMotion) {
      videoRefs.current.forEach((video) => video?.pause());
      return;
    }

    const playActiveVideo = () => {
      if (document.visibilityState !== 'visible') return;
      void firstVideo?.play().catch(() => undefined);
    };

    playActiveVideo();

    if (sources.length < 2) {
      document.addEventListener('visibilitychange', playActiveVideo);
      return () => document.removeEventListener('visibilitychange', playActiveVideo);
    }

    let pauseTimer: ReturnType<typeof setTimeout> | undefined;
    const cycleTimer = window.setInterval(() => {
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
  }, [clipDurationMs, reduceMotion, sourceKey, sources.length]);

  if (!sources.length) return null;

  return sources.map((source, index) => (
    <video
      key={source}
      ref={(video) => { videoRefs.current[index] = video; }}
      className={[className, 'direction-hero-video', index === activeSource ? 'is-active' : ''].filter(Boolean).join(' ')}
      src={source}
      poster={poster}
      autoPlay={index === 0 && !reduceMotion}
      muted
      playsInline
      preload={index < 2 ? 'metadata' : 'none'}
      loop={sources.length === 1}
      aria-hidden="true"
    />
  ));
}
