'use client';

import { useEffect } from 'react';

// /yak-pratsyuiemo: one choice of format through the page. The scope drawing over «Наш обсяг» (FormatsScope, which
// mirrors the map's radio group by itself) and the map's switcher (resp-format) show the same format, and after a switch
// on the map the works that have just moved into a zone are marked for a moment (data-fresh, delivery.css). The map's
// switcher works without this (CSS :has); this only adds the marks.
const GROUP = 'resp-format';
const FRESH_MS = 2400;

export function FormatSwitchSync() {
  useEffect(() => {
    const figure = document.querySelector<HTMLElement>('.proc-resp-figure');
    let shown = document.querySelector<HTMLInputElement>('input[name="resp-format"]:checked')?.value;
    let timer = 0;
    const clear = () => figure?.querySelectorAll<HTMLElement>('[data-fresh]').forEach((element) => { delete element.dataset.fresh; });

    const mark = (from: string, to: string) => {
      window.clearTimeout(timer);
      clear();
      for (const item of figure?.querySelectorAll<HTMLElement>('li[data-formats]') ?? []) {
        const formats = new Set((item.dataset.formats ?? '').split(' '));
        if (formats.has(to) && !formats.has(from)) item.dataset.fresh = '';
      }
      timer = window.setTimeout(clear, FRESH_MS);
    };

    const onChange = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.name !== GROUP) return;
      if (shown && shown !== input.value) mark(shown, input.value);
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
