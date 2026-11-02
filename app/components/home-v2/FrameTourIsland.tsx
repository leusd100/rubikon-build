'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';

const HomeFrameTour = lazy(() => import('./HomeFrameTour').then(({ HomeFrameTour: Tour }) => ({ default: Tour })));

/** One screen ahead: the drawing is there before the block is, while a visitor on the first screen never asks for it
 *  (at 1800 px the first screen already reached it, and the page's first load paid for the tour) */
const AHEAD = '100% 0px';

/** HOME's frame tour is the page's enhancement, so its code comes only as the visitor nears it: it brings /angary's whole
 *  drawing, which the first screen must not wait for. The slot keeps its room from hydration on (home-v2.css), so a page
 *  without script has no empty block. */
export function FrameTourIsland() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    slot.dataset.armed = '';
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setNear(true);
      observer.disconnect();
    }, { rootMargin: AHEAD });
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="hv2-frame-slot" ref={slotRef}>
      {near && <Suspense fallback={null}><HomeFrameTour /></Suspense>}
    </div>
  );
}
