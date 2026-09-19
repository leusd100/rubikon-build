import { queueGoogleCommand } from '../googleCommand';
import { hasAnalyticsConsent } from '../consent';

/** Queue locally, not a GA delivery receipt. Tracking failures must never break the form. */
export function queueInquiryAnalyticsEvent(
  name: 'inquiry_contact_attempt' | 'generate_lead',
  parameters: { contact_method: string; project_direction: string },
): boolean {
  if (!hasAnalyticsConsent()) return false;
  try {
    queueGoogleCommand('event', name, parameters);
    return true;
  } catch {
    return false;
  }
}
