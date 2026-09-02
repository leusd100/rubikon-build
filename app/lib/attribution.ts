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

/**
 * `landingPage`/`referrer`/`utm` are lead-context data: they never leave RUBIKON's own records
 * and are covered by the lead form's own consent checkbox, so they're always kept. `clickIds`
 * (gclid/gbraid/wbraid) exist for exactly one purpose — matching this lead to a click in Google's
 * ad account — so they're the one part of attribution gated on the Advertising consent category,
 * independently of Analytics. Capture itself (above) stays unconditional and ephemeral: the
 * click ID is only ever observable in the URL of the very first pageview, long before a visitor
 * could have made any consent choice, so gating capture instead of transmission would make the
 * field permanently uncapturable rather than merely consent-gated. Pure — takes the already-read
 * Attribution and an explicit boolean rather than reading consent itself, so this stays
 * independently testable from app/lib/consent.ts.
 */
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
