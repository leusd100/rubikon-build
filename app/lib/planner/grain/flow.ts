/**
 * The consultation's flow as a pure reducer: answering, continuing to the next theme, editing a
 * theme (from the consultation or from the result), revealing the result and resetting.
 *
 * Semantics are the prototype's PlannerApp handlers (app/planner.tsx, `819f163`) — patchAnswer,
 * continueTheme, editTheme, reveal, reset — minus their scroll side effects and the prototype-only
 * demo loader. UI state (open tab, open driver, comparison toggle) is not flow and stays in the
 * components.
 */
import { EMPTY_GRAIN_ANSWERS, type Answers } from './answers';
import { explainChanges } from './changes';
import { isThemeComplete } from './rules';

/** Theme indices 0–4 are questions; 5 is the readiness check. */
export const GRAIN_READINESS_STEP = 5;

export type GrainFlowState = {
  /** Live answers while the visitor is editing. */
  answers: Answers;
  /** Last answers accepted by a completed, valid theme; inquiry data is derived only from this. */
  committedAnswers: Answers;
  activeTheme: number;
  completed: number[];
  /** The theme being edited and the answers as they were when editing started. */
  editing: { theme: number; snapshot: Answers } | null;
  resultVisible: boolean;
  changeNotes: string[];
};

export type GrainFlowAction =
  | { [K in keyof Answers]: { type: 'answer'; key: K; value: Answers[K] } }[keyof Answers]
  | { type: 'continue'; theme: number }
  | { type: 'edit'; theme: number; fromResult?: boolean }
  | { type: 'reveal' }
  | { type: 'reset' };

export const INITIAL_GRAIN_FLOW: GrainFlowState = {
  answers: EMPTY_GRAIN_ANSWERS,
  committedAnswers: EMPTY_GRAIN_ANSWERS,
  activeTheme: 0,
  completed: [],
  editing: null,
  resultVisible: false,
  changeNotes: [],
};

function continueGrainFlow(state: GrainFlowState, action: Extract<GrainFlowAction, { type: 'continue' }>): GrainFlowState {
  if (!isThemeComplete(action.theme, state.answers)) return state;
  const editing = state.editing;
  // `state.completed` is the list *before* this theme is added, as in the prototype's closure.
  const next = editing && state.completed.length === 5 ? GRAIN_READINESS_STEP : action.theme === 4 ? GRAIN_READINESS_STEP : action.theme + 1;
  return {
    ...state,
    committedAnswers: {
      ...state.answers,
      crops: [...state.answers.crops],
      development: [...state.answers.development],
    },
    completed: Array.from(new Set([...state.completed, action.theme])),
    activeTheme: next,
    editing: null,
    changeNotes: editing ? explainChanges(editing.snapshot, state.answers) : state.changeNotes,
    resultVisible: next === GRAIN_READINESS_STEP && editing ? true : state.resultVisible,
  };
}

export function reduceGrainFlow(state: GrainFlowState, action: GrainFlowAction): GrainFlowState {
  switch (action.type) {
    case 'answer':
      return { ...state, answers: { ...state.answers, [action.key]: action.value } };

    case 'continue':
      return continueGrainFlow(state, action);

    case 'edit':
      return {
        ...state,
        // The snapshot is taken once, when the first edit starts; switching to another theme
        // before continuing keeps it, so the change notes describe the whole edit.
        editing: {
          theme: action.theme,
          snapshot: state.editing?.snapshot ?? { ...state.answers, crops: [...state.answers.crops], development: [...state.answers.development] },
        },
        activeTheme: action.theme,
        resultVisible: action.fromResult ? false : state.resultVisible,
      };

    case 'reveal':
      return { ...state, resultVisible: true };

    case 'reset':
      // «Почати спочатку» returns to the canonical initial state — including ending an edit in
      // progress. Deliberate change from prototype 819f163, whose reset() kept the edit snapshot:
      // the next «Продовжити» then explained the fresh answers against the abandoned consultation.
      return INITIAL_GRAIN_FLOW;
  }
}
