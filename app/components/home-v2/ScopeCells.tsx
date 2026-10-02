'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

/** The scope as the building it made (UX pass 2026-10, owner: the block «можна зробити цікавішим, живішим»). Each cell
 *  draws the same hangar in a quiet outline and, in copper, the part its work names — where in the building that work
 *  is, not the order it was done in. Oblique view as on the site's other drawings: depth runs up-left at 45°.
 *  The copper part draws itself, cell by cell, once the cells come into view — armed only after hydration and with
 *  motion allowed, so the server markup is the finished drawing (home-v2.css). */
type ScopePoint = readonly [number, number, number];
const SW = 60;
const SD = 56;
const SE = 26;
const SR = 38;
const sp = ([x, d, z]: ScopePoint) => `${(26 + x - d * 0.4).toFixed(1)},${(66 - z - d * 0.4).toFixed(1)}`;
const sl = (...points: ScopePoint[]) => `M${points.map(sp).join('L')}`;
const gable = (d: number) => sl([0, d, 0], [0, d, SE], [SW / 2, d, SR], [SW, d, SE], [SW, d, 0]);
const SCOPE_OUTLINE = `${gable(0)}${sl([0, 0, 0], [SW, 0, 0])}${sl([0, 0, 0], [0, SD, 0], [0, SD, SE], [SW / 2, SD, SR], [SW, SD, SE], [SW, 0, SE])}`
  + `${sl([0, 0, SE], [0, SD, SE])}${sl([SW / 2, 0, SR], [SW / 2, SD, SR])}`;
const SCOPE_PARTS: Record<string, string> = {
  Каркас: [0, SD / 3, (SD * 2) / 3, SD].map(gable).join('') + sl([0, 0, SE], [0, SD, SE]) + sl([SW, 0, SE], [SW, SD, SE]) + sl([SW / 2, 0, SR], [SW / 2, SD, SR]),
  'Стінові панелі': `${gable(0)}${sl([0, 0, 0], [SW, 0, 0])}${[10, 20, 30, 40, 50].map((x) => sl([x, 0, 0], [x, 0, SE + (SR - SE) * (1 - Math.abs(x - SW / 2) / (SW / 2))])).join('')}`
    + `${sl([0, 0, 0], [0, SD, 0], [0, SD, SE], [0, 0, SE])}${[8, 16, 24, 32, 40, 48].map((d) => sl([0, d, 0], [0, d, SE])).join('')}`,
  Покрівля: `${sl([0, 0, SE], [SW / 2, 0, SR], [SW, 0, SE], [SW, SD, SE], [SW / 2, SD, SR], [0, SD, SE], [0, 0, SE])}${sl([SW / 2, 0, SR], [SW / 2, SD, SR])}`
    + [7, 14, 21, 28, 35, 42, 49].map((d) => `${sl([0, d, SE], [SW / 2, d, SR])}${sl([SW / 2, d, SR], [SW, d, SE])}`).join(''),
};

export function ScopeCells({ items }: Readonly<{ items: readonly string[] }>) {
  const listRef = useRef<HTMLUListElement>(null);
  const drawnParts = items.filter((item) => SCOPE_PARTS[item]).length;

  useEffect(() => {
    const list = listRef.current;
    if (!list || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    list.dataset.draw = 'armed';
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      list.dataset.draw = 'on';
      observer.disconnect();
    }, { threshold: 0.6 });
    observer.observe(list);
    // Once every cell has drawn, the list rests: from then a pointed cell draws its part again (home-v2.css)
    let drawn = 0;
    const settle = (event: AnimationEvent) => {
      if (event.animationName !== 'hv2-scope-draw') return;
      drawn += 1;
      if (drawn === drawnParts) list.dataset.draw = 'done';
    };
    list.addEventListener('animationend', settle);
    return () => { observer.disconnect(); list.removeEventListener('animationend', settle); };
  }, [drawnParts]);

  return (
    <ul className="hv2-scope-chips" aria-label="Роботи на цьому об’єкті" ref={listRef}>
      {items.map((item, index) => (
        <li key={item} style={{ '--i': index } as CSSProperties}>
          {SCOPE_PARTS[item] && (
            <svg className="hv2-scope-glyph" viewBox="0 0 92 72" aria-hidden="true" focusable="false">
              <path className="hv2-scope-outline" d={SCOPE_OUTLINE} />
              <path className="hv2-scope-part" d={SCOPE_PARTS[item]} pathLength={1} />
            </svg>
          )}
          {item}
        </li>
      ))}
    </ul>
  );
}
