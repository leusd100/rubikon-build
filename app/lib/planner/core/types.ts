/**
 * Universal Planner Core — types only.
 *
 * The contract every object-level planner (grain today, hangar/metal/concrete later) can be
 * described by. It deliberately knows nothing about a domain: no grain words, no React, no
 * behaviour. `app/lib/planner/grain` satisfies these shapes; a shared engine is built only once
 * a second planner exists (rule of two), not speculatively now.
 *
 * Reserved, intentionally NOT modelled in v1: Constraint, DerivedNeed, Evidence. Grain still
 * expresses them as functions (requiresHandling, sitePressure, …), not as types.
 */

export type ThemeState = 'incomplete' | 'unknown' | 'confirmed';

export type PlannerTheme = { id: string; title: string; note: string };

/** v1: `id` equals `label`; the prototype detects new facts by comparing strings. */
export type CustomerFact = { id: string; label: string };

export type DecisionDriver = { id: string; label: string; explanation: string };

export type Insight = { kind: string; title: string; body: string };

export type Tension = { kind: string; title: string; body: string };

export type DecisionOutcome = 'candidateComparison' | 'clarificationRequired';

export type CandidateApproach<K extends string = string> = {
  key: K;
  category: string;
  title: string;
  label: string;
  summary: string;
  reasons: string[];
  careful: string[];
};

export type Unknown = { id: string; title: string; blocking: boolean; why: string; how: string };

export type EngineeringGate = { id: string; label: string };

export type ReadinessState = { understanding: string; decision: string; brief: string };

export type BriefRow = { label: string; value: string; themeIndex?: number };

export type BriefSection = { id: string; heading: string; rows: BriefRow[] };

export type PreliminaryBrief = { headline: string; sections: BriefSection[] };

export type ChangeExplanation = string[];

export type PlannerAction =
  | { type: 'editTheme'; themeIndex: number; fromResult?: boolean }
  | { type: 'reveal' }
  | { type: 'reset' };
