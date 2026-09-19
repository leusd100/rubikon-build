// The site's Content-Security-Policy — the only definition. proxy.ts sends it on every page response;
// nothing else in the repo may declare its own policy (tests/unit/security/csp.test.ts enforces that).
//
// Known weakness, deliberately kept for now: 'unsafe-inline' in script-src covers the framework's inline RSC
// flight scripts (dozens per page, different on every page) and the inline gtag consent-default snippet in
// app/layout.tsx; in style-src it covers React style attributes. Removing it needs per-request nonces — a
// separate hardening sprint. There is no 'unsafe-eval' and nothing on the site needs it.

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    // Google tag, loaded only after Analytics consent (app/components/AnalyticsConsent.tsx).
    'https://www.googletagmanager.com',
    // Cloudflare Turnstile on the inquiry form.
    'https://challenges.cloudflare.com',
    // Cloudflare Web Analytics, injected at the edge (automatic setup). The served URL continues past the file
    // name (/beacon.min.js/v…), so the source must end in "/" — without it CSP requires an exact path and still
    // blocks the beacon. Its RUM POST goes to same-origin /cdn-cgi/rum, which connect-src 'self' already allows.
    'https://static.cloudflareinsights.com/beacon.min.js/',
  ],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https://www.google-analytics.com', 'https://*.google-analytics.com'],
  'media-src': ["'self'"],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https://www.googletagmanager.com', 'https://www.google-analytics.com', 'https://*.google-analytics.com'],
  // Cloudflare Turnstile renders its challenge in an iframe from this origin (inquiry form).
  'frame-src': ["'self'", 'https://challenges.cloudflare.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
} as const satisfies Record<string, readonly string[]>;

export function buildContentSecurityPolicy({ development }: { development: boolean }): string {
  return [
    ...Object.entries(CSP_DIRECTIVES).map(([directive, sources]) => `${directive} ${sources.join(' ')}`),
    // The local dev server is plain http; upgrading its subresources to https would break it.
    ...(development ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
