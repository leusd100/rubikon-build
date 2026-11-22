/** One idempotency key belongs to one lead lifecycle, not to the lifetime of the mounted form. */
let fallbackSequence = 0;

/** RFC 4122 version 4 from 16 secure random bytes, for a browser that has getRandomValues but not randomUUID. */
function uuidFromRandomBytes(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The key travels to D1 (`leads.submission_id`, UNIQUE) and, since DEC-06, to GA4 as `lead_submission_id`, so it must not
 * collide across visitors: a timestamp and a per-page counter alone did (ANALYTICS_REPAIR_SPEC §5). randomUUID first
 * (secure contexts), then getRandomValues (also on plain http), and the old timestamp key only where neither exists — no
 * browser the site supports — so the form still submits and D1's unique index remains the last barrier.
 */
export function createSubmissionId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto.getRandomValues === 'function') return uuidFromRandomBytes(crypto.getRandomValues(new Uint8Array(16)));
  }
  fallbackSequence += 1;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
}

/** A confirmed success starts the next lead lifecycle. Failed attempts deliberately do not call it. */
export function nextSubmissionIdAfterSuccess(createId = createSubmissionId): string {
  return createId();
}
