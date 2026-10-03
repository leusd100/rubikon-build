import { transitionAttachment } from '../inquiry/attachment';
import { sameObjectProfile } from './objectProfile';
import type { ConfiguratorState } from './types';

export type HangarAttachmentState =
  | { status: 'untouched'; reason: null }
  | { status: 'attached'; reason: 'business-edit' | 'explicit-action' }
  | { status: 'detached'; reason: 'explicit-detach' };

export type HangarAttachmentEvent =
  | { type: 'business-edit' }
  | { type: 'explicit-attach' }
  | { type: 'explicit-detach' }
  | { type: 'presentation-only' };

export const INITIAL_HANGAR_ATTACHMENT: HangarAttachmentState = {
  status: 'untouched',
  reason: null,
};

/**
 * The attachment contract is deliberately separate from ConfiguratorState. Technical/3D mode,
 * fullscreen, scale helpers, demo state and render colours are presentation concerns and must not
 * become lead data merely because they changed on screen.
 *
 * A real business edit re-attaches after an explicit detach. That is the least surprising version
 * of the automatic contract: "Не додавати" applies to the current configuration, while a later
 * parameter change is fresh intent. An unchanged commit is filtered before this transition.
 *
 * The state machine itself is the shared inquiry contract (app/lib/inquiry/attachment.ts); for
 * these four events it is exactly this contract, so the result never carries a planner-only reason.
 */
export function transitionHangarAttachment(
  current: HangarAttachmentState,
  event: HangarAttachmentEvent,
): HangarAttachmentState {
  return transitionAttachment(current, event) as HangarAttachmentState;
}

/**
 * The same hangar as drawn: every business field but the object profile (purpose, project, region, lifting equipment),
 * which changes no drawing — answering «Для чого ангар?» must not relabel the example's drawings «Ваш ангар» (03.10).
 */
export function sameDrawnHangar(a: ConfiguratorState, b: ConfiguratorState): boolean {
  return sameBusinessConfiguration({ ...a, objectProfile: b.objectProfile }, b);
}

/**
 * Exact business-state equality. Presentation state is intentionally absent from this type. `ridgeEdited` is left out
 * on purpose: the controls set it only together with a changed ridge, so the ridge value already answers the question,
 * and an edited ridge set back to the default is the default configuration again.
 */
export function sameBusinessConfiguration(a: ConfiguratorState, b: ConfiguratorState): boolean {
  return a.dimensions.width === b.dimensions.width
    && a.dimensions.length === b.dimensions.length
    && a.dimensions.height === b.dimensions.height
    && a.ridgeHeightM === b.ridgeHeightM
    && a.envelope === b.envelope
    && a.wallSystem === b.wallSystem
    && a.roofSystem === b.roofSystem
    && a.foundationType === b.foundationType
    && a.gates === b.gates
    && a.gateType === b.gateType
    && a.doors === b.doors
    && sameObjectProfile(a.objectProfile, b.objectProfile)
    && a.scope.length === b.scope.length
    && a.scope.every((item) => b.scope.includes(item));
}
