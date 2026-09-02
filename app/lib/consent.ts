'use client';

// Single source of truth for the site's cookie-consent state: category shape, localStorage
// read/write, migration from the single-flag consent this project shipped before the
// Advertising category existed, and the gtag('consent', 'update', ...) mapping.
//
// Kept separate from AnalyticsConsent.tsx (the banner UI) and attribution.ts (what gets
// captured/sent with a lead) so each file has one job — the state-transition logic below has no
// JSX and no unconditional `window` access at module scope, so it's directly unit-testable
// without a DOM (see tests/unit/consent.test.ts).

export type ConsentCategory = 'granted' | 'denied';

export type ConsentState = {
  analytics: ConsentCategory;
  advertising: ConsentCategory;
};

export const CONSENT_STORAGE_KEY = 'rubikon-consent-state';
// Superseded by CONSENT_STORAGE_KEY. Kept only so a visitor who already made a choice under the
// old single-flag banner gets migrated instead of re-prompted — never written to by this version
// of the code.
export const LEGACY_ANALYTICS_STORAGE_KEY = 'rubikon-analytics-consent';

declare global {
  interface Window {
    dataLayer: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

function isConsentCategory(value: unknown): value is ConsentCategory {
  return value === 'granted' || value === 'denied';
}

/** Pure — no storage access, so this is directly unit-testable. */
export function parseConsentState(raw: string | null): ConsentState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    if (isConsentCategory(candidate.analytics) && isConsentCategory(candidate.advertising)) {
      return { analytics: candidate.analytics, advertising: candidate.advertising };
    }
  } catch {
    // Malformed value — treat as if nothing was ever stored.
  }
  return null;
}

/**
 * The pre-Advertising-category consent was a single 'granted'|'denied' flag that only ever meant
 * analytics. Migrating it must not silently grant advertising — a visitor who accepted analytics
 * under the old banner was never even asked about advertising.
 */
export function migrateLegacyConsent(legacyRaw: string | null): ConsentState | null {
  if (!isConsentCategory(legacyRaw)) return null;
  return { analytics: legacyRaw, advertising: 'denied' };
}

/**
 * Resolves which consent state to use from the raw values of both storage keys — a pure
 * function of two strings, so the migration path is testable without touching localStorage.
 * `migrated` tells the caller whether the result should be persisted under the new key (a
 * one-time write-back); this function itself never writes anything.
 */
export function resolveConsentState(
  currentRaw: string | null,
  legacyRaw: string | null,
): { state: ConsentState | null; migrated: boolean } {
  const current = parseConsentState(currentRaw);
  if (current) return { state: current, migrated: false };

  const migrated = migrateLegacyConsent(legacyRaw);
  if (migrated) return { state: migrated, migrated: true };

  return { state: null, migrated: false };
}

/** Pure mapping from our two consent categories to gtag's four Consent Mode v2 signals. */
export function toGoogleConsentSignals(state: ConsentState) {
  return {
    analytics_storage: state.analytics,
    ad_storage: state.advertising,
    ad_user_data: state.advertising,
    ad_personalization: state.advertising,
  };
}

export function readConsentState(): ConsentState | null {
  try {
    const { state, migrated } = resolveConsentState(
      window.localStorage.getItem(CONSENT_STORAGE_KEY),
      window.localStorage.getItem(LEGACY_ANALYTICS_STORAGE_KEY),
    );
    if (migrated && state) writeConsentState(state);
    return state;
  } catch {
    return null;
  }
}

export function writeConsentState(state: ConsentState) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Consent still applies for the current page when storage is unavailable.
  }
}

export function updateGoogleConsent(state: ConsentState) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer.push(args));
  window.gtag('consent', 'update', toGoogleConsentSignals(state));
}

export function hasAnalyticsConsent(): boolean {
  return readConsentState()?.analytics === 'granted';
}

export function hasAdvertisingConsent(): boolean {
  return readConsentState()?.advertising === 'granted';
}
