'use client';

import type { ReactNode } from 'react';

// A link to the closing form that also starts the visitor's message: it opens the folded form (data-open-inquiry,
// ConversationFormToggle) and writes the situation into «Коротко про завдання» — if the field is empty, or still holds
// only the line such a link wrote before (a second choice replaces the first). The visitor's own words are never touched.
// Without JavaScript it is a plain #inquiry link.
export function PrefillInquiryLink({ text, className, children }: Readonly<{ text: string; className?: string; children: ReactNode }>) {
  const prefill = () => {
    const field = document.getElementById('inquiry-comment');
    if (!(field instanceof HTMLTextAreaElement) || !text) return;
    const current = field.value.trim();
    if (current && current !== field.dataset.prefilled?.trim()) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, text);
    field.dataset.prefilled = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return (
    <a className={className} href="#inquiry" onClick={prefill} data-open-inquiry="">
      {children}
    </a>
  );
}
