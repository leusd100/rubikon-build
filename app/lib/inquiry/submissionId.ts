/** One idempotency key belongs to one lead lifecycle, not to the lifetime of the mounted form. */
let fallbackSequence = 0;

export function createSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  fallbackSequence += 1;
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
}

/** A confirmed success starts the next lead lifecycle. Failed attempts deliberately do not call it. */
export function nextSubmissionIdAfterSuccess(createId = createSubmissionId): string {
  return createId();
}
