'use client';

/* eslint-disable @next/next/no-img-element -- same reason as ResponsiveImage: next/image resizing is a no-op in
   this vinext/Cloudflare deployment, so the static phone hero ships pre-generated WebP variants. */
import { useSyncExternalStore } from 'react';
import { DirectionHeroVideo } from '../DirectionHeroVideo';
import { useViewportVariant } from '../../hooks/useViewportVariant';

// HOME v2 prototype. Desktop and tablet keep the existing footage; ≤760 px gets one still instead of the 2.6 MB
// phone montage. The still is a concept image (the /napryamky steel-frame render, cropped 4:5) — an unclad frame,
// so it never reads as a finished object, and the hero labels it «Ілюстрація».
const STATIC_QUERY = '(max-width: 760px)';
export const HERO_STATIC_SRC = '/media/home-v2/concepts/hero-mobile-752w.webp';
const HERO_STATIC_SRCSET = '/media/home-v2/concepts/hero-mobile-480w.webp 480w, /media/home-v2/concepts/hero-mobile-752w.webp 752w';

const desktopSources = [
  '/media/about/straight-line-14377591-v2.mp4',
  '/media/about/blueprint-v2.mp4',
  '/media/about/drilling-29913842-v2.mp4',
  '/media/about/welding-v2.mp4',
  '/media/about/structure-v2.mp4',
];

function subscribe(onChange: () => void) {
  const media = window.matchMedia(STATIC_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function HomeV2HeroMedia() {
  const { variant, hasResolvedViewport } = useViewportVariant();
  // Server snapshot = not static: the SSR markup is the video component, whose ≤760 poster IS the still,
  // so a phone paints the same image before and after hydration.
  const isStatic = useSyncExternalStore(subscribe, () => window.matchMedia(STATIC_QUERY).matches, () => false);

  if (isStatic) {
    return (
      <img
        className="direction-hero-poster hv2-hero-still"
        src={HERO_STATIC_SRC}
        srcSet={HERO_STATIC_SRCSET}
        sizes="100vw"
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    );
  }

  const tablet = variant === 'tablet';
  return (
    <DirectionHeroVideo
      key={`${variant}-${hasResolvedViewport}`}
      sources={tablet ? ['/media/about/home-tablet-montage-v2.mp4'] : desktopSources}
      poster={tablet ? '/media/about/home-tablet-poster.webp' : '/media/about/straight-line-poster.webp'}
      mobilePoster={HERO_STATIC_SRC}
      clipDurationMs={2500}
      fadeDurationMs={800}
      loopSingleSource
      playbackRate={tablet ? 1 : 0.85}
      videoMediaQuery={hasResolvedViewport ? '(min-width: 761px)' : '(min-width: 99999px)'}
    />
  );
}
