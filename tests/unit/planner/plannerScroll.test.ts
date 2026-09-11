import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, scrollAfterRender, scrollToPlannerTarget } from '../../../app/components/planner/plannerScroll';

// The unit suite runs in plain node: stand in for the few DOM pieces the helper touches.
class FakeElement {
  scrollIntoView = vi.fn();
  focus = vi.fn();
  constructor(private readonly focusable: boolean, private readonly child: FakeElement | null = null) {}
  matches(selector: string) {
    return selector === '[data-planner-focus]' && this.focusable;
  }
  querySelector(selector: string) {
    return selector === '[data-planner-focus]' ? this.child : null;
  }
}

function stubWindow(reduce: boolean) {
  vi.stubGlobal('HTMLElement', FakeElement);
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' }),
    setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
  });
}

const asElement = (element: FakeElement) => element as unknown as Element;

describe('plannerScroll', () => {
  beforeEach(() => stubWindow(false));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reads the reduced-motion preference, and treats a server render as motion allowed', () => {
    expect(prefersReducedMotion()).toBe(false);
    stubWindow(true);
    expect(prefersReducedMotion()).toBe(true);
    vi.unstubAllGlobals();
    expect(prefersReducedMotion()).toBe(false);
  });

  it('scrolls smoothly and moves focus to the step heading inside the target', () => {
    const heading = new FakeElement(true);
    const step = new FakeElement(false, heading);
    scrollToPlannerTarget(asElement(step), 'center');
    expect(step.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('jumps instead of animating under reduced motion, and focuses a target that is itself the heading', () => {
    stubWindow(true);
    const heading = new FakeElement(true);
    scrollToPlannerTarget(asElement(heading));
    expect(heading.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    expect(heading.focus).toHaveBeenCalledOnce();
  });

  it('does nothing without a target and leaves focus alone when the target has no heading', () => {
    expect(() => scrollToPlannerTarget(null)).not.toThrow();
    const plain = new FakeElement(false);
    scrollToPlannerTarget(asElement(plain));
    expect(plain.scrollIntoView).toHaveBeenCalledOnce();
    expect(plain.focus).not.toHaveBeenCalled();
  });

  it('looks the target up only after the next render', () => {
    vi.useFakeTimers();
    const heading = new FakeElement(true);
    const find = vi.fn(() => asElement(heading));
    scrollAfterRender(find);
    expect(find).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60);
    expect(find).toHaveBeenCalledOnce();
    expect(heading.scrollIntoView).toHaveBeenCalledOnce();
  });

  it('waits for a target that is still loading, then scrolls to it', () => {
    vi.useFakeTimers();
    const heading = new FakeElement(true);
    let rendered = false;
    const find = vi.fn(() => (rendered ? asElement(heading) : null));
    const fallback = new FakeElement(false);
    scrollAfterRender(find, 'start', () => asElement(fallback));
    vi.advanceTimersByTime(60 * 4);
    expect(heading.scrollIntoView).not.toHaveBeenCalled();
    rendered = true;
    vi.advanceTimersByTime(60);
    expect(heading.scrollIntoView).toHaveBeenCalledOnce();
    expect(heading.focus).toHaveBeenCalledOnce();
    expect(fallback.scrollIntoView).not.toHaveBeenCalled();
  });

  it('gives up after about a second and scrolls to the fallback instead', () => {
    vi.useFakeTimers();
    const fallback = new FakeElement(false);
    const find = vi.fn(() => null);
    scrollAfterRender(find, 'start', () => asElement(fallback));
    vi.advanceTimersByTime(60 * 25);
    expect(find).toHaveBeenCalledTimes(21);
    expect(fallback.scrollIntoView).toHaveBeenCalledOnce();
    expect(() => scrollAfterRender(() => null)).not.toThrow();
    vi.advanceTimersByTime(60 * 25);
  });
});
