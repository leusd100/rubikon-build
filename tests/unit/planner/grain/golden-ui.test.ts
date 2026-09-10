/**
 * Parity for the logic the prototype kept inside app/planner.tsx: readiness, completed-theme
 * summaries, driver explanations, clarification copy, comparison cells and the process diagram.
 * The expectations are what prototype 819f163 actually rendered (golden `dom`).
 */
import { describe, expect, it } from 'vitest';
import golden from './__golden__/prototype-819f163.json';
import { fixtureNames, fixtures, normalize } from './fixtures';
import {
  buildCandidates,
  clarificationHow,
  clarificationWhy,
  comparisonCell,
  comparisonRows,
  countUnknowns,
  driverExplanation,
  formatCapacityInfo,
  formatUnknownCount,
  grainDiagramModel,
  parseCapacity,
  readinessState,
  routeDecision,
  themeSummary,
  themes,
  type GrainDiagramModel,
} from '../../../../app/lib/planner/grain';

/** The diagram's text nodes in the order the prototype's SVG renders them. */
function diagramTexts(model: GrainDiagramModel) {
  return [
    model.siteCaption,
    ...model.row.flatMap((node) => (node.sub ? [node.title, node.sub] : [node.title])),
    model.storageLabel,
    ...(model.zoneLetters.length ? model.zoneLetters : ['?']),
    model.shipping.title,
    ...model.phases.map((phase) => phase.label),
  ].map(normalize);
}

describe.each(fixtureNames)('prototype UI parity — %s', (name) => {
  const answers = fixtures[name];
  const dom = golden.dom[name];
  const comparison = routeDecision(answers) === 'candidateComparison';

  it('readiness verdicts match the readiness card', () => {
    expect(readinessState(answers)).toEqual({
      understanding: dom.readiness.items['Розуміння задачі'],
      decision: dom.readiness.items['Готовність маршруту'],
      brief: dom.readiness.items['Попередній опис'],
    });
    if (!comparison) expect(dom.readiness.body.startsWith(formatUnknownCount(countUnknowns(answers)))).toBe(true);
  });

  it('completed-theme summaries match the collapsed theme cards', () => {
    const capacityLabel = formatCapacityInfo(parseCapacity(answers.capacity));
    expect(dom.completedThemes.map((theme) => theme.title)).toEqual(themes);
    expect(dom.completedThemes.map((theme) => theme.summary)).toEqual(
      [0, 1, 2, 3, 4].map((index) => normalize(themeSummary(index, answers, capacityLabel))),
    );
  });

  it('driver explanations match what opened under each driver', () => {
    for (const driver of dom.result.drivers) expect(driverExplanation(driver.label)).toBe(driver.explanation);
  });

  it('clarification cards match the clarification map', () => {
    for (const card of dom.result.clarification) {
      expect(clarificationWhy(card.title)).toBe(card.why);
      expect(clarificationHow(card.title)).toBe(card.how);
    }
  });

  it('comparison cells match the side-by-side matrix', () => {
    if (!comparison) return;
    const candidates = buildCandidates(answers);
    expect('matrix' in dom.result).toBe(true);
    if (!('matrix' in dom.result)) return;
    expect(dom.result.matrix.head).toEqual(candidates.map((candidate) => candidate.title));
    expect(dom.result.matrix.rows).toEqual(
      comparisonRows(answers).map((row) => ({ row, cells: candidates.map((candidate) => comparisonCell(candidate.key, row)) })),
    );
  });

  it('the diagram model reproduces every label of the prototype diagram', () => {
    const model = grainDiagramModel(answers);
    expect(diagramTexts(model)).toEqual(dom.diagram.texts);
    expect(model.zoneLetters.length).toBe(dom.diagram.zoneCount);
    expect(model.phases.some((phase) => phase.kind === 'second')).toBe(dom.diagram.phaseTwoBox);
  });
});
