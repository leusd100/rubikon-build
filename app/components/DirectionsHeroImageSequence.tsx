'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { directionsHeroSequenceAssets } from '../data/directionsHeroSequenceManifest';
import { directionsSequenceTraces, type SequenceTrace } from '../data/directionHeroTraceManifest';
import { directions } from '../data/directions';
import { readPreference, subscribeTheme } from '../lib/theme';
import { HERO_THEME_SCRIPT, darkMedia } from '../lib/heroThemeSources';
import { useDeferredMedia } from '../hooks/useDeferredMedia';
import { useHeroControlPlacement } from './useHeroControlPlacement';

const CLIP_DURATION_MS = 6000; // UX pass 2026-10: 3 s per slide was too fast to read the indicator and the picture
const FADE_DURATION_MS = 2000;
// Cover scales to the hero's height as well as its width; 100vw alone downloaded a tiny,
// heavily stretched landscape on tall screens. Portrait sources keep a native-height crop.
const LANDSCAPE_SIZES = '(min-aspect-ratio: 23/10) 100vw, 230svh';
const PORTRAIT_SIZES = '100vw';
const PHONE = '(max-width: 760px)';
const PORTRAIT_TABLET = '(min-width: 761px) and (max-width: 1050px) and (orientation: portrait)';
const pad = (value: number) => String(value).padStart(2, '0');

// Each slide draws itself, then its photo is left behind a copper edge (owner, 20.11: «так само застосуємо» — the
// direction heroes' trace, «2 · Скан»; styles: «Hero trace» in globals.css). Once a session, in the sequence's first
// round, with motion allowed. Which drawing a slide gets is read from the file its photo actually shows: the theme
// (daylight or blue hour) and the crop (landscape, a tablet's portrait, the phone's 3 : 2 window).
const TRACE_SESSION_KEY = 'rubikon-hero-trace:directions-sequence';
function cropOf(photoSrc: string): keyof SequenceTrace {
  if (photoSrc.includes('/mobile-directions-')) return 'mobile';
  return photoSrc.includes('-portrait-') ? 'portrait' : 'landscape';
}
const traceOf = (traces: SequenceTrace | undefined, photoSrc: string) => traces?.[cropOf(photoSrc)];
const tracesOf = (id: string, photoSrc: string) => directionsSequenceTraces[`${/-blue-hour-/.test(photoSrc) ? 'dark' : 'daylight'}/${id}`];
// The first slide draws as the hero's first view: the script runs before the first paint, so the paper covers the hero
// while its photo comes in (as DirectionHeroImage's). No photo within 2.5 s, or no drawing within .9 s after it: the
// paper goes and the hero is as before. Its drawings ride on the trace's data-traces, by theme.
const SEQUENCE_TRACE_SCRIPT = `(function(s){var t=s.querySelector('.dhs-trace'),k='${TRACE_SESSION_KEY}',t0=Date.now(),run=0;try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(e){return}if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;s.setAttribute('data-hero-seq','');s.setAttribute('data-hero-play','');var stop=function(){if(!run)s.removeAttribute('data-hero-play')},watch=function(){if(!window.IntersectionObserver)return;var io=new IntersectionObserver(function(e){if(e[0].intersectionRatio>=.5)return;s.removeAttribute('data-hero-run');s.removeAttribute('data-hero-play');s.removeAttribute('data-hero-turn');io.disconnect()},{threshold:.5});io.observe(s);setTimeout(function(){io.disconnect()},3500)};(function wait(){var p=s.querySelector('.directions-hero-sequence-image'),c,m;if(Date.now()-t0>2500)return stop();if(!p||!p.complete||!p.naturalWidth)return setTimeout(wait,50);c=p.currentSrc;m=JSON.parse(t.getAttribute('data-traces'))[/-blue-hour-/.test(c)?'dark':'daylight'];t.onload=function(){if(s.hasAttribute('data-hero-play')){run=1;s.setAttribute('data-hero-run','');watch()}};t.onerror=stop;setTimeout(stop,900);t.src=m[/mobile-directions-/.test(c)?'mobile':/-portrait-/.test(c)?'portrait':'landscape']})()})(document.currentScript.parentNode)`;

