'use client';

// As with ResponsiveImage, next/image resizing is a no-op in this deployment:
// picture selects pre-generated AVIF variants with the existing WebP fallback.
import { useSyncExternalStore } from 'react';
import { DirectionHeroVideo } from '../DirectionHeroVideo';
import { useViewportVariant } from '../../hooks/useViewportVariant';

// HOME v2. Desktop and tablet keep the existing footage; ≤760 px gets one still instead of the 2.6 MB
// phone montage. The still is a concept image (the /napryamky steel-frame render) — an unclad frame, so it never reads
// as a finished object, and the hero labels it «Ілюстрація». It is cropped to the rows the phone band can show
// (752×678, see scripts/generate-home-v2-crops.py), so object-position 50% 32% frames it exactly as the 4:5 crop did.
const STATIC_QUERY = '(max-width: 760px)';
export const HERO_STATIC_SRC = '/media/home-v2/concepts/hero-mobile-band-752w.webp';
const HERO_STATIC_SRCSET = '/media/home-v2/concepts/hero-mobile-band-480w.webp 480w, /media/home-v2/concepts/hero-mobile-band-752w.webp 752w';
const HERO_STATIC_AVIF = {
  src: '/media/home-v2/concepts/hero-mobile-band-752w.avif',
  srcSet: '/media/home-v2/concepts/hero-mobile-band-480w.avif 480w, /media/home-v2/concepts/hero-mobile-band-752w.avif 752w',
};

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
  // so a phone selects the same responsive source before and after hydration. The preload must use that
  // srcset too: a fixed 752w preload made DPR-1 phones fetch both 752w and 480w on the first visit.
  const isStatic = useSyncExternalStore(subscribe, () => window.matchMedia(STATIC_QUERY).matches, () => false);

  if (isStatic) {
    return (
      <picture>
        <source type="image/avif" srcSet={HERO_STATIC_AVIF.srcSet} sizes="100vw" />
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
      </picture>
    );
  }

  const tablet = variant === 'tablet';
  return (
    <DirectionHeroVideo
      key={`${variant}-${hasResolvedViewport}`}
      sources={tablet ? ['/media/about/home-tablet-montage-v2.mp4'] : desktopSources}
      poster={tablet ? '/media/about/home-tablet-poster.webp' : '/media/about/straight-line-poster.webp'}
      mobilePoster={HERO_STATIC_SRC}
      mobilePosterSrcSet={HERO_STATIC_SRCSET}
      mobilePosterSizes="100vw"
      mobilePosterAvif={HERO_STATIC_AVIF}
      clipDurationMs={2500}
      fadeDurationMs={800}
      loopSingleSource
      playbackRate={tablet ? 1 : 0.85}
      videoMediaQuery={hasResolvedViewport ? '(min-width: 761px)' : '(min-width: 99999px)'}
    />
  );
}
