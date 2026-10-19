import { afterEach, describe, expect, it, vi } from 'vitest';
import { revealAttachedBrief } from '../../../app/components/inquiry/revealAttachedBrief';

// After «Обговорити цю конфігурацію» / «До заявки» the visitor lands on the brief they attached: on a phone or tablet the
// link's own jump is taken over (the URL still says #inquiry), the brief is scrolled into view; everywhere it takes focus
// and its status line says it is attached — once, on this explicit action. A brief already sent says that instead.

type FakeElement = {
  scrollIntoView: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  querySelector: () => { textContent: string } | null;
  dataset: Record<string, string>;
  textContent: string;
};

function fakeElement(headline = '', attributes: string[] = []): FakeElement {
  return {
    scrollIntoView: vi.fn(),
    focus: vi.fn(),
    querySelector: () => (headline ? { textContent: headline } : null),
    // data-* attributes as the DOM exposes them: data-sent → dataset.sent
    dataset: Object.fromEntries(attributes.filter((name) => name.startsWith('data-')).map((name) => [name.slice(5), ''])),
    textContent: '',
  };
}

function stubPage({ narrow, reduced = false, brief = true, sent = false }: { narrow: boolean; reduced?: boolean; brief?: boolean; sent?: boolean }) {
  const elements: Record<string, FakeElement> = {
    inquiry: fakeElement(),
    'inquiry-brief-status': fakeElement(),
    ...(brief ? { 'inquiry-brief': fakeElement('24 × 60 × 8 м · Холодний', sent ? ['data-sent'] : []) } : {}),
  };
  const replaceState = vi.fn();
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({ matches: query.includes('reduce') ? reduced : narrow }),
    requestAnimationFrame: (callback: () => void) => { callback(); return 0; },
    history: { replaceState },
  });
  vi.stubGlobal('document', { getElementById: (id: string) => elements[id] ?? null });
  return { elements, replaceState };
}

type FakeClick = NonNullable<Parameters<typeof revealAttachedBrief>[0]> & {
  preventDefault: ReturnType<typeof vi.fn>;
  stopPropagation: ReturnType<typeof vi.fn>;
};

/** A link's click as a React handler gets it: on its way up (Event.BUBBLING_PHASE) */
function clickEvent(eventPhase = 3) {
  return { preventDefault: vi.fn(), stopPropagation: vi.fn(), eventPhase } as unknown as FakeClick;
}

afterEach(() => vi.unstubAllGlobals());

describe('revealAttachedBrief', () => {
  it('on a phone or tablet takes the jump over: the brief scrolls into view, keeps #inquiry, takes focus, says it once', () => {
    const { elements, replaceState } = stubPage({ narrow: true });
    const event = clickEvent();
    revealAttachedBrief(event);
    expect(event!.preventDefault).toHaveBeenCalledOnce();
    // the window's smooth scrolling (Lenis) must not make the jump again (PDO-02)
    expect(event!.stopPropagation).toHaveBeenCalledOnce();
    expect(replaceState).toHaveBeenCalledWith(null, '', '#inquiry');
    expect(elements['inquiry-brief'].scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    expect(elements['inquiry-brief'].focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(elements['inquiry-brief-status'].textContent).toBe('Додано до заявки: 24 × 60 × 8 м · Холодний');
  });

  it('on a desktop leaves the anchor jump alone and only moves focus to the brief', () => {
    const { elements, replaceState } = stubPage({ narrow: false });
    const event = clickEvent();
    revealAttachedBrief(event);
    expect(event!.preventDefault).not.toHaveBeenCalled();
    // the anchor jump is the window's own (Lenis smooths it): the click goes on up
    expect(event!.stopPropagation).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(elements['inquiry-brief'].scrollIntoView).not.toHaveBeenCalled();
    expect(elements['inquiry-brief'].focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('says a brief already sent with a saved lead was sent, not added (04.10)', () => {
    const { elements } = stubPage({ narrow: true, sent: true });
    revealAttachedBrief(clickEvent());
    expect(elements['inquiry-brief'].focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(elements['inquiry-brief-status'].textContent).toBe('Надіслано з вашим запитом: 24 × 60 × 8 м · Холодний');
  });

  it('takes a DOM click as well as a React one (the form toggle\'s document listener)', () => {
    const { elements, replaceState } = stubPage({ narrow: true });
    const event = new Event('click', { cancelable: true });
    revealAttachedBrief(event);
    expect(event.defaultPrevented).toBe(true);
    expect(replaceState).toHaveBeenCalledWith(null, '', '#inquiry');
    expect(elements['inquiry-brief-status'].textContent).toBe('Додано до заявки: 24 × 60 × 8 м · Холодний');
  });

  it('a desktop jump taken over (the form under the stamp) is not made again from the window: the click stops at the document', () => {
    const { elements, replaceState } = stubPage({ narrow: false });
    const event = clickEvent();
    revealAttachedBrief(event, { takeOver: true });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(replaceState).toHaveBeenCalledWith(null, '', '#inquiry');
    expect(elements['inquiry-brief'].scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
  });

  it('from a capture listener stops the click only on its way back up, so the link\'s own handlers still run', () => {
    stubPage({ narrow: false });
    const listeners: Array<(event: Event) => void> = [];
    const page = globalThis.document as unknown as Record<string, unknown>;
    page.addEventListener = vi.fn((type: string, listener: (event: Event) => void) => { if (type === 'click') listeners.push(listener); });
    page.removeEventListener = vi.fn((type: string, listener: (event: Event) => void) => {
      if (type === 'click') listeners.splice(listeners.indexOf(listener), 1);
    });
    // the form toggle's listener: on the document, in the capture phase (Event.CAPTURING_PHASE)
    const event = clickEvent(1);
    revealAttachedBrief(event as unknown as Event & FakeClick, { takeOver: true });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(page.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(page.addEventListener).toHaveBeenCalledTimes(1);

    // back up at the document, after the link's handlers: stopped there, before the window
    listeners[0](event as unknown as Event);
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(listeners).toHaveLength(0);
  });

  it('a stop left waiting (the click never came back up) lets the next click by', () => {
    stubPage({ narrow: true });
    const listeners: Array<(event: Event) => void> = [];
    const page = globalThis.document as unknown as Record<string, unknown>;
    page.addEventListener = vi.fn((_: string, listener: (event: Event) => void) => listeners.push(listener));
    page.removeEventListener = vi.fn((_: string, listener: (event: Event) => void) => listeners.splice(listeners.indexOf(listener), 1));
    revealAttachedBrief(clickEvent(1));
    const next = clickEvent();
    listeners[0](next as unknown as Event);
    expect(next.stopPropagation).not.toHaveBeenCalled();
    expect(listeners).toHaveLength(0);
  });

  it('jumps without smooth scrolling under reduced motion', () => {
    const { elements } = stubPage({ narrow: true, reduced: true });
    revealAttachedBrief(clickEvent());
    expect(elements['inquiry-brief'].scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
  });

  it('falls back to the form when no brief has rendered (narrow), and does nothing else', () => {
    const { elements } = stubPage({ narrow: true, brief: false });
    revealAttachedBrief(clickEvent());
    expect(elements.inquiry.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    expect(elements['inquiry-brief-status'].textContent).toBe('');
  });

  it('on a desktop without a brief changes nothing', () => {
    const { elements } = stubPage({ narrow: false, brief: false });
    revealAttachedBrief();
    expect(elements.inquiry.scrollIntoView).not.toHaveBeenCalled();
  });
});
