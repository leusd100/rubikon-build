'use client';

import { useEffect } from 'react';

// The page's one motion controller (/yak-pratsyuiemo, /pro-nas; `root` names the page element). The markup is
// complete and final without it: this only adds `data-motion-ready` to the page (which lets the page's CSS hold
// [data-motion] blocks in their "before" state) and flips each block to `data-motion-state="on"` once, when it
// meaningfully enters the viewport. Nothing replays; the reveal observer lets go of a block once it has shown. A block that
// keeps moving after its reveal (HOME's node sheet: the load) carries [data-motion-live] and is "on" only while it is
// on screen. With prefers-reduced-motion nothing is armed, so the final state shows at once and nothing moves. (The background parallax was removed in
// the 2026-10 UX pass: a drifting backdrop explained nothing.)

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

    // Live blocks: "on" while any of the block is on screen, "off" otherwise — nothing animates out of sight
    const live = [...page.querySelectorAll<HTMLElement>('[data-motion-live]')];
    const watch = new IntersectionObserver((entries) => {
      for (const entry of entries) (entry.target as HTMLElement).dataset.motionLive = entry.isIntersecting ? 'on' : 'off';
    });
    live.forEach((block) => watch.observe(block));

    return () => {
      reveal.disconnect();
      watch.disconnect();
      live.forEach((block) => { block.dataset.motionLive = ''; });
      cancelAnimationFrame(arm);
      delete page.dataset.motionReady;
    };
  }, [root]);

  return null;
}
