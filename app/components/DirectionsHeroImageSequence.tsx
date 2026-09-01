'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { directionsHeroSequenceAssets } from '../data/directionsHeroSequenceManifest';
import { useDeferredMedia } from '../hooks/useDeferredMedia';

const CLIP_DURATION_MS = 3000;
const FADE_DURATION_MS = 2000;

export function DirectionsHeroImageSequence() {
  const [activeIndex, setActiveIndex] = useState(0);
  // One index ahead of whatever's on screen, and never decreases — so each slide gets a full
  // CLIP_DURATION_MS head start to load before its turn, instead of every slide after the first
  // downloading at once the moment shouldLoadMedia flips true. Starts at 1 (not 0) so slide 1 is
  // already eligible the instant shouldLoadMedia turns true — still gated by that flag below, so
  // nothing loads early — and monotonic after that: once a slide is unlocked it stays unlocked
  // as activeIndex wraps back around the cycle, so nothing re-toggles its <source> and re-fetches
  // every loop.
  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(1);
  const firstImageRef = useRef<HTMLImageElement>(null);
  const { shouldLoadMedia } = useDeferredMedia(firstImageRef, {
    observeKey: 'directions-static-hero-sequence',
  });

  useEffect(() => {
    if (!shouldLoadMedia) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % directionsHeroSequenceAssets.length;
        setMaxUnlockedIndex((unlocked) => Math.max(unlocked, next + 1));
        return next;
      });
    }, CLIP_DURATION_MS);

    return () => window.clearInterval(timer);
  }, [shouldLoadMedia]);

  const visibleIndex = shouldLoadMedia ? activeIndex : 0;

  return (
    <>
      {directionsHeroSequenceAssets.map((asset, index) => {
        const shouldAttachSource = index === 0 || (shouldLoadMedia && index <= maxUnlockedIndex);
        const style = {
          '--directions-hero-image-position': asset.focalPosition,
          '--directions-hero-image-position-mobile': asset.mobileFocalPosition,
          transitionDuration: `${FADE_DURATION_MS}ms`,
        } as CSSProperties;

        return (
          <picture key={asset.fallbackSrc}>
            {shouldAttachSource && <source type="image/webp" srcSet={asset.srcSet} sizes="100vw" />}
            <img
              ref={index === 0 ? firstImageRef : undefined}
              aria-hidden="true"
              className={`directions-hero-sequence-image${index === visibleIndex ? ' is-active' : ''}`}
              src={shouldAttachSource ? asset.fallbackSrc : undefined}
              alt=""
              width={1672}
              height={941}
              sizes="100vw"
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
              style={style}
            />
          </picture>
        );
      })}
    </>
  );
}
