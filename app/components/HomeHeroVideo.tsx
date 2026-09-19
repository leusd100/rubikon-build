'use client';

import { DirectionHeroVideo } from './DirectionHeroVideo';
import { useViewportVariant, type ViewportVariant } from '../hooks/useViewportVariant';

// v2 (Sprint 3.2): H.264 High 1280×720, CRF 23, trimmed to the 3.2 s the montage can show (it restarts each clip
// at 0 and leaves it after ~2.8 s of source time). 13.97 → 4.00 MB for the set. New names, not replaced in place:
// /media is cached for 7 days, and the originals stay until a separate cleanup after deploy.
const desktopSources = [
  '/media/about/straight-line-14377591-v2.mp4',
  '/media/about/blueprint-v2.mp4',
  '/media/about/drilling-29913842-v2.mp4',
  '/media/about/welding-v2.mp4',
  '/media/about/structure-v2.mp4',
];

const variantConfig = {
  desktop: {
    sources: desktopSources,
    poster: '/media/about/straight-line-poster.webp',
    mobilePoster: '/media/about/straight-line-poster-768w.webp',
  },
  phone: {
    sources: ['/media/about/home-phone-montage.mp4'],
    poster: '/media/about/home-phone-poster.webp',
    mobilePoster: '/media/about/home-phone-poster.webp',
  },
  tablet: {
    sources: ['/media/about/home-tablet-montage-v2.mp4'],
    poster: '/media/about/home-tablet-poster.webp',
    mobilePoster: '/media/about/home-tablet-poster.webp',
  },
} satisfies Record<ViewportVariant, {
  sources: string[];
  poster: string;
  mobilePoster: string;
}>;

export function HomeHeroVideo() {
  const { variant, hasResolvedViewport } = useViewportVariant();
  const config = variantConfig[variant];

  return (
    <DirectionHeroVideo
      key={`${variant}-${hasResolvedViewport}`}
      sources={config.sources}
      poster={config.poster}
      mobilePoster={config.mobilePoster}
      clipDurationMs={2500}
      fadeDurationMs={800}
      loopSingleSource
      playbackRate={variant === 'desktop' ? 0.85 : 1}
      videoMediaQuery={hasResolvedViewport ? 'all' : '(min-width: 99999px)'}
    />
  );
}
