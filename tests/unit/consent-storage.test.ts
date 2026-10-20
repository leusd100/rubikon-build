import { afterEach, describe, expect, it, vi } from 'vitest';
import * as consent from '../../app/lib/consent';
import {
  CONSENT_PENDING_ATTRIBUTE,
  CONSENT_PENDING_INIT_SCRIPT,
  CONSENT_STORAGE_KEY,
  LEGACY_ANALYTICS_STORAGE_KEY,
  clearConsentPending,
} from '../../app/lib/consentStorage';

// PDO-09: the inline <head> script flags a first visit (data-consent-pending) before the banner's own code has run. It
// must say «pending» exactly when the banner will ask — readConsentState() === null — or the phone hero keeps room for a
// banner that never shows (or shows the banner over the actions again). Both run here on the same stand-in storage.

type Stored = Record<string, string>;

function stubBrowser(stored: Stored, { storageThrows = false } = {}) {
  const store = new Map(Object.entries(stored));
  const blocked = () => { throw new Error('storage blocked'); };
  const localStorage = {
    getItem: (key: string) => (storageThrows ? blocked() : store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => (storageThrows ? blocked() : void store.set(key, value)),
    removeItem: (key: string) => (storageThrows ? blocked() : void store.delete(key)),
  };
  const attributes = new Map<string, string>();
  const documentElement = {
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
    hasAttribute: (name: string) => attributes.has(name),
  };
  vi.stubGlobal('window', { localStorage, dataLayer: [] });
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('document', { documentElement });
  return { documentElement };
}

function runHeadScript() {
  // The same string the root layout inlines, run as the browser runs a classic script: globals only
  new Function(CONSENT_PENDING_INIT_SCRIPT)();
}

const valid = (analytics: string, advertising: string) => JSON.stringify({ analytics, advertising });

const CASES: [string, Stored][] = [
  ['nothing stored (a first visit)', {}],
  ['necessary only', { [CONSENT_STORAGE_KEY]: valid('denied', 'denied') }],
  ['accept all', { [CONSENT_STORAGE_KEY]: valid('granted', 'granted') }],
  ['advertising alone', { [CONSENT_STORAGE_KEY]: valid('denied', 'granted') }],
  ['legacy granted', { [LEGACY_ANALYTICS_STORAGE_KEY]: 'granted' }],
  ['legacy denied', { [LEGACY_ANALYTICS_STORAGE_KEY]: 'denied' }],
  ['legacy value of another shape', { [LEGACY_ANALYTICS_STORAGE_KEY]: 'yes' }],
  ['legacy key holding the new JSON', { [LEGACY_ANALYTICS_STORAGE_KEY]: valid('granted', 'granted') }],
  ['current key with one category', { [CONSENT_STORAGE_KEY]: JSON.stringify({ analytics: 'granted' }) }],
  ['current key with an unknown value', { [CONSENT_STORAGE_KEY]: valid('granted', 'maybe') }],
  ['current key not JSON', { [CONSENT_STORAGE_KEY]: '{analytics' }],
  ['current key empty', { [CONSENT_STORAGE_KEY]: '' }],
  ['current key a JSON number', { [CONSENT_STORAGE_KEY]: '0' }],
  ['current key a JSON array', { [CONSENT_STORAGE_KEY]: '[]' }],
  ['current key null', { [CONSENT_STORAGE_KEY]: 'null' }],
  ['broken current key, valid legacy', { [CONSENT_STORAGE_KEY]: '{analytics', [LEGACY_ANALYTICS_STORAGE_KEY]: 'denied' }],
  ['valid current key, broken legacy', { [CONSENT_STORAGE_KEY]: valid('granted', 'denied'), [LEGACY_ANALYTICS_STORAGE_KEY]: 'x' }],
];

describe('CONSENT_PENDING_INIT_SCRIPT', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the keys app/lib/consent.ts reads, which are the same constants', () => {
    expect(consent.CONSENT_STORAGE_KEY).toBe(CONSENT_STORAGE_KEY);
    expect(consent.LEGACY_ANALYTICS_STORAGE_KEY).toBe(LEGACY_ANALYTICS_STORAGE_KEY);
    expect(CONSENT_PENDING_INIT_SCRIPT).toContain(`'${CONSENT_STORAGE_KEY}'`);
    expect(CONSENT_PENDING_INIT_SCRIPT).toContain(`'${LEGACY_ANALYTICS_STORAGE_KEY}'`);
    expect(CONSENT_PENDING_INIT_SCRIPT).toContain(`'${CONSENT_PENDING_ATTRIBUTE}'`);
    expect(CONSENT_PENDING_ATTRIBUTE).toBe('data-consent-pending');
  });

  it.each(CASES)('flags the visit exactly when the banner will ask: %s', (_, stored) => {
    const { documentElement } = stubBrowser(stored);
    runHeadScript();
    const pending = documentElement.hasAttribute(CONSENT_PENDING_ATTRIBUTE);
    // readConsentState may migrate the legacy key (a write): run it after the script, on the same storage
    expect(pending).toBe(consent.readConsentState() === null);
  });

  it('flags the visit when storage throws, as the banner then asks too', () => {
    const { documentElement } = stubBrowser({ [CONSENT_STORAGE_KEY]: valid('denied', 'denied') }, { storageThrows: true });
    runHeadScript();
    expect(documentElement.hasAttribute(CONSENT_PENDING_ATTRIBUTE)).toBe(true);
    expect(consent.readConsentState()).toBeNull();
  });

  it('runs without throwing when there is no localStorage at all', () => {
    const { documentElement } = stubBrowser({});
    vi.stubGlobal('window', {});
    expect(runHeadScript).not.toThrow();
    expect(documentElement.hasAttribute(CONSENT_PENDING_ATTRIBUTE)).toBe(true);
  });

  it('is one self-contained expression with no template holes left', () => {
    expect(CONSENT_PENDING_INIT_SCRIPT.startsWith('(function(){')).toBe(true);
    expect(CONSENT_PENDING_INIT_SCRIPT.endsWith('})();')).toBe(true);
    expect(CONSENT_PENDING_INIT_SCRIPT).not.toContain('${');
  });

  it('clearConsentPending removes the flag', () => {
    const { documentElement } = stubBrowser({});
    runHeadScript();
    expect(documentElement.hasAttribute(CONSENT_PENDING_ATTRIBUTE)).toBe(true);
    clearConsentPending();
    expect(documentElement.hasAttribute(CONSENT_PENDING_ATTRIBUTE)).toBe(false);
  });
});
