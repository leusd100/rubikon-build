'use client';

import { useCallback, useSyncExternalStore, type CSSProperties } from 'react';
import type { DirectionHeroImageAsset } from '../data/directionHeroImageManifest';
import { readEffectiveTheme, subscribeTheme } from '../lib/theme';

// Cover is constrained by height on tall screens. Tall phones need fewer source pixels;
// short phones keep the larger crop so the steel and roof detail stays sharp.
const HERO_SIZES = '(max-width: 760px) and (max-height: 700px) 150svh, (max-width: 760px) 120svh, (min-aspect-ratio: 3/2) 100vw, 150svh';
// A phone gets the art's 784 × 1024 window at native size: up to 440 px wide cover draws the hero by its height and
// never shows more than that window, so every DPR receives the same pixels as from the landscape file, in half the bytes.
const PHONE = '(max-width: 440px)';
const ON_SERVER = typeof window === 'undefined';

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
  // Only the server's markup carries src, so the preload scanner and readers without JS still get the art. React sets a
  // client-made img's attributes (the dark art after hydration, any theme change) before the img is inside the
  // <picture>, and WebKit then downloads that landscape src next to the phone source; with no src at all Firefox fetches
  // both too. So on the client src is given only once the img is in place: one request in every engine (QA 15.10).
  const placeFallbackSrc = useCallback((image: HTMLImageElement | null) => {
    if (image && !image.hasAttribute('src')) image.src = art.fallbackSrc;
  }, [art.fallbackSrc]);

  return (
    // A new image element cannot retain the previously decoded light bitmap while
    // its dark source loads. Updating src and data-art-theme on one node could.
    <picture key={`${asset.fallbackSrc}-${theme}`}>
      <source media={PHONE} type="image/avif" srcSet={art.portrait.avif} />
      <source media={PHONE} type="image/webp" srcSet={art.portrait.webp} />
      <source type="image/webp" srcSet={art.srcSet} sizes={HERO_SIZES} />
      <img
        aria-hidden="true"
        className="direction-hero-image"
        data-art-theme={theme}
        ref={placeFallbackSrc}
        src={ON_SERVER ? art.fallbackSrc : undefined}
        suppressHydrationWarning
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
