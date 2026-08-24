'use client';

import { useEffect, useRef, useState } from 'react';

type DirectionHeroVideoProps = {
  sources: string[];
  poster: string;
  className?: string;
};

export function DirectionHeroVideo({ sources, poster, className }: DirectionHeroVideoProps) {
  const [activeSource, setActiveSource] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion) {
      video?.pause();
      return;
    }

    video.load();
    void video.play().catch(() => undefined);
  }, [activeSource, reduceMotion]);

  if (!sources.length) return null;

  return (
    <video
      ref={videoRef}
      className={className}
      src={sources[activeSource]}
      poster={poster}
      autoPlay={!reduceMotion}
      muted
      playsInline
      preload="metadata"
      loop={sources.length === 1}
      aria-hidden="true"
      onEnded={() => {
        if (sources.length > 1) setActiveSource((current) => (current + 1) % sources.length);
      }}
    />
  );
}
