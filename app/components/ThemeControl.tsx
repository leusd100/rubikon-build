'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { Monitor, Moon, Sun } from 'lucide-react';
import { readEffectiveTheme, readPreference, setThemePreference, subscribeTheme, type ThemePreference } from '../lib/theme';

// Architectural Copper v0.2 prototype: the theme choice exists on HOME only, the one page with a dark palette.
const PROTOTYPE_PATH = '/';

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Як у системі' },
  { value: 'light', label: 'Світла' },
  { value: 'dark', label: 'Темна' },
];

const LABEL: Record<ThemePreference, string> = { system: 'як у системі', light: 'світла', dark: 'темна' };

// Server render and hydration use 'system'; the real value arrives right after hydration. The visible
// selection never waits for it: CSS reads data-theme-preference on <html>, which the head script set before paint.
function usePreference() {
  return useSyncExternalStore(subscribeTheme, readPreference, () => 'system' as const);
}

function useEffective() {
  return useSyncExternalStore(subscribeTheme, readEffectiveTheme, () => 'light' as const);
}

/** Three labelled radios. Native radios give arrow-key movement and the checked state for free. */
export function ThemeOptions({ variant }: Readonly<{ variant: 'panel' | 'menu' }>) {
  const preference = usePreference();
  const effective = useEffective();
  const name = useId();
  const pathname = usePathname();
  if (pathname !== PROTOTYPE_PATH) return null;

  return (
    <fieldset className={`theme-options theme-options-${variant}`}>
      <legend>Тема оформлення</legend>
      <div className="theme-options-row">
        {OPTIONS.map((option) => (
          <label key={option.value} data-theme-option={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={preference === option.value}
              onChange={() => setThemePreference(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {preference === 'system' && (
        <p className="theme-options-note">Зараз {effective === 'dark' ? 'темна' : 'світла'}, як у налаштуваннях пристрою.</p>
      )}
    </fieldset>
  );
}

/** Desktop header: one quiet 44 px cell beside the contacts, opening the labelled options. */
export function ThemeMenu() {
  const preference = usePreference();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const onHome = usePathname() === PROTOTYPE_PATH;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function onPointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onFocus(event: FocusEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('focusin', onFocus);
    };
  }, [open]);

  if (!onHome) return null;

  return (
    <div className="theme-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="theme-menu-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Тема оформлення: ${LABEL[preference]}`}
        title={`Тема: ${LABEL[preference]}`}
        onClick={() => setOpen((value) => !value)}
      >
        {/* All three drawn; CSS shows the one matching data-theme-preference, so the icon is right from the first frame. */}
        <Monitor aria-hidden="true" className="theme-icon theme-icon-system" />
        <Sun aria-hidden="true" className="theme-icon theme-icon-light" />
        <Moon aria-hidden="true" className="theme-icon theme-icon-dark" />
      </button>
      <div className="theme-menu-panel" id={panelId} hidden={!open}>
        <ThemeOptions variant="panel" />
      </div>
    </div>
  );
}
