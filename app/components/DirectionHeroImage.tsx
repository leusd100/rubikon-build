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

// The first view of a direction hero draws its photo in lines, then the photo develops (owner, 20.11: prototype B). The
// script runs while the hero is parsed, before its first paint, and decides whether the intro plays at all:
//  - once a session per hero: keyed by the drawing, not the address (two pages share one hero; grain-page.spec keeps
//    storage free of planner words); storage refused (a private window) plays it, as on a first visit;
//  - never with reduced motion, nor without JS: the intro is opt-in (data-hero-play), the photo is the default;
//  - in step: the veil covers the hero at once, the drawing is fetched only when the photo is in, and the veil's own
//    clock starts with the drawing's (data-hero-run on the drawing's load) — the SVG's animation starts when it loads,
//    so they cannot part (review of #323: on a slow link the lines drew late over blank paper);
//  - not on a slow link: no photo within 2.5 s and the intro is dropped, the hero as before it.
// The photo is looked up on every check: a stored theme swaps its <picture> after hydration. A constant string that
// reads its drawing from the img's data (CodeQL, #323).
const HERO_TRACE_SCRIPT = "(function(m){var t=m.querySelector('.direction-hero-trace'),k='rubikon-hero-trace:'+t.getAttribute('data-landscape').split('/').pop(),t0=Date.now(),run=0;try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(e){}if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;m.setAttribute('data-hero-play','');var stop=function(){if(!run)m.removeAttribute('data-hero-play')};(function wait(){var p=m.querySelector('.direction-hero-image');if(Date.now()-t0>2500)return stop();if(!p||!p.complete||!p.naturalWidth)return setTimeout(wait,50);t.onload=function(){if(m.hasAttribute('data-hero-play')){run=1;m.setAttribute('data-hero-run','')}};t.onerror=stop;setTimeout(stop,900);t.src=t.getAttribute(matchMedia('(max-width: 440px)').matches?'data-phone':'data-landscape')})()})(document.currentScript.parentNode)";

type DirectionHeroImageProps = {
  asset: DirectionHeroImageAsset;
};

/**
 * Static, high-priority hero artwork for the five service detail pages.
 * It deliberately does not share DirectionHeroVideo so this path cannot attach
 * hidden video sources or change deferred-media behaviour elsewhere.
 */
export function DirectionHeroImage({ asset }: Readonly<DirectionHeroImageProps>) {
  // The server cannot know the theme, so its markup is the System one: the dark sources carry the OS dark media query
  // and the browser picks one art on the first parse. Rendering the daylight art there made every dark visitor fetch the
  // daylight hero (high priority) and then the dark one after hydration (MD-01, 29.10: +52…230 KB at 390, +162…446 KB at
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
    <>
    {/* A new image element cannot retain the previously decoded light bitmap while
        its dark source loads. Updating src and data-art-theme on one node could.
        With System the browser itself re-selects when the OS theme changes. */}
    <picture key={`${asset.fallbackSrc}-${preference}`}>
      {!theme && <source data-dark="" media={darkMedia(PHONE)} type="image/avif" srcSet={phoneDarkArt.avif} suppressHydrationWarning />}
      {!theme && <source data-dark="" media={darkMedia(PHONE)} type="image/webp" srcSet={phoneDarkArt.webp} suppressHydrationWarning />}
      <source media={PHONE} type="image/avif" srcSet={phoneArt.avif} />
      <source media={PHONE} type="image/webp" srcSet={phoneArt.webp} />
      {/* From 441 px the landscape art, AVIF first as on a phone (20.11: 15–16 % smaller at no lower SSIM) */}
      {!theme && <source data-dark="" media={darkMedia()} type="image/avif" srcSet={asset.dark.avifSrcSet} sizes={HERO_SIZES} suppressHydrationWarning />}
      {!theme && <source data-dark="" media={darkMedia()} type="image/webp" srcSet={asset.dark.srcSet} sizes={HERO_SIZES} suppressHydrationWarning />}
      <source type="image/avif" srcSet={art.avifSrcSet} sizes={HERO_SIZES} />
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
    {asset.trace && (
      <>
        {/* The veil is the hero's own colour over the photo; the drawing lies on it in an <img> of the photo's size, fit
            and position, so the browser lays it on the photo as it lays the photo, at every width. Both are hidden until
            the script below opts the hero into its intro, and neither is keyed by theme: a stored theme's picture swap
            after hydration does not replay them. The drawing has no src until the photo is in (the script picks the
            crop by the phone query the photo's <picture> uses). CSS: globals.css «Hero trace». */}
        <span className="direction-hero-veil" aria-hidden="true" />
        <span className="direction-hero-scan" aria-hidden="true" />
        <img
          className="direction-hero-trace"
          data-landscape={asset.trace.landscape}
          data-phone={asset.trace.phoneCrop ?? asset.trace.portrait}
          alt=""
          aria-hidden="true"
          width={1536}
          height={1024}
          decoding="async"
          style={style}
          suppressHydrationWarning
        />
        <script dangerouslySetInnerHTML={{ __html: HERO_TRACE_SCRIPT }} />
      </>
    )}
    </>
  );
}
