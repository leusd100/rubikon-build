'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export default function MobileMenu({ children }: { children: ReactNode }) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !menuRef.current?.open) return;
      menuRef.current.open = false;
      menuRef.current.querySelector<HTMLElement>('summary')?.focus();
    }

    function closeOutside(event: PointerEvent) {
      const menu = menuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, []);

  return (
    <details
      className="mobile-menu"
      ref={menuRef}
      onClickCapture={(event) => {
        if (event.target instanceof Element && event.target.closest('a, button')) {
          window.setTimeout(() => {
            if (menuRef.current) menuRef.current.open = false;
          }, 0);
        }
      }}
      // Tab past the menu's last item (or Shift+Tab back past its button) closes it, so the focus never lands on the page
      // under a still-open panel — the panel covered the hero's call it went to (review 11.10, sweep 2.4). Only a focus
      // that goes somewhere: a window losing focus (relatedTarget null) leaves the menu as it was
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && menuRef.current?.open && !menuRef.current.contains(next)) menuRef.current.open = false;
      }}
    >
      {children}
    </details>
  );
}
