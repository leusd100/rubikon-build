'use client';

import { useEffect, useRef } from 'react';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const startPlayback = () => {
      if (document.visibilityState !== 'visible') return;
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
  }, []);

  return (
    <video
      ref={videoRef}
      src="/media/hero-steel-frame.mp4"
      poster="/media/hero-steel-frame.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
