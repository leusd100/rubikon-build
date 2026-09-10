import { describe, expect, it } from 'vitest';
import golden from './__golden__/prototype-819f163.json';
import { fixtures } from './fixtures';
import {
  EMPTY_GRAIN_ANSWERS,
  GRAIN_READINESS_STEP,
  INITIAL_GRAIN_FLOW,
  explainChanges,
  reduceGrainFlow,
  type GrainFlowAction,
  type GrainFlowState,
} from '../../../../app/lib/planner/grain';

const run = (actions: GrainFlowAction[], from: GrainFlowState = INITIAL_GRAIN_FLOW) => actions.reduce(reduceGrainFlow, from);
const continueAll: GrainFlowAction[] = [0, 1, 2, 3, 4].map((theme) => ({ type: 'continue', theme }));
/** DEMO answered, all five themes continued, result revealed — the state the batch #3 edits started from. */
const revealedDemo = run([...continueAll, { type: 'reveal' }], { ...INITIAL_GRAIN_FLOW, answers: fixtures.DEMO });

describe('grain flow reducer — parity with the prototype PlannerApp handlers', () => {
  it('answering changes only the answered key', () => {
    const state = run([{ type: 'answer', key: 'operation', value: 'high' }]);
    expect(state.answers).toEqual({ ...EMPTY_GRAIN_ANSWERS, operation: 'high' });
    expect(state.activeTheme).toBe(0);
  });

  it('continuing walks themes 0→4 and ends on the readiness step without showing the result', () => {
    const state = run(continueAll, { ...INITIAL_GRAIN_FLOW, answers: fixtures.A });
    expect(state.activeTheme).toBe(GRAIN_READINESS_STEP);
    expect(state.completed).toEqual([0, 1, 2, 3, 4]);
    expect(state.resultVisible).toBe(false);
    expect(state.changeNotes).toEqual([]);
  });

  it('reveal shows the result', () => {
    expect(revealedDemo.resultVisible).toBe(true);
  });

  it('editing from the result hides it, and continuing returns straight to it with consequence notes', () => {
    const editing = run([{ type: 'edit', theme: 3, fromResult: true }], revealedDemo);
    expect(editing.resultVisible).toBe(false);
    expect(editing.activeTheme).toBe(3);
    expect(editing.editing).toEqual({ theme: 3, snapshot: fixtures.DEMO });

    const done = run([{ type: 'answer', key: 'sitePressure', value: 'space' }, { type: 'continue', theme: 3 }], editing);
    expect(done.activeTheme).toBe(GRAIN_READINESS_STEP);
    expect(done.resultVisible).toBe(true);
    expect(done.editing).toBeNull();
    // The same note the prototype rendered for this edit.
    expect(done.changeNotes).toEqual(golden.dom.DEMO.edits[0].notes);
  });

  it('keeps the first snapshot when the visitor switches themes mid-edit', () => {
    const state = run([
      { type: 'edit', theme: 3 },
      { type: 'answer', key: 'sitePressure', value: 'space' },
      { type: 'edit', theme: 0 },
      { type: 'answer', key: 'separation', value: 'shared' },
      { type: 'continue', theme: 0 },
    ], revealedDemo);
    expect(state.changeNotes).toEqual(explainChanges(fixtures.DEMO, { ...fixtures.DEMO, sitePressure: 'space', separation: 'shared' }));
  });

  it('editing without coming from the result leaves its visibility alone', () => {
    expect(run([{ type: 'edit', theme: 1 }], revealedDemo).resultVisible).toBe(true);
  });

  it('an edit before every theme is complete continues to the next theme, not to the result', () => {
    const partial = run([{ type: 'continue', theme: 0 }, { type: 'continue', theme: 1 }], { ...INITIAL_GRAIN_FLOW, answers: fixtures.A });
    const state = run([{ type: 'edit', theme: 0 }, { type: 'continue', theme: 0 }], partial);
    expect(state.activeTheme).toBe(1);
    expect(state.resultVisible).toBe(false);
    expect(state.changeNotes).toEqual(['Підтверджені факти не змінилися.']);
  });

  it('the edit snapshot is a copy, not a reference to the live answer arrays', () => {
    const editing = run([{ type: 'edit', theme: 0 }], revealedDemo);
    expect(editing.editing?.snapshot.crops).not.toBe(revealedDemo.answers.crops);
    expect(editing.editing?.snapshot.development).not.toBe(revealedDemo.answers.development);
  });

  it('reset clears answers, progress, result and notes — and, like 819f163, leaves an edit in progress', () => {
    const midEdit = run([{ type: 'edit', theme: 2, fromResult: true }], revealedDemo);
    const state = reduceGrainFlow(midEdit, { type: 'reset' });
    expect(state).toEqual({ ...INITIAL_GRAIN_FLOW, editing: midEdit.editing });
  });
});
