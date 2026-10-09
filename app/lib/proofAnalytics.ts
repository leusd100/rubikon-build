import { hasAnalyticsConsent } from './consent';
import { queueGoogleCommand } from './googleCommand';

/** What a visitor does with HOME's proof block (the audit of 08.10: the block sent nothing, so nobody knew whether its tour,
 *  nodes or layers are used). Only with analytics consent; queued, never a delivery receipt; a failure never breaks it. */
export type ProofAction = 'tour_start' | 'node_open' | 'layer' | 'brief_click' | 'exit_click';

export function queueProofEvent(action: ProofAction, detail = ''): boolean {
  if (!hasAnalyticsConsent()) return false;
  try {
    queueGoogleCommand('event', 'proof_interaction', { proof_action: action, proof_detail: detail });
    return true;
  } catch {
    return false;
  }
}
