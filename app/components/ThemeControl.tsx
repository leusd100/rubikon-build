'use client';

import { useId, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { readEffectiveTheme, readPreference, setThemePreference, subscribeTheme, type ThemePreference } from '../lib/theme';

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Як у системі' },
  { value: 'light', label: 'Світла' },
  { value: 'dark', label: 'Темна' },
];

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

/**
 * Desktop header: a light/dark switch of its own, set apart from the contacts so it never reads as one more contact.
 * One click flips the shown theme and stores it; until the first click the theme follows the system (the phone menu
 * keeps all three options). The knob's side follows data-theme on <html>, which the head script sets before paint, so
 * the first frame is right; aria-checked catches up right after hydration.
 */
export function ThemeSwitch() {
  const dark = useEffective() === 'dark';
  return (
    <button
      type="button"
      role="switch"
      className="theme-switch"
      aria-checked={dark}
      aria-label="Темна тема"
      title={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      onClick={() => setThemePreference(dark ? 'light' : 'dark')}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-switch-knob" />
        <Sun className="theme-switch-sun" />
        <Moon className="theme-switch-moon" />
      </span>
    </button>
  );
}
