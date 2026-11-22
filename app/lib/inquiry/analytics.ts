import { queueGoogleCommand } from '../googleCommand';
import { canMeasureAnalytics } from '../analyticsHost';

export type InquiryEventParameters = { contact_method: string; project_direction: string };
/** A saved lead also carries its anonymous submission key, the same value D1 stores as `leads.submission_id` (DEC-06). */
export type LeadEventParameters = InquiryEventParameters & { lead_submission_id: string };

/** Queue locally, not a GA delivery receipt. Tracking failures must never break the form. */
export function queueInquiryAnalyticsEvent(name: 'inquiry_contact_attempt', parameters: InquiryEventParameters): boolean;
export function queueInquiryAnalyticsEvent(name: 'generate_lead', parameters: LeadEventParameters): boolean;
export function queueInquiryAnalyticsEvent(
  name: 'inquiry_contact_attempt' | 'generate_lead',
  parameters: InquiryEventParameters | LeadEventParameters,
): boolean {
  if (!canMeasureAnalytics()) return false;
  try {
    queueGoogleCommand('event', name, parameters);
    return true;
  } catch {
    return false;
  }
}
