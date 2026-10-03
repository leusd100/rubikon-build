'use client';

import type { MouseEvent } from 'react';

// After an explicit «take this to the form» action (the configurator's «Обговорити цю конфігурацію», the sticky
// «До заявки»), the visitor lands on the brief they have just attached, not only on the top of #inquiry. On a phone
// or tablet the form is one column and the brief sat 1.4 screens below where the anchor landed (UX review 2026-10).
// The brief takes focus and its status line says it is attached — once, on this action only: business edits attach
// on their own and must not announce on every slider move. Without JavaScript the link's href="#inquiry" still works.

const NARROW = '(max-width: 1180px)';

export function revealAttachedBrief(event?: MouseEvent<HTMLAnchorElement>) {
  const narrow = window.matchMedia(NARROW).matches;
  if (narrow && event) {
    event.preventDefault();
    window.history.replaceState(null, '', '#inquiry');
  }
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Two frames: the attachment renders, then the folded form opens for it (ConversationFormToggle)
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    const brief = document.getElementById('inquiry-brief');
    if (!brief) {
      if (narrow) document.getElementById('inquiry')?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
      return;
    }
    if (narrow) brief.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
    brief.focus({ preventScroll: true });
    const status = document.getElementById('inquiry-brief-status');
    const headline = brief.querySelector('strong')?.textContent ?? '';
    if (status) status.textContent = `Додано до заявки: ${headline}`;
  }));
}
