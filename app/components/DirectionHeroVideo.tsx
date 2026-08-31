'use client';

import { useEffect, useRef, useState } from 'react';
import { useDeferredMedia } from '../hooks/useDeferredMedia';

type DirectionHeroVideoProps = {
  sources: string[];
  poster: string;
  mobilePoster: string;
  className?: string;
  clipDurationMs?: number;
  fadeDurationMs?: number;
  loopSingleSource?: boolean;
  playbackRate?: number;
  videoMediaQuery?: string;
};

const DEFAULT_FADE_DURATION_MS = 1100;

export function DirectionHeroVideo({
  sources,
  poster,
  mobilePoster,
  className,
  clipDurationMs = 6000,
  fadeDurationMs = DEFAULT_FADE_DURATION_MS,
  loopSingleSource = true,
  playbackRate = 1,
  videoMediaQuery = '(min-width: 761px)',
}: DirectionHeroVideoProps) {
  const [activeSource, setActiveSource] = useState(0);
  const [outgoingSource, setOutgoingSource] = useState<number | null>(null);
  const [readySources, setReadySources] = useState<Record<number, boolean>>({});
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
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
    const preferredMedia = window.matchMedia(videoMediaQuery);
    const updateVideoPreference = () => setCanUseVideo(preferredMedia.matches);

    updateVideoPreference();
    preferredMedia.addEventListener('change', updateVideoPreference);
    return () => preferredMedia.removeEventListener('change', updateVideoPreference);
  }, [videoMediaQuery]);

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
      if (nextVideo.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return;

      nextVideo.currentTime = 0;
      void nextVideo.play().then(() => {
        setReadySources((current) => ({ ...current, [nextIndex]: true }));
        setOutgoingSource(previousIndex);
        activeSourceRef.current = nextIndex;
        setActiveSource(nextIndex);

        pauseTimer = setTimeout(() => {
          videoRefs.current[previousIndex]?.pause();
          setOutgoingSource((current) => current === previousIndex ? null : current);
        }, fadeDurationMs);
      }).catch(() => undefined);
    }, clipDurationMs);

    document.addEventListener('visibilitychange', playActiveVideo);

    return () => {
      window.clearInterval(cycleTimer);
      if (pauseTimer) clearTimeout(pauseTimer);
      document.removeEventListener('visibilitychange', playActiveVideo);
    };
  }, [clipDurationMs, fadeDurationMs, isVisible, playbackRate, shouldAttachVideo, sourceKey, sources.length]);

  if (!sources.length) return null;

  const nextSource = sources.length > 1 ? (activeSource + 1) % sources.length : activeSource;

  return (
    <>
      <link
        rel="preload"
        as="image"
        href={mobilePoster}
        media="(max-width: 760px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={poster}
        media="(min-width: 761px)"
        fetchPriority="high"
      />
      <picture>
        <source media="(max-width: 760px)" srcSet={mobilePoster} />
        <img
          aria-hidden="true"
          className={`direction-hero-poster${hasStartedPlayback ? ' is-hidden' : ''}`}
          src={poster}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </picture>
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
            (index === activeSource || index === outgoingSource) && readySources[index] ? 'is-active' : '',
          ].filter(Boolean).join(' ')}
          style={{ transitionDuration: `${fadeDurationMs}ms` }}
          src={shouldAttachVideo ? source : undefined}
          autoPlay={shouldAttachVideo && index === 0}
          muted
          playsInline
          preload={shouldAttachVideo && (index === activeSource || index === nextSource) ? 'auto' : 'none'}
          loop={sources.length === 1 && loopSingleSource}
          onCanPlay={(event) => {
            event.currentTarget.playbackRate = playbackRate;
            setReadySources((current) => ({ ...current, [index]: true }));
          }}
          onPlaying={() => {
            if (index === activeSourceRef.current) setHasStartedPlayback(true);
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
