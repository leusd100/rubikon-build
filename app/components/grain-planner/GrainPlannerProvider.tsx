'use client';

import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';
import {
  GRAIN_READINESS_STEP,
  INITIAL_GRAIN_FLOW,
  buildFacts,
  reduceGrainFlow,
  type Answers,
  type GrainFlowAction,
  type GrainFlowState,
} from '../../lib/planner/grain';
import { scrollAfterRender } from '../planner/plannerScroll';

type GrainPlannerContextValue = {
  state: GrainFlowState;
  /** The fact the last answer added — what the phone strip shows under the synthesis. */
  latestFact: string | null;
  changeOpen: boolean;
  setChangeOpen: (open: boolean) => void;
  answer: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
  continueTheme: (theme: number) => void;
  editTheme: (theme: number, fromResult?: boolean) => void;
  reveal: () => void;
  reset: () => void;
};

const GrainPlannerContext = createContext<GrainPlannerContextValue | null>(null);

const activeStep = () => document.querySelector('.planner-active-step');
const questionFor = (theme: number) => () => document.querySelector(`.planner-question[data-planner-theme="${theme}"]`);
const resultBand = () => document.querySelector('#result [data-planner-anchor]') ?? document.getElementById('result');

/**
 * One consultation shared by the planner band and the result band. State transitions are the
 * domain reducer (app/lib/planner/grain/flow.ts); this adds only where the page scrolls next.
 */
export function GrainPlannerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceGrainFlow, INITIAL_GRAIN_FLOW);
  const [latestFact, setLatestFact] = useState<string | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);

  const value = useMemo<GrainPlannerContextValue>(() => ({
    state,
    latestFact,
    changeOpen,
    setChangeOpen,
    answer: (key, value) => {
      // Same rule as the prototype's effect, computed in the event instead: the newest added fact,
      // kept while nothing new appears, cleared when no facts remain.
      const before = buildFacts(state.answers);
      const after = buildFacts({ ...state.answers, [key]: value });
      const added = after.filter((fact) => !before.includes(fact));
      const newest = added.at(-1);
      if (newest) setLatestFact(newest);
      else if (!after.length) setLatestFact(null);
      dispatch({ type: 'answer', key, value } as GrainFlowAction);
    },
    continueTheme: (theme) => {
      const next = reduceGrainFlow(state, { type: 'continue', theme });
      if (state.editing) setChangeOpen(false);
      dispatch({ type: 'continue', theme });
      if (next.activeTheme < GRAIN_READINESS_STEP) scrollAfterRender(activeStep);
      else if (next.resultVisible && state.editing) scrollAfterRender(resultBand);
      else scrollAfterRender(() => document.querySelector('.planner-readiness'), 'center');
    },
    editTheme: (theme, fromResult = false) => {
      dispatch({ type: 'edit', theme, fromResult });
      scrollAfterRender(questionFor(theme));
    },
    reveal: () => {
      dispatch({ type: 'reveal' });
      scrollAfterRender(resultBand);
    },
    reset: () => {
      dispatch({ type: 'reset' });
      setLatestFact(null);
      setChangeOpen(false);
      scrollAfterRender(() => document.getElementById('planner'));
    },
  }), [state, latestFact, changeOpen]);

  return <GrainPlannerContext.Provider value={value}>{children}</GrainPlannerContext.Provider>;
}

export function useGrainPlanner() {
  const value = useContext(GrainPlannerContext);
  if (!value) throw new Error('useGrainPlanner must be used inside <GrainPlannerProvider>.');
  return value;
}
