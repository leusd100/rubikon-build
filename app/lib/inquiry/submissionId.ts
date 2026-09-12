/** One idempotency key belongs to one lead lifecycle, not to the lifetime of the mounted form. */
export function createSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** Failed/retry attempts retain the key; a confirmed success starts the next lead lifecycle. */
export function submissionIdAfterAttempt(current: string, accepted: boolean, createId = createSubmissionId): string {
  return accepted ? createId() : current;
}
