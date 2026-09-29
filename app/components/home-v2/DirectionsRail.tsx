'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// HOME v2 prototype. On a phone the five direction cards are a swipe row; this adds a visible position — «02 / 05» and
// five dots that also jump to a card — so nobody takes the first card for the whole list. From 761 px the cards are
// the usual mosaic and the indicator is hidden by CSS.
export function DirectionsRail({ children, count }: Readonly<{ children: ReactNode; count: number }>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const grid = rootRef.current?.querySelector<HTMLElement>('.direction-grid');
    if (!grid) return;
    const update = () => {
      const start = grid.getBoundingClientRect().left + parseFloat(getComputedStyle(grid).paddingLeft || '0');
      let best = 0;
      let bestDistance = Infinity;
      Array.from(grid.children).forEach((card, index) => {
        const distance = Math.abs(card.getBoundingClientRect().left - start);
        if (distance < bestDistance) { bestDistance = distance; best = index; }
      });
      setActive(best);
    };
    update();
    grid.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      grid.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const goTo = (index: number) => {
    const grid = rootRef.current?.querySelector<HTMLElement>('.direction-grid');
    const card = grid?.children[index] as HTMLElement | undefined;
    if (!grid || !card) return;
    const start = grid.getBoundingClientRect().left + parseFloat(getComputedStyle(grid).paddingLeft || '0');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    grid.scrollTo({ left: grid.scrollLeft + card.getBoundingClientRect().left - start, behavior: reduce ? 'auto' : 'smooth' });
  };

  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    <div className="hv2-rail" ref={rootRef}>
      {children}
      <div className="hv2-rail-nav">
        <p className="hv2-rail-count" aria-live="polite"><b>{pad(active + 1)}</b> / {pad(count)}</p>
        <div className="hv2-rail-dots">
          {Array.from({ length: count }, (_, index) => (
            <button
              type="button"
              key={index}
              aria-label={`Напрям ${index + 1} з ${count}`}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => goTo(index)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="hv2-rail-hint" aria-hidden="true">Гортайте →</p>
      </div>
    </div>
  );
}
