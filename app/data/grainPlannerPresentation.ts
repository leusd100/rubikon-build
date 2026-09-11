/**
 * How the Grain Planner is shown — every decision that stays open until real users have tested it
 * (Implementation Spec v1 §5, §H). Declarative on purpose: changing any value here must never
 * require a change in app/lib/planner/**. The domain decides what is true; this decides how it is
 * laid out.
 */
export type GrainResultBlock = 'change' | 'scenario' | 'outcome' | 'development' | 'boundary' | 'brief';
export type GrainCollapsibleBlock = 'boundary' | 'conceptDetail' | 'comparison';

export type GrainPlannerPresentation = {
  /** Show the first question straight away, or only the themes and a start button. */
  entry: 'cover-with-first-question' | 'cover-only';
  liveUnderstanding: {
    desktop: 'panel';
    /** ≤ 1050 px: the strip above the active step, plus a compact summary at readiness. */
    mobile: 'strip' | 'strip+summary';
  };
  result: {
    /** Order of the personalised result, top to bottom. DOM order follows it, not just pixels. */
    desktop: GrainResultBlock[];
    mobile: GrainResultBlock[];
    /** Collapsed behind a disclosure on narrow screens. */
    collapsedOnMobile: GrainCollapsibleBlock[];
    /** WHY inside the concept detail, or its first reason on each card as well. */
    whyPlacement: 'detail' | 'card';
  };
  /** `compact` drops «Як це зрозуміти» from the clarification cards. */
  clarificationDensity: 'full' | 'compact';
  handoff: {
    position: 'after-brief' | 'after-outcome';
    /** The floating «До заявки» on phones arrives with the inquiry attachment (Phase 3). */
    mobileCta: boolean;
  };
};

export const grainPlannerPresentation: GrainPlannerPresentation = {
  entry: 'cover-with-first-question',
  liveUnderstanding: { desktop: 'panel', mobile: 'strip+summary' },
  result: {
    desktop: ['change', 'scenario', 'outcome', 'development', 'boundary', 'brief'],
    mobile: ['change', 'scenario', 'outcome', 'brief', 'boundary', 'development'],
    collapsedOnMobile: ['boundary', 'conceptDetail', 'comparison'],
    whyPlacement: 'detail',
  },
  clarificationDensity: 'full',
  handoff: { position: 'after-brief', mobileCta: true },
};
