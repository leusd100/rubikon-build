import type { NormalizedOpportunity, OpportunityCategory, ScoreBreakdown, ScoreResult } from './types.js';

const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  angary: 'Ангари та склади',
  zernoskhovyshcha: 'Зерносховища',
  metalokonstruktsii: 'Металоконструкції',
  'betonni-roboty': 'Бетонні роботи',
  'pokrivelni-roboty': 'Покрівельні роботи',
  other: 'Інше / не визначено',
};

const BREAKDOWN_LABELS: Record<keyof ScoreBreakdown, string> = {
  categoryMatch: 'Відповідність напряму',
  regionFit: 'Регіон',
  deadlineRunway: 'Запас часу до дедлайну',
  budgetSignal: 'Орієнтовний бюджет',
  keywordStrength: 'Ключові слова',
};

/**
 * Pure formatter — builds the exact text a Telegram alert would contain. No network call, no
 * dependency on any Telegram library or credentials. Matches the message shape described in
 * docs/project-radar-mvp.md §Telegram alert rules.
 */
export function formatTelegramAlert(opportunity: NormalizedOpportunity, score: ScoreResult): string {
  const lines = [
    `🆕 Нова можливість — ${score.classification} (${score.total}/100)`,
    opportunity.title,
    `Категорія: ${CATEGORY_LABELS[opportunity.category]}`,
    `Регіон: ${opportunity.region ?? 'не вказано'}`,
    opportunity.deadlineAt ? `Дедлайн: ${opportunity.deadlineAt.slice(0, 10)}` : 'Дедлайн: не вказано',
    `Головний фактор: ${topFactor(score.breakdown)}`,
    opportunity.url,
  ];

  return lines.join('\n');
}

function topFactor(breakdown: ScoreBreakdown): string {
  const entries = Object.entries(breakdown) as Array<[keyof ScoreBreakdown, number]>;
  const [key, value] = entries.reduce((best, current) => (current[1] > best[1] ? current : best));
  return `${BREAKDOWN_LABELS[key]} (${value})`;
}
