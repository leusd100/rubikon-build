// Server-side Turnstile verification for /api/leads. The secret is passed in by the route from its
// runtime env and only ever travels in the Siteverify request body — it is never logged, returned
// or thrown. Neither is the token.
import {
  TURNSTILE_ACTION,
  TURNSTILE_ALLOWED_HOSTNAMES,
  TURNSTILE_TOKEN_MAX_LENGTH,
  isLocalHostname,
} from './turnstile';

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 5000;

type SiteverifyResponse = {
  success?: boolean;
  'error-codes'?: string[];
  hostname?: string;
  action?: string;
  metadata?: { result_with_testing_key?: boolean };
};

/**
 * - `rejected`: the token is missing, invalid, expired, already used, or was solved for another
 *   action or hostname — the visitor can retry with a fresh token.
 * - `unavailable`: Siteverify could not give an answer (timeout, network, 5xx, internal-error) or
 *   our own secret is rejected — nothing the visitor did wrong, still never a pass.
 */
export type TurnstileVerdict = { ok: true } | { ok: false; reason: 'rejected' | 'unavailable' };

// Log a category only: never the token, the secret, or Cloudflare's full response.
function logFailure(category: string) {
  console.warn(`[leads] turnstile ${category}`);
}

export async function verifyTurnstileToken(input: {
  secret: string;
  token: string;
  remoteIp: string | null;
  /** Hostname the lead request itself arrived on — gates Cloudflare's test keys to local hosts. */
  requestHostname: string;
}): Promise<TurnstileVerdict> {
  const { secret, token, remoteIp, requestHostname } = input;
  if (!token || token.length > TURNSTILE_TOKEN_MAX_LENGTH) {
    return { ok: false, reason: 'rejected' };
  }

  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (remoteIp) form.append('remoteip', remoteIp);

  let outcome: SiteverifyResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    if (!response.ok) {
      logFailure(`siteverify http ${response.status}`);
      return { ok: false, reason: 'unavailable' };
    }
    outcome = (await response.json()) as SiteverifyResponse;
  } catch {
    logFailure('siteverify unreachable');
    return { ok: false, reason: 'unavailable' };
  }

  const errorCodes = Array.isArray(outcome['error-codes']) ? outcome['error-codes'] : [];
  if (errorCodes.includes('missing-input-secret') || errorCodes.includes('invalid-input-secret')) {
    logFailure('misconfigured');
    return { ok: false, reason: 'unavailable' };
  }
  if (errorCodes.includes('internal-error')) {
    logFailure('siteverify internal error');
    return { ok: false, reason: 'unavailable' };
  }
  if (outcome.success !== true) {
    return { ok: false, reason: 'rejected' };
  }

  // Cloudflare's official test keys answer with hostname "example.com" and no action. They are
  // only ever acceptable for a request made to a local dev server — a production Worker that was
  // accidentally given a test secret must reject everything rather than accept everything.
  if (outcome.metadata?.result_with_testing_key === true) {
    if (isLocalHostname(requestHostname)) return { ok: true };
    logFailure('test key outside local development');
    return { ok: false, reason: 'rejected' };
  }

  if (outcome.action !== TURNSTILE_ACTION) {
    logFailure('action mismatch');
    return { ok: false, reason: 'rejected' };
  }
  if (!outcome.hostname || !TURNSTILE_ALLOWED_HOSTNAMES.includes(outcome.hostname)) {
    logFailure('hostname mismatch');
    return { ok: false, reason: 'rejected' };
  }

  return { ok: true };
}
