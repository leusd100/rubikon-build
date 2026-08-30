import { env } from 'cloudflare:workers';
import type { D1Database } from '@cloudflare/workers-types';
import { inquiryDirectionOptions } from '../../data/directions';
import { company } from '../../data/company';

// Bindings expected on the Worker (created via the Cloudflare Dashboard, not wrangler.jsonc
// in this project — see the Lead Architecture Spec for how each one is provisioned):
//   DB                 D1 database — leads / lead_submit_log / lead_notify_failures
//   IP_HASH_SALT       secret — mixed into the rate-limit IP hash, never the raw IP
//   TELEGRAM_BOT_TOKEN secret — notification bot
//   TELEGRAM_CHAT_ID   secret — where the bot posts new-lead notifications
type Env = {
  DB: D1Database;
  IP_HASH_SALT: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
};

const workerEnv = env as unknown as Env;

const CONTACT_METHODS: readonly string[] = ['Дзвінок', 'Telegram', 'WhatsApp', 'Viber'];
const DIRECTION_ALLOWLIST: readonly string[] = inquiryDirectionOptions;
const PHONE_PATTERN = /^\+380\d{9}$/;
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = '-10 minutes';

type LeadPayload = {
  submissionId?: string;
  name?: string;
  phone?: string;
  contactMethod?: string;
  direction?: string;
  details?: {
    location?: string;
    dimensions?: string;
    cooperation?: string;
    startDate?: string;
    comment?: string;
  };
  sourcePage?: string;
  landingPage?: string;
  referrer?: string;
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  clickIds?: { gclid?: string; gbraid?: string; wbraid?: string };
  consentAt?: string;
  privacyVersion?: string;
  companyWebsite?: string; // honeypot — must stay empty
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function clip(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

// Sanity bound for consent_at: must parse as a real date, not be from before this feature
// could possibly have shipped, and not be meaningfully in the future (small clock-skew
// allowance only). This doesn't prove the consent is genuine — that's inherent to a public
// endpoint — but it stops obviously-garbage or nonsensical timestamps from being accepted
// into an audit column whose whole purpose is to be trustworthy on inspection.
const CONSENT_EARLIEST = Date.parse('2026-08-01T00:00:00.000Z');
const CONSENT_FUTURE_SKEW_MS = 5 * 60 * 1000;

function isPlausibleConsentTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  if (parsed < CONSENT_EARLIEST) return false;
  if (parsed > Date.now() + CONSENT_FUTURE_SKEW_MS) return false;
  return true;
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: Request) {
  let body: LeadPayload;
  try {
    body = (await request.json()) as LeadPayload;
  } catch {
    return json({ ok: false, error: 'validation', fields: ['body'] }, 400);
  }

  // Honeypot: a bot that fills this hidden field gets a plausible-looking success and
  // nothing is written anywhere — it should never learn that it was caught.
  if (clip(body.companyWebsite, 200)) {
    return json({ ok: true, id: 0, isNew: false });
  }

  const submissionId = clip(body.submissionId, 100);
  const name = clip(body.name, 80);
  const phone = clip(body.phone, 20);
  const contactMethod = clip(body.contactMethod, 20);
  const direction = clip(body.direction, 100);
  const consentAt = clip(body.consentAt, 40);
  const privacyVersion = clip(body.privacyVersion, 40);

  const fieldErrors: string[] = [];
  if (!submissionId) fieldErrors.push('submissionId');
  if (name.length < 2) fieldErrors.push('name');
  if (!PHONE_PATTERN.test(phone)) fieldErrors.push('phone');
  if (!CONTACT_METHODS.includes(contactMethod)) fieldErrors.push('contactMethod');
  if (!DIRECTION_ALLOWLIST.includes(direction)) fieldErrors.push('direction');
  if (!consentAt || !isPlausibleConsentTimestamp(consentAt)) fieldErrors.push('consentAt');
  // Must match the server's own current privacy-policy version, not merely be non-empty —
  // a client (or a direct API caller) claiming consent under a version we didn't actually
  // serve would make the audit column meaningless.
  if (privacyVersion !== company.privacyVersion) fieldErrors.push('privacyVersion');

  if (fieldErrors.length) {
    return json({ ok: false, error: 'validation', fields: fieldErrors }, 400);
  }

  // Idempotent retry, checked before the rate limiter: a sequential retry of an
  // already-accepted submissionId must always succeed and must never touch the rate-limit
  // bucket — regardless of whether that bucket happens to be full right now. This only runs
  // after full field validation above, so a garbage payload paired with a guessed/known
  // submissionId still can't get a 200 without ever having passed validation for that data.
  const alreadyAccepted = await workerEnv.DB.prepare('SELECT id FROM leads WHERE submission_id = ?')
    .bind(submissionId)
    .first<{ id: number }>();
  if (alreadyAccepted) {
    return json({ ok: true, id: alreadyAccepted.id, isNew: false });
  }

  const details = JSON.stringify({
    location: clip(body.details?.location, 100),
    dimensions: clip(body.details?.dimensions, 100),
    cooperation: clip(body.details?.cooperation, 100),
    startDate: clip(body.details?.startDate, 100),
    comment: clip(body.details?.comment, 800),
  });

  const sourcePage = clip(body.sourcePage, 300);
  const landingPage = clip(body.landingPage, 300);
  const referrer = clip(body.referrer, 300);
  const utmSource = clip(body.utm?.source, 200);
  const utmMedium = clip(body.utm?.medium, 200);
  const utmCampaign = clip(body.utm?.campaign, 200);
  const utmTerm = clip(body.utm?.term, 200);
  const utmContent = clip(body.utm?.content, 200);
  const gclid = clip(body.clickIds?.gclid, 200);
  const gbraid = clip(body.clickIds?.gbraid, 200);
  const wbraid = clip(body.clickIds?.wbraid, 200);

  // A missing salt must fail loudly, not silently hash with an empty string — that would
  // quietly weaken the rate-limit hash instead of surfacing the misconfiguration.
  if (!workerEnv.IP_HASH_SALT) {
    return json({ ok: false, error: 'server' }, 500);
  }

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await hashIp(clientIp, workerEnv.IP_HASH_SALT);

  // Atomic check-and-reserve: the COUNT and the reservation INSERT are one SQLite statement,
  // so no concurrent request can read the same pre-increment count before either writes back
  // (the previous separate SELECT-then-INSERT had exactly that race). `meta.changes === 0`
  // means the WHERE clause suppressed the insert, i.e. the caller is already at the limit.
  const reservation = await workerEnv.DB.prepare(
    `INSERT INTO lead_submit_log (ip_hash)
     SELECT ? WHERE (
       SELECT COUNT(*) FROM lead_submit_log WHERE ip_hash = ? AND created_at > datetime('now', ?)
     ) < ?`,
  )
    .bind(ipHash, ipHash, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX)
    .run();

  if (!reservation.meta.changes) {
    return json({ ok: false, error: 'rate_limited' }, 429);
  }

  const rateLogRowId = reservation.meta.last_row_id;
  let leadId: number;

  try {
    const insert = await workerEnv.DB.prepare(
      `INSERT INTO leads (
        submission_id, name, phone, contact_method, direction, details,
        source_page, landing_page, referrer,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        gclid, gbraid, wbraid, consent_at, privacy_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        submissionId, name, phone, contactMethod, direction, details,
        sourcePage, landingPage, referrer,
        utmSource, utmMedium, utmCampaign, utmTerm, utmContent,
        gclid, gbraid, wbraid, consentAt, privacyVersion,
      )
      .run();

    leadId = Number(insert.meta.last_row_id ?? 0);
  } catch (error) {
    // The early lookup above already handles a sequential retry of an existing submissionId,
    // so reaching a UNIQUE-constraint failure here means a genuine concurrent race: two
    // requests for the same brand-new submissionId passed the early lookup at the same time
    // (neither saw the other's row yet), both reserved a rate-limit slot, and both attempted
    // this insert — exactly one wins. This is the loser's path, not a duplicate-retry path.
    if (String(error).includes('UNIQUE constraint failed')) {
      // The loser produced no new lead — undo its rate-limit reservation so this race never
      // costs the visitor a slot they didn't actually use. Best effort: if this delete fails
      // for some reason, the lead lookup below still succeeds and the client still gets the
      // correct response; the reservation just isn't rolled back.
      try {
        await workerEnv.DB.prepare('DELETE FROM lead_submit_log WHERE rowid = ?').bind(rateLogRowId).run();
      } catch {
        // Non-fatal — see comment above.
      }
      const existing = await workerEnv.DB.prepare('SELECT id FROM leads WHERE submission_id = ?')
        .bind(submissionId)
        .first<{ id: number }>();
      // isNew: false tells the client this was already accepted on a previous attempt — it
      // must not fire a second generate_lead conversion for the same underlying lead.
      if (existing) return json({ ok: true, id: existing.id, isNew: false });
    }
    return json({ ok: false, error: 'server' }, 500);
  }

  // D1 already has the lead — from here on, nothing can turn this response into a failure.
  // Notification is best-effort and happens after the fact is already true.
  try {
    await notifyTelegram(workerEnv, { name, phone, direction, contactMethod, sourcePage });
  } catch (error) {
    try {
      await workerEnv.DB.prepare(
        'INSERT INTO lead_notify_failures (lead_id, channel, error) VALUES (?, ?, ?)',
      )
        .bind(leadId, 'telegram', String(error).slice(0, 500))
        .run();
    } catch {
      // The lead itself is already saved — that's what matters if even this logging fails.
    }
  }

  return json({ ok: true, id: leadId, isNew: true });
}

async function notifyTelegram(
  targetEnv: Env,
  lead: { name: string; phone: string; direction: string; contactMethod: string; sourcePage: string },
) {
  if (!targetEnv.TELEGRAM_BOT_TOKEN || !targetEnv.TELEGRAM_CHAT_ID) {
    throw new Error('telegram not configured');
  }

  const text = [
    '🆕 Нова заявка з сайту',
    `Ім'я: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    `Напрям: ${lead.direction}`,
    `Зв'язок: ${lead.contactMethod}`,
    `Сторінка: ${lead.sourcePage || '—'}`,
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${targetEnv.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: targetEnv.TELEGRAM_CHAT_ID, text }),
  });

  if (!response.ok) {
    throw new Error(`telegram responded ${response.status}`);
  }
}
