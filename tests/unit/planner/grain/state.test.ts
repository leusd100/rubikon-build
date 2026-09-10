import { describe, expect, it } from 'vitest';
import { fixtureNames, fixtures } from './fixtures';
import {
  GRAIN_PLANNER_STATE_SCHEMA,
  GRAIN_PLANNER_VERSION,
  buildDrivers,
  countUnknowns,
  createGrainPlannerState,
  decisionBlockingUnknowns,
  hasExpansionTension,
  routeDecision,
  validateGrainPlannerState,
  visibleCandidateKeys,
} from '../../../../app/lib/planner/grain';

const valid = () => JSON.parse(JSON.stringify(createGrainPlannerState(fixtures.B)));

describe('GrainPlannerStateV1', () => {
  it.each(fixtureNames)('%s: carries the raw answers and what the planner derived from them', (name) => {
    const answers = fixtures[name];
    const state = createGrainPlannerState(answers);
    expect(state.schema).toBe(GRAIN_PLANNER_STATE_SCHEMA);
    expect(state.version).toBe(1);
    expect(state.plannerVersion).toBe(GRAIN_PLANNER_VERSION);
    expect(state.answers).toEqual(answers);
    const comparison = routeDecision(answers) === 'candidateComparison';
    expect(state.derived).toEqual({
      outcome: routeDecision(answers),
      candidates: comparison ? visibleCandidateKeys(answers) : [],
      drivers: buildDrivers(answers),
      unknownCount: countUnknowns(answers),
      blockingUnknowns: decisionBlockingUnknowns(answers),
      tension: hasExpansionTension(answers),
    });
    expect(validateGrainPlannerState(state)).toBe(true);
    expect(validateGrainPlannerState(JSON.parse(JSON.stringify(state)))).toBe(true);
  });

  it('copies the answer arrays instead of holding references to live state', () => {
    const answers = { ...fixtures.A, crops: [...fixtures.A.crops], development: [...fixtures.A.development] };
    const state = createGrainPlannerState(answers);
    answers.crops.push('Соя');
    answers.development.push('physical');
    expect(state.answers.crops).toEqual(fixtures.A.crops);
    expect(state.answers.development).toEqual(fixtures.A.development);
  });
});

describe('validateGrainPlannerState rejects what a public form could send', () => {
  const cases: [string, (state: ReturnType<typeof valid>) => unknown][] = [
    ['a non-object', () => 'grain'],
    ['null', () => null],
    ['another schema', (s) => ({ ...s, schema: 'rubikon.hangar.state' })],
    ['an unknown version', (s) => ({ ...s, version: 2 })],
    ['an empty planner version', (s) => ({ ...s, plannerVersion: '' })],
    ['an extra top-level key', (s) => ({ ...s, extra: true })],
    ['a missing answer key', (s) => { delete s.answers.futureHandling; return s; }],
    ['an extra answer key', (s) => ({ ...s, answers: { ...s.answers, budget: '1 000 000' } })],
    ['an unknown crop', (s) => ({ ...s, answers: { ...s.answers, crops: ['Рис'] } })],
    ['a duplicated crop', (s) => ({ ...s, answers: { ...s.answers, crops: ['Пшениця', 'Пшениця'] } })],
    ['more than six crops', (s) => ({ ...s, answers: { ...s.answers, crops: ['Пшениця', 'Кукурудза', 'Соняшник', 'Ячмінь', 'Соя', 'Ще не визначили', 'Рис'] } })],
    ['a capacity over 40 characters', (s) => ({ ...s, answers: { ...s.answers, capacity: '1'.repeat(41) } })],
    ['an unknown separation id', (s) => ({ ...s, answers: { ...s.answers, separation: 'mixed' } })],
    ['a non-string choice', (s) => ({ ...s, answers: { ...s.answers, operation: 3 } })],
    ['an unknown development id', (s) => ({ ...s, answers: { ...s.answers, development: ['silo'] } })],
    ['an unknown outcome', (s) => ({ ...s, derived: { ...s.derived, outcome: 'recommendation' } })],
    ['an unknown candidate', (s) => ({ ...s, derived: { ...s.derived, candidates: ['bunker'] } })],
    ['a fractional unknown count', (s) => ({ ...s, derived: { ...s.derived, unknownCount: 1.5 } })],
    ['an out-of-range unknown count', (s) => ({ ...s, derived: { ...s.derived, unknownCount: 11 } })],
    ['an unknown blocking reason', (s) => ({ ...s, derived: { ...s.derived, blockingUnknowns: ['budget'] } })],
    ['an over-long driver', (s) => ({ ...s, derived: { ...s.derived, drivers: ['x'.repeat(81)] } })],
    ['a non-boolean tension', (s) => ({ ...s, derived: { ...s.derived, tension: 'yes' } })],
  ];

  it.each(cases)('rejects %s', (_name, mutate) => {
    expect(validateGrainPlannerState(mutate(valid()))).toBe(false);
  });
});
