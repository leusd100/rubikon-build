import { afterEach, describe, expect, it, vi } from 'vitest';
import { revealAttachedBrief } from '../../../app/components/inquiry/revealAttachedBrief';

// After «Обговорити цю конфігурацію» / «До заявки» the visitor lands on the brief they attached: on a phone or tablet the
// link's own jump is taken over (the URL still says #inquiry), the brief is scrolled into view; everywhere it takes focus
// and its status line says it is attached — once, on this explicit action.

type FakeElement = { scrollIntoView: ReturnType<typeof vi.fn>; focus: ReturnType<typeof vi.fn>; querySelector: () => { textContent: string } | null; textContent: string };

function fakeElement(headline = ''): FakeElement {
  return { scrollIntoView: vi.fn(), focus: vi.fn(), querySelector: () => (headline ? { textContent: headline } : null), textContent: '' };
}

function stubPage({ narrow, reduced = false, brief = true }: { narrow: boolean; reduced?: boolean; brief?: boolean }) {
  const elements: Record<string, FakeElement> = {
    inquiry: fakeElement(),
    'inquiry-brief-status': fakeElement(),
    ...(brief ? { 'inquiry-brief': fakeElement('24 × 60 × 8 м · Холодний') } : {}),
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

function clickEvent() {
  return { preventDefault: vi.fn() } as unknown as Parameters<typeof revealAttachedBrief>[0] & { preventDefault: ReturnType<typeof vi.fn> };
}

afterEach(() => vi.unstubAllGlobals());

describe('revealAttachedBrief', () => {
  it('on a phone or tablet takes the jump over: the brief scrolls into view, keeps #inquiry, takes focus, says it once', () => {
    const { elements, replaceState } = stubPage({ narrow: true });
    const event = clickEvent();
    revealAttachedBrief(event);
    expect(event!.preventDefault).toHaveBeenCalledOnce();
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
    expect(replaceState).not.toHaveBeenCalled();
    expect(elements['inquiry-brief'].scrollIntoView).not.toHaveBeenCalled();
    expect(elements['inquiry-brief'].focus).toHaveBeenCalledWith({ preventScroll: true });
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
