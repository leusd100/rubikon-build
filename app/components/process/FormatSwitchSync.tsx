'use client';

import { useEffect } from 'react';

// /yak-pratsyuiemo: one choice of format through the page. The scope drawing over «Наш обсяг» (FormatsScope, which
// mirrors the table's radio group by itself) and the responsibility table's switcher (resp-format) show the same format,
// and after a switch the table's rows whose parties changed are lit for a moment (data-fresh, resp-matrix.css). The
// switcher works without this (CSS :has); this only adds the light.
const GROUP = 'resp-format';
const FRESH_MS = 2400;

export function FormatSwitchSync() {
  useEffect(() => {
    const figure = document.querySelector<HTMLElement>('.resp-matrix');
    let shown = document.querySelector<HTMLInputElement>('input[name="resp-format"]:checked')?.value;
    let timer = 0;
    const clear = () => figure?.querySelectorAll<HTMLElement>('[data-fresh]').forEach((element) => { delete element.dataset.fresh; });

    const mark = (from: string, to: string) => {
      window.clearTimeout(timer);
      clear();
      // Each row says where it stands per format (data-<format>): light it where that changes
      for (const row of figure?.querySelectorAll<HTMLElement>('.rm-row') ?? []) {
        if (row.getAttribute(`data-${from}`) !== row.getAttribute(`data-${to}`)) row.dataset.fresh = '';
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
