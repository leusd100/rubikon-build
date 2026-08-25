'use client';

import { useEffect, useRef } from 'react';
import { useDeferredMedia } from '../hooks/useDeferredMedia';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isVisible, shouldLoadMedia: shouldAttachVideo } = useDeferredMedia(videoRef);

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
