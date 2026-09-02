import { describe, expect, it } from 'vitest';
import { filterAttributionForConsent, type Attribution } from '../../app/lib/attribution';

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
