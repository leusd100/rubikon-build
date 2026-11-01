'use client';

import { useEffect } from 'react';

/**
 * The shade over a sheet going down under the next one (app/motion.css). Decoration, in its own element because a block's
 * ::before and ::after already draw the field's marks (sheet-field.css). It goes only into the blocks that actually hold, so
 * motion.css stays the one list of them: with reduced motion, in an old browser and without script there is simply none.
 */
export function StackShade() {
  useEffect(() => {
    const shades = [...document.querySelectorAll<HTMLElement>('main[data-field] > section')]
      .filter((block) => getComputedStyle(block).animationName === 'stack-hold')
      .map((block) => {
        const shade = document.createElement('span');
        shade.className = 'stack-shade';
        shade.setAttribute('aria-hidden', 'true');
        return block.appendChild(shade);
      });
    return () => shades.forEach((shade) => shade.remove());
  }, []);

  return null;
}
