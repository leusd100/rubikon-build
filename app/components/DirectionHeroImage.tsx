import type { CSSProperties } from 'react';
import type { DirectionHeroImageAsset } from '../data/directionHeroImageManifest';

type DirectionHeroImageProps = {
  asset: DirectionHeroImageAsset;
};

/**
 * Static, high-priority hero artwork for the five service detail pages.
 * It deliberately does not share DirectionHeroVideo so this path cannot attach
 * hidden video sources or change deferred-media behaviour elsewhere.
 */
export function DirectionHeroImage({ asset }: DirectionHeroImageProps) {
  const style = {
    '--direction-hero-image-position': asset.focalPosition,
    '--direction-hero-image-position-mobile': asset.mobileFocalPosition,
  } as CSSProperties;

  return (
    <picture>
      <source type="image/webp" srcSet={asset.srcSet} sizes="100vw" />
      <img
        aria-hidden="true"
        className="direction-hero-image"
        src={asset.fallbackSrc}
        alt=""
        width={1536}
        height={1024}
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        style={style}
      />
    </picture>
  );
}
