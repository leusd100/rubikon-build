import { describe, expect, it } from 'vitest';
import {
  INITIAL_ATTACHMENT_STATUS,
  INQUIRY_ATTACHMENT_DATA_LIMIT,
  INQUIRY_ATTACHMENT_TEXT_LIMIT,
  transitionAttachment,
  type AttachmentStatus,
} from '../../../../app/lib/inquiry/attachment';
import {
  GRAIN_PLANNER_VERSION,
  INITIAL_GRAIN_FLOW,
  createGrainAttachment,
  createGrainBrief,
  createGrainPlannerState,
  cropOptions,
  developmentOptions,
  formatGrainBriefText,
  reduceGrainAttachment,
  reduceGrainFlow,
  sameGrainAnswers,
  synthesizeScenario,
  validateGrainPlannerState,
  type Answers,
  type GrainFlowAction,
  type GrainFlowState,
} from '../../../../app/lib/planner/grain';
import { fixtureNames, fixtures } from './fixtures';

describe('createGrainAttachment', () => {
  for (const name of fixtureNames) {
    it(`${name}: text, rows and structured state all come from the domain`, () => {
      const answers = fixtures[name];
      const attachment = createGrainAttachment(answers);
      const brief = createGrainBrief(answers);

      expect(attachment).toMatchObject({
        kind: 'grain-brief',
        version: GRAIN_PLANNER_VERSION,
        title: 'До заявки додано ваш опис задачі',
        headline: brief.headline,
        editHref: '#planner',
        dimensionsField: { mode: 'omit' },
      });
      expect(attachment.text).toBe(formatGrainBriefText(brief, answers));
      expect(attachment.text.length).toBeLessThanOrEqual(INQUIRY_ATTACHMENT_TEXT_LIMIT);
      expect(attachment.data).toEqual(createGrainPlannerState(answers));
      expect(validateGrainPlannerState(attachment.data)).toBe(true);
      expect(JSON.stringify(attachment.data).length).toBeLessThanOrEqual(INQUIRY_ATTACHMENT_DATA_LIMIT);
    });

    it(`${name}: every visible row is a line of the text, and every line after the header is a visible row`, () => {
      const answers = fixtures[name];
      const attachment = createGrainAttachment(answers);
      const rows = attachment.sections.flatMap((section) => section.rows.map((row) => `${row.label}: ${row.value}`));
      const [header, ...lines] = attachment.text.split('\n');

      expect(header).toBe('Опис задачі (Зерновий планувальник v1)');
      expect(lines).toEqual(rows);
      expect(rows[0]).toBe(`Сценарій: ${synthesizeScenario(answers)}`);
    });
  }

  it('keeps the structured state under the data limit for the largest possible answers', () => {
    const largest: Answers = {
      ...fixtures.B,
      crops: [...cropOptions],
      capacity: '1'.repeat(40),
      development: developmentOptions.map(([id]) => id),
    };
    expect(JSON.stringify(createGrainAttachment(largest).data).length).toBeLessThanOrEqual(INQUIRY_ATTACHMENT_DATA_LIMIT);
  });
});

describe('sameGrainAnswers', () => {
  it('ignores order inside multi-choice answers and the spelling of one capacity', () => {
    expect(sameGrainAnswers(fixtures.B, { ...fixtures.B, crops: [...fixtures.B.crops].reverse(), development: [...fixtures.B.development].reverse() })).toBe(true);
    expect(sameGrainAnswers({ ...fixtures.B, capacity: '12000' }, { ...fixtures.B, capacity: '12 000' })).toBe(true);
  });

  it('sees every business answer change', () => {
    const changes: Partial<Answers>[] = [
      { crops: ['Пшениця'] },
      { capacity: '9000' },
      { separation: 'shared' },
      { operation: 'seasonal' },
      { handling: 'mobile' },
      { processing: 'none' },
      { site: 'existing' },
      { sitePressure: 'space' },
      { development: ['capacity'] },
      { futureHandling: null },
    ];
    for (const change of changes) expect(sameGrainAnswers(fixtures.B, { ...fixtures.B, ...change })).toBe(false);
  });
});

type Step = GrainFlowAction | 'detach' | 'attach';

