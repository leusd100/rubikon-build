'use client';

import { useEffect } from 'react';

/** How long the page has to stand still (no change of its size), once it has loaded, before the landing is done */
const QUIET_MS = 1200;
/** The longest the landing keeps watching: past this, whatever the page does, the visitor's scroll is theirs. Long enough
    for a slow phone's load; the visitor's own move ends it at once anyway */
const LONGEST_MS = 10_000;
/** Off by less than this and the target is where it should be: sub-pixel layout, a 1 px border */
const TOLERANCE = 2;
/** Any of these is the visitor's own move: from then on nothing scrolls for them */
const INPUT_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

/**
 * A visit that arrives with a fragment (`rubikonbuild.com/#inquiry` from a card, a profile or a message) lands on its
 * target and stays there while the page finishes building around it.
 *
 * The browser scrolls to the fragment once, as soon as the target is parsed, and with `scroll-behavior: smooth` the
 * glide aims at where the target stood then. Islands that hydrate above it during the glide change their height —
 * HOME's signature block grew by 665 px at 1440 (10.11) — and the glide still ended at the old place: 781 px above the
 * request form on a desktop, 965 px on a Pixel 7, in 3–5 visits of 5 (production, 10.11). Here the target is put back
 * at its place, at once, whenever the page's size changes, until the page has loaded and stands still, the visitor moves,
 * or 10 s pass. A quiet spell before the page has loaded does not end it: on HOME the growth came with hydration
 * (10.11), but a lazy part (an image, a dynamic island) on a slow connection can still come after one — a precaution,
 * not a case a test has shown.
 *
 * Only a fresh visit by link: a reload or Back/Forward keeps the scroll the browser restores. Links within the page are
 * SmoothScroll's.
 */
export function HashLanding() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navigation && navigation.type !== 'navigate') return;
    const target = document.getElementById(id);
    if (!target) return;

    let quiet = 0;
    const land = () => {
      const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const wanted = Math.min(
        target.getBoundingClientRect().top + window.scrollY - margin,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      if (Math.abs(window.scrollY - wanted) > TOLERANCE) window.scrollTo({ top: wanted, behavior: 'instant' });
      window.clearTimeout(quiet);
      quiet = window.setTimeout(done, QUIET_MS);
    };
    /** Quiet: done if the page has loaded, else wait for it and for another quiet spell after it */
    const done = () => {
      if (document.readyState === 'complete') stop();
      else window.addEventListener('load', land, { once: true });
    };
    const sized = new ResizeObserver(land);
    const longest = window.setTimeout(stop, LONGEST_MS);
    function stop() {
      sized.disconnect();
      window.clearTimeout(quiet);
      window.clearTimeout(longest);
      window.removeEventListener('load', land);
      for (const type of INPUT_EVENTS) window.removeEventListener(type, stop, true);
    }
    for (const type of INPUT_EVENTS) window.addEventListener(type, stop, { capture: true, passive: true });
    // the first call comes at once, as it starts observing: the glide is stopped there, at the target's present place
    sized.observe(document.documentElement);
    return stop;
  }, []);
  return null;
}
