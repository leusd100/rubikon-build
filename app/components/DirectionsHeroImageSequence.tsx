'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { directionsHeroSequenceAssets } from '../data/directionsHeroSequenceManifest';
import { directions } from '../data/directions';
import { useDeferredMedia } from '../hooks/useDeferredMedia';
import { useHeroControlPlacement } from './useHeroControlPlacement';

const CLIP_DURATION_MS = 6000; // UX pass 2026-10: 3 s per slide was too fast to read the indicator and the picture
const FADE_DURATION_MS = 2000;
// Cover scales to the hero's height as well as its width; 100vw alone downloaded a tiny,
// heavily stretched landscape on tall screens. Portrait sources keep a native-height crop.
const LANDSCAPE_SIZES = '(min-aspect-ratio: 23/10) 100vw, 230svh';
const PORTRAIT_SIZES = '(max-width: 760px) 640px, 100vw';
const pad = (value: number) => String(value).padStart(2, '0');

/** The direction a slide shows, by the asset's own file name (the sequence follows the directions' order). */
function directionTitle(src: string) {
  return directions.find((direction) => src.includes(`directions-sequence-${direction.id}-`))?.title ?? '';
}

export function DirectionsHeroImageSequence() {
  // on a computer the pause / play stands on the line of the hero's buttons, clear of the cookie strip (08.10)
  const placeControl = useHeroControlPlacement();
  const [activeIndex, setActiveIndex] = useState(0);
  // One index ahead of whatever's on screen, and never decreases — so each slide gets a full
  // CLIP_DURATION_MS head start to load before its turn, instead of every slide after the first
  // downloading at once the moment shouldLoadMedia flips true. Starts at 1 (not 0) so slide 1 is
  // already eligible the instant shouldLoadMedia turns true — still gated by that flag below, so
  // nothing loads early — and monotonic after that: once a slide is unlocked it stays unlocked
  // as activeIndex wraps back around the cycle, so nothing re-toggles its <source> and re-fetches
  // every loop.
  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(1);
  const firstImageRef = useRef<HTMLImageElement>(null);
  const { isVisible, shouldLoadMedia } = useDeferredMedia(firstImageRef, {
    observeKey: 'directions-static-hero-sequence',
  });
  // The slides change on their own, so they can be paused (the same round control as the hero videos); the active
  // bar restarts with every slide and every resume
  const [paused, setPaused] = useState(false);
  const [resumes, setResumes] = useState(0);

  useEffect(() => {
    // Out of sight the slides wait (07.10): every 6 s the sequence re-rendered, cross-faded two full-screen pictures and
    // decoded the next one while the visitor read the page far below
    if (!shouldLoadMedia || paused || !isVisible) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % directionsHeroSequenceAssets.length;
        setMaxUnlockedIndex((unlocked) => Math.max(unlocked, next + 1));
        return next;
      });
    }, CLIP_DURATION_MS);

    return () => window.clearInterval(timer);
  }, [shouldLoadMedia, paused, isVisible]);

  const visibleIndex = shouldLoadMedia ? activeIndex : 0;
  const count = directionsHeroSequenceAssets.length;

  return (
    <>
      {directionsHeroSequenceAssets.map((asset, index) => {
        const shouldAttachSource = index === 0 || (shouldLoadMedia && index <= maxUnlockedIndex);
        const style = {
          '--directions-hero-image-position': asset.focalPosition,
          '--directions-hero-image-position-mobile': asset.mobileFocalPosition,
          transitionDuration: `${FADE_DURATION_MS}ms`,
        } as CSSProperties;

        return (
          <picture key={asset.fallbackSrc}>
            {shouldAttachSource && <source media="(max-width: 1050px) and (orientation: portrait)" type="image/webp" srcSet={asset.portraitSrcSet} sizes={PORTRAIT_SIZES} />}
            {shouldAttachSource && <source type="image/webp" srcSet={asset.srcSet} sizes={LANDSCAPE_SIZES} />}
            <img
              ref={index === 0 ? firstImageRef : undefined}
              aria-hidden="true"
              className={`directions-hero-sequence-image${index === visibleIndex ? ' is-active' : ''}`}
              src={shouldAttachSource ? asset.fallbackSrc : undefined}
              alt=""
              width={asset.width}
              height={asset.height}
              sizes={LANDSCAPE_SIZES}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
              style={style}
            />
          </picture>
        );
      })}
      {shouldLoadMedia && (
        <>
          {/* Which direction the slide shows — the sequence otherwise cycles without saying what it is */}
          <div className="dhs-indicator" data-paused={paused || undefined} aria-hidden="true">
            <span className="dhs-bars">
              {directionsHeroSequenceAssets.map((asset, index) => (
                <i key={asset.fallbackSrc} className={index < visibleIndex ? 'is-done' : undefined}>
                  {/* restarts with the slide, a resume and a return into view — so it fills with the slide's own time */}
                  {index === visibleIndex && <b key={`${visibleIndex}-${resumes}-${isVisible}`} />}
                </i>
              ))}
            </span>
            <span className="dhs-caption">
              <b>{pad(visibleIndex + 1)}</b> / {pad(count)} · {directionTitle(directionsHeroSequenceAssets[visibleIndex].fallbackSrc)}
            </span>
          </div>
          <button
            ref={placeControl}
            type="button"
            className="hero-video-control"
            data-paused={paused || undefined}
            onClick={() => {
              setPaused((value) => !value);
              setResumes((value) => value + 1);
            }}
          >
            <span className="hero-video-control-label">{paused ? 'Відтворити' : 'Пауза'}<span className="sr-only">{paused ? ' показ напрямів' : ' показу напрямів'}</span></span>
            <span className="hero-video-control-icon" aria-hidden="true" />
          </button>
        </>
      )}
    </>
  );
}
