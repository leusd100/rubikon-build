'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { directionsHeroSequenceAssets } from '../data/directionsHeroSequenceManifest';
import { directions } from '../data/directions';
import { readPreference, subscribeTheme } from '../lib/theme';
import { HERO_THEME_SCRIPT, darkMedia } from '../lib/heroThemeSources';
import { useDeferredMedia } from '../hooks/useDeferredMedia';
import { useHeroControlPlacement } from './useHeroControlPlacement';

const CLIP_DURATION_MS = 6000; // UX pass 2026-10: 3 s per slide was too fast to read the indicator and the picture
const FADE_DURATION_MS = 2000;
// Cover scales to the hero's height as well as its width; 100vw alone downloaded a tiny,
// heavily stretched landscape on tall screens. Portrait sources keep a native-height crop.
const LANDSCAPE_SIZES = '(min-aspect-ratio: 23/10) 100vw, 230svh';
const PORTRAIT_SIZES = '100vw';
const PHONE = '(max-width: 760px)';
const PORTRAIT_TABLET = '(min-width: 761px) and (max-width: 1050px) and (orientation: portrait)';
const pad = (value: number) => String(value).padStart(2, '0');

/** The slide order follows the five direction records. */
function directionTitle(id: string) {
  return directions.find((direction) => direction.id === id)?.title ?? '';
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
  // As in DirectionHeroImage: the server's markup is the System one, its blue-hour sources under the OS dark media
  // query, so a dark visitor no longer fetches the daylight first slide before the dark one (MD-01, 29.10). Only a stored
  // Light or Dark swaps to explicit pictures on the client.
  const preference = useSyncExternalStore(subscribeTheme, readPreference, () => 'system' as const);
  const theme = preference === 'system' ? null : preference;
  const firstImageRef = useRef<HTMLImageElement>(null);
  const { isVisible, shouldLoadMedia } = useDeferredMedia(firstImageRef, {
    // Theme changes replace the image nodes; observe the new first slide.
    observeKey: `directions-static-hero-sequence-${preference}`,
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
        const art = theme === 'dark' ? asset.dark : asset.daylight;
        const shouldAttachSource = index === 0 || (shouldLoadMedia && index <= maxUnlockedIndex);
        const system = !theme && shouldAttachSource;
        const style = {
          '--directions-hero-image-position': asset.focalPosition,
          '--directions-hero-image-position-mobile': asset.mobileFocalPosition,
          transitionDuration: `${FADE_DURATION_MS}ms`,
        } as CSSProperties;

        return (
          // Keep decoded pixels scoped to their theme, including during hydration.
          <picture key={`${asset.id}-${preference}`}>
            {system && <source data-dark="" media={darkMedia(PHONE)} suppressHydrationWarning type="image/avif" srcSet={asset.dark.mobile.avif} sizes="100vw" />}
            {system && <source data-dark="" media={darkMedia(PHONE)} suppressHydrationWarning type="image/webp" srcSet={asset.dark.mobile.webp} sizes="100vw" />}
            {shouldAttachSource && <source media={PHONE} type="image/avif" srcSet={art.mobile.avif} sizes="100vw" />}
            {shouldAttachSource && <source media={PHONE} type="image/webp" srcSet={art.mobile.webp} sizes="100vw" />}
            {system && <source data-dark="" media={darkMedia(PORTRAIT_TABLET)} suppressHydrationWarning type="image/webp" srcSet={asset.dark.portraitSrcSet} sizes={PORTRAIT_SIZES} />}
            {shouldAttachSource && <source media={PORTRAIT_TABLET} type="image/webp" srcSet={art.portraitSrcSet} sizes={PORTRAIT_SIZES} />}
            {system && <source data-dark="" media={darkMedia()} suppressHydrationWarning type="image/webp" srcSet={asset.dark.srcSet} sizes={LANDSCAPE_SIZES} />}
            {shouldAttachSource && <source type="image/webp" srcSet={art.srcSet} sizes={LANDSCAPE_SIZES} />}
            {system && <script dangerouslySetInnerHTML={{ __html: HERO_THEME_SCRIPT }} />}
            <img
              ref={(image) => {
                if (index === 0) firstImageRef.current = image;
                // Give client-created images their fallback only after the picture sources are in place.
                // Otherwise WebKit can fetch the landscape fallback as well as the mobile source on a theme change.
                if (image && !shouldAttachSource) image.removeAttribute('src');
                // The System picture has no src: see DirectionHeroImage (the inline script ends the preload scanner's view)
                else if (image && theme && !image.hasAttribute('src')) image.src = art.fallbackSrc;
              }}
              aria-hidden="true"
              className={`directions-hero-sequence-image${index === visibleIndex ? ' is-active' : ''}`}
              data-art-theme={theme ?? 'system'}
              suppressHydrationWarning
              alt=""
              width={art.width}
              height={art.height}
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
                <i key={asset.id} className={index < visibleIndex ? 'is-done' : undefined}>
                  {/* restarts with the slide, a resume and a return into view — so it fills with the slide's own time */}
                  {index === visibleIndex && <b key={`${visibleIndex}-${resumes}-${isVisible}`} />}
                </i>
              ))}
            </span>
            <span className="dhs-caption">
              <b>{pad(visibleIndex + 1)}</b> / {pad(count)} · {directionTitle(directionsHeroSequenceAssets[visibleIndex].id)}
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
