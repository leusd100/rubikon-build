import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// app/lib/theme.ts runs in the browser, but its logic is small enough to drive with stand-ins for the four
// browser surfaces it touches: <html> attributes, localStorage, matchMedia and window events. This repo's
// unit suite is plain node on purpose (no jsdom), so these stubs are the whole "DOM".

const KEY = 'rubikon-theme';

type Env = ReturnType<typeof createEnv>;

function createEnv({ stored = null as string | null, osDark = false, storageThrows = false, matchMediaThrows = false } = {}) {
  const dataset: { theme?: string; themePreference?: string } = {};
  const store = new Map<string, string>(stored === null ? [] : [[KEY, stored]]);
  const mediaListeners = new Set<() => void>();
  const windowListeners = new Map<string, Set<(event: unknown) => void>>();
  const media = {
    matches: osDark,
    addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
  };
  const blocked = () => { throw new Error('storage blocked'); };
  const localStorage = {
    getItem: (key: string) => (storageThrows ? blocked() : store.get(key) ?? null),
    setItem: (key: string, value: string) => (storageThrows ? blocked() : store.set(key, value)),
    removeItem: (key: string) => (storageThrows ? blocked() : store.delete(key)),
  };
  const window = {
    localStorage,
    matchMedia: () => (matchMediaThrows ? blocked() : media),
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      windowListeners.get(type)!.add(listener);
    },
    removeEventListener: (type: string, listener: (event: unknown) => void) => windowListeners.get(type)?.delete(listener),
  };
  const documentElement = { dataset };

  vi.stubGlobal('window', window);
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('document', { documentElement });

  return {
    dataset,
    store,
    mediaListeners,
    windowListeners,
    theme: () => `${dataset.theme}/${dataset.themePreference}`,
    setOsDark(dark: boolean) {
      media.matches = dark;
      mediaListeners.forEach((listener) => listener());
    },
    fireStorage(key: string, newValue: string | null) {
      windowListeners.get('storage')?.forEach((listener) => listener({ key, newValue }));
    },
  };
}

async function loadTheme() {
  vi.resetModules();
  return import('../../app/lib/theme');
}

