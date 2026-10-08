import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reloadOnce } from '../../app/lib/reloadOnce';

// app/error.tsx and app/global-error.tsx: a failed chunk reloads the page once, then the page shows what to do
function stubWindow(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  const reload = vi.fn();
  vi.stubGlobal('window', { sessionStorage: storage, location: { reload } });
  return reload;
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe('reloadOnce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reloads on the first failure and marks the tab', () => {
    const storage = memoryStorage();
    const reload = stubWindow(storage);
    expect(reloadOnce()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem('rubikon-error-reload')).toBe(String(Date.now()));
  });

  it('does not reload again within a minute, so a page that keeps failing shows the error page', () => {
    const storage = memoryStorage();
    const reload = stubWindow(storage);
    reloadOnce();
    vi.advanceTimersByTime(59_000);
    expect(reloadOnce()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads again once the minute has passed', () => {
    const storage = memoryStorage();
    const reload = stubWindow(storage);
    reloadOnce();
    vi.advanceTimersByTime(60_000);
    expect(reloadOnce()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('without storage it never reloads: a loop could not be told from a first failure', () => {
    const reload = stubWindow({
      getItem: () => { throw new Error('blocked'); },
      setItem: () => undefined,
    });
    expect(reloadOnce()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
