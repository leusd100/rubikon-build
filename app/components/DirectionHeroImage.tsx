'use client';

import { useCallback, useSyncExternalStore, type CSSProperties } from 'react';
import type { DirectionHeroImageAsset } from '../data/directionHeroImageManifest';
import { readPreference, subscribeTheme } from '../lib/theme';
import { HERO_THEME_SCRIPT, darkMedia } from '../lib/heroThemeSources';

// Cover is constrained by height on tall screens. Tall phones need fewer source pixels;
// short phones keep the larger crop so the steel and roof detail stays sharp.
const HERO_SIZES = '(max-width: 760px) and (max-height: 700px) 150svh, (max-width: 760px) 120svh, (min-aspect-ratio: 3/2) 100vw, 150svh';
// A phone gets the art's 784 × 1024 window at native size: up to 440 px wide cover draws the hero by its height and
// never shows more than that window, so every DPR receives the same pixels as from the landscape file, in half the bytes.
const PHONE = '(max-width: 440px)';

type DirectionHeroImageProps = {
  asset: DirectionHeroImageAsset;
};

/**
 * Static, high-priority hero artwork for the five service detail pages.
 * It deliberately does not share DirectionHeroVideo so this path cannot attach
 * hidden video sources or change deferred-media behaviour elsewhere.
 */
export function DirectionHeroImage({ asset }: DirectionHeroImageProps) {
  // The server cannot know the theme, so its markup is the System one: the dark sources carry the OS dark media query
  // and the browser picks one art on the first parse. Rendering the daylight art there made every dark visitor fetch the
  // daylight hero (high priority) and then the dark one after hydration (MD-01, 29.10: +50…230 KB at 390, +242…446 KB at
  // 1440). Only a stored Light or Dark swaps to an explicit picture on the client.
  const preference = useSyncExternalStore(subscribeTheme, readPreference, () => 'system' as const);
  const theme = preference === 'system' ? null : preference;
  const art = theme === 'dark' ? asset.dark : asset;
  const phoneArt = asset.phoneCrop?.[theme ?? 'light'] ?? art.portrait;
  const phoneDarkArt = asset.phoneCrop?.dark ?? asset.dark.portrait;
  const style = {
    '--direction-hero-image-position': asset.focalPosition,
    '--direction-hero-image-position-mobile': asset.mobileFocalPosition,
    '--direction-hero-image-top': asset.artTop,
    '--direction-phone-image-position': asset.phoneCrop?.position,
  } as CSSProperties;
  // Only the server's markup carries src, so the preload scanner and readers without JS still get the art. React sets a
  // client-made img's attributes (the dark art after hydration, any theme change) before the img is inside the
  // <picture>, and WebKit then downloads that landscape src next to the phone source; with no src at all Firefox fetches
  // both too. So on the client src is given only once the img is in place: one request in every engine (QA 15.10).
  // The System picture has no src at all: HERO_THEME_SCRIPT inside it ends the preload scanner's view of the <picture>,
  // and Chromium then preloaded that bare landscape src next to the phone source (29.10: +386 KB at 390). Its sources
  // carry every width, so no engine that supports <picture> needs it.
  const placeFallbackSrc = useCallback((image: HTMLImageElement | null) => {
    if (image && theme && !image.hasAttribute('src')) image.src = art.fallbackSrc;
  }, [art.fallbackSrc, theme]);

  return (
    // A new image element cannot retain the previously decoded light bitmap while
    // its dark source loads. Updating src and data-art-theme on one node could.
    // With System the browser itself re-selects when the OS theme changes.
    <picture key={`${asset.fallbackSrc}-${preference}`}>
      {!theme && <source data-dark="" media={darkMedia(PHONE)} type="image/avif" srcSet={phoneDarkArt.avif} suppressHydrationWarning />}
      {!theme && <source data-dark="" media={darkMedia(PHONE)} type="image/webp" srcSet={phoneDarkArt.webp} suppressHydrationWarning />}
      <source media={PHONE} type="image/avif" srcSet={phoneArt.avif} />
      <source media={PHONE} type="image/webp" srcSet={phoneArt.webp} />
      {!theme && <source data-dark="" media={darkMedia()} type="image/webp" srcSet={asset.dark.srcSet} sizes={HERO_SIZES} suppressHydrationWarning />}
      <source type="image/webp" srcSet={art.srcSet} sizes={HERO_SIZES} />
      {!theme && <script dangerouslySetInnerHTML={{ __html: HERO_THEME_SCRIPT }} />}
      <img
        aria-hidden="true"
        className="direction-hero-image"
        data-art-theme={theme ?? 'system'}
        ref={placeFallbackSrc}
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
