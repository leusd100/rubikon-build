'use client';

import { useEffect } from 'react';

/** The two Hero pages share a translucent top and a denser header after scrolling. */
export function HeroHeaderState() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const state = window.scrollY > 32 ? 'scrolled' : 'top';
      if (root.dataset.heroHeader !== state) root.dataset.heroHeader = state;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      delete root.dataset.heroHeader;
    };
  }, []);

  return null;
}
