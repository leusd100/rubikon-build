'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Compact headers share the Hero treatment; wide HOME/About retain their existing treatment. */
export function HeroHeaderState() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const compact = window.matchMedia('(max-width: 1099px)');
    const wideHero = pathname === '/' || pathname === '/pro-nas';
    const update = () => {
      if (!compact.matches && !wideHero) {
        delete root.dataset.heroHeader;
        return;
      }
      const state = window.scrollY > 32 ? 'scrolled' : 'top';
      if (root.dataset.heroHeader !== state) root.dataset.heroHeader = state;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    compact.addEventListener('change', update);
    return () => {
      window.removeEventListener('scroll', update);
      compact.removeEventListener('change', update);
      delete root.dataset.heroHeader;
    };
  }, [pathname]);

  return null;
}
