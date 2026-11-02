'use client';

import { useEffect } from 'react';

const GESTURES = [
  ['rule', '.eyebrow > span'],
  ['mask', 'h2'],
  ['rise', '.section-header p:not(.eyebrow), .lead-copy, .conversation-lead'],
] as const;

/**
 * The gestures of Motion v1 (ui-system §6.3) on what every block has: the label's copper rule draws, the heading rises from
 * under its own edge, the lead follows. Once per page view. The markup is final without this: only what lies below the first
 * screen is tagged, and only here, so the first screen never hides, a page without script shows everything, and with reduced
 * motion nothing is armed. A block whose own reveal already moves its heading ([data-motion]) keeps it. Tab into a block
 * before it has shown, or print the page, and it shows at once.
 */
export function SiteReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fold = window.innerHeight * .9;
    const blocks = [...document.querySelectorAll<HTMLElement>('main[data-field] > section')].filter((block) => block.getBoundingClientRect().top > fold);
    const armed = new Map<HTMLElement, HTMLElement[]>();
    for (const block of blocks) {
      const parts = GESTURES.flatMap(([gesture, selector]) => [...block.querySelectorAll<HTMLElement>(selector)]
        .filter((element) => !element.closest('[data-motion]'))
        .map((element) => { element.dataset.reveal = gesture; return element; }));
      if (parts.length) armed.set(block, parts);
    }
    const show = (block: HTMLElement) => { armed.get(block)?.forEach((element) => { element.dataset.revealState = 'on'; }); armed.delete(block); };
    const showAll = () => [...armed.keys()].forEach(show);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -14% 0px' });
    armed.forEach((_, block) => observer.observe(block));
    const focused = (event: FocusEvent) => { const block = [...armed.keys()].find((candidate) => candidate.contains(event.target as Node)); if (block) show(block); };
    document.addEventListener('focusin', focused);
    window.addEventListener('beforeprint', showAll);
    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', focused);
      window.removeEventListener('beforeprint', showAll);
    };
  }, []);

  return null;
}
