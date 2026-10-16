'use client';

import { useEffect } from 'react';

/** Owns only the phone Hero's header state; the existing header/menu keep their behavior. */
export function HeroHeaderState({ mediaQuery }: Readonly<{ mediaQuery: string }>) {
  useEffect(() => {
    const query = window.matchMedia(mediaQuery);
    const root = document.documentElement;
    const update = () => {
      if (!query.matches) {
        delete root.dataset.heroHeader;
        return;
      }
      const state = window.scrollY > 32 ? 'scrolled' : 'top';
      if (root.dataset.heroHeader !== state) root.dataset.heroHeader = state;
    };
    update();
    query.addEventListener('change', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('scroll', update);
      delete root.dataset.heroHeader;
    };
  }, [mediaQuery]);

  return null;
}
