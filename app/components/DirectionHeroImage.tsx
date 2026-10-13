'use client';

import { useSyncExternalStore, type CSSProperties } from 'react';
import type { DirectionHeroImageAsset } from '../data/directionHeroImageManifest';
import { readEffectiveTheme, subscribeTheme } from '../lib/theme';

// Cover is constrained by height on tall screens; request enough source pixels.
const HERO_SIZES = '(min-aspect-ratio: 3/2) 100vw, 150svh';

type DirectionHeroImageProps = {
  asset: DirectionHeroImageAsset;
};

/**
 * Static, high-priority hero artwork for the five service detail pages.
 * It deliberately does not share DirectionHeroVideo so this path cannot attach
 * hidden video sources or change deferred-media behaviour elsewhere.
 */
export function DirectionHeroImage({ asset }: DirectionHeroImageProps) {
  const theme = useSyncExternalStore(subscribeTheme, readEffectiveTheme, () => 'light' as const);
  const art = theme === 'dark' ? asset.dark : asset;
  const style = {
    '--direction-hero-image-position': asset.focalPosition,
    '--direction-hero-image-position-mobile': asset.mobileFocalPosition,
  } as CSSProperties;

  return (
    // A new image element cannot retain the previously decoded light bitmap while
    // its dark source loads. Updating src and data-art-theme on one node could.
    <picture key={`${asset.fallbackSrc}-${theme}`}>
      <source type="image/webp" srcSet={art.srcSet} sizes={HERO_SIZES} />
      <img
        aria-hidden="true"
        className="direction-hero-image"
        data-art-theme={theme}
        src={art.fallbackSrc}
        alt=""
        width={1536}
        height={1024}
        sizes={HERO_SIZES}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        style={style}
      />
    </picture>
  );
}
