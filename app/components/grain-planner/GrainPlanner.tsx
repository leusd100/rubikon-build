'use client';

import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { grainPlannerPresentation } from '../../data/grainPlannerPresentation';
import type { ThemeState } from '../../lib/planner/core/types';
import {
  buildFacts,
  countUnknowns,
  expansionTension,
  formatCapacityInfo,
  formatUnknownCount,
  isThemeComplete,
  panelInsight,
  parseCapacity,
  readinessState,
  routeDecision,
  synthesizeScenario,
  themeAnswerState,
  themeNotes,
  themeSummary,
  themes,
} from '../../lib/planner/grain';
import { CompletedTheme } from '../planner/CompletedTheme';
import { LiveStrip } from '../planner/LiveStrip';
import { LiveUnderstandingPanel } from '../planner/LiveUnderstandingPanel';
import { QuestionFrame } from '../planner/QuestionFrame';
import { ReadinessCard } from '../planner/ReadinessCard';
import { ThemeRail } from '../planner/ThemeRail';
import { GrainProcessDiagram } from './GrainProcessDiagram';
import { useGrainPlanner } from './GrainPlannerProvider';
import { DevelopmentQuestion } from './questions/DevelopmentQuestion';
import { OperationQuestion } from './questions/OperationQuestion';
import { ProcessingQuestion } from './questions/ProcessingQuestion';
import { SiteQuestion } from './questions/SiteQuestion';
import { StorageQuestion } from './questions/StorageQuestion';

/** Question copy per theme — verbatim from the prototype's question components. */
const QUESTIONS = [
  { question: 'Що потрібно зберігати?', hint: 'Можна вибрати кілька варіантів.', Component: StorageQuestion },
  { question: 'Як зерно переважно проходитиме через об’єкт?', hint: 'Опишіть реальний режим роботи, без технічних розрахунків.', Component: OperationQuestion },
  { question: 'Чи потрібна підготовка зерна перед зберіганням?', hint: 'Питаємо лише про операції, не про модель обладнання.', Component: ProcessingQuestion },
  { question: 'Що вже є на майданчику?', hint: 'Наявність конструкцій ще не означає, що їх можна використати.', Component: SiteQuestion },
  { question: 'Що може знадобитися після запуску першої черги?', hint: 'Можна вибрати кілька реальних напрямків розвитку.', Component: DevelopmentQuestion },
];

/**
 * The consultation: themes, the active question, finished themes and readiness — beside the live
 * understanding panel on wide screens, with the phone strip and a compact summary on narrow ones.
 */
const blockingVerb = (count: number) => (count === 1 ? 'робить' : 'роблять');

export function GrainPlanner() {
  const { state, latestFact, answer, continueTheme, editTheme, reveal, reset } = useGrainPlanner();
  const { answers, activeTheme, completed } = state;
  const coverOnly = grainPlannerPresentation.entry === 'cover-only';
  const [started, setStarted] = useState(!coverOnly);

  const capacityLabel = formatCapacityInfo(parseCapacity(answers.capacity));
  const facts = buildFacts(answers);
  const synthesis = synthesizeScenario(answers);
  const themeStates: ThemeState[] = themes.map((_, index) => (completed.includes(index) ? themeAnswerState(index, answers) : 'incomplete'));
  const comparison = routeDecision(answers) === 'candidateComparison';
  const readiness = readinessState(answers);
  const unknownCount = countUnknowns(answers);
  const active = QUESTIONS[activeTheme];

  const panel = {
    note: 'оновлюється разом із відповідями',
    synthesis,
    facts,
    emptyFacts: 'Підтверджені факти з’являться тут',
    diagram: <GrainProcessDiagram answers={answers} />,
    insight: panelInsight(answers),
    tension: expansionTension(answers),
  };

  return (
    <div className="planner-layout">
      <div className="planner-consultation">
        <div className="planner-toolbar">
          <ThemeRail
            label="Теми консультації"
            active={activeTheme}
            items={themes.map((title, index) => ({ title, note: themeNotes[index], state: themeStates[index] }))}
          />
          {(completed.length > 0 || answers.crops.length > 0) && (
            <button type="button" className="planner-reset" onClick={() => { reset(); setStarted(!coverOnly); }}>
              <RotateCcw aria-hidden="true" /> Почати спочатку
            </button>
          )}
        </div>

        <div className="planner-stack">
          {themes.map((title, index) => (completed.includes(index) && activeTheme !== index ? (
            <CompletedTheme
              key={title}
              index={index}
              title={title}
              summary={themeSummary(index, answers, capacityLabel)}
              state={themeStates[index]}
              onEdit={() => editTheme(index)}
            />
          ) : null))}

          {active && (started ? (
            <div className="planner-active-step" data-planner-anchor>
              {facts.length > 0 && <LiveStrip label="Поточне розуміння" synthesis={synthesis} latestFact={latestFact} />}
              <QuestionFrame
                themeIndex={activeTheme}
                themeTitle={themes[activeTheme]}
                contextLabel={activeTheme === 4 ? 'Майбутній контекст' : 'Основний контекст'}
                question={active.question}
                hint={active.hint}
                canContinue={isThemeComplete(activeTheme, answers)}
                answerState={themeAnswerState(activeTheme, answers)}
                continueLabel={activeTheme === 4 ? 'Перевірити готовність' : 'Продовжити'}
                onContinue={() => continueTheme(activeTheme)}
              >
                <active.Component answers={answers} answer={answer} />
              </QuestionFrame>
            </div>
          ) : (
            <div className="planner-start">
              <p>П’ять коротких тем — про зерно, режим роботи, підготовку, майданчик і розвиток. Без технічних розрахунків.</p>
              <button type="button" className="button button-primary" onClick={() => setStarted(true)}>Почати консультацію</button>
            </div>
          ))}

          {!active && (
            <div className="planner-readiness-step">
              {grainPlannerPresentation.liveUnderstanding.mobile === 'strip+summary' && (
                <div className="planner-summary-mobile">
                  <LiveUnderstandingPanel variant="summary" label="Ваш опис" {...panel} />
                </div>
              )}
              <ReadinessCard
                eyebrow="Перевірка готовності"
                heading={comparison ? 'Контексту достатньо, щоб порівняти перші концепції.' : 'Ми вже бачимо, що потрібно уточнити перед порівнянням концепцій.'}
                body={comparison
                  ? 'Планувальник сформував ключові фактори й може пояснити появу кожного підходу у вашому сценарії.'
                  : `${formatUnknownCount(unknownCount)} поки ${blockingVerb(unknownCount)} пряме порівняння передчасним — але наступні дії вже зрозумілі.`}
                items={[
                  { label: 'Розуміння задачі', value: readiness.understanding, ready: readiness.understanding === 'Готове' },
                  { label: 'Готовність маршруту', value: readiness.decision, ready: readiness.decision === 'Можна порівнювати' },
                  { label: 'Попередній опис', value: readiness.brief, ready: readiness.brief === 'Готове' },
                ]}
                ready={comparison}
                revealLabel={comparison ? 'Показати концепції' : 'Показати карту уточнень'}
                onReveal={reveal}
              />
            </div>
          )}
        </div>
      </div>

      <LiveUnderstandingPanel
        variant="panel"
        label="Живе розуміння"
        {...panel}
        progress={themes.map((title, index) => ({ title, state: themeStates[index], current: index === activeTheme }))}
      />
    </div>
  );
}
