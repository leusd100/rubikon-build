import { canMeasureAnalytics } from '../analyticsHost';
import { queueInquiryAnalyticsEvent, type InquiryEventParameters } from './analytics';
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
 *
 * The event names the lead by `submissionId`, the key the request carried and D1 stored as `leads.submission_id`, so an
 * observed GA4 lead joins exactly one stored row (ANALYTICS_REPAIR_SPEC §5). A random per-lead key: no person, phone or
 * GA client id.
 */
export function acknowledgeSavedLead(
  leadId: number | undefined,
  submissionId: string,
  acknowledged: Set<number>,
  parameters: InquiryEventParameters,
): void {
  const firstAcknowledgement = typeof leadId === 'number' && leadId > 0 && !acknowledged.has(leadId);
  if (!firstAcknowledgement) return;
  const measurable = canMeasureAnalytics();
  const queued = measurable && queueInquiryAnalyticsEvent('generate_lead', { ...parameters, lead_submission_id: submissionId });
  // No retroactive event after denial or off the production host; eligible events are deduplicated only once queued.
  if (!measurable || queued) acknowledged.add(leadId);
}
