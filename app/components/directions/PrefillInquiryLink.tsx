'use client';

import type { ReactNode } from 'react';

// A link to the closing form that also starts the visitor's message: it opens the folded form (data-open-inquiry,
// ConversationFormToggle) and, if «Коротко про завдання» is still empty, writes the situation into it. Without
// JavaScript it is a plain #inquiry link.
export function PrefillInquiryLink({ text, className, children }: Readonly<{ text: string; className?: string; children: ReactNode }>) {
  const prefill = () => {
    const field = document.getElementById('inquiry-comment');
    if (!(field instanceof HTMLTextAreaElement) || field.value.trim()) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return (
    <a className={className} href="#inquiry" onClick={prefill} data-open-inquiry="">
      {children}
    </a>
  );
}
