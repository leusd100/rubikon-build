import { hasAnalyticsConsent } from '../consent';
import { queueInquiryAnalyticsEvent } from './analytics';
import { createSubmissionId } from './submissionId';

/** The last submit of this lead lifecycle: its idempotency key and the business payload it carried. */
export type SubmitAttempt = { id: string; signature: string };

/**
 * One business payload belongs to one idempotency key. A retry of the same payload keeps its key;
 * changed fields (including attachments) are a new inquiry, never a silent acknowledgement of an
 * old payload. The first attempt of a lifecycle takes the key the form already holds.
 */
export function attemptSubmissionId(last: SubmitAttempt | null, signature: string, firstId: string, createId = createSubmissionId): string {
  if (!last) return firstId;
  return last.signature === signature ? last.id : createId();
}

/**
 * Count a saved lead once per mounted form, including a duplicate acknowledgement after a lost
 * response. Server identity also protects against repeated acknowledgements; isNew=false alone
 * cannot distinguish a lost response from an already-counted lead.
 */
export function acknowledgeSavedLead(
  leadId: number | undefined,
  acknowledged: Set<number>,
  parameters: { contact_method: string; project_direction: string },
): void {
  const firstAcknowledgement = typeof leadId === 'number' && leadId > 0 && !acknowledged.has(leadId);
  if (!firstAcknowledgement) return;
  const consentGranted = hasAnalyticsConsent();
  const queued = consentGranted && queueInquiryAnalyticsEvent('generate_lead', parameters);
  // No retroactive event after denial; eligible events are deduplicated only once queued.
  if (!consentGranted || queued) acknowledged.add(leadId);
}
