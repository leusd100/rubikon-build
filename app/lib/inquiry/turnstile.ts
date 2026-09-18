// Cloudflare Turnstile — public configuration shared by the inquiry form and /api/leads.
// Nothing secret lives here: TURNSTILE_SECRET is a Worker runtime secret read only by
// app/lib/inquiry/turnstileVerify.ts on the server.

/**
 * The production widget's public site key (Managed mode). Public by design — the browser needs
 * it to render the widget — so it is committed like the GA measurement ID.
 */
export const TURNSTILE_SITE_KEY = '0x4AAAAAAE6PDJHNjg4Vb418';

/** Cloudflare's official "always passes" test site key (visible widget). Local hosts only. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

/** Sent as the widget's `action` and required back from Siteverify for a real key. */
export const TURNSTILE_ACTION = 'lead_submit';

/**
 * Hostnames a real-key token may have been solved on — exact matches of Siteverify's `hostname`.
 * www.rubikonbuild.com 308-redirects to the apex before any page renders, so it never hosts the
 * form. Workers preview hostnames are deliberately absent: production accepts production tokens only.
 */
export const TURNSTILE_ALLOWED_HOSTNAMES: readonly string[] = ['rubikonbuild.com'];

export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Siteverify rejects longer responses; anything longer is not a token. */
export const TURNSTILE_TOKEN_MAX_LENGTH = 2048;

export function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

/** Local development never touches the production widget. */
export function turnstileSiteKeyFor(hostname: string): string {
  return isLocalHostname(hostname) ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY;
}