/** Runs the flow and the attachment side by side, as GrainPlannerProvider does. */
function run(steps: Step[], start: { flow: GrainFlowState; status: AttachmentStatus } = { flow: INITIAL_GRAIN_FLOW, status: INITIAL_ATTACHMENT_STATUS }) {
  let { flow, status } = start;
  for (const step of steps) {
    if (step === 'detach') status = transitionAttachment(status, { type: 'explicit-detach' });
    else if (step === 'attach') status = transitionAttachment(status, { type: 'explicit-attach' });
    else {
      status = reduceGrainAttachment(status, flow, step);
      flow = reduceGrainFlow(flow, step);
    }
  }
  return { flow, status };
}

function answerAll(answers: Answers): GrainFlowAction[] {
  return [
    ...(Object.entries(answers).map(([key, value]) => ({ type: 'answer', key, value }) as GrainFlowAction)),
    ...[0, 1, 2, 3, 4].map((theme) => ({ type: 'continue', theme }) as const),
  ];
}

const reveal: GrainFlowAction = { type: 'reveal' };
const editSite = (value: Answers['sitePressure']): GrainFlowAction[] => [
  { type: 'edit', theme: 3, fromResult: true },
  { type: 'answer', key: 'sitePressure', value },
  { type: 'continue', theme: 3 },
];

describe('grain attachment lifecycle', () => {
  it('attaches nothing while the consultation is answered, before the first reveal', () => {
    expect(run(answerAll(fixtures.A)).status).toEqual({ status: 'untouched', reason: null });
  });

  it('attaches on the first reveal, and a later reveal changes nothing', () => {
    const revealed = run([...answerAll(fixtures.A), reveal]);
    expect(revealed.status).toEqual({ status: 'attached', reason: 'result-reveal' });
    expect(run([reveal], revealed).status).toBe(revealed.status);
  });

  it('keeps «Не додавати» through another reveal', () => {
    const detached = run([...answerAll(fixtures.A), reveal, 'detach', reveal]);
    expect(detached.status).toEqual({ status: 'detached', reason: 'explicit-detach' });
  });

  it('re-attaches after «Не додавати» when an edit really changes an answer', () => {
    const edited = run([...answerAll(fixtures.A), reveal, 'detach', ...editSite('compact')]);
    expect(edited.status).toEqual({ status: 'attached', reason: 'business-edit' });
    expect(edited.flow.resultVisible).toBe(true);
  });

  it('fires nothing for an edit that ends where it started', () => {
    const unchanged = run([...answerAll(fixtures.A), reveal, 'detach', ...editSite('space')]);
    expect(unchanged.status).toEqual({ status: 'detached', reason: 'explicit-detach' });

    const changedAndBack = run([
      ...answerAll(fixtures.A), reveal, 'detach',
      { type: 'edit', theme: 3, fromResult: true },
      { type: 'answer', key: 'sitePressure', value: 'compact' },
      { type: 'answer', key: 'sitePressure', value: 'space' },
      { type: 'continue', theme: 3 },
    ]);
    expect(changedAndBack.status).toEqual({ status: 'detached', reason: 'explicit-detach' });
  });

  it('does not re-attach while an edit is still open', () => {
    const open = run([...answerAll(fixtures.A), reveal, 'detach', { type: 'edit', theme: 3, fromResult: true }, { type: 'answer', key: 'sitePressure', value: 'compact' }]);
    expect(open.status).toEqual({ status: 'detached', reason: 'explicit-detach' });
  });

  it('attaches nothing for an edit made before the first reveal', () => {
    const earlyEdit = run([
      ...answerAll(fixtures.A),
      { type: 'edit', theme: 0 },
      { type: 'answer', key: 'capacity', value: '5000' },
      { type: 'continue', theme: 0 },
    ]);
    expect(earlyEdit.status).toEqual({ status: 'untouched', reason: null });
    expect(run([reveal], earlyEdit).status).toEqual({ status: 'attached', reason: 'result-reveal' });
  });

  it('attaches explicitly after «Не додавати» (the handoff CTA)', () => {
    expect(run([...answerAll(fixtures.A), reveal, 'detach', 'attach']).status).toEqual({ status: 'attached', reason: 'explicit-action' });
  });

  it('returns to untouched on «Почати спочатку», whatever came before', () => {
    for (const before of [[] as Step[], ['detach'] as Step[], editSite('compact')]) {
      const reset = run([...answerAll(fixtures.A), reveal, ...before, { type: 'reset' }]);
      expect(reset.status).toEqual({ status: 'untouched', reason: null });
      expect(reset.flow).toBe(INITIAL_GRAIN_FLOW);
    }
  });
});
