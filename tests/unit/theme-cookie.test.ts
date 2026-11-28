import { afterEach, describe, expect, it, vi } from 'vitest';

// The stored theme is also a cookie for the Worker (app/lib/theme.ts, worker/hero-theme-sources.ts): the toggle writes it
// and the head script brings it in line with the storage on every page. A cookie jar that keeps what document.cookie
// is given, and the toggle's and the head script's writes compared as strings.

const KEY = 'rubikon-theme';
const YEAR = 60 * 60 * 24 * 365;

function createEnv({ stored = null as string | null, cookie = '', protocol = 'https:' } = {}) {
  const dataset: Record<string, string> = {};
  const store = new Map<string, string>(stored === null ? [] : [[KEY, stored]]);
  const writes: string[] = [];
  let jar = cookie;
  const document = {
    documentElement: { dataset },
    get cookie() { return jar; },
    set cookie(value: string) {
      writes.push(value);
      const [pair] = value.split(';');
      const removed = /;Max-Age=0(?:;|$)/.test(value);
      const others = jar.split('; ').filter((part) => part && !part.startsWith(`${KEY}=`));
      jar = [...others, ...(removed ? [] : [pair])].join('; ');
    },
  };
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const window = { localStorage, matchMedia: () => ({ matches: false }), location: { protocol } };
  vi.stubGlobal('document', document);
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('location', window.location);
  vi.stubGlobal('window', window);
  return { writes, jar: () => jar };
}

async function loadTheme() {
  vi.resetModules();
  return import('../../app/lib/theme');
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('theme cookie', () => {
  it('is light or dark for a year, on the whole site, Secure on https; System removes it', async () => {
    const { themeCookie } = await loadTheme();
    expect(themeCookie('dark', true)).toBe(`${KEY}=dark;Max-Age=${YEAR};Path=/;SameSite=Lax;Secure`);
    expect(themeCookie('light', false)).toBe(`${KEY}=light;Max-Age=${YEAR};Path=/;SameSite=Lax`);
    expect(themeCookie('system', true)).toBe(`${KEY}=;Max-Age=0;Path=/;SameSite=Lax;Secure`);
  });

  it('the toggle writes it with the storage, and System removes both', async () => {
    const env = createEnv();
    const { setThemePreference } = await loadTheme();
    setThemePreference('dark');
    expect(env.jar()).toBe(`${KEY}=dark`);
    setThemePreference('light');
    expect(env.jar()).toBe(`${KEY}=light`);
    setThemePreference('system');
    expect(env.jar()).toBe('');
  });

  it('the head script writes the same cookie as the toggle, for every stored value and protocol', async () => {
    const { THEME_INIT_SCRIPT, themeCookie } = await loadTheme();
    for (const protocol of ['https:', 'http:']) {
      for (const [stored, cookie, preference] of [['dark', '', 'dark'], ['light', `${KEY}=dark`, 'light'], [null, `${KEY}=light`, 'system']] as const) {
        const env = createEnv({ stored, cookie, protocol });
        new Function(THEME_INIT_SCRIPT)();
        expect(env.writes, `${stored} over «${cookie}» on ${protocol}`).toEqual([themeCookie(preference, protocol === 'https:')]);
      }
    }
  });

  it('the head script writes nothing when the cookie already agrees with the storage', async () => {
    const { THEME_INIT_SCRIPT } = await loadTheme();
    for (const [stored, cookie] of [['dark', `${KEY}=dark`], ['light', `a=1; ${KEY}=light; b=2`], [null, ''], [null, 'other=dark']] as const) {
      const env = createEnv({ stored, cookie });
      new Function(THEME_INIT_SCRIPT)();
      expect(env.writes, `${stored} over «${cookie}»`).toEqual([]);
    }
  });

  it('reads only its own name: a cookie that merely ends in it does not count', async () => {
    const env = createEnv({ stored: 'dark', cookie: `old-${KEY}=dark` });
    const { THEME_INIT_SCRIPT } = await loadTheme();
    new Function(THEME_INIT_SCRIPT)();
    expect(env.writes).toHaveLength(1);
  });
});
