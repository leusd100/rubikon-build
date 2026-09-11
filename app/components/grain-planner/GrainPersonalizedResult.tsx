'use client';

import { ArrowDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { GRAIN_RESPONSIBILITY_STATEMENT } from '../../data/grainPage';
import { grainPlannerPresentation, type GrainResultBlock } from '../../data/grainPlannerPresentation';
import {
  buildFacts,
  buildUnknowns,
  clarificationHow,
  clarificationWhy,
  createGrainBrief,
  engineeringGates,
  firstClarificationTheme,
  formatCapacityInfo,
  hasExpansionTension,
  parseCapacity,
  routeDecision,
  scenarioClientQuestions,
  themes,
} from '../../lib/planner/grain';
import { BriefTable } from '../planner/BriefTable';
import { ChangeBanner } from '../planner/ChangeBanner';
import { ClarificationMap } from '../planner/ClarificationMap';
import { DecisionBoundary } from '../planner/DecisionBoundary';
import { ResponsibilityNote } from '../planner/ResponsibilityNote';
import { ResultHeading } from '../planner/ResultHeading';
import { ScenarioStrip } from '../planner/ScenarioStrip';
import { usePlannerMediaQuery } from '../planner/usePlannerMediaQuery';
import { GrainCandidateComparison } from './GrainCandidateComparison';
import { GrainDevelopmentExplorer } from './GrainDevelopmentExplorer';
import { useGrainPlanner } from './GrainPlannerProvider';

/**
 * The personalised result (#result after reveal): its blocks in the order grainPlannerPresentation
 * gives for this width — DOM order, so reading order matches the screen. Loaded on demand by
 * GrainResultBand: nobody needs it before the first answer, so the first page load does not carry it.
 */
export default function GrainPersonalizedResult() {
  const { state, editTheme, changeOpen, setChangeOpen, briefAttached, attachBrief } = useGrainPlanner();
  const mobile = usePlannerMediaQuery('(max-width: 1050px)');
  const narrow = usePlannerMediaQuery('(max-width: 760px)');
  const presentation = grainPlannerPresentation;

  const { answers } = state;
  const comparison = routeDecision(answers) === 'candidateComparison';
  const capacityLabel = formatCapacityInfo(parseCapacity(answers.capacity));
  const facts = buildFacts(answers);
  const unknowns = buildUnknowns(answers);
  const followUps = scenarioClientQuestions(answers).filter((item) => !unknowns.includes(item));
  const brief = createGrainBrief(answers);
  const taskRows = brief.sections.find((section) => section.id === 'task')?.rows ?? [];
  const decisionRows = brief.sections.find((section) => section.id === 'decision')?.rows ?? [];
  const clarifyTheme = firstClarificationTheme(answers);
  const collapsed = (block: 'boundary') => narrow && presentation.result.collapsedOnMobile.includes(block);

  // The handoff attaches the brief before it scrolls — also after «Не додавати» — so the form the
  // visitor lands on always carries the description the button promised.
  const handoff = (
    <div className="planner-handoff">
      <a className="button button-primary" href="#inquiry" onClick={attachBrief}>Передати опис RUBIKON <ArrowDown aria-hidden="true" /></a>
      <p>
        {briefAttached
          ? 'Опис уже додано до короткої форми нижче: залиште контакт, і інженер RUBIKON зв’яжеться з вами.'
          : 'Кнопка додасть опис до короткої форми нижче: залиште контакт, і інженер RUBIKON зв’яжеться з вами.'}
      </p>
    </div>
  );

  const boundary = (
    <DecisionBoundary
      eyebrow="Межа відповідальності"
      heading="Вам не потрібно знати все, щоб почати."
      lead="Невідомі відповіді, питання першої розмови та інженерні перевірки показані окремо."
      undecided={{ label: 'Ви ще не визначили', items: unknowns }}
      undecidedEmpty="Ключові відповіді для цього етапу зафіксовані."
      firstCall={{ label: 'На першій розмові уточнимо', items: followUps }}
      gates={{ label: 'Визначає лише проєктування', items: engineeringGates(answers) }}
      note={<ResponsibilityNote label="Хто за що відповідає." statement={GRAIN_RESPONSIBILITY_STATEMENT} />}
    />
  );

  const blocks: Record<GrainResultBlock, ReactNode> = {
    change: state.changeNotes.length > 0 && (
      <ChangeBanner
        id="grain-change-notes"
        title="Результат оновлено"
        subtitle="Інші відповіді не було скинуто."
        toggleLabel="Що змінилося?"
        notes={state.changeNotes}
        open={changeOpen}
        onToggle={() => setChangeOpen(!changeOpen)}
      />
    ),
    scenario: (
      <ScenarioStrip
        label="Ваш сценарій"
        headline={capacityLabel || 'Місткість уточнюється'}
        facts={facts.filter((fact) => fact !== capacityLabel)}
        editLabel="Редагувати"
        onEdit={() => editTheme(0, true)}
      />
    ),
    outcome: (
      <>
        {comparison ? (
          <GrainCandidateComparison answers={answers} narrow={narrow} />
        ) : (
          <ClarificationMap
            heading={(
              <ResultHeading
                id="grain-result-title"
                eyebrow="Результат · потрібні уточнення"
                heading="Вибір концепції ще зарано робити — але ми вже знаємо, що саме з’ясувати."
                lead="«Не знаю» не зупинило планувальник: відповідь стала картою наступних корисних дій."
              />
            )}
            cards={unknowns.map((title) => ({ title, why: clarificationWhy(title), how: clarificationHow(title) }))}
            density={presentation.clarificationDensity}
            whyLabel="Чому це важливо"
            howLabel="Як це зрозуміти"
            editLabel={`Уточнити: ${themes[clarifyTheme].toLowerCase()}`}
            onEdit={() => editTheme(clarifyTheme, true)}
          />
        )}
        {presentation.handoff.position === 'after-outcome' && handoff}
      </>
    ),
    development: comparison && hasExpansionTension(answers) && <GrainDevelopmentExplorer />,
    boundary: collapsed('boundary') ? (
      <details className="planner-disclosure">
        <summary>Що ви ще не визначили, що уточнимо і що вирішує проєктування</summary>
        {boundary}
      </details>
    ) : boundary,
    brief: (
      <BriefTable
        eyebrow="Попередній опис"
        heading="Постановка задачі для першої розмови."
        note="Сформовано планувальником · без інженерних розрахунків"
        rows={taskRows.map((row) => ({
          label: row.label,
          value: row.value,
          onEdit: row.themeIndex === undefined ? undefined : () => editTheme(row.themeIndex as number, true),
        }))}
        asideTitle="Карта рішення"
        aside={[...decisionRows, { label: 'Підтверджено фактів', value: String(facts.length) }]}
        action={presentation.handoff.position === 'after-brief' ? handoff : undefined}
      />
    ),
  };

  const order = mobile ? presentation.result.mobile : presentation.result.desktop;

  return (
    <section id="result" className="page-section grain-planner-root grain-result-band" aria-labelledby="grain-result-title">
      <div className="shell">
        {order.map((key) => (blocks[key] ? <div className="planner-result-block" data-block={key} key={key}>{blocks[key]}</div> : null))}
      </div>
    </section>
  );
}
