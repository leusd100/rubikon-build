'use client';

import { useEffect, useState } from 'react';
import { DirectionHeroVideo } from './DirectionHeroVideo';

type AboutHeroVariant = 'desktop' | 'phone' | 'tablet';

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
} satisfies Record<AboutHeroVariant, {
  sources: string[];
  poster: string;
  mobilePoster: string;
}>;

export function AboutHeroVideo() {
  const [variant, setVariant] = useState<AboutHeroVariant>('desktop');
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
