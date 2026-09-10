/**
 * Grain Planner domain — the public API.
 *
 * Pure TypeScript: no React, no DOM, no page copy. Ported from the standalone prototype
 * (`codex/grain-planner-v0.5 @ 819f163`) with behavioural parity pinned by
 * tests/unit/planner/grain/golden*.test.ts. UI lives in app/components (Phase 2); this module is
 * what those components, the preliminary brief and (later) the inquiry attachment read from.
 */
export type { Answers, CapacityInfo, SingleChoice } from './answers';
export { EMPTY_GRAIN_ANSWERS, formatCapacityInfo, parseCapacity } from './answers';

export {
  cropOptions,
  developmentOptions,
  handlingOptions,
  operationOptions,
  processingOptions,
  separationOptions,
  siteOptions,
  sitePressureOptions,
  themeNotes,
  themes,
} from './options';

export { developmentLabel, uiLabels } from './labels';

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
export { buildCandidates, comparisonCell, comparisonRows, visibleCandidateKeys } from './candidates';

export type { TensionNote } from './understanding';
export {
  buildDrivers,
  buildFacts,
  driverExplanation,
  expansionTension,
  formatCropCount,
  panelInsight,
  synthesizeScenario,
  themeSummary,
} from './understanding';

export {
  buildUnknowns,
  clarificationHow,
  clarificationWhy,
  engineeringGates,
  formatUnknownCount,
  readinessState,
  scenarioClientQuestions,
} from './boundary';

export { explainChanges } from './changes';

export type { GrainDiagramModel, GrainDiagramNode } from './diagram';
export { grainDiagramModel } from './diagram';

export type { GrainFlowAction, GrainFlowState } from './flow';
export { GRAIN_READINESS_STEP, INITIAL_GRAIN_FLOW, reduceGrainFlow } from './flow';
