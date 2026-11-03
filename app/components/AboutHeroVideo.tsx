'use client';

/* eslint-disable @next/next/no-img-element -- as HomeV2HeroMedia: next/image resizing is a no-op in this
   vinext/Cloudflare deployment, so the phone still ships pre-generated WebP variants. */
import { useSyncExternalStore } from 'react';
import { DirectionHeroVideo } from './DirectionHeroVideo';
import { useViewportVariant, type ViewportVariant } from '../hooks/useViewportVariant';

// Owner selected photo B, «Продумана робота», on 03.11: planning tools with a construction site behind them.
// Generated illustration, not a portrait of the team or a documented RUBIKON project.
// The visible «Ілюстрація» label, desktop/tablet footage and 600px boundary remain.
const STATIC_QUERY = '(max-width: 600px)';
export const ABOUT_STATIC_SRC = '/media/about/about-planning-photo-v1-683w.0470ec96.webp';
const ABOUT_STATIC_SRCSET = '/media/about/about-planning-photo-v1-480w.b6f12476.webp 480w, /media/about/about-planning-photo-v1-683w.0470ec96.webp 683w';

// As on HOME, the 0.85 slow-down is in the files (re-timed to an even 30 fps by scripts/retime-hero-clips.py), so the
// desktop clips play at 1.0 (OD-S1 option B, 15.10)
const desktopSources = [
  '/media/about/about-precision-9617516-v2.mp4',
  '/media/about/about-floor-plan-8725798-v2.mp4',
  '/media/about/about-grinder-14488798-v2.mp4',
  '/media/about/about-welding-20507417-v2.mp4',
  '/media/about/about-structure-40721-v2.mp4',
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
        width={683}
        height={1024}
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
      mobilePosterSrcSet={isDesktop ? ABOUT_STATIC_SRCSET : undefined}
      mobilePosterSizes="100vw"
      mobilePosterMediaQuery="(max-width: 600px)"
      posterMediaQuery="(min-width: 601px)"
      clipDurationMs={isDesktop ? 3800 : 2500}
      fadeDurationMs={isDesktop ? 1100 : 800}
      loopSingleSource
      videoMediaQuery={hasResolvedViewport ? '(min-width: 601px)' : '(min-width: 99999px)'}
    />
  );
}
