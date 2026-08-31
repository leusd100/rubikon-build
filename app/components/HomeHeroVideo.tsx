'use client';

import { useEffect, useState } from 'react';
import { DirectionHeroVideo } from './DirectionHeroVideo';

type HomeHeroVariant = 'desktop' | 'phone' | 'tablet';

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
} satisfies Record<HomeHeroVariant, {
  sources: string[];
  poster: string;
  mobilePoster: string;
}>;

export function HomeHeroVideo() {
  const [variant, setVariant] = useState<HomeHeroVariant>('desktop');
  const [hasResolvedViewport, setHasResolvedViewport] = useState(false);

  useEffect(() => {
    const phoneMedia = window.matchMedia('(max-width: 600px)');
    const tabletPortraitMedia = window.matchMedia(
      '(min-width: 601px) and (max-width: 1100px) and (orientation: portrait)',
    );

    const updateVariant = () => {
      setVariant(phoneMedia.matches ? 'phone' : tabletPortraitMedia.matches ? 'tablet' : 'desktop');
      setHasResolvedViewport(true);
    };

    updateVariant();
    phoneMedia.addEventListener('change', updateVariant);
    tabletPortraitMedia.addEventListener('change', updateVariant);

    return () => {
      phoneMedia.removeEventListener('change', updateVariant);
      tabletPortraitMedia.removeEventListener('change', updateVariant);
    };
  }, []);

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
