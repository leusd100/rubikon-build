// Where the cookie-consent choice is stored, and the first-visit flag derived from it before the first paint.
//
// No 'use client' here, unlike app/lib/consent.ts: the root layout (a server component) inlines
// CONSENT_PENDING_INIT_SCRIPT into <head>, and a constant exported from a client module would reach it only as a client
// reference. consent.ts re-exports the two keys, so they are defined once and the script cannot drift from them.

export const CONSENT_STORAGE_KEY = 'rubikon-consent-state';
// Superseded by CONSENT_STORAGE_KEY. Kept only so a visitor who already made a choice under the
// old single-flag banner gets migrated instead of re-prompted — never written to by this version
// of the code.
export const LEGACY_ANALYTICS_STORAGE_KEY = 'rubikon-analytics-consent';

/**
 * On <html> while no consent choice is stored: the visit on which the cookie banner will ask. The banner itself mounts
 * only after hydration, so anything that must make room for it reads this flag instead of the banner's presence
 * (`body:has(> .cookie-banner)` moved the hero once the page was already painted). PDO-09.
 */
export const CONSENT_PENDING_ATTRIBUTE = 'data-consent-pending';

/**
 * Inline, blocking, in <head> after THEME_INIT_SCRIPT: sets CONSENT_PENDING_ATTRIBUTE exactly when readConsentState()
 * in consent.ts will return null — no valid choice under the current key, no 'granted' | 'denied' under the legacy one,
 * or storage that throws. tests/unit/consent-storage.test.ts runs it against readConsentState() on the same storage.
 */
export const CONSENT_PENDING_INIT_SCRIPT = `(function(){var v=function(x){return x==='granted'||x==='denied'},k=false;try{var s=window.localStorage,c=s.getItem('${CONSENT_STORAGE_KEY}'),l=s.getItem('${LEGACY_ANALYTICS_STORAGE_KEY}');try{var o=JSON.parse(c);k=!!o&&typeof o==='object'&&v(o.analytics)&&v(o.advertising)}catch(e){}k=k||v(l)}catch(e){k=false}if(!k)document.documentElement.setAttribute('${CONSENT_PENDING_ATTRIBUTE}','')})();`;

/** A choice is stored (or the banner has been answered): the room kept for the banner goes back to the page. */
export function clearConsentPending() {
  document.documentElement.removeAttribute(CONSENT_PENDING_ATTRIBUTE);
}
