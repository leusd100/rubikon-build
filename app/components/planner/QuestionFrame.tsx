import { ArrowRight, Check, CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ThemeState } from '../../lib/planner/core/types';

function answerStatus(canContinue: boolean, answerState: ThemeState) {
  if (!canContinue) return 'Оберіть відповідь, щоб продовжити';
  if (answerState === 'unknown') return <><CircleHelp aria-hidden="true" /> Відповідь зафіксовано; лишилося уточнення</>;
  return <><Check aria-hidden="true" /> Підтверджені дані зафіксовано</>;
}

/** The active step: theme label, the question, its answers and the way forward. */
export function QuestionFrame({
  themeIndex,
  themeTitle,
  contextLabel,
  question,
  hint,
  canContinue,
  answerState,
  continueLabel,
  onContinue,
  children,
}: {
  themeIndex: number;
  themeTitle: string;
  contextLabel: string;
  question: string;
  hint?: string;
  canContinue: boolean;
  answerState: ThemeState;
  continueLabel: string;
  onContinue: () => void;
  children: ReactNode;
}) {
  const headingId = `planner-question-${themeIndex}`;

  return (
    <article className="planner-question" data-planner-theme={themeIndex} data-planner-anchor aria-labelledby={headingId}>
      <p className="planner-question-index">{themeTitle} <span>{contextLabel}</span></p>
      <h3 id={headingId} tabIndex={-1} data-planner-focus>{question}</h3>
      {hint && <p className="planner-question-hint">{hint}</p>}
      {children}
      <div className="planner-question-footer">
        <p className="planner-question-status" aria-live="polite">
          {answerStatus(canContinue, answerState)}
        </p>
        <button type="button" className="button button-primary planner-continue" disabled={!canContinue} onClick={onContinue}>
          {continueLabel} <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
