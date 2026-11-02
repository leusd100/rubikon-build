'use client';

import { useEffect } from 'react';

const WIDTH = 760;
const HEIGHT = 430;
const DESKTOP = '(min-width: 1181px)';
/** After a long frame the particles carry on instead of jumping */
const LONGEST_STEP = 1 / 20;
const WARM_UP_STEPS = 240;

/**
 * Wakes the still scene of a paper block (page-materials.css) once the block comes up: liveScenes.ts is fetched only on a page
 * with a scene, a desktop width and motion allowed, and the loop runs only while the block is on the screen. The SVG stays
 * underneath as the page without script and with reduced motion sees it, and a scene that redraws all of it takes its place.
 */
export function LiveScene() {
  useEffect(() => {
    if (!window.matchMedia(DESKTOP).matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let stop = () => {};
    let cancelled = false;
    void import('./liveScenes').then(({ SCENES }) => {
      if (cancelled) return;
      const found = Object.entries(SCENES).find(([selector]) => document.querySelector(selector));
      if (!found) return;
      const [selector, { make, replaces }] = found;
      const block = document.querySelector<HTMLElement>(selector)!;
      const scene = make();
      const canvas = document.createElement('canvas');
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.className = 'live-scene';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.width = WIDTH * ratio;
      canvas.height = HEIGHT * ratio;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.scale(ratio, ratio);
      context.lineCap = 'round';
      block.appendChild(canvas);
      const inks = () => {
        const [r, g, b] = getComputedStyle(block).backgroundColor.match(/\d+/g)!.map(Number);
        const dark = r + g + b < 380;
        return dark ? { ink: '#F5F2EB', copper: '#C98A5E', dark } : { ink: '#25282A', copper: '#A0522A', dark };
      };
      let frame = 0, last = 0, count = 0, time = 0, colours = inks();
      // it comes up already running, not from an empty sky
      for (let i = 0; i < WARM_UP_STEPS; i++) scene.step(context, 1 / 30, time += 1 / 30, colours);
      const tick = (now: number) => {
        const dt = Math.min(LONGEST_STEP, (now - last) / 1000 || 0);
        last = now;
        time += dt;
        if (++count % 30 === 0) colours = inks();
        context.clearRect(0, 0, WIDTH, HEIGHT);
        scene.step(context, dt, time, colours);
        frame = requestAnimationFrame(tick);
      };
      const observer = new IntersectionObserver(([entry]) => {
        cancelAnimationFrame(frame);
        frame = 0;
        if (!entry.isIntersecting) return;
        if (replaces) block.style.setProperty(replaces, 'none');
        if (scene.still) block.style.setProperty('--scene', `var(${scene.still})`);
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }, { rootMargin: '0px' });
      observer.observe(canvas);
      stop = () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        canvas.remove();
        block.style.removeProperty('--scene');
        block.style.removeProperty('--material');
      };
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return null;
}
