import { useCallback, useRef } from 'react';

// The hero's pause / play (owner, 08.10): on a computer it stands on the line of the hero's own buttons, its centre on
// theirs, not in the bottom corner — the cookie strip along the bottom of the screen covered it there, on HOME, /pro-nas
// and /napryamky alike. The control is placed by the media layer it belongs to and the buttons live in the text layer,
// so CSS has no common box to align them by (anchor positioning needs the anchor inside the control's containing
// block): the row is measured instead, and again whenever either box changes size. Where a button reaches under it
// (768–1024 px, the buttons grow wide) it keeps only its circle, the word for screen readers; where even the circle
// meets a button it stands just above the row. A phone keeps the corner: there the buttons fill the width.

const DESKTOP = '(min-width: 761px)';
/** The least room kept between the control and a button */
const GAP = 12;

/** A ref for the hero's `.hero-video-control`; the hero's buttons are marked `data-hero-actions` */
export function useHeroControlPlacement() {
  const cleanup = useRef<(() => void) | null>(null);
  return useCallback((control: HTMLElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!control) return;
    const frame = control.offsetParent;
    const actions = control.closest('section')?.querySelector<HTMLElement>('[data-hero-actions]');
    if (!(frame instanceof HTMLElement) || !actions) return;
    const desktop = window.matchMedia(DESKTOP);
    const place = () => {
      control.removeAttribute('data-compact');
      if (!desktop.matches) {
        control.style.removeProperty('bottom');
        return;
      }
      const box = frame.getBoundingClientRect();
      const row = actions.getBoundingClientRect();
      const buttons = [...actions.children].map((child) => child.getBoundingClientRect()).filter((rect) => rect.width > 0);
      // `right` is the control's CSS anchor, so its right edge does not move with `bottom`; the circle is its height
      const { left, right } = control.getBoundingClientRect();
      const size = control.offsetHeight;
      const clear = (from: number, top: number) => buttons.every((rect) => rect.right + GAP <= from || rect.left >= right
        || rect.bottom + GAP <= top || rect.top >= top + size + GAP);
      let top = (row.top + row.bottom) / 2 - size / 2;
      if (!clear(left, top)) {
        control.setAttribute('data-compact', '');
        if (!clear(right - size, top)) top = row.top - GAP - size;
      }
      control.style.bottom = `${Math.max(0, Math.round(box.bottom - top - size))}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(frame);
    observer.observe(actions);
    desktop.addEventListener('change', place);
    cleanup.current = () => {
      observer.disconnect();
      desktop.removeEventListener('change', place);
      control.style.removeProperty('bottom');
      control.removeAttribute('data-compact');
    };
  }, []);
}
