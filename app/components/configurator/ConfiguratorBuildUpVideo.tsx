'use client';

import { useEffect, useRef, useState } from 'react';
import { useDeferredMedia } from '../../hooks/useDeferredMedia';

// The 3D build-up, recorded (owner, 18.11): on /angary the 3D view sits behind «Подивитися в 3D» and the layer-by-layer
// build only plays when each work is ticked under «Окремі роботи», so almost no visitor sees it. This loop shows it
// beside the configurator's heading. It is a frame-by-frame capture of the live 3D view at its default 24 × 60 m example
// (the configurator's own geometry, nothing drawn on top except the stage names), so it never shows more than the tool does.
const SOURCE = '/media/angary/configurator-buildup-24x60-v1.mp4';
const POSTER_AVIF = '/media/angary/configurator-buildup-24x60-v1.avif';
const POSTER_WEBP = '/media/angary/configurator-buildup-24x60-v1.webp';
// As the hero footage (DirectionHeroVideo): no video download on a phone unless the visitor asks for it
const AUTOPLAY_QUERY = '(min-width: 761px)';

export function ConfiguratorBuildUpVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // shouldLoadMedia is false under reduced motion and Save-Data: then the loop waits for the visitor's own «Відтворити»
  const { isVisible, shouldLoadMedia } = useDeferredMedia(videoRef, { rootMargin: '200px 0px' });
  const [autoplayWidth, setAutoplayWidth] = useState(false);
  const [requested, setRequested] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(AUTOPLAY_QUERY);
    const update = () => setAutoplayWidth(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const autoplay = autoplayWidth && shouldLoadMedia;
  const attached = autoplay || requested;
  const shouldPlay = attached && isVisible && !userPaused;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !attached) return;
    if (!shouldPlay) {
      video.pause();
      return;
    }
    const play = () => {
      if (document.visibilityState === 'visible') void video.play().catch(() => undefined);
      else video.pause();
    };
    play();
    document.addEventListener('visibilitychange', play);
    return () => document.removeEventListener('visibilitychange', play);
  }, [attached, shouldPlay]);

  // Before anything plays the button starts it; after, it pauses and resumes. The word names the next action, as on
  // the hero's control, so the button carries no aria-pressed
  const paused = !attached || userPaused;
  const toggle = () => {
    if (!attached) {
      setRequested(true);
      setUserPaused(false);
      return;
    }
    setUserPaused((value) => !value);
  };

  return (
    <figure className="hc-buildup">
      <div className="hc-buildup-frame">
        <picture>
          <source type="image/avif" srcSet={POSTER_AVIF} />
          <img className="hc-buildup-poster" src={POSTER_WEBP} alt="" width={1280} height={720} loading="lazy" decoding="async" />
        </picture>
        <video
          ref={videoRef}
          className={`hc-buildup-video${hasPlayed ? ' is-playing' : ''}`}
          src={attached ? SOURCE : undefined}
          muted
          playsInline
          loop
          preload={attached ? 'auto' : 'none'}
          onPlaying={() => setHasPlayed(true)}
          aria-hidden="true"
          // Firefox puts every <video> in the Tab order: the button below is the one control (DirectionHeroVideo)
          tabIndex={-1}
        />
        <button type="button" className="hero-video-control" data-compact="" data-paused={paused || undefined} onClick={toggle}>
          <span className="hero-video-control-label">{paused ? 'Відтворити' : 'Пауза'}<span className="sr-only"> відео</span></span>
          <span className="hero-video-control-icon" aria-hidden="true" />
        </button>
      </div>
      <figcaption>Приклад у 3D: ангар 24 × 60 м від фундаменту до покрівлі</figcaption>
    </figure>
  );
}
