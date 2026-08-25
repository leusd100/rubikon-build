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
    >
      {children}
    </details>
  );
}
