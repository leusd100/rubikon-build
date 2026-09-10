/**
 * Grain Planner rules: which answers are required, what counts as unknown, and where the
 * consultation routes. Verbatim from the prototype (`819f163`, app/planner-logic.ts).
 */
import type { DecisionOutcome, ThemeState } from '../core/types';
import { parseCapacity, type Answers, type SingleChoice } from './answers';

export type ThemeAnswerState = ThemeState;

export const existingSiteTypes = ['operating', 'building', 'assets', 'reconstruction'];
export const stationaryHandling = ['stationary', 'combined'];

export function hasActiveProcessing(processing: SingleChoice) {
  return Boolean(processing && !['none', 'unknown'].includes(processing));
}

export function hasDevelopmentIntent(answers: Answers) {
  return answers.development.some((item) => !['none', 'unknown'].includes(item));
}

export function hasExpansionTension(answers: Answers) {
  return answers.sitePressure === 'compact' && answers.development.includes('physical');
}

export function requiresHandling(answers: Answers) {
  return answers.operation === 'high' || hasActiveProcessing(answers.processing);
}

export function requiresFutureHandling(answers: Answers) {
  return answers.development.includes('handling');
}

export function countUnknowns(answers: Answers) {
  const capacity = parseCapacity(answers.capacity);
  return [
    capacity.kind === 'unknown',
    answers.crops.includes('Ще не визначили'),
    answers.separation === 'unknown',
    answers.operation === 'unknown',
    requiresHandling(answers) && answers.handling === 'unknown',
    answers.processing === 'unknown',
    answers.site === 'unknown',
    answers.sitePressure === 'unknown',
    answers.development.includes('unknown'),
    requiresFutureHandling(answers) && answers.futureHandling === 'unknown',
  ].filter(Boolean).length;
}

export function decisionBlockingUnknowns(answers: Answers) {
  const blockers: string[] = [];
  if (answers.crops.includes('Ще не визначили')) blockers.push('crops');
  if (answers.separation === 'unknown') blockers.push('separation');
  if (answers.processing === 'unknown') blockers.push('processing');
  return blockers;
}

export function routeDecision(answers: Answers): DecisionOutcome {
  return decisionBlockingUnknowns(answers).length > 0 || countUnknowns(answers) >= 3
    ? 'clarificationRequired'
    : 'candidateComparison';
}

export function firstClarificationTheme(answers: Answers) {
  if (answers.crops.includes('Ще не визначили') || answers.separation === 'unknown') return 0;
  if (answers.processing === 'unknown') return 2;
  if (requiresHandling(answers) && answers.handling === 'unknown') return hasActiveProcessing(answers.processing) ? 2 : 1;
  if (answers.site === 'unknown' || answers.sitePressure === 'unknown') return 3;
  if (answers.operation === 'unknown') return 1;
  if (answers.development.includes('unknown') || (requiresFutureHandling(answers) && answers.futureHandling === 'unknown')) return 4;
  if (parseCapacity(answers.capacity).kind === 'unknown') return 0;
  return 0;
}

export function isThemeComplete(index: number, answers: Answers) {
  const capacity = parseCapacity(answers.capacity);
  if (index === 0) return answers.crops.length > 0 && !['empty', 'invalid'].includes(capacity.kind) && Boolean(answers.separation);
  if (index === 1) return Boolean(answers.operation) && (answers.operation !== 'high' || Boolean(answers.handling));
  if (index === 2) return Boolean(answers.processing) && (!hasActiveProcessing(answers.processing) || Boolean(answers.handling));
  if (index === 3) return Boolean(answers.site) && Boolean(answers.sitePressure);
  if (index === 4) return answers.development.length > 0 && (!requiresFutureHandling(answers) || Boolean(answers.futureHandling));
  return false;
}

export function themeAnswerState(index: number, answers: Answers): ThemeAnswerState {
  if (!isThemeComplete(index, answers)) return 'incomplete';
  const capacity = parseCapacity(answers.capacity);
  const unknown = index === 0
    ? capacity.kind === 'unknown' || answers.crops.includes('Ще не визначили') || answers.separation === 'unknown'
    : index === 1
      ? answers.operation === 'unknown' || (answers.operation === 'high' && answers.handling === 'unknown')
      : index === 2
        ? answers.processing === 'unknown' || (requiresHandling(answers) && answers.handling === 'unknown')
        : index === 3
          ? answers.site === 'unknown' || answers.sitePressure === 'unknown'
          : answers.development.includes('unknown') || (requiresFutureHandling(answers) && answers.futureHandling === 'unknown');
  return unknown ? 'unknown' : 'confirmed';
}

/**
 * The processing step asks about handling only when nobody has answered it yet. If the operation
 * step already captured it, repeating the same editable question one step later reads as a form
 * that forgot what it was told; the step shows it as context instead.
 */
export function shouldAskHandlingInProcessing(answers: Answers) {
  return hasActiveProcessing(answers.processing) && !answers.handling;
}
