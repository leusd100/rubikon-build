'use client';

import { Arrow } from '../Arrow';

// /yak-pratsyuiemo scope block (under each format's column in FormatsScope) — «Обговорити цей формат»: goes to the form (a plain #inquiry link without JavaScript)
// and picks this format in «Який обсяг робіт вас цікавить?», opening «Додати параметри об’єкта» so the choice is seen.
// Focus stays with the visitor; a polite live region says what was selected.
export function FormatPrefillLink({ label }: Readonly<{ label: string }>) {
  const prefill = () => {
    const select = document.querySelector('#inquiry select[name="cooperation"]');
    if (!(select instanceof HTMLSelectElement) || ![...select.options].some((option) => option.value === label)) return;
    select.value = label;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const details = select.closest('details');
    if (details) details.open = true;
    select.classList.add('is-prefilled');
    window.setTimeout(() => select.classList.remove('is-prefilled'), 2400);
    const status = document.getElementById('format-prefill-status');
    if (status) status.textContent = `У формі вибрано обсяг робіт: ${label}.`;
  };

  return (
    // Three such links stand side by side: the name says which format (and keeps the visible words first, WCAG 2.5.3)
    <a className="link-arrow proc-scope-cta" href="#inquiry" onClick={prefill} data-open-inquiry="" aria-label={`Обговорити цей формат: ${label}`}>
      Обговорити цей формат <Arrow to="up-right" />
    </a>
  );
}
