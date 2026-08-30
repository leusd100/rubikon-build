'use client';

// Captures UTM parameters and Google Ads click IDs once per browser session, on whichever
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

/** Call once near the root of the app (e.g. in a client component mounted in layout). */
export function ensureAttributionCaptured() {
  try {
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, JSON.stringify(captureAttribution()));
  } catch {
    // Session storage unavailable (private mode, etc.) — attribution is best-effort.
  }
}

/** Call at form-submit time. Falls back to an empty-but-valid shape if nothing was captured. */
export function readAttribution(): Attribution {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw) as Attribution;
  } catch {
    // Fall through to the default below.
  }
  return captureAttribution();
}
