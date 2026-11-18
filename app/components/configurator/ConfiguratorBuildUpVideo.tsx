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
  // useDeferredMedia starts out «visible» and its idle timer still fires in a tab opened in the background, where the
  // observer never reports: that would fetch the MP4 for a block far below the fold (review, 18.11). The source waits for
  // the block itself to be on screen in a visible tab once.
  const [seen, setSeen] = useState(false);
  const [attached, setAttached] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(AUTOPLAY_QUERY);
    const update = () => setAutoplayWidth(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const target = videoRef.current;
    if (!target || seen || typeof IntersectionObserver === 'undefined') return;
    // Some browsers report entries in a hidden tab too: an entry dropped there is taken up once the tab is shown
    let intersecting = false;
    const check = () => {
      if (intersecting && document.visibilityState === 'visible') setSeen(true);
    };
    const observer = new IntersectionObserver((entries) => {
      intersecting = entries.at(-1)!.isIntersecting;
      check();
    // Half of the loop in view, not its edge: at 768 × 1024 its top sits inside the first screen, and a page opened
    // there fetched the MP4 before the visitor had scrolled at all (direction-static-hero.spec.ts, 18.11)
    }, { threshold: 0.5 });
    observer.observe(target);
    document.addEventListener('visibilitychange', check);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', check);
    };
  }, [seen]);

  const autoplay = autoplayWidth && shouldLoadMedia;
  const wanted = autoplay || requested;
  // Kept once set, as the hero's source is: taking it away later does not stop a playing resource (HTML load algorithm)
  // and giving it back would reload the clip from its start
  // (a latch adjusted while rendering, the React way to keep state derived from other state)
  if (!attached && ((autoplay && seen) || requested)) setAttached(true);
  // A narrower window or reduced motion turned on mid-loop withdraws autoplay: the loop pauses until the visitor asks
  const shouldPlay = attached && wanted && isVisible && !userPaused;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!shouldPlay) {
      video.pause();
      return;
    }
    const play = () => {
      if (document.visibilityState !== 'visible') {
        video.pause();
        return;
      }
      // Autoplay refused (Low Power Mode, Safari's per-site setting): the button must offer «Відтворити», not «Пауза»
      void video.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'NotAllowedError') setUserPaused(true);
      });
    };
    play();
    document.addEventListener('visibilitychange', play);
    return () => document.removeEventListener('visibilitychange', play);
  }, [shouldPlay]);

  // Before anything plays the button starts it; after, it pauses and resumes. The word names the next action, as on
  // the hero's control, so the button carries no aria-pressed
  // Not yet attached reads as paused too: the poster is still, so the button offers «Відтворити»
  const paused = !wanted || userPaused || !attached;
  const toggle = () => {
    if (paused) {
      setRequested(true);
      setUserPaused(false);
      return;
    }
    setUserPaused(true);
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
