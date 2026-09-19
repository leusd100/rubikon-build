'use client';

import { hasAdvertisingConsent } from './consent';

// Captures first-touch UTM context, with Google Ads click IDs gated on consent, on whichever
// page the visitor actually lands on first — then makes them available to the inquiry form
// no matter which page it's eventually submitted from. sessionStorage (not localStorage) is
// deliberate: this is attribution for one visit, not a permanent record.

const storageKey = 'rubikon-attribution';

export type Attribution = {
  landingPage: string;
  referrer: string;
  utm: {
    source: string;
    medium: string;
    campaign: string;
    term: string;
    content: string;
  };
  clickIds: {
    gclid: string;
    gbraid: string;
    wbraid: string;
  };
};

function readParam(params: URLSearchParams, key: string) {
  return (params.get(key) || '').slice(0, 200);
}

function captureAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search);
  return {
    landingPage: window.location.pathname.slice(0, 300),
    referrer: (document.referrer || '').slice(0, 300),
    utm: {
      source: readParam(params, 'utm_source'),
      medium: readParam(params, 'utm_medium'),
      campaign: readParam(params, 'utm_campaign'),
      term: readParam(params, 'utm_term'),
      content: readParam(params, 'utm_content'),
    },
    clickIds: {
      gclid: readParam(params, 'gclid'),
      gbraid: readParam(params, 'gbraid'),
      wbraid: readParam(params, 'wbraid'),
    },
  };
}

/** Capture first-touch context, but only persist advertising IDs after explicit consent.
 * Revocation also scrubs records written by previous versions of the site.
 */
export function ensureAttributionCaptured(advertisingGranted = hasAdvertisingConsent()) {
  try {
    const attribution = readAttribution();
    // A choice on the landing page can still capture its IDs. Never mix another page's
    // campaign into the original landing context after navigation.
    if (advertisingGranted && attribution.landingPage === window.location.pathname) {
      const current = captureAttribution();
      for (const key of ['gclid', 'gbraid', 'wbraid'] as const) {
        if (current.clickIds[key]) attribution.clickIds[key] = current.clickIds[key];
      }
    }
    window.sessionStorage.setItem(storageKey, JSON.stringify(
      filterAttributionForConsent(attribution, { advertisingGranted }),
    ));
  } catch {
    // Storage is optional; consent still gates the submit-time fallback.
  }
}

export function readAttribution(): Attribution {
  let attribution = captureAttribution();
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    const stored: unknown = raw ? JSON.parse(raw) : null;
    if (stored && typeof stored === 'object') {
      const candidate = stored as Attribution;
      if (typeof candidate.landingPage === 'string' && typeof candidate.referrer === 'string'
        && candidate.utm && candidate.clickIds
        && ['source', 'medium', 'campaign', 'term', 'content'].every(
          (key) => typeof candidate.utm[key as keyof Attribution['utm']] === 'string',
        ) && ['gclid', 'gbraid', 'wbraid'].every(
          (key) => typeof candidate.clickIds[key as keyof Attribution['clickIds']] === 'string',
        )) attribution = candidate;
    }
  } catch {
    // Malformed or unavailable storage must not prevent an inquiry.
  }
  return filterAttributionForConsent(attribution, { advertisingGranted: hasAdvertisingConsent() });
}

/** Pure submit-time protection, independent of how attribution was captured. */
export function filterAttributionForConsent(
  attribution: Attribution,
  { advertisingGranted }: { advertisingGranted: boolean },
): Attribution {
  if (advertisingGranted) return attribution;
  return {
    ...attribution,
    clickIds: { gclid: '', gbraid: '', wbraid: '' },
  };
}
