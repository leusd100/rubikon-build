// RUBIKON colour system v1 — theme preference (system / light / dark), site-wide.
//
// Two attributes on <html>, both set before the first paint by THEME_INIT_SCRIPT in app/layout.tsx:
//   data-theme-preference = system | light | dark   (what the visitor chose; system unless stored)
//   data-theme            = light | dark            (what is shown; system resolves through prefers-color-scheme)
// app/theme.css reads data-theme; the theme control reads data-theme-preference for its first-frame state.
// An explicit Light or Dark is stored; choosing System removes the key, so the OS decides again.

export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'rubikon-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Inline, blocking, in <head>: runs before <body> is parsed, so the first painted frame already has the right theme. */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement,p='system',t='light';try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');if(s==='light'||s==='dark')p=s}catch(e){}if(p==='system'){try{if(window.matchMedia('${DARK_QUERY}').matches)t='dark'}catch(e){}}else{t=p}d.dataset.themePreference=p;d.dataset.theme=t})();`;

const listeners = new Set<() => void>();
let media: MediaQueryList | null = null;

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function readPreference(): ThemePreference {
  const value = document.documentElement.dataset.themePreference;
  return isPreference(value) ? value : 'system';
}

export function readEffectiveTheme(): EffectiveTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function systemTheme(): EffectiveTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function apply(preference: ThemePreference) {
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = preference === 'system' ? systemTheme() : preference;
  listeners.forEach((listener) => listener());
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage blocked (private mode, disabled site data): the choice still applies for this page view.
  }
  apply(preference);
}

// The OS theme only matters while the preference is System; an explicit Light or Dark ignores it.
function onSystemChange() {
  if (readPreference() === 'system') apply('system');
}

// Another tab changed the preference: follow it, so two open tabs never disagree.
function onStorage(event: StorageEvent) {
  if (event.key !== THEME_STORAGE_KEY) return;
  apply(isPreference(event.newValue) && event.newValue !== 'system' ? event.newValue : 'system');
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    media = window.matchMedia(DARK_QUERY);
    media.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    // The head script may have run under a different OS theme than the one now active.
    onSystemChange();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      media?.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
      media = null;
    }
  };
}
