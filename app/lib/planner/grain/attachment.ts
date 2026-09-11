/**
 * The grain brief as a shared inquiry attachment, and when the consultation changes its state.
 * Everything is derived from the domain — the text is formatGrainBriefText, the rows are the
 * brief's sections, the data is GrainPlannerStateV1 — so the form and /api/leads hold no grain logic.
 */
import {
  INQUIRY_ATTACHMENT_LABELS,
  transitionAttachment,
  type AttachmentEvent,
  type AttachmentStatus,
  type InquiryAttachment,
} from '../../inquiry/attachment';
import { parseCapacity, type Answers } from './answers';
import { createGrainBrief, formatGrainBriefText } from './brief';
import type { GrainFlowAction, GrainFlowState } from './flow';
import { createGrainPlannerState } from './state';
import { synthesizeScenario } from './understanding';
import { GRAIN_PLANNER_VERSION } from './version';

export function createGrainAttachment(answers: Answers): InquiryAttachment {
  const brief = createGrainBrief(answers);

  return {
    kind: 'grain-brief',
    version: GRAIN_PLANNER_VERSION,
    title: INQUIRY_ATTACHMENT_LABELS['grain-brief'].form,
    headline: brief.headline,
    // The scenario sentence is the text's first line after the header, so the form shows it as
    // the first row: every visible row is a line of the text, and every line of it is visible.
    sections: brief.sections.map((section, index) => ({
      id: section.id,
      heading: section.heading,
      rows: [
        ...(index === 0 ? [{ label: 'Сценарій', value: synthesizeScenario(answers) }] : []),
        ...section.rows.map(({ label, value }) => ({ label, value })),
      ],
    })),
    text: formatGrainBriefText(brief, answers),
    editHref: '#planner',
    dimensionsField: { mode: 'omit' },
    data: createGrainPlannerState(answers),
  };
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((item) => b.includes(item));

/**
 * Whether two sets of answers describe the same task. Order inside the multi-choice answers and the
 * spelling of the same capacity («12000» / «12 000») are not changes.
 */
export function sameGrainAnswers(a: Answers, b: Answers) {
  return sameSet(a.crops, b.crops)
    && sameSet(a.development, b.development)
    && JSON.stringify(parseCapacity(a.capacity)) === JSON.stringify(parseCapacity(b.capacity))
    && a.separation === b.separation
    && a.operation === b.operation
    && a.handling === b.handling
    && a.processing === b.processing
    && a.site === b.site
    && a.sitePressure === b.sitePressure
    && a.futureHandling === b.futureHandling;
}

/**
 * The attachment event a flow action causes, given the flow before it. Before the first reveal
 * there is no brief, so nothing attaches; the first reveal attaches; finishing an edit that really
 * changed an answer attaches again (also after «Не додавати»); «Почати спочатку» resets. Answering
 * and presentation — tabs, disclosures, the change banner — cause nothing.
 */
export function grainAttachmentEvent(status: AttachmentStatus, flow: GrainFlowState, action: GrainFlowAction): AttachmentEvent | null {
  switch (action.type) {
    case 'reveal':
      return { type: 'result-reveal' };
    case 'reset':
      return { type: 'reset' };
    case 'continue':
      if (!flow.editing || status.status === 'untouched' || sameGrainAnswers(flow.editing.snapshot, flow.answers)) return null;
      return { type: 'business-edit' };
    default:
      return null;
  }
}

export function reduceGrainAttachment(status: AttachmentStatus, flow: GrainFlowState, action: GrainFlowAction): AttachmentStatus {
  const event = grainAttachmentEvent(status, flow, action);
  return event ? transitionAttachment(status, event) : status;
}
