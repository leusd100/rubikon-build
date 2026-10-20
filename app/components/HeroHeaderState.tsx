'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** /zernoskhovyshcha keeps its wide-screen header band until its hero is reframed (W2-12, PDO-48). */
const BAND_PATH = '/zernoskhovyshcha';

/**
 * One header model on every page and at every width (PDO-18): over the first screen the header lies on the picture
 * (`top`), and after 32 px of scroll it turns solid (`scrolled`). Until PDO-18 only phones, tablets, HOME and /pro-nas
 * had these states; the inner pages' wide screens kept a band of their own.
 */
export function HeroHeaderState() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const wide = window.matchMedia('(min-width: 1100px)');
    const update = () => {
      if (pathname === BAND_PATH && wide.matches) {
        delete root.dataset.heroHeader;
        return;
      }
      const state = window.scrollY > 32 ? 'scrolled' : 'top';
      if (root.dataset.heroHeader !== state) root.dataset.heroHeader = state;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    wide.addEventListener('change', update);
    return () => {
      window.removeEventListener('scroll', update);
      wide.removeEventListener('change', update);
      delete root.dataset.heroHeader;
    };
  }, [pathname]);

  return null;
}
