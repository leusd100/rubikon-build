import { company } from '../data/company';
import { hasAnalyticsConsent } from './consent';

/**
 * The one hostname the production GA4 property may hear from: the canonical site (`company.siteUrl`), matched exactly.
 *
 * Until 21.11 the tag loaded on any host once Analytics was granted, and 581 of the 595 GA4 sessions the 26.09 audit
 * counted came from localhost, 127.0.0.1 and previews (00_control measurement/ANALYTICS_REPAIR_SPEC.md §2–§3, DEC-06).
 * An exact match keeps out localhost, every *.workers.dev preview and any future staging host without listing them;
 * www.rubikonbuild.com 308-redirects to the apex before a page renders, so it never runs this code. A build-mode check is
 * deliberately not added: previews are production builds, so it would add nothing the hostname does not already decide.
 */
export const PRODUCTION_ANALYTICS_HOSTNAME = new URL(company.siteUrl).hostname;

export function isProductionAnalyticsHost(hostname?: string): boolean {
  const host = hostname ?? (typeof window === 'undefined' ? undefined : window.location?.hostname);
  return host === PRODUCTION_ANALYTICS_HOSTNAME;
}

/**
 * Whether this page may load the production tag or hand it an event: the production host AND Analytics consent.
 * Consent stays its own condition (consent.ts); the host only narrows where a consented visitor is measured.
 */
export function canMeasureAnalytics(): boolean {
  return isProductionAnalyticsHost() && hasAnalyticsConsent();
}
