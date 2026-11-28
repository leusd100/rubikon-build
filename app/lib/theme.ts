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

// The stored choice is also a cookie of the same name, light or dark only, for the Worker: it points the server's hero
// <picture> at the stored theme before WebKit's preload scanner reads it (app/lib/heroThemeSources.ts). The storage stays
// the source of truth; the head script brings the cookie in line with it on every page (a choice made before the cookie
// existed, storage cleared), so a stale cookie lasts at most one page. A functional preference the visitor set, nothing
// else: no consent needed, named in the privacy policy.
export const THEME_COOKIE = THEME_STORAGE_KEY;
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const THEME_COOKIE_ATTRIBUTES = ';Path=/;SameSite=Lax';
const THEME_COOKIE_READ = `((document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)(?:;|$)/)||[])[1]||'system')`;
const THEME_COOKIE_WRITE = `document.cookie='${THEME_COOKIE}='+(p==='system'?';Max-Age=0':p+';Max-Age=${THEME_COOKIE_MAX_AGE}')+'${THEME_COOKIE_ATTRIBUTES}'+(location.protocol==='https:'?';Secure':'')`;

/** Inline, blocking, in <head>: runs before <body> is parsed, so the first painted frame already has the right theme. */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement,p='system',t='light';try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');if(s==='light'||s==='dark')p=s}catch(e){}if(p==='system'){try{if(window.matchMedia('${DARK_QUERY}').matches)t='dark'}catch(e){}}else{t=p}d.dataset.themePreference=p;d.dataset.theme=t;try{if(${THEME_COOKIE_READ}!==p)${THEME_COOKIE_WRITE}}catch(e){}})();`;

/** The cookie for a preference, as the head script writes it: Light or Dark for a year, System removes it. */
export function themeCookie(preference: ThemePreference, secure: boolean) {
  const value = preference === 'system' ? ';Max-Age=0' : `${preference};Max-Age=${THEME_COOKIE_MAX_AGE}`;
  return `${THEME_COOKIE}=${value}${THEME_COOKIE_ATTRIBUTES}${secure ? ';Secure' : ''}`;
}

/** The cookie in line with a preference (the site's CSP has no 'unsafe-eval', so not by running the head script's text). */
export function writeThemeCookie(preference: ThemePreference) {
  document.cookie = themeCookie(preference, window.location.protocol === 'https:');
}

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
  try {
    writeThemeCookie(preference);
  } catch {
    // Cookies blocked: the inline script still points the hero, Safari then fetches the OS theme's one too, as before.
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
