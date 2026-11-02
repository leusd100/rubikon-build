'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { type MobileHeroArtwork, mobileArtworkSrcSet } from '../data/mobileHeroArtwork';
import { readPreference, subscribeTheme } from '../lib/theme';
import { HERO_THEME_SCRIPT, darkMedia } from '../lib/heroThemeSources';

/** Match the existing service heroes' first-parse theme selection, including a saved override of the OS theme. */
export function ThemedHeroPoster({ artwork, className, media, fallback }: Readonly<{
  artwork: MobileHeroArtwork;
  className: string;
  media?: string;
  fallback?: string;
}>) {
  const preference = useSyncExternalStore(subscribeTheme, readPreference, () => 'system' as const);
  const theme = preference === 'system' ? null : preference;
  const art = theme === 'dark' ? artwork.dark : artwork.light;
  const placeFallbackSrc = useCallback((image: HTMLImageElement | null) => {
    if (image && theme && !image.hasAttribute('src')) {
      image.src = fallback && media && !window.matchMedia(media).matches ? fallback : `${art}-1024w.webp`;
    }
  }, [art, fallback, media, theme]);

  return (
    <picture key={theme ?? 'system'}>
      {!theme && <source data-dark="" media={darkMedia(media)} srcSet={mobileArtworkSrcSet(artwork.dark)} sizes="100vw" suppressHydrationWarning />}
      <source media={media} srcSet={mobileArtworkSrcSet(art)} sizes="100vw" />
      {fallback && <source srcSet={fallback} />}
      {!theme && <script dangerouslySetInnerHTML={{ __html: HERO_THEME_SCRIPT }} />}
      {/* Same source ordering and delayed fallback as DirectionHeroImage prevents duplicate WebKit requests. */}
      <img
        ref={placeFallbackSrc}
        suppressHydrationWarning
        className={className}
        data-art-theme={theme ?? 'system'}
        width={1024}
        height={1536}
        alt=""
        aria-hidden="true"
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </picture>
  );
}
