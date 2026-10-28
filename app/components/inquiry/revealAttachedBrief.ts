'use client';

// After an explicit «take this to the form» action (the configurator's «Обговорити цю конфігурацію», the sticky
// «До заявки»), the visitor lands on the brief they have just attached, not only on the top of #inquiry. On a phone
// or tablet the form is one column and the brief sat 1.4 screens below where the anchor landed (UX review 2026-10).
// The brief takes focus and its status line says it is attached — once, on this action only: business edits attach
// on their own and must not announce on every slider move. Without JavaScript the link's href="#inquiry" still works.
// Every link to the form takes this way while a brief is attached (ConversationFormToggle, sweep 03.10): the cost and
// title-block CTAs and the FAQ link used to leave a phone at the form's heading, the brief below and focus on the page.
// A brief that already went out with a saved lead says so instead (04.10).
// `takeOver` (Phase 4): the form stands under /angary's configurator stamp (InquiryFormHost), not in #inquiry — the jump
// is taken over on every width, or a desktop's anchor jump would carry the visitor to the end of the page and leave the
// focus on a brief far above it.

const NARROW = '(max-width: 1180px)';
/** `Event.CAPTURING_PHASE` */
const CAPTURING_PHASE = 1;

type LinkClick = Pick<Event, 'preventDefault' | 'stopPropagation' | 'eventPhase'>;

/**
 * A jump taken over is not made again from the window. From 1181 px the desktop scrolls through Lenis (SmoothScroll.tsx),
 * whose click listener on the window took every anchor of the page, prevented or not, until MO-02: it carried the
 * visitor to #inquiry at the end of the page after the form had opened under the stamp, the brief focused 4 800 px above
 * the window (review 18.10, PDO-02). The click stops at the document — where React and the page's own listeners have
 * it — as HangarConfigurator's #configurator links do. A capture listener (ConversationFormToggle) sees the click before
 * the link does, and stopping it there would stop the link's own handlers too (PrefillInquiryLink's text): from there it
 * is stopped on its way back up instead, by a listener on the document that takes only this click and goes after one.
 */
function keepFromWindow(event: LinkClick) {
  if (event.eventPhase !== CAPTURING_PHASE) {
    event.stopPropagation();
    return;
  }
  const stopOnWayUp = (click: Event) => {
    document.removeEventListener('click', stopOnWayUp);
    if (click === event) click.stopPropagation();
  };
  document.addEventListener('click', stopOnWayUp);
}

/** `event`: the link's click, a React or a DOM one — only its default (the anchor jump) is taken over. */
export function revealAttachedBrief(event?: LinkClick, { takeOver = false }: { takeOver?: boolean } = {}) {
  const own = takeOver || window.matchMedia(NARROW).matches;
  if (own && event) {
    event.preventDefault();
    keepFromWindow(event);
    window.history.replaceState(null, '', '#inquiry');
  }
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Two frames: the attachment renders, then the folded form opens for it (ConversationFormToggle) or the form opens under
  // the stamp (InquiryFormHost)
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    const brief = document.getElementById('inquiry-brief');
    if (!brief) {
      // no brief (detached): the form itself — under the stamp, if it stands there
      const form = document.getElementById('hc-inquiry') ?? document.getElementById('inquiry');
      if (own) form?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
      if (takeOver && form?.hasAttribute('tabindex')) form.focus({ preventScroll: true });
      return;
    }
    if (own) brief.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
    brief.focus({ preventScroll: true });
    const status = document.getElementById('inquiry-brief-status');
    const headline = brief.querySelector('strong')?.textContent ?? '';
    if (status) status.textContent = `${brief.dataset.sent === undefined ? 'Додано до заявки' : 'Надіслано з вашим запитом'}: ${headline}`;
  }));
}
