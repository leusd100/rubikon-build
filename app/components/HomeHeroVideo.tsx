'use client';

import { DirectionHeroVideo } from './DirectionHeroVideo';
import { useViewportVariant, type ViewportVariant } from '../hooks/useViewportVariant';

const desktopSources = [
  '/media/about/straight-line-14377591.mp4',
  '/media/about/blueprint.m4v',
  '/media/about/drilling-29913842.m4v',
  '/media/about/welding.m4v',
  '/media/about/structure.m4v',
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
    sources: ['/media/about/home-tablet-montage.mp4'],
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
