import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readSentKeys, saveSentKeys } from '../../../app/components/inquiry/formAttachment';

// The briefs sent with a saved lead (08.10, audit): remembered in this browser only — the brief's own text, no name, no
// phone — the last 10, for 30 days, so a reload does not ask for an already sent brief again

const KEY = 'rubikon-inquiry-sent';

describe('the sent briefs in this browser', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
    values = new Map();
    vi.stubGlobal('window', {
      localStorage: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('are none at first, and come back as saved', () => {
    expect(readSentKeys()).toEqual([]);
    saveSentKeys(['brief one', 'brief two']);
    expect(readSentKeys()).toEqual(['brief one', 'brief two']);
  });

  it('keep the last ten', () => {
    saveSentKeys(Array.from({ length: 14 }, (_, index) => `brief ${index}`));
    expect(readSentKeys()).toEqual(Array.from({ length: 10 }, (_, index) => `brief ${index + 4}`));
  });

  it('are forgotten after 30 days', () => {
    saveSentKeys(['brief']);
    vi.advanceTimersByTime(31 * 24 * 3600 * 1000);
    expect(readSentKeys()).toEqual([]);
  });

  it('ignore a record they could not have written', () => {
    values.set(KEY, JSON.stringify({ at: 'today', keys: ['brief'] }));
    expect(readSentKeys()).toEqual([]);
    values.set(KEY, JSON.stringify({ at: Date.now(), keys: ['brief', 42, null] }));
    expect(readSentKeys()).toEqual(['brief']);
    values.set(KEY, '{broken');
    expect(readSentKeys()).toEqual([]);
  });

  it('work without storage: nothing remembered, nothing thrown', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('blocked'); } });
    expect(readSentKeys()).toEqual([]);
    expect(() => saveSentKeys(['brief'])).not.toThrow();
  });
});
