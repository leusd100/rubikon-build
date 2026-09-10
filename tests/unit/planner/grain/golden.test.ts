import { describe, expect, it } from 'vitest';
import golden from './__golden__/prototype-819f163.json';
import { editChain, fixtureNames, fixtures, normalize } from './fixtures';
import {
  buildCandidates,
  buildDrivers,
  buildFacts,
  buildUnknowns,
  comparisonRows,
  countUnknowns,
  decisionBlockingUnknowns,
  engineeringGates,
  expansionTension,
  explainChanges,
  firstClarificationTheme,
  formatCapacityInfo,
  hasActiveProcessing,
  hasDevelopmentIntent,
  hasExpansionTension,
  isThemeComplete,
  panelInsight,
  parseCapacity,
  requiresFutureHandling,
  requiresHandling,
  routeDecision,
  scenarioClientQuestions,
  shouldAskHandlingInProcessing,
  synthesizeScenario,
  themeAnswerState,
  visibleCandidateKeys,
  type Answers,
} from '../../../../app/lib/planner/grain';

type DomFixture = (typeof golden.dom)[keyof typeof golden.dom];

/** Every logic output the golden recorded from prototype 819f163, recomputed by the port. */
function logicOf(answers: Answers) {
  const capacity = parseCapacity(answers.capacity);
  return {
    parseCapacity: capacity,
    formatCapacityInfo: formatCapacityInfo(capacity),
    countUnknowns: countUnknowns(answers),
    decisionBlockingUnknowns: decisionBlockingUnknowns(answers),
    routeDecision: routeDecision(answers),
    firstClarificationTheme: firstClarificationTheme(answers),
    isThemeComplete: [0, 1, 2, 3, 4].map((index) => isThemeComplete(index, answers)),
    themeAnswerState: [0, 1, 2, 3, 4].map((index) => themeAnswerState(index, answers)),
    scenarioClientQuestions: scenarioClientQuestions(answers),
    visibleCandidateKeys: visibleCandidateKeys(answers),
    buildCandidates: buildCandidates(answers),
    panelInsight: panelInsight(answers),
    expansionTension: expansionTension(answers),
    shouldAskHandlingInProcessing: shouldAskHandlingInProcessing(answers),
    comparisonRows: comparisonRows(answers),
    buildDrivers: buildDrivers(answers),
    buildFacts: buildFacts(answers),
    buildUnknowns: buildUnknowns(answers),
    engineeringGates: engineeringGates(answers),
    synthesizeScenario: synthesizeScenario(answers),
    hasExpansionTension: hasExpansionTension(answers),
    hasActiveProcessing: hasActiveProcessing(answers.processing),
    hasDevelopmentIntent: hasDevelopmentIntent(answers),
    requiresHandling: requiresHandling(answers),
    requiresFutureHandling: requiresFutureHandling(answers),
  };
}

describe('golden parity with prototype 819f163 — inputs', () => {
  it('uses exactly the fixtures and edit chain the golden was captured with', () => {
    expect(golden.fixtures).toEqual(fixtures);
    expect(golden.editChain).toEqual(editChain);
  });
});

describe.each(fixtureNames)('golden parity with prototype 819f163 — %s', (name) => {
  const answers = fixtures[name];
  const dom: DomFixture = golden.dom[name];
  const normalizedList = (items: string[]) => items.map(normalize);

  it('reproduces every logic output of the prototype', () => {
    expect(logicOf(answers)).toEqual(golden.logic[name]);
  });

  it('matches what the prototype rendered in the live-understanding panel', () => {
    expect(dom.live.synthesis).toBe(normalize(synthesizeScenario(answers)));
    expect(dom.live.facts).toEqual(normalizedList(buildFacts(answers)));
    const insight = panelInsight(answers);
    expect(dom.live.insight).toEqual(insight && { kind: insight.kind, title: insight.title, body: insight.body });
    const tension = expansionTension(answers);
    expect(dom.live.tension).toEqual(tension && { kind: tension.kind, body: tension.body });
    expect(dom.completedThemes.map((theme) => theme.state)).toEqual([0, 1, 2, 3, 4].map((index) => themeAnswerState(index, answers)));
  });

  it('matches the concepts, WHY and drivers the prototype rendered', () => {
    const candidates = routeDecision(answers) === 'candidateComparison' ? buildCandidates(answers) : [];
    expect(dom.result.cards).toEqual(candidates.map(({ category, label, title, summary }) => ({ category, label, title, summary })));
    expect(dom.result.concepts).toEqual(candidates.map(({ title, category, label, reasons, careful }) => ({ title, category, status: label, reasons, careful })));
    expect(dom.result.drivers.map((driver) => driver.label)).toEqual(candidates.length ? buildDrivers(answers) : []);
    if (candidates.length) {
      // The prototype renders the matrix only for the comparison route, so only those fixtures carry it.
      expect('matrix' in dom.result ? dom.result.matrix.rows.map((row) => row.row) : null).toEqual(comparisonRows(answers));
    }
  });

  it('matches the decision boundary the prototype rendered', () => {
    const unknowns = buildUnknowns(answers);
    const boundary = dom.result.boundary as Record<string, unknown>;
    expect(boundary['ВИ ЩЕ НЕ ВИЗНАЧИЛИ']).toEqual(unknowns.length ? unknowns : { text: 'Ключові відповіді для цього етапу зафіксовані.' });
    expect(boundary['НА ПЕРШІЙ РОЗМОВІ УТОЧНИМО']).toEqual(scenarioClientQuestions(answers).filter((item) => !unknowns.includes(item)));
    expect(dom.result.gates).toEqual(engineeringGates(answers));
    if (routeDecision(answers) === 'clarificationRequired') {
      expect(dom.result.clarification.map((card) => card.title)).toEqual(unknowns);
    }
  });
});

describe('golden parity with prototype 819f163 — «Що змінилося?»', () => {
  it.each(editChain.map((edit, index) => [edit.name, index] as const))('%s', (_name, index) => {
    const { before, after } = editChain[index];
    const notes = explainChanges(before, after);
    expect(notes).toEqual(golden.edits[index].notes);
    expect(notes).toEqual(golden.dom.DEMO.edits[index].notes);
  });
});
