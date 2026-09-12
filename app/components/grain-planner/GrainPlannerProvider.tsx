'use client';

import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';
import { INITIAL_ATTACHMENT_STATUS, transitionAttachment, type AttachmentStatus } from '../../lib/inquiry/attachment';
import {
  GRAIN_READINESS_STEP,
  INITIAL_GRAIN_FLOW,
  buildFacts,
  createGrainAttachment,
  reduceGrainAttachment,
  reduceGrainFlow,
  type Answers,
  type GrainFlowAction,
  type GrainFlowState,
} from '../../lib/planner/grain';
import { useInquiryAttachmentSource } from '../inquiry/InquiryAttachmentProvider';
import { scrollAfterRender } from '../planner/plannerScroll';

type GrainPlannerContextValue = {
  state: GrainFlowState;
  /** The fact the last answer added — what the phone strip shows under the synthesis. */
  latestFact: string | null;
  changeOpen: boolean;
  setChangeOpen: (open: boolean) => void;
  /** Whether the brief is attached to the inquiry form right now. */
  briefAttached: boolean;
  answer: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
  continueTheme: (theme: number) => void;
  editTheme: (theme: number, fromResult?: boolean) => void;
  reveal: () => void;
  reset: () => void;
  /** «Передати опис RUBIKON»: attach the brief, also after «Не додавати». */
  attachBrief: () => void;
};

const GrainPlannerContext = createContext<GrainPlannerContextValue | null>(null);

/** The consultation and its inquiry attachment change together, so no render sees one without the other. */
type GrainSession = { flow: GrainFlowState; attachment: AttachmentStatus };
type GrainSessionAction = GrainFlowAction | { type: 'attach-brief' } | { type: 'detach-brief' };

const INITIAL_GRAIN_SESSION: GrainSession = { flow: INITIAL_GRAIN_FLOW, attachment: INITIAL_ATTACHMENT_STATUS };

function reduceGrainSession(session: GrainSession, action: GrainSessionAction): GrainSession {
  switch (action.type) {
    case 'attach-brief':
      return { ...session, attachment: transitionAttachment(session.attachment, { type: 'explicit-attach' }) };
    case 'detach-brief':
      return { ...session, attachment: transitionAttachment(session.attachment, { type: 'explicit-detach' }) };
    default:
      return {
        flow: reduceGrainFlow(session.flow, action),
        attachment: reduceGrainAttachment(session.attachment, session.flow, action),
      };
  }
}

const activeStep = () => document.querySelector('.planner-active-step');
const questionFor = (theme: number) => () => document.querySelector(`.planner-question[data-planner-theme="${theme}"]`);
const resultHeading = () => document.querySelector('#result [data-planner-anchor]');
const resultSection = () => document.getElementById('result');

/**
 * One consultation shared by the planner band and the result band. State transitions are the
 * domain reducers (app/lib/planner/grain: flow.ts and attachment.ts); this adds where the page
 * scrolls next, and publishes the brief to the page's inquiry form while it is attached.
 */
export function GrainPlannerProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(reduceGrainSession, INITIAL_GRAIN_SESSION);
  const [latestFact, setLatestFact] = useState<string | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const state = session.flow;
  const briefAttached = session.attachment.status === 'attached';

  const detachBrief = useCallback(() => dispatch({ type: 'detach-brief' }), []);
  const attachment = useMemo(
    () => (briefAttached ? createGrainAttachment(state.answers) : null),
    [briefAttached, state.answers],
  );
  const source = useMemo(
    () => ({ attachment, status: session.attachment, detach: detachBrief }),
    [attachment, session.attachment, detachBrief],
  );
  useInquiryAttachmentSource(source);

  const value = useMemo<GrainPlannerContextValue>(() => ({
    state,
    latestFact,
    changeOpen,
    setChangeOpen,
    briefAttached,
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
      else if (next.resultVisible && state.editing) scrollAfterRender(resultHeading, 'start', resultSection);
      else scrollAfterRender(() => document.querySelector('.planner-readiness'), 'center');
    },
    editTheme: (theme, fromResult = false) => {
      dispatch({ type: 'edit', theme, fromResult });
      scrollAfterRender(questionFor(theme));
    },
    reveal: () => {
      dispatch({ type: 'reveal' });
      scrollAfterRender(resultHeading, 'start', resultSection);
    },
    reset: () => {
      dispatch({ type: 'reset' });
      setLatestFact(null);
      setChangeOpen(false);
      scrollAfterRender(() => document.getElementById('planner'));
    },
    attachBrief: () => dispatch({ type: 'attach-brief' }),
  }), [state, latestFact, changeOpen, briefAttached]);

  return <GrainPlannerContext.Provider value={value}>{children}</GrainPlannerContext.Provider>;
}

export function useGrainPlanner() {
  const value = useContext(GrainPlannerContext);
  if (!value) throw new Error('useGrainPlanner must be used inside <GrainPlannerProvider>.');
  return value;
}