/** The slide order follows the five direction records. */
function directionTitle(id: string) {
  return directions.find((direction) => direction.id === id)?.title ?? '';
}

export function DirectionsHeroImageSequence() {
  // on a computer the pause / play stands on the line of the hero's buttons, clear of the cookie strip (08.10)
  const placeControl = useHeroControlPlacement();
  const [activeIndex, setActiveIndex] = useState(0);
  // One index ahead of whatever's on screen, and never decreases — so each slide gets a full
  // CLIP_DURATION_MS head start to load before its turn, instead of every slide after the first
  // downloading at once the moment shouldLoadMedia flips true. Starts at 1 (not 0) so slide 1 is
  // already eligible the instant shouldLoadMedia turns true — still gated by that flag below, so
  // nothing loads early — and monotonic after that: once a slide is unlocked it stays unlocked
  // as activeIndex wraps back around the cycle, so nothing re-toggles its <source> and re-fetches
  // every loop.
  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(1);
  // As in DirectionHeroImage: the server's markup is the System one, its blue-hour sources under the OS dark media
  // query, so a dark visitor no longer fetches the daylight first slide before the dark one (MD-01, 29.10). Only a stored
  // Light or Dark swaps to explicit pictures on the client.
  const preference = useSyncExternalStore(subscribeTheme, readPreference, () => 'system' as const);
  const theme = preference === 'system' ? null : preference;
  const firstImageRef = useRef<HTMLImageElement>(null);
  const { isVisible, shouldLoadMedia } = useDeferredMedia(firstImageRef, {
    // Theme changes replace the image nodes; observe the new first slide.
    observeKey: `directions-static-hero-sequence-${preference}`,
  });
  // The slides change on their own, so they can be paused (the same round control as the hero videos); the active
  // bar restarts with every slide and every resume
  const [paused, setPaused] = useState(false);
  const [resumes, setResumes] = useState(0);
  // The slides' drawings: whether they play in this view, the slides drawn, and each next slide's drawing loaded ahead
  // of its turn (only a drawing already in plays — a turn never waits for one)
  const traceRef = useRef<HTMLImageElement>(null);
  const drawing = useRef({ allowed: false, drawn: new Set<number>([0]), ready: new Map<number, HTMLImageElement>(), shown: 0 });

  useEffect(() => {
    const hero = traceRef.current?.closest<HTMLElement>('.directions-subhero');
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // The first view's script has claimed this session's drawing; without it (a page reached in the app), claim it here
    let allowed = 'heroSeq' in hero.dataset;
    if (!allowed) {
      try {
        allowed = !sessionStorage.getItem(TRACE_SESSION_KEY);
        if (allowed) sessionStorage.setItem(TRACE_SESSION_KEY, '1');
      } catch { /* storage unavailable: no drawing */ }
    }
    drawing.current.allowed = allowed;
  }, []);

  // A theme change replaces the photos: the drawings loaded ahead were for the old ones (before the effect below reads them)
  useEffect(() => {
    drawing.current.ready.clear();
  }, [preference]);

  // The next slide's drawing, once its photo is in (the drawing of the file that photo shows)
  useEffect(() => {
    const state = drawing.current;
    const next = (activeIndex + 1) % directionsHeroSequenceAssets.length;
    const photo = traceRef.current?.closest<HTMLElement>('.directions-subhero')?.querySelectorAll<HTMLImageElement>('.directions-hero-sequence-image')[next];
    if (!state.allowed || !shouldLoadMedia || !photo || state.drawn.has(next) || state.ready.has(next)) return;
    const arm = () => {
      const src = traceOf(tracesOf(directionsHeroSequenceAssets[next].id, photo.currentSrc), photo.currentSrc);
      if (!photo.naturalWidth || !src) return;
      const ahead = new Image();
      ahead.src = src;
      state.ready.set(next, ahead);
    };
    if (photo.complete) {
      arm();
      return;
    }
    photo.addEventListener('load', arm, { once: true });
    return () => photo.removeEventListener('load', arm);
  }, [activeIndex, shouldLoadMedia, maxUnlockedIndex, preference]);

  // Out of sight a drawn turn ends where it is, leaving the slide: nobody watches it, and the page below should have the
  // frames (Nightly 44891291892 on #323; the first slide's script ends its own intro once the hero is less than half on
  // screen)
  useEffect(() => {
    if (isVisible) return;
    const hero = traceRef.current?.closest<HTMLElement>('.directions-subhero');
    if (!hero) return;
    delete hero.dataset.heroRun;
    delete hero.dataset.heroPlay;
    delete hero.dataset.heroTurn;
  }, [isVisible]);

  // A turn: the slide going out ends whatever the last one drew; a slide not drawn yet, with its drawing in, draws. Set
  // before the paint that swaps the slides, so the swap is the drawn turn's quick one under the paper.
  useLayoutEffect(() => {
    const state = drawing.current;
    const hero = traceRef.current?.closest<HTMLElement>('.directions-subhero');
    const trace = traceRef.current;
    // the first slide is the first view's (the script's); a turn is a change of slide
    if (state.shown === activeIndex || !hero || !trace) return;
    state.shown = activeIndex;
    delete hero.dataset.heroRun;
    delete hero.dataset.heroPlay;
    delete hero.dataset.heroTurn;
    const ahead = state.ready.get(activeIndex);
    if (!state.allowed || state.drawn.has(activeIndex) || !ahead?.complete || !ahead.naturalWidth) return;
    state.drawn.add(activeIndex);
    hero.dataset.heroTurn = '';
    // the drawing's animations start over on the next data-hero-run, so this one must first be seen without it
    hero.getBoundingClientRect();
    const drop = window.setTimeout(() => {
      delete hero.dataset.heroTurn;
    }, 900);
    trace.onload = () => {
      window.clearTimeout(drop);
      if (!('heroTurn' in hero.dataset)) return;
      hero.dataset.heroPlay = '';
      hero.dataset.heroRun = '';
    };
    trace.src = ahead.src;
  }, [activeIndex]);

  useEffect(() => {
    // Out of sight the slides wait (07.10): every 6 s the sequence re-rendered, cross-faded two full-screen pictures and
    // decoded the next one while the visitor read the page far below
    if (!shouldLoadMedia || paused || !isVisible) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % directionsHeroSequenceAssets.length;
        setMaxUnlockedIndex((unlocked) => Math.max(unlocked, next + 1));
        return next;
      });
    }, CLIP_DURATION_MS);

    return () => window.clearInterval(timer);
  }, [shouldLoadMedia, paused, isVisible]);

  const visibleIndex = shouldLoadMedia ? activeIndex : 0;
  const count = directionsHeroSequenceAssets.length;

  return (
    <>
      {directionsHeroSequenceAssets.map((asset, index) => {
        const art = theme === 'dark' ? asset.dark : asset.daylight;
        const shouldAttachSource = index === 0 || (shouldLoadMedia && index <= maxUnlockedIndex);
        const system = !theme && shouldAttachSource;
        const style = {
          '--directions-hero-image-position': asset.focalPosition,
          '--directions-hero-image-position-mobile': asset.mobileFocalPosition,
          transitionDuration: `${FADE_DURATION_MS}ms`,
        } as CSSProperties;

        return (
          // Keep decoded pixels scoped to their theme, including during hydration.
          <picture key={`${asset.id}-${preference}`}>
            {system && <source data-dark="" media={darkMedia(PHONE)} suppressHydrationWarning type="image/avif" srcSet={asset.dark.mobile.avif} sizes="100vw" />}
            {system && <source data-dark="" media={darkMedia(PHONE)} suppressHydrationWarning type="image/webp" srcSet={asset.dark.mobile.webp} sizes="100vw" />}
            {shouldAttachSource && <source media={PHONE} type="image/avif" srcSet={art.mobile.avif} sizes="100vw" />}
            {shouldAttachSource && <source media={PHONE} type="image/webp" srcSet={art.mobile.webp} sizes="100vw" />}
            {system && <source data-dark="" media={darkMedia(PORTRAIT_TABLET)} suppressHydrationWarning type="image/webp" srcSet={asset.dark.portraitSrcSet} sizes={PORTRAIT_SIZES} />}
            {shouldAttachSource && <source media={PORTRAIT_TABLET} type="image/webp" srcSet={art.portraitSrcSet} sizes={PORTRAIT_SIZES} />}
            {system && <source data-dark="" media={darkMedia()} suppressHydrationWarning type="image/webp" srcSet={asset.dark.srcSet} sizes={LANDSCAPE_SIZES} />}
            {shouldAttachSource && <source type="image/webp" srcSet={art.srcSet} sizes={LANDSCAPE_SIZES} />}
            {system && <script dangerouslySetInnerHTML={{ __html: HERO_THEME_SCRIPT }} />}
            <img
              ref={(image) => {
                if (index === 0) firstImageRef.current = image;
                // Give client-created images their fallback only after the picture sources are in place.
                // Otherwise WebKit can fetch the landscape fallback as well as the mobile source on a theme change.
                if (image && !shouldAttachSource) image.removeAttribute('src');
                // The System picture has no src: see DirectionHeroImage (the inline script ends the preload scanner's view)
                else if (image && theme && !image.hasAttribute('src')) image.src = art.fallbackSrc;
              }}
              aria-hidden="true"
              className={`directions-hero-sequence-image${index === visibleIndex ? ' is-active' : ''}`}
              data-art-theme={theme ?? 'system'}
              suppressHydrationWarning
              alt=""
              width={art.width}
              height={art.height}
              sizes={LANDSCAPE_SIZES}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
              style={style}
            />
          </picture>
        );
      })}
      {/* The slide's drawing over it, the paper of the hero's colour it draws on, and the copper edge that leaves the
          photo behind (see SEQUENCE_TRACE_SCRIPT); the script and the turns set its source */}
      <span className="dhs-veil" aria-hidden="true" />
      {/* In a span as each slide is in its picture: a direct child of the hero would take .subhero-media > img's
          position and lie off the slide */}
      <span className="dhs-trace-frame">
        {/* eslint-disable-next-line @next/next/no-img-element -- a 10–15 KB SVG drawing set by script, never the LCP */}
        <img
          ref={traceRef}
          className="dhs-trace"
          alt=""
          aria-hidden="true"
          width={directionsHeroSequenceAssets[visibleIndex].daylight.width}
          height={directionsHeroSequenceAssets[visibleIndex].daylight.height}
          data-traces={JSON.stringify({
            daylight: directionsSequenceTraces[`daylight/${directionsHeroSequenceAssets[0].id}`],
            dark: directionsSequenceTraces[`dark/${directionsHeroSequenceAssets[0].id}`],
          })}
          style={{
            '--directions-hero-image-position': directionsHeroSequenceAssets[visibleIndex].focalPosition,
            '--directions-hero-image-position-mobile': directionsHeroSequenceAssets[visibleIndex].mobileFocalPosition,
          } as CSSProperties}
          suppressHydrationWarning
        />
      </span>
      <span className="dhs-scan" aria-hidden="true" />
      <script dangerouslySetInnerHTML={{ __html: SEQUENCE_TRACE_SCRIPT }} />
      {shouldLoadMedia && (
        <>
          {/* Which direction the slide shows — the sequence otherwise cycles without saying what it is */}
          <div className="dhs-indicator" data-paused={paused || undefined} aria-hidden="true">
            <span className="dhs-bars">
              {directionsHeroSequenceAssets.map((asset, index) => (
                <i key={asset.id} className={index < visibleIndex ? 'is-done' : undefined}>
                  {/* restarts with the slide, a resume and a return into view — so it fills with the slide's own time */}
                  {index === visibleIndex && <b key={`${visibleIndex}-${resumes}-${isVisible}`} />}
                </i>
              ))}
            </span>
            <span className="dhs-caption">
              <b>{pad(visibleIndex + 1)}</b> / {pad(count)} · {directionTitle(directionsHeroSequenceAssets[visibleIndex].id)}
            </span>
          </div>
          <button
            ref={placeControl}
            type="button"
            className="hero-video-control"
            data-paused={paused || undefined}
            onClick={() => {
              setPaused((value) => !value);
              setResumes((value) => value + 1);
            }}
          >
            <span className="hero-video-control-label">{paused ? 'Відтворити' : 'Пауза'}<span className="sr-only">{paused ? ' показ напрямів' : ' показу напрямів'}</span></span>
            <span className="hero-video-control-icon" aria-hidden="true" />
          </button>
        </>
      )}
    </>
  );
}
