'use client';

/* eslint-disable @next/next/no-img-element -- as HomeV2HeroMedia: next/image resizing is a no-op in this
   vinext/Cloudflare deployment, so the phone still ships pre-generated WebP variants. */
import { useSyncExternalStore } from 'react';
import { DirectionHeroVideo } from './DirectionHeroVideo';
import { useViewportVariant, type ViewportVariant } from '../hooks/useViewportVariant';

// /pro-nas hero. Desktop and tablet keep the footage; a phone (≤ 600 px, the hook's phone variant) gets one still
// instead of the 3.5 MB phone montage (UX pass 2026-10, owner's photo 4: a steel frame at sunset over the anchor bolts).
// As everywhere on this page, the image carries no «Ілюстрація» tag (owner's decision, 30.09) and is decorative.
const STATIC_QUERY = '(max-width: 600px)';
export const ABOUT_STATIC_SRC = '/media/about/about-phone-still-768w.webp';
const ABOUT_STATIC_SRCSET = '/media/about/about-phone-still-480w.webp 480w, /media/about/about-phone-still-768w.webp 768w';

const desktopSources = [
  '/media/about/about-precision-9617516.mp4',
  '/media/about/about-floor-plan-8725798.mp4',
  '/media/about/about-grinder-14488798.mp4',
  '/media/about/about-welding-20507417.mp4',
  '/media/about/about-structure-40721.mp4',
];

const variantConfig = {
  desktop: {
    sources: desktopSources,
    poster: '/media/about/about-precision-9617516-poster.webp',
    // The SSR markup is this variant: a phone paints the still before hydration, and the same still after
    mobilePoster: ABOUT_STATIC_SRC,
  },
  tablet: {
    sources: ['/media/about/about-tablet-montage.mp4'],
    poster: '/media/about/about-tablet-poster.webp',
    mobilePoster: '/media/about/about-tablet-poster.webp',
  },
} satisfies Record<Exclude<ViewportVariant, 'phone'>, {
  sources: string[];
  poster: string;
  mobilePoster: string;
}>;

function subscribe(onChange: () => void) {
  const media = window.matchMedia(STATIC_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function AboutHeroVideo() {
  const { variant, hasResolvedViewport } = useViewportVariant();
  const isStatic = useSyncExternalStore(subscribe, () => window.matchMedia(STATIC_QUERY).matches, () => false);

  if (isStatic) {
    return (
      <img
        className="direction-hero-poster about-hero-still"
        src={ABOUT_STATIC_SRC}
        srcSet={ABOUT_STATIC_SRCSET}
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

  const config = variantConfig[variant === 'tablet' ? 'tablet' : 'desktop'];
  const isDesktop = variant === 'desktop';

  return (
    <DirectionHeroVideo
      key={`${variant}-${hasResolvedViewport}`}
      sources={config.sources}
      poster={config.poster}
      mobilePoster={config.mobilePoster}
      clipDurationMs={isDesktop ? 3800 : 2500}
      fadeDurationMs={isDesktop ? 1100 : 800}
      loopSingleSource
      playbackRate={isDesktop ? 0.85 : 1}
      videoMediaQuery={hasResolvedViewport ? '(min-width: 601px)' : '(min-width: 99999px)'}
    />
  );
}
