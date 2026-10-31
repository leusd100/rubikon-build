// When the inquiry form starts Turnstile. Measured on production 30.10: in Safari 27.2 the Turnstile iframe stalls one frame
// for 120–150 ms once per page view (a frame over 100 ms in 8 of 8 control runs, 1 of 9 with Turnstile blocked). Started
// 600 px ahead of the form, that stall hit every visitor who only scrolled past it, and Lenis then caught up in a single
// 127–215 px step. Started by the first real interaction, it falls to someone who has come to write.
//
// This only decides when the widget gets ready. It is not what guards a lead: useTurnstile's getToken() prepares the widget
// itself on every submit, so a submit nothing here saw (a form restored or autofilled, then sent) still waits for a token.

const FORM_INTERACTIONS = ['focusin', 'pointerdown', 'touchstart'] as const;
const OPEN_FORM_LINK = '[data-open-inquiry]';
// Capture: a control inside the form may stop the event. Passive: a touch that starts on the form must not hold up scrolling.
const LISTEN = { capture: true, passive: true } as const;

type GateForm = Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & Pick<Node, 'contains'>;
type GateView = {
  document: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & Pick<Document, 'activeElement'>;
  requestAnimationFrame: (callback: () => void) => unknown;
};

/** Calls `start` once, on the visitor's first interaction with `form`; returns the cleanup. */
export function onFirstFormInteraction(form: GateForm, view: GateView, start: () => void): () => void {
  let finished = false;

  const fire = () => {
    if (finished) return;
    stop();
    start();
  };
  const fireOnOpenLink = (event: Event) => {
    const target = event.target as Partial<Element> | null;
    if (!target?.closest?.(OPEN_FORM_LINK)) return;
    // Next frame: this listener runs before ConversationFormToggle's, and on a phone the form is still display:none. With
    // api.js already on the page (a client navigation) the widget would otherwise render into the hidden container.
    view.requestAnimationFrame(fire);
  };
  function stop() {
    finished = true;
    for (const type of FORM_INTERACTIONS) form.removeEventListener(type, fire, LISTEN);
    view.document.removeEventListener('click', fireOnOpenLink, LISTEN);
  }

  for (const type of FORM_INTERACTIONS) form.addEventListener(type, fire, LISTEN);
  view.document.addEventListener('click', fireOnOpenLink, LISTEN);
  // A field focused before hydration sent its focusin to nobody.
  if (form.contains(view.document.activeElement)) fire();
  return stop;
}
