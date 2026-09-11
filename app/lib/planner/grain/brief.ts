/**
 * The preliminary brief: the same rows the prototype's «Попередній опис» showed, plus the text
 * version that travels with an inquiry.
 *
 * The task rows are the prototype's PreliminaryBrief (app/planner.tsx, `819f163`) verbatim; the
 * decision and open-question rows reuse its «Карта рішення» aside and decision-boundary lists.
 * The text never includes WHY: at 2 229 characters for the complex scenario it would not fit the
 * inquiry's 1 600-character field, and every reason is re-derivable from the answers.
 */
import type { BriefRow, PreliminaryBrief } from '../core/types';
import { formatCapacityInfo, parseCapacity, type Answers } from './answers';
import { buildUnknowns, scenarioClientQuestions } from './boundary';
import { buildCandidates } from './candidates';
import { developmentLabel, uiLabels } from './labels';
import { hasActiveProcessing, hasExpansionTension, requiresFutureHandling, routeDecision } from './rules';
import { buildDrivers, synthesizeScenario } from './understanding';

/** The inquiry form stores at most this many characters of an attachment's text (/api/leads). */
export const GRAIN_BRIEF_TEXT_LIMIT = 1600;

const BRIEF_TEXT_HEADER = 'Опис задачі (Зерновий планувальник v1)';
const UNDECIDED_LABEL = 'Ви ще не визначили';
const FIRST_CALL_LABEL = 'На першій розмові уточнимо';
const LIST_SEPARATOR = '; ';

/** The ten «Попередній опис» rows, with the theme each one edits. */
export function grainBriefTaskRows(answers: Answers): BriefRow[] {
  const capacityLabel = formatCapacityInfo(parseCapacity(answers.capacity));
  const rows = [
    ['Тип задачі', answers.processing && !['none', 'unknown'].includes(answers.processing) ? 'Зберігання з підготовкою зерна' : answers.processing === 'none' ? 'Зберігання зерна без підтвердженої підготовки' : 'Тип задачі уточнюється', 2],
    ['Місткість', capacityLabel || 'Потрібно уточнити', 0],
    ['Продукція', answers.crops.join(' · ') || 'Потрібно уточнити', 0],
    ['Розділення', answers.separation ? uiLabels[answers.separation] : 'Не визначено', 0],
    ['Режим роботи', answers.operation ? uiLabels[answers.operation] : 'Не визначено', 1],
    ['Переміщення першої черги', answers.handling ? uiLabels[answers.handling] : 'Поки не визначено як фактор', 1],
    ['Підготовка зерна', answers.processing ? uiLabels[answers.processing] : 'Не визначено', 2],
    ['Майданчик', [answers.site && uiLabels[answers.site], answers.sitePressure && uiLabels[answers.sitePressure]].filter(Boolean).join(' · ') || 'Не визначено', 3],
    ['Розвиток', answers.development.map(developmentLabel).join(' · ') || 'Не визначено', 4],
    ['Майбутнє переміщення', requiresFutureHandling(answers) ? answers.futureHandling ? uiLabels[answers.futureHandling] : 'Потрібно уточнити' : 'Не заявлено окремо', 4],
  ] as [string, string, number][];
  return rows.map(([label, value, themeIndex]) => ({ label, value, themeIndex }));
}

/**
 * The title the brief is filed under, built from what is confirmed of scale, batches and
 * preparation. Two or more → «≈ 12 000 т · окремі партії · очищення + сушіння». Exactly one →
 * «Зерносховище · сушіння», so a lone signal never stands as a one-word title. None → the neutral
 * «Опис задачі зерносховища».
 */
export function grainBriefHeadline(answers: Answers) {
  const capacity = parseCapacity(answers.capacity);
  const parts = [
    capacity.kind === 'known' || capacity.kind === 'range' ? formatCapacityInfo(capacity) : '',
    answers.separation && answers.separation !== 'unknown' ? uiLabels[answers.separation] : '',
    hasActiveProcessing(answers.processing) ? uiLabels[answers.processing ?? ''] : '',
  ].filter(Boolean);
  if (parts.length >= 2) return parts.join(' · ');
  if (parts.length === 1) return `Зерносховище · ${parts[0]}`;
  return 'Опис задачі зерносховища';
}

export function createGrainBrief(answers: Answers): PreliminaryBrief {
  const outcome = routeDecision(answers);
  const candidates = outcome === 'candidateComparison' ? buildCandidates(answers) : [];
  const drivers = buildDrivers(answers);
  const unknowns = buildUnknowns(answers);
  const followUps = scenarioClientQuestions(answers).filter((item) => !unknowns.includes(item));
  const decision: BriefRow[] = [
    { label: 'Головні фактори', value: drivers.join(' · ') || 'Потрібно уточнити' },
    { label: outcome === 'candidateComparison' ? 'Концепції для порівняння' : 'Наступний шлях', value: candidates.length ? candidates.map((item) => item.title).join(' / ') : 'Карта уточнень перед порівнянням' },
    ...(hasExpansionTension(answers) ? [{ label: 'Ключова суперечність', value: 'Компактний майданчик ↔ фізичне розширення, але резерв території ще не підтверджено' }] : []),
  ];
  const open: BriefRow[] = [
    ...(unknowns.length ? [{ label: UNDECIDED_LABEL, value: unknowns.join(LIST_SEPARATOR) }] : []),
    ...(followUps.length ? [{ label: FIRST_CALL_LABEL, value: followUps.join(LIST_SEPARATOR) }] : []),
  ];
  return {
    headline: grainBriefHeadline(answers),
    sections: [
      { id: 'task', heading: 'Ваша задача', rows: grainBriefTaskRows(answers) },
      { id: 'decision', heading: 'Карта рішення', rows: decision },
      { id: 'open', heading: 'Що уточнити', rows: open },
    ],
  };
}

/**
 * The brief as plain text for the inquiry: one «label: value» line per row, never longer than
 * `limit`. Over the limit, the open-question lists shrink from the end — first-call questions
 * before undecided answers — and end in «…». A line is dropped whole or kept whole, never cut.
 */
export function formatGrainBriefText(brief: PreliminaryBrief, answers: Answers, limit = GRAIN_BRIEF_TEXT_LIMIT) {
  const fixed = [BRIEF_TEXT_HEADER, `Сценарій: ${synthesizeScenario(answers)}`];
  const rows = brief.sections.flatMap((section) => section.rows);
  const lists = new Map(rows.filter((row) => row.label === UNDECIDED_LABEL || row.label === FIRST_CALL_LABEL).map((row) => [row.label, row.value.split(LIST_SEPARATOR)]));
  const truncated = new Set<string>();
  const render = () => [...fixed, ...rows.flatMap((row) => {
    const items = lists.get(row.label);
    if (!items) return [`${row.label}: ${row.value}`];
    if (!items.length && !truncated.has(row.label)) return [];
    return [`${row.label}: ${[...items, ...(truncated.has(row.label) ? ['…'] : [])].join(LIST_SEPARATOR)}`];
  })].join('\n');

  let text = render();
  for (const label of [FIRST_CALL_LABEL, UNDECIDED_LABEL]) {
    const items = lists.get(label);
    while (items && items.length && text.length > limit) {
      items.pop();
      truncated.add(label);
      text = render();
    }
  }
  if (text.length <= limit) return text;
  // Unreachable with today's copy (the longest complete scenario is well under the limit); kept
  // so the contract holds even if copy grows: drop whole lines from the end.
  const lines = text.split('\n');
  while (lines.length > 1 && lines.join('\n').length > limit) lines.pop();
  return lines.join('\n');
}
