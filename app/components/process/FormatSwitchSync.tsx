'use client';

import { useEffect } from 'react';

// /yak-pratsyuiemo: one choice of format through the page. The phone's switcher over «Наш обсяг» (scope-format) and the
// map's (resp-format) mirror each other, and after a switch on the map the works that have just moved into a zone are
// marked for a moment (data-fresh, delivery.css). Both switchers work without this (CSS :has); it only joins them.
const GROUPS = ['scope-format', 'resp-format'];
const FRESH_MS = 2400;

export function FormatSwitchSync() {
  useEffect(() => {
    const figure = document.querySelector<HTMLElement>('.proc-resp-figure');
    let shown = document.querySelector<HTMLInputElement>('input[name="resp-format"]:checked')?.value;
    let timer = 0;
    const clear = () => figure?.querySelectorAll('[data-fresh]').forEach((element) => element.removeAttribute('data-fresh'));

    const mark = (from: string, to: string) => {
      window.clearTimeout(timer);
      clear();
      for (const item of figure?.querySelectorAll<HTMLElement>('li[data-formats]') ?? []) {
        const formats = (item.dataset.formats ?? '').split(' ');
        if (formats.includes(to) && !formats.includes(from)) item.dataset.fresh = '';
      }
      timer = window.setTimeout(clear, FRESH_MS);
    };

    const onChange = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !GROUPS.includes(input.name)) return;
      for (const group of GROUPS.filter((name) => name !== input.name)) {
        const twin = document.querySelector<HTMLInputElement>(`input[name="${group}"][value="${input.value}"]`);
        if (twin) twin.checked = true;
      }
      if (input.name === 'resp-format' && shown && shown !== input.value) mark(shown, input.value);
      shown = input.value;
    };

    document.addEventListener('change', onChange);
    return () => {
      document.removeEventListener('change', onChange);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
