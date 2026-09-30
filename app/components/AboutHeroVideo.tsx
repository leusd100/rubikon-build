'use client';

import { DirectionHeroVideo } from './DirectionHeroVideo';
import { useViewportVariant, type ViewportVariant } from '../hooks/useViewportVariant';

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
    mobilePoster: '/media/about/about-precision-9617516-poster-768w.webp',
  },
  phone: {
    sources: ['/media/about/about-phone-montage.mp4'],
    poster: '/media/about/about-phone-poster.webp',
    mobilePoster: '/media/about/about-phone-poster.webp',
  },
  tablet: {
    sources: ['/media/about/about-tablet-montage.mp4'],
    poster: '/media/about/about-tablet-poster.webp',
    mobilePoster: '/media/about/about-tablet-poster.webp',
  },
} satisfies Record<ViewportVariant, {
  sources: string[];
  poster: string;
  mobilePoster: string;
}>;

export function AboutHeroVideo() {
  const { variant, hasResolvedViewport } = useViewportVariant();
  const config = variantConfig[variant];
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
      videoMediaQuery={hasResolvedViewport ? 'all' : '(min-width: 99999px)'}
    />
  );
}
