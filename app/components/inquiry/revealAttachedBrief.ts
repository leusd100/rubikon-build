'use client';

// After an explicit «take this to the form» action (the configurator's «Обговорити цю конфігурацію», the sticky
// «До заявки»), the visitor lands on the brief they have just attached, not only on the top of #inquiry. On a phone
// or tablet the form is one column and the brief sat 1.4 screens below where the anchor landed (UX review 2026-10).
// The brief takes focus and its status line says it is attached — once, on this action only: business edits attach
// on their own and must not announce on every slider move. Without JavaScript the link's href="#inquiry" still works.
// Every link to the form takes this way while a brief is attached (ConversationFormToggle, sweep 03.10): the cost and
// title-block CTAs and the FAQ link used to leave a phone at the form's heading, the brief below and focus on the page.
// A brief that already went out with a saved lead says so instead (04.10).

const NARROW = '(max-width: 1180px)';

/** `event`: the link's click, a React or a DOM one — only its default (the anchor jump) is taken over. */
export function revealAttachedBrief(event?: Pick<Event, 'preventDefault'>) {
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
    if (status) status.textContent = `${brief.dataset.sent === undefined ? 'Додано до заявки' : 'Надіслано з вашим запитом'}: ${headline}`;
  }));
}
