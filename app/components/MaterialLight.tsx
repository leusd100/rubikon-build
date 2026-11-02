'use client';

import { useEffect } from 'react';

const SMOOTHING = .14;

/**
 * The material answers the hand (owner 01.11): a soft light follows the pointer across a block's surface, a little behind
 * it, the way a lamp moves over steel. Only with a mouse or a trackpad, only on the dark blocks that carry a material (on
 * paper it does nothing you can see: ≤10/255, review 01.11), and one transform a frame while the pointer is there: the loop stops as soon as the light has arrived. It lies under the block's
 * text, and nothing depends on it.
 */
export function MaterialLight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const blocks = [...document.querySelectorAll<HTMLElement>('main[data-field] > section:not(.conversation, .cost-section, .direction-entry, .proc-terms, .team-about, .angary-cost)')]
      .filter((block) => getComputedStyle(block).backgroundImage.includes('/media/materials/'));
    const cleanups = blocks.map((block) => {
      const light = document.createElement('span');
      light.className = 'material-light';
      light.setAttribute('aria-hidden', 'true');
      block.insertBefore(light, block.firstChild);
      let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, inside = false;
      const place = () => { light.style.transform = `translate3d(${x}px, ${y}px, 0)`; };
      const step = () => {
        x += (targetX - x) * SMOOTHING;
        y += (targetY - y) * SMOOTHING;
        place();
        frame = Math.abs(targetX - x) + Math.abs(targetY - y) > .5 ? requestAnimationFrame(step) : 0;
      };
      const move = (event: PointerEvent) => {
        const box = block.getBoundingClientRect();
        // A held block is scaled, and the light lives in its unscaled box
        const scale = block.offsetWidth / box.width;
        targetX = (event.clientX - box.left) * scale;
        targetY = (event.clientY - box.top) * scale;
        if (!inside) { inside = true; x = targetX; y = targetY; place(); light.dataset.on = ''; }
        if (!frame) frame = requestAnimationFrame(step);
      };
      const leave = () => { inside = false; delete light.dataset.on; };
      block.addEventListener('pointermove', move, { passive: true });
      block.addEventListener('pointerleave', leave);
      return () => {
        cancelAnimationFrame(frame);
        block.removeEventListener('pointermove', move);
        block.removeEventListener('pointerleave', leave);
        light.remove();
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return null;
}
