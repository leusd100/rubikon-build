'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useDeferredMedia } from '../hooks/useDeferredMedia';

type DirectionHeroVideoProps = {
  sources: string[];
  poster: string;
  className?: string;
  clipDurationMs?: number;
  playbackRate?: number;
};

const FADE_DURATION_MS = 1100;

export function DirectionHeroVideo({
  sources,
  poster,
  className,
  clipDurationMs = 6000,
  playbackRate = 1,
}: DirectionHeroVideoProps) {
  const [activeSource, setActiveSource] = useState(0);
  const [readySources, setReadySources] = useState<Record<number, boolean>>({});
  const [canUseVideo, setCanUseVideo] = useState(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const observationRef = useRef<HTMLVideoElement>(null);
  const activeSourceRef = useRef(0);
  const sourceKey = sources.join('|');
  const { isVisible, shouldLoadMedia } = useDeferredMedia(observationRef, {
    fallbackDelayMs: 450,
    observeKey: sourceKey,
  });
  const shouldAttachVideo = shouldLoadMedia && isVisible && canUseVideo;

  useEffect(() => {
    const desktopMedia = window.matchMedia('(min-width: 761px)');
    const updateVideoPreference = () => setCanUseVideo(desktopMedia.matches);

    updateVideoPreference();
    desktopMedia.addEventListener('change', updateVideoPreference);
    return () => desktopMedia.removeEventListener('change', updateVideoPreference);
  }, []);

  useEffect(() => {
    activeSourceRef.current = 0;

    const firstVideo = videoRefs.current[0];
    videoRefs.current.forEach((video) => {
      if (video) video.playbackRate = playbackRate;
    });
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
  }, [clipDurationMs, isVisible, playbackRate, shouldAttachVideo, sourceKey, sources.length]);

  if (!sources.length) return null;

  return (
    <>
      <Image
        className="direction-hero-poster"
        src={poster}
        alt=""
        fill
        priority
        sizes="100vw"
        aria-hidden="true"
      />
      {sources.map((source, index) => (
        <video
          key={source}
          ref={(video) => {
            videoRefs.current[index] = video;
            if (index === 0) observationRef.current = video;
          }}
          className={[
            className,
            'direction-hero-video',
            index === activeSource && readySources[index] ? 'is-active' : '',
          ].filter(Boolean).join(' ')}
          src={shouldAttachVideo ? source : undefined}
          autoPlay={shouldAttachVideo && index === 0}
          muted
          playsInline
          preload={shouldAttachVideo && index === activeSource ? 'auto' : 'none'}
          loop={sources.length === 1}
          onCanPlay={(event) => {
            event.currentTarget.playbackRate = playbackRate;
            setReadySources((current) => ({ ...current, [index]: true }));
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
