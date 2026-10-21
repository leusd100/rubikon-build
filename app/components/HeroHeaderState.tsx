'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * One header model on every page and at every width (PDO-18; «Збалансована», owner 21.10): over the first screen the
 * header lies on the picture (`top`, 92 % graphite), and after 32 px of scroll it turns solid (`scrolled`). The grain hero
 * (main.grain-page — /zernoskhovyshcha and /planner-preview) has the same two states; only its picture is framed under the
 * header on wide screens, in CSS (globals.css, «One header model»). Until 21.10 /zernoskhovyshcha alone kept a 90 % band
 * with blur on scroll as well, by its path, while /planner-preview — the same page — turned solid.
 */
export function HeroHeaderState() {
  const pathname = usePathname();

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
  }, [pathname]);

  return null;
}
