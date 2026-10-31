import { describe, expect, it, vi } from 'vitest';
import { onFirstFormInteraction } from '../../../app/lib/inquiry/turnstileGate';

function setup({ focusedInside = false } = {}) {
  const active = { inside: focusedInside };
  const form = Object.assign(new EventTarget(), { contains: vi.fn(() => active.inside) });
  const document = Object.assign(new EventTarget(), { activeElement: null });
  const frames: Array<() => void> = [];
  const view = { document, requestAnimationFrame: (callback: () => void) => frames.push(callback) };
  const start = vi.fn();
  const stop = onFirstFormInteraction(form, view, start);
  const clickOn = (target: unknown) => {
    const event = new Event('click');
    Object.defineProperty(event, 'target', { value: target });
    document.dispatchEvent(event);
  };
  const runFrames = () => frames.splice(0).forEach((frame) => frame());
  return { form, document, frames, start, stop, clickOn, runFrames };
}

const openLink = { closest: (selector: string) => (selector === '[data-open-inquiry]' ? {} : null) };

describe('onFirstFormInteraction', () => {
  it('starts nothing on its own, whatever the page does around the form', () => {
    const { document, start, frames, clickOn } = setup();
    for (const type of ['scroll', 'wheel', 'pointermove', 'touchmove']) document.dispatchEvent(new Event(type));
    clickOn({ closest: () => null });
    expect(start).not.toHaveBeenCalled();
    expect(frames).toEqual([]);
  });

  it.each(['focusin', 'pointerdown', 'touchstart'])('starts on %s inside the form', (type) => {
    const { form, start } = setup();
    form.dispatchEvent(new Event(type));
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts once, however many interactions follow', () => {
    const { form, start, clickOn, runFrames } = setup();
    form.dispatchEvent(new Event('pointerdown'));
    form.dispatchEvent(new Event('focusin'));
    form.dispatchEvent(new Event('touchstart'));
    clickOn(openLink);
    runFrames();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('starts a frame after a click on a link that opens the form, when the folded form has opened', () => {
    const { start, clickOn, runFrames } = setup();
    clickOn(openLink);
    expect(start).not.toHaveBeenCalled();
    runFrames();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('takes a click inside a marked link for the link, and a target without closest() for nothing', () => {
    const { start, clickOn, runFrames } = setup();
    clickOn(null);
    clickOn({});
    runFrames();
    expect(start).not.toHaveBeenCalled();
  });

  it('starts at once when a field took the focus before the listeners were there', () => {
    expect(setup({ focusedInside: true }).start).toHaveBeenCalledTimes(1);
  });

  it('never starts after the cleanup: the form moved under the stamp in that frame', () => {
    const { form, start, stop, clickOn, runFrames } = setup();
    clickOn(openLink);
    stop();
    runFrames();
    form.dispatchEvent(new Event('focusin'));
    clickOn(openLink);
    runFrames();
    expect(start).not.toHaveBeenCalled();
  });

  it('listens passively: a touch that starts on the form must not hold up scrolling', () => {
    const form = Object.assign(new EventTarget(), { contains: () => false });
    const add = vi.spyOn(form, 'addEventListener');
    onFirstFormInteraction(form, { document: Object.assign(new EventTarget(), { activeElement: null }), requestAnimationFrame: () => 0 }, () => undefined);
    expect(add).toHaveBeenCalledWith('touchstart', expect.any(Function), { capture: true, passive: true });
  });
});