/** Runs the exact string the layout inlines in <head>. */
async function runHeadScript() {
  const { THEME_INIT_SCRIPT } = await loadTheme();
  new Function(THEME_INIT_SCRIPT)();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('head script — resolves the theme before first paint', () => {
  it.each([
    { stored: null, osDark: false, expected: 'light/system' },
    { stored: null, osDark: true, expected: 'dark/system' },
    { stored: 'light', osDark: true, expected: 'light/light' },
    { stored: 'dark', osDark: false, expected: 'dark/dark' },
  ])('stored=$stored, OS dark=$osDark → $expected', async ({ stored, osDark, expected }) => {
    const env = createEnv({ stored, osDark });
    await runHeadScript();
    expect(env.theme()).toBe(expected);
  });

  it('ignores a stored value that is not light or dark', async () => {
    const env = createEnv({ stored: 'sepia', osDark: true });
    await runHeadScript();
    expect(env.theme()).toBe('dark/system');
  });

  it('falls back to System when storage is blocked', async () => {
    const env = createEnv({ storageThrows: true, osDark: true });
    await runHeadScript();
    expect(env.theme()).toBe('dark/system');
  });

  it('falls back to Light when matchMedia is unavailable', async () => {
    const env = createEnv({ matchMediaThrows: true });
    await runHeadScript();
    expect(env.theme()).toBe('light/system');
  });

  it('uses the same storage key the runtime reads and writes', async () => {
    const { THEME_INIT_SCRIPT, THEME_STORAGE_KEY } = await loadTheme();
    expect(THEME_STORAGE_KEY).toBe(KEY);
    expect(THEME_INIT_SCRIPT).toContain(`'${KEY}'`);
  });
});

describe('reading the current theme', () => {
  it('treats a missing or unknown preference as System and anything but dark as Light', async () => {
    const env = createEnv();
    const { readPreference, readEffectiveTheme } = await loadTheme();
    expect(readPreference()).toBe('system');
    expect(readEffectiveTheme()).toBe('light');
    env.dataset.themePreference = 'dark';
    env.dataset.theme = 'dark';
    expect(readPreference()).toBe('dark');
    expect(readEffectiveTheme()).toBe('dark');
    env.dataset.themePreference = 'bogus';
    expect(readPreference()).toBe('system');
  });
});

describe('choosing a theme', () => {
  let env: Env;
  beforeEach(() => {
    env = createEnv({ osDark: true });
  });

  it('stores an explicit choice and applies it regardless of the OS', async () => {
    const { setThemePreference } = await loadTheme();
    setThemePreference('light');
    expect(env.theme()).toBe('light/light');
    expect(env.store.get(KEY)).toBe('light');
  });

  it('returning to System removes the stored choice and follows the OS again', async () => {
    env.store.set(KEY, 'light');
    const { setThemePreference } = await loadTheme();
    setThemePreference('system');
    expect(env.store.has(KEY)).toBe(false);
    expect(env.theme()).toBe('dark/system');
  });

  it('still applies the choice for this page view when storage is blocked', async () => {
    env = createEnv({ storageThrows: true });
    const { setThemePreference } = await loadTheme();
    setThemePreference('dark');
    expect(env.theme()).toBe('dark/dark');
  });

  it('notifies subscribers of every change', async () => {
    const { setThemePreference, subscribeTheme } = await loadTheme();
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);
    listener.mockClear();
    setThemePreference('light');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});

describe('staying in sync while the page is open', () => {
  it('follows OS changes while the preference is System', async () => {
    const env = createEnv({ osDark: false });
    await runHeadScript();
    const { subscribeTheme } = await import('../../app/lib/theme');
    const unsubscribe = subscribeTheme(() => {});
    env.setOsDark(true);
    expect(env.theme()).toBe('dark/system');
    env.setOsDark(false);
    expect(env.theme()).toBe('light/system');
    unsubscribe();
  });

  it('ignores OS changes once Light or Dark was chosen', async () => {
    const env = createEnv({ stored: 'dark', osDark: false });
    await runHeadScript();
    const { subscribeTheme } = await import('../../app/lib/theme');
    const unsubscribe = subscribeTheme(() => {});
    env.setOsDark(true);
    env.setOsDark(false);
    expect(env.theme()).toBe('dark/dark');
    unsubscribe();
  });

  it('re-resolves System on first subscription, in case the OS changed after the head script ran', async () => {
    const env = createEnv({ osDark: false });
    await runHeadScript();
    const { subscribeTheme } = await import('../../app/lib/theme');
    env.setOsDark(true); // no listener attached yet: <html> still says light
    expect(env.theme()).toBe('light/system');
    const unsubscribe = subscribeTheme(() => {});
    expect(env.theme()).toBe('dark/system');
    unsubscribe();
  });

  it('follows a choice made in another tab and ignores unrelated storage keys', async () => {
    const env = createEnv({ osDark: true });
    await runHeadScript();
    const { subscribeTheme } = await import('../../app/lib/theme');
    const unsubscribe = subscribeTheme(() => {});
    env.fireStorage(KEY, 'light');
    expect(env.theme()).toBe('light/light');
    env.fireStorage('rubikon-consent-state', 'dark');
    expect(env.theme()).toBe('light/light');
    env.fireStorage(KEY, null); // the other tab returned to System
    expect(env.theme()).toBe('dark/system');
    unsubscribe();
  });

  it('attaches the OS and storage listeners once and removes them with the last subscriber', async () => {
    const env = createEnv();
    const { subscribeTheme } = await loadTheme();
    const first = subscribeTheme(() => {});
    const second = subscribeTheme(() => {});
    expect(env.mediaListeners.size).toBe(1);
    expect(env.windowListeners.get('storage')?.size).toBe(1);
    first();
    expect(env.mediaListeners.size).toBe(1);
    second();
    expect(env.mediaListeners.size).toBe(0);
    expect(env.windowListeners.get('storage')?.size).toBe(0);
  });
});
