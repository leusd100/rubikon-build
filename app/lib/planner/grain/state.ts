/**
 * The structured, versioned Grain Planner state that travels with an inquiry next to the brief
 * text: raw answer ids (so the exact consultation can be reopened) plus what the planner derived
 * from them at the time.
 *
 * `validateGrainPlannerState` is strict on purpose — it is what /api/leads will run on data that
 * arrives from a public form. An invalid state is dropped there, never allowed to block the lead.
 */
import type { DecisionOutcome } from '../core/types';
import type { Answers } from './answers';
import { visibleCandidateKeys, type CandidateKey } from './candidates';
import { cropOptions, developmentOptions, handlingOptions, operationOptions, processingOptions, separationOptions, siteOptions, sitePressureOptions } from './options';
import { countUnknowns, decisionBlockingUnknowns, hasExpansionTension, routeDecision } from './rules';
import { buildDrivers } from './understanding';
import { GRAIN_PLANNER_VERSION } from './version';

export const GRAIN_PLANNER_STATE_SCHEMA = 'rubikon.grain-planner.state';

export type GrainPlannerStateV1 = {
  schema: typeof GRAIN_PLANNER_STATE_SCHEMA;
  version: 1;
  plannerVersion: string;
  answers: Answers;
  derived: {
    outcome: DecisionOutcome;
    /** The concepts the client was shown — none on the clarification route. */
    candidates: CandidateKey[];
    drivers: string[];
    unknownCount: number;
    blockingUnknowns: string[];
    tension: boolean;
  };
};

export function createGrainPlannerState(answers: Answers): GrainPlannerStateV1 {
  const outcome = routeDecision(answers);
  return {
    schema: GRAIN_PLANNER_STATE_SCHEMA,
    version: 1,
    plannerVersion: GRAIN_PLANNER_VERSION,
    answers: { ...answers, crops: [...answers.crops], development: [...answers.development] },
    derived: {
      outcome,
      candidates: outcome === 'candidateComparison' ? visibleCandidateKeys(answers) : [],
      drivers: buildDrivers(answers),
      unknownCount: countUnknowns(answers),
      blockingUnknowns: decisionBlockingUnknowns(answers),
      tension: hasExpansionTension(answers),
    },
  };
}

const STATE_KEYS = ['schema', 'version', 'plannerVersion', 'answers', 'derived'];
const ANSWER_KEYS: (keyof Answers)[] = ['crops', 'capacity', 'separation', 'operation', 'handling', 'processing', 'site', 'sitePressure', 'development', 'futureHandling'];
const DERIVED_KEYS = ['outcome', 'candidates', 'drivers', 'unknownCount', 'blockingUnknowns', 'tension'];
const ids = (options: string[][]) => options.map(([id]) => id);
const SINGLE_CHOICE_IDS: Partial<Record<keyof Answers, string[]>> = {
  separation: ids(separationOptions),
  operation: ids(operationOptions),
  handling: ids(handlingOptions),
  processing: ids(processingOptions),
  site: ids(siteOptions),
  sitePressure: ids(sitePressureOptions(false)),
  futureHandling: ids(handlingOptions),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isIdList(value: unknown, max: number, allowed: string[]) {
  return Array.isArray(value) && value.length <= max && new Set(value).size === value.length
    && value.every((item) => typeof item === 'string' && allowed.includes(item));
}

export function validateGrainPlannerState(value: unknown): value is GrainPlannerStateV1 {
  if (!isRecord(value) || !hasExactKeys(value, STATE_KEYS)) return false;
  if (value.schema !== GRAIN_PLANNER_STATE_SCHEMA || value.version !== 1) return false;
  if (typeof value.plannerVersion !== 'string' || !value.plannerVersion || value.plannerVersion.length > 60) return false;

  const answers = value.answers;
  if (!isRecord(answers) || !hasExactKeys(answers, ANSWER_KEYS)) return false;
  if (!isIdList(answers.crops, 6, cropOptions)) return false;
  if (typeof answers.capacity !== 'string' || answers.capacity.length > 40) return false;
  if (!isIdList(answers.development, 7, ids(developmentOptions))) return false;
  for (const [key, allowed] of Object.entries(SINGLE_CHOICE_IDS)) {
    const choice = answers[key];
    if (choice !== null && !(typeof choice === 'string' && allowed.includes(choice))) return false;
  }

  const derived = value.derived;
  if (!isRecord(derived) || !hasExactKeys(derived, DERIVED_KEYS)) return false;
  if (derived.outcome !== 'candidateComparison' && derived.outcome !== 'clarificationRequired') return false;
  if (!isIdList(derived.candidates, 3, ['silo', 'framed', 'arch'])) return false;
  if (!Array.isArray(derived.drivers) || derived.drivers.length > 10 || !derived.drivers.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 80)) return false;
  if (typeof derived.unknownCount !== 'number' || !Number.isInteger(derived.unknownCount) || derived.unknownCount < 0 || derived.unknownCount > 10) return false;
  if (!isIdList(derived.blockingUnknowns, 3, ['crops', 'separation', 'processing'])) return false;
  return typeof derived.tension === 'boolean';
}
