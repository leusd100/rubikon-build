'use client';

import { useEffect } from 'react';

// The page's one motion controller (/yak-pratsyuiemo, /pro-nas; `root` names the page element). The markup is
// complete and final without it: this only adds `data-motion-ready` to the page (which lets the page's CSS hold
// [data-motion] blocks in their "before" state) and flips each block to `data-motion-state="on"` once, when it
// meaningfully enters the viewport. Nothing replays; every observer disconnects when its work is done. With
// prefers-reduced-motion nothing is armed, so the final state shows at once.
// Also drives the parallax layers ([data-parallax]) while — and only while — they are on screen.

export function ProcessMotion({ root = '.process-page' }: Readonly<{ root?: string }>) {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(root);
    if (!page || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Two phases: "before" states without transitions, then transitions on (see delivery.css).
    page.dataset.motionReady = 'arming';
    let arm = requestAnimationFrame(() => { arm = requestAnimationFrame(() => { page.dataset.motionReady = 'on'; }); });
    const blocks = [...page.querySelectorAll<HTMLElement>('[data-motion]')];
    // "Meaningfully in view": 30 % of the block, or — for a block taller than about three screens, which can never show
    // 30 % at once (the stacked responsibility map on a phone) — a third of the viewport's height.
    const reveal = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const inView = entry.intersectionRatio >= 0.3 || entry.intersectionRect.height >= window.innerHeight / 3;
        if (!entry.isIntersecting || !inView) continue;
        (entry.target as HTMLElement).dataset.motionState = 'on';
        reveal.unobserve(entry.target);
        if (blocks.every((block) => block.dataset.motionState === 'on')) reveal.disconnect();
      }
    }, { threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3], rootMargin: '0px 0px -8% 0px' });
    blocks.forEach((block) => reveal.observe(block));

    // Parallax: a slow, small drift of the background layer; the foreground never moves.
    const layers = [...page.querySelectorAll<HTMLElement>('[data-parallax]')];
    const visible = new Set<HTMLElement>();
    let frame = 0;
    const paint = () => {
      frame = 0;
      for (const layer of visible) {
        const box = layer.parentElement!.getBoundingClientRect();
        const progress = (box.top + box.height / 2 - window.innerHeight / 2) / window.innerHeight; // about −1…1
        layer.style.transform = `translate3d(0, ${(progress * -Number(layer.dataset.parallax)).toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const watch = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
        else visible.delete(entry.target as HTMLElement);
      }
      if (visible.size) { window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); }
      else window.removeEventListener('scroll', onScroll);
    });
    layers.forEach((layer) => watch.observe(layer));

    return () => {
      reveal.disconnect();
      watch.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
      cancelAnimationFrame(arm);
      delete page.dataset.motionReady;
    };
  }, [root]);

  return null;
}
