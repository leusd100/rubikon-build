'use client';

import { useEffect, useRef, useState } from 'react';
import { useDeferredMedia } from '../hooks/useDeferredMedia';

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
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const observationRef = useRef<HTMLVideoElement>(null);
  const activeSourceRef = useRef(0);
  const sourceKey = sources.join('|');
  const { isVisible, shouldLoadMedia } = useDeferredMedia(observationRef, {
    fallbackDelayMs: 450,
    observeKey: sourceKey,
  });
  const shouldAttachVideo = shouldLoadMedia && isVisible;

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
  }, [clipDurationMs, isVisible, shouldAttachVideo, sourceKey, sources.length]);

  if (!sources.length) return null;

  return sources.map((source, index) => (
    <video
      key={source}
      ref={(video) => {
        videoRefs.current[index] = video;
        if (index === 0) observationRef.current = video;
      }}
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
