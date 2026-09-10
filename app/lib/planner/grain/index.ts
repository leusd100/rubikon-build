/**
 * Grain Planner domain — the public API.
 *
 * Pure TypeScript: no React, no DOM, no page copy. Ported from the standalone prototype
 * (`codex/grain-planner-v0.5 @ 819f163`) with behavioural parity pinned by
 * tests/unit/planner/grain/golden.test.ts. UI lives in app/components (Phase 2); this module is
 * what those components, the preliminary brief and (later) the inquiry attachment read from.
 */
export type { Answers, CapacityInfo, SingleChoice } from './answers';
export { formatCapacityInfo, parseCapacity } from './answers';

export type { ThemeAnswerState } from './rules';
export {
  countUnknowns,
  decisionBlockingUnknowns,
  firstClarificationTheme,
  hasActiveProcessing,
  hasDevelopmentIntent,
  hasExpansionTension,
  isThemeComplete,
  requiresFutureHandling,
  requiresHandling,
  routeDecision,
  shouldAskHandlingInProcessing,
  themeAnswerState,
} from './rules';

export type { Candidate, CandidateKey } from './candidates';
export { buildCandidates, comparisonRows, visibleCandidateKeys } from './candidates';

export type { TensionNote } from './understanding';
export { buildDrivers, buildFacts, expansionTension, panelInsight, synthesizeScenario } from './understanding';

export { buildUnknowns, engineeringGates, scenarioClientQuestions } from './boundary';

export { explainChanges } from './changes';
