import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inquiryDirectionOptions } from '../../../app/data/directions';
import {
  TURNSTILE_ACTION,
  TURNSTILE_ALLOWED_HOSTNAMES,
  TURNSTILE_SITE_KEY,
  TURNSTILE_TEST_SITE_KEY,
  TURNSTILE_TOKEN_MAX_LENGTH,
  turnstileSiteKeyFor,
} from '../../../app/lib/inquiry/turnstile';
import { SITEVERIFY_URL, verifyTurnstileToken } from '../../../app/lib/inquiry/turnstileVerify';

const PREVIEW_HOSTNAME = 'feat-form-turnstile-rubikon-build.leusd100.workers.dev';

function verify(overrides: Partial<Parameters<typeof verifyTurnstileToken>[0]> = {}) {
  return verifyTurnstileToken({
    secret: 'test-only-secret',
    token: 'token',
    remoteIp: '203.0.113.10',
    requestHostname: 'rubikonbuild.com',
    ...overrides,
  });
}

describe('verifyTurnstileToken', () => {
  let siteverify: ReturnType<typeof vi.fn>;

  function answers(body: Record<string, unknown>) {
    siteverify.mockResolvedValueOnce(Response.json(body));
  }

  beforeEach(() => {
    siteverify = vi.fn();
    vi.stubGlobal('fetch', siteverify);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts a real-key token for lead_submit on the production hostname', async () => {
    answers({ success: true, hostname: 'rubikonbuild.com', action: TURNSTILE_ACTION });
    await expect(verify()).resolves.toEqual({ ok: true });
    const [url, init] = siteverify.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(SITEVERIFY_URL);
    expect(init.method).toBe('POST');
    // Bounded by a timeout signal, so a hanging Siteverify cannot hold the request open.
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('accepts the exact Sprint 2 preview hostname and nothing that merely resembles it', async () => {
    answers({ success: true, hostname: PREVIEW_HOSTNAME, action: TURNSTILE_ACTION });
    await expect(verify()).resolves.toEqual({ ok: true });

    for (const hostname of ['leusd100.workers.dev', `x.${PREVIEW_HOSTNAME}`, 'www.rubikonbuild.com', 'rubikonbuild.com.evil.example', '']) {
      answers({ success: true, hostname, action: TURNSTILE_ACTION });
      await expect(verify()).resolves.toEqual({ ok: false, reason: 'rejected' });
    }
  });

  it('rejects a token solved for another action, or with no action', async () => {
    answers({ success: true, hostname: 'rubikonbuild.com', action: 'login' });
    await expect(verify()).resolves.toEqual({ ok: false, reason: 'rejected' });
    answers({ success: true, hostname: 'rubikonbuild.com' });
    await expect(verify()).resolves.toEqual({ ok: false, reason: 'rejected' });
  });

  it('accepts Cloudflare test-key results only for a request made to a local host', async () => {
    const testKeyResult = { success: true, hostname: 'example.com', metadata: { result_with_testing_key: true } };
    for (const requestHostname of ['localhost', '127.0.0.1']) {
      answers(testKeyResult);
      await expect(verify({ requestHostname })).resolves.toEqual({ ok: true });
    }
    for (const requestHostname of ['rubikonbuild.com', PREVIEW_HOSTNAME]) {
      answers(testKeyResult);
      await expect(verify({ requestHostname })).resolves.toEqual({ ok: false, reason: 'rejected' });
    }
  });

  it.each([
    ['missing-input-response'],
    ['invalid-input-response'],
    ['timeout-or-duplicate'],
  ])('treats %s as a rejected token', async (code) => {
    answers({ success: false, 'error-codes': [code] });
    await expect(verify()).resolves.toEqual({ ok: false, reason: 'rejected' });
  });

  it.each([
    ['missing-input-secret'],
    ['invalid-input-secret'],
    ['internal-error'],
  ])('treats %s as unavailable, never as a pass', async (code) => {
    answers({ success: false, 'error-codes': [code] });
    await expect(verify()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('rejects an empty or oversized token without calling Siteverify', async () => {
    await expect(verify({ token: '' })).resolves.toEqual({ ok: false, reason: 'rejected' });
    await expect(verify({ token: 'x'.repeat(TURNSTILE_TOKEN_MAX_LENGTH + 1) })).resolves.toEqual({ ok: false, reason: 'rejected' });
    expect(siteverify).not.toHaveBeenCalled();
  });

  it('omits remoteip when the visitor IP is unknown', async () => {
    answers({ success: true, hostname: 'rubikonbuild.com', action: TURNSTILE_ACTION });
    await verify({ remoteIp: null });
    const form = (siteverify.mock.calls[0]?.[1] as RequestInit).body as FormData;
    expect(form.has('remoteip')).toBe(false);
  });
});

describe('Turnstile public configuration', () => {
  it('uses the official always-pass test key on local hosts and never on a public one', () => {
    expect(TURNSTILE_TEST_SITE_KEY).toBe('1x00000000000000000000AA');
    expect(turnstileSiteKeyFor('localhost')).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(turnstileSiteKeyFor('127.0.0.1')).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(turnstileSiteKeyFor('rubikonbuild.com')).toBe(TURNSTILE_SITE_KEY);
    expect(turnstileSiteKeyFor(PREVIEW_HOSTNAME)).toBe(TURNSTILE_SITE_KEY);
  });

  it('allows exactly production and the Sprint 2 preview — no wildcard, no account-wide workers.dev', () => {
    expect([...TURNSTILE_ALLOWED_HOSTNAMES]).toEqual(['rubikonbuild.com', PREVIEW_HOSTNAME]);
  });
});

describe('inquiry direction options', () => {
  it('offers «Ще не визначено» once, as the last option', () => {
    expect(inquiryDirectionOptions.at(-1)).toBe('Ще не визначено');
    expect(new Set(inquiryDirectionOptions).size).toBe(inquiryDirectionOptions.length);
  });
});
