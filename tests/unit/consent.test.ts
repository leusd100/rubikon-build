import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_STORAGE_KEY,
  LEGACY_ANALYTICS_STORAGE_KEY,
  hasAdvertisingConsent,
  hasAnalyticsConsent,
  migrateLegacyConsent,
  parseConsentState,
  readConsentState,
  resolveConsentState,
  toGoogleConsentSignals,
  updateGoogleConsent,
  writeConsentState,
  type ConsentState,
} from '../../app/lib/consent';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

describe('parseConsentState', () => {
  it('returns null when nothing was ever stored', () => {
    expect(parseConsentState(null)).toBeNull();
  });

  it('parses a valid stored state', () => {
    const state: ConsentState = { analytics: 'granted', advertising: 'denied' };
    expect(parseConsentState(JSON.stringify(state))).toEqual(state);
  });

  it('rejects malformed JSON instead of throwing', () => {
    expect(parseConsentState('{not json')).toBeNull();
  });

  it('rejects a value missing a category', () => {
    expect(parseConsentState(JSON.stringify({ analytics: 'granted' }))).toBeNull();
  });

  it('rejects a value with an invalid category', () => {
    expect(parseConsentState(JSON.stringify({ analytics: 'yes', advertising: 'denied' }))).toBeNull();
  });

  it('rejects a bare string that is not a JSON object', () => {
    expect(parseConsentState(JSON.stringify('granted'))).toBeNull();
  });
});

describe('migrateLegacyConsent', () => {
  it('maps a legacy granted flag to analytics-only consent — never advertising', () => {
    expect(migrateLegacyConsent('granted')).toEqual({ analytics: 'granted', advertising: 'denied' });
  });

  it('maps a legacy denied flag to fully denied consent', () => {
    expect(migrateLegacyConsent('denied')).toEqual({ analytics: 'denied', advertising: 'denied' });
  });

  it('returns null when there was never a legacy choice', () => {
    expect(migrateLegacyConsent(null)).toBeNull();
  });

  it('returns null for an unrecognised legacy value', () => {
    expect(migrateLegacyConsent('yes-please')).toBeNull();
  });
});

describe('resolveConsentState', () => {
  it('prefers the current-format state when present, ignoring any legacy value', () => {
    const current: ConsentState = { analytics: 'granted', advertising: 'granted' };
    expect(resolveConsentState(JSON.stringify(current), 'denied')).toEqual({
      state: current,
      migrated: false,
    });
  });

  it('falls back to migrating the legacy flag when no current-format value exists', () => {
    expect(resolveConsentState(null, 'granted')).toEqual({
      state: { analytics: 'granted', advertising: 'denied' },
      migrated: true,
    });
  });

  it('resolves to null, unmigrated, when neither key was ever set', () => {
    expect(resolveConsentState(null, null)).toEqual({ state: null, migrated: false });
  });

  it('ignores a malformed current value and still migrates the legacy one', () => {
    expect(resolveConsentState('{broken', 'denied')).toEqual({
      state: { analytics: 'denied', advertising: 'denied' },
      migrated: true,
    });
  });
});

describe('toGoogleConsentSignals', () => {
  it.each([
    [
      { analytics: 'denied', advertising: 'denied' },
      { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' },
    ],
    [
      { analytics: 'granted', advertising: 'denied' },
      { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' },
    ],
    [
      { analytics: 'denied', advertising: 'granted' },
      { analytics_storage: 'denied', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' },
    ],
    [
      { analytics: 'granted', advertising: 'granted' },
      { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' },
    ],
  ] as [ConsentState, Record<string, string>][])('maps %o to the matching gtag signals', (state, expected) => {
    expect(toGoogleConsentSignals(state)).toEqual(expected);
  });

  it('never lets Advertising consent imply analytics_storage, or vice versa', () => {
    expect(toGoogleConsentSignals({ analytics: 'granted', advertising: 'denied' }).ad_storage).toBe('denied');
    expect(toGoogleConsentSignals({ analytics: 'denied', advertising: 'granted' }).analytics_storage).toBe('denied');
  });
});

describe('browser-storage-backed helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: createMemoryStorage(), dataLayer: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('readConsentState returns the stored state unchanged when already in the new format', () => {
    const state: ConsentState = { analytics: 'granted', advertising: 'denied' };
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));

    expect(readConsentState()).toEqual(state);
  });

  it('readConsentState migrates a legacy value and persists it under the new key', () => {
    window.localStorage.setItem(LEGACY_ANALYTICS_STORAGE_KEY, 'granted');

    const state = readConsentState();

    expect(state).toEqual({ analytics: 'granted', advertising: 'denied' });
    expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY)!)).toEqual(state);
  });

  it('readConsentState returns null, not a throw, with no storage access at all', () => {
    vi.unstubAllGlobals();
    expect(readConsentState()).toBeNull();
  });

  it('writeConsentState persists exactly the given state for a later readConsentState', () => {
    writeConsentState({ analytics: 'denied', advertising: 'granted' });
    expect(readConsentState()).toEqual({ analytics: 'denied', advertising: 'granted' });
  });

  it('hasAnalyticsConsent and hasAdvertisingConsent read their own category independently', () => {
    writeConsentState({ analytics: 'granted', advertising: 'denied' });
    expect(hasAnalyticsConsent()).toBe(true);
    expect(hasAdvertisingConsent()).toBe(false);

    writeConsentState({ analytics: 'denied', advertising: 'granted' });
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasAdvertisingConsent()).toBe(true);
  });

  it('hasAnalyticsConsent/hasAdvertisingConsent are false before any choice has been made', () => {
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasAdvertisingConsent()).toBe(false);
  });

  it('updateGoogleConsent pushes the mapped signals onto the dataLayer via gtag', () => {
    updateGoogleConsent({ analytics: 'granted', advertising: 'denied' });

    const w = window as unknown as { dataLayer: unknown[][] };
    expect(w.dataLayer).toContainEqual([
      'consent',
      'update',
      { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' },
    ]);
  });

  it('updateGoogleConsent initialises dataLayer/gtag itself when neither exists yet', () => {
    vi.stubGlobal('window', { localStorage: createMemoryStorage() });

    updateGoogleConsent({ analytics: 'denied', advertising: 'denied' });

    const w = window as unknown as { dataLayer: unknown[][] };
    expect(Array.isArray(w.dataLayer)).toBe(true);
    expect(w.dataLayer).toHaveLength(1);
  });
});
