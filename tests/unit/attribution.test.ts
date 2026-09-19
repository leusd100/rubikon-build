import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureAttributionCaptured, readAttribution, filterAttributionForConsent, type Attribution } from '../../app/lib/attribution';

function makeAttribution(overrides: Partial<Attribution> = {}): Attribution {
  return {
    landingPage: '/angary',
    referrer: 'https://www.google.com/',
    utm: { source: 'google', medium: 'cpc', campaign: 'angary-q3', term: '', content: '' },
    clickIds: { gclid: 'Cj0KCQ-test-gclid', gbraid: '', wbraid: '' },
    ...overrides,
  };
}

describe('filterAttributionForConsent', () => {
  it('passes every field through unchanged when Advertising consent is granted', () => {
    const attribution = makeAttribution();

    expect(filterAttributionForConsent(attribution, { advertisingGranted: true })).toEqual(attribution);
  });

  it('strips gclid/gbraid/wbraid but keeps landingPage/referrer/utm when consent is denied', () => {
    const attribution = makeAttribution();

    const result = filterAttributionForConsent(attribution, { advertisingGranted: false });

    expect(result.clickIds).toEqual({ gclid: '', gbraid: '', wbraid: '' });
    expect(result.landingPage).toBe(attribution.landingPage);
    expect(result.referrer).toBe(attribution.referrer);
    expect(result.utm).toEqual(attribution.utm);
  });

  it('strips every click-ID field individually, not just the ones with a value', () => {
    const attribution = makeAttribution({
      clickIds: { gclid: 'a', gbraid: 'b', wbraid: 'c' },
    });

    expect(filterAttributionForConsent(attribution, { advertisingGranted: false }).clickIds).toEqual({
      gclid: '',
      gbraid: '',
      wbraid: '',
    });
  });

  it('does not mutate the original attribution object', () => {
    const attribution = makeAttribution();
    const original = JSON.parse(JSON.stringify(attribution));

    filterAttributionForConsent(attribution, { advertisingGranted: false });

    expect(attribution).toEqual(original);
  });
});


describe('consent-gated attribution storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  function browser(consent: string | null = null, existing: string | null = null) {
    const stored = new Map<string, string>();
    if (existing) stored.set('rubikon-attribution', existing);
    const location = { pathname: '/angary', search: '?gclid=click-a&gbraid=click-b&wbraid=click-c&utm_source=google' };
    const localStorage = { getItem: (key: string) => key === 'rubikon-consent-state' ? consent : null };
    vi.stubGlobal('window', {
      location, localStorage,
      sessionStorage: { getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value) },
    });
    vi.stubGlobal('document', { referrer: '' });
    return { stored, location, grant: () => { consent = JSON.stringify({ analytics: 'denied', advertising: 'granted' }); } };
  }

  it('stores no advertising IDs before consent, then captures on explicit grant and scrubs on revoke', () => {
    const browserState = browser();
    ensureAttributionCaptured();
    expect(browserState.stored.get('rubikon-attribution')).not.toContain('click-');
    browserState.grant();
    ensureAttributionCaptured();
    expect(readAttribution().clickIds.gclid).toBe('click-a');
    ensureAttributionCaptured(false);
    expect(browserState.stored.get('rubikon-attribution')).not.toContain('click-');
  });

  it('scrubs old pre-consent records and tolerates malformed stored data', () => {
    const browserState = browser(null, JSON.stringify(makeAttribution()));
    ensureAttributionCaptured();
    expect(browserState.stored.get('rubikon-attribution')).not.toContain('Cj0');
    browserState.stored.set('rubikon-attribution', 'null');
    expect(() => readAttribution()).not.toThrow();
    expect(readAttribution().clickIds.gclid).toBe('');
  });

  it('does not mix a later page campaign with the original landing context', () => {
    const browserState = browser();
    ensureAttributionCaptured();
    browserState.location.pathname = '/zernoskhovyshcha';
    browserState.grant();
    ensureAttributionCaptured();
    expect(readAttribution().landingPage).toBe('/angary');
    expect(readAttribution().clickIds.gclid).toBe('');
  });
});
