import type { Classification, NormalizedOpportunity, ScoreBreakdown, ScoreConfig, ScoreResult } from './types.js';

/**
 * Default weights/thresholds/regions/keywords, matching docs/project-radar-mvp.md §Rubikon Score.
 * Everything here is intentionally a plain config object, not a hardcoded constant inside the
 * scoring function — tune by editing this object (or passing a different ScoreConfig), not by
 * rewriting scoreOpportunity().
 */
export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  weights: {
    categoryMatch: 35,
    regionFit: 25,
    deadlineRunway: 15,
    budgetSignal: 15,
    keywordStrength: 10,
  },
  thresholds: {
    highPriority: 70,
    review: 40,
  },
  primaryRegion: 'Дніпропетровська область',
  neighboringRegions: ['Запорізька область', 'Полтавська область', 'Кіровоградська область', 'Харківська область'],
  strongKeywords: ['ангар', 'зерносховищ', 'металоконструкц', 'промислов', 'елеватор', 'логістичний центр'],
};

type BudgetTier = 'unknown' | 'too-small' | 'sweet-spot' | 'very-large';

/** UAH thresholds for classifying a parsed budget figure. Deliberately simple, editable in one place. */
const BUDGET_TIER_BOUNDS = {
  tooSmallBelow: 300_000,
  sweetSpotUpTo: 5_000_000,
};

export function scoreOpportunity(
  opportunity: NormalizedOpportunity,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
  now: Date = new Date(),
): ScoreResult {
  const budgetTier = classifyBudget(opportunity.budgetHint);

  const breakdown: ScoreBreakdown = {
    categoryMatch: scoreCategoryMatch(opportunity, config),
    regionFit: scoreRegionFit(opportunity, config, budgetTier),
    deadlineRunway: scoreDeadlineRunway(opportunity, now, config),
    budgetSignal: scoreBudgetSignal(budgetTier, config),
    keywordStrength: scoreKeywordStrength(opportunity, config),
  };

  const total = Math.round(
    breakdown.categoryMatch +
      breakdown.regionFit +
      breakdown.deadlineRunway +
      breakdown.budgetSignal +
      breakdown.keywordStrength,
  );

  return { total, breakdown, classification: classify(total, config) };
}

function classify(total: number, config: ScoreConfig): Classification {
  if (total >= config.thresholds.highPriority) return 'HIGH_PRIORITY';
  if (total >= config.thresholds.review) return 'REVIEW';
  return 'IGNORE';
}

function scoreCategoryMatch(opportunity: NormalizedOpportunity, config: ScoreConfig): number {
  const weight = config.weights.categoryMatch;
  if (opportunity.categoryConfidence === 'strong') return weight;
  if (opportunity.categoryConfidence === 'weak') return Math.round(weight * 0.4);
  return 0;
}

function scoreRegionFit(opportunity: NormalizedOpportunity, config: ScoreConfig, budgetTier: BudgetTier): number {
  const weight = config.weights.regionFit;
  const region = opportunity.region ?? '';

  if (region === config.primaryRegion) return weight;
  if (config.neighboringRegions.includes(region)) return Math.round(weight * 0.6);

  // Elsewhere in Ukraine (or region unstated) is only worth points if the opportunity is large
  // enough that traveling for it would plausibly be worth it — matches the spec's "elsewhere,
  // only if large enough to be worth traveling for" rule.
  if (budgetTier === 'sweet-spot' || budgetTier === 'very-large') return Math.round(weight * 0.32);
  return 0;
}

function scoreDeadlineRunway(opportunity: NormalizedOpportunity, now: Date, config: ScoreConfig): number {
  const weight = config.weights.deadlineRunway;
  if (!opportunity.deadlineAt) return 0; // unclear — spec treats this the same as "too soon"

  const deadline = new Date(opportunity.deadlineAt);
  if (Number.isNaN(deadline.getTime())) return 0;

  const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntil > 10) return weight;
  if (daysUntil >= 3) return Math.round(weight * 0.53);
  return 0;
}

function scoreBudgetSignal(tier: BudgetTier, config: ScoreConfig): number {
  const weight = config.weights.budgetSignal;
  switch (tier) {
    case 'sweet-spot':
      return weight;
    case 'very-large':
      return Math.round(weight * 0.53);
    case 'too-small':
      return Math.round(weight * 0.33);
    case 'unknown':
    default:
      return 0; // no data — doesn't penalize, just doesn't reward
  }
}

function scoreKeywordStrength(opportunity: NormalizedOpportunity, config: ScoreConfig): number {
  const weight = config.weights.keywordStrength;
  const text = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const hits = config.strongKeywords.filter((keyword) => text.includes(keyword)).length;
  if (hits >= 2) return weight;
  if (hits === 1) return Math.round(weight * 0.5);
  return 0;
}

/**
 * Extremely simple free-text budget parser — good enough for a prototype demonstrating the
 * concept, not a robust NLP number extractor. Understands plain digits and "тис"/"млн"
 * multipliers, e.g. "500 тис грн" or "2.5 млн". Returns 'unknown' if nothing parseable is found —
 * that's a deliberate no-penalty outcome, not an error.
 */
function classifyBudget(budgetHint: string | null): BudgetTier {
  if (!budgetHint) return 'unknown';

  const lower = budgetHint.toLowerCase();
  const numberMatch = lower.match(/[\d]+([.,]\d+)?/);
  if (!numberMatch) return 'unknown';

  let value = parseFloat(numberMatch[0].replace(',', '.'));
  if (lower.includes('млн')) value *= 1_000_000;
  else if (lower.includes('тис')) value *= 1_000;

  if (value < BUDGET_TIER_BOUNDS.tooSmallBelow) return 'too-small';
  if (value <= BUDGET_TIER_BOUNDS.sweetSpotUpTo) return 'sweet-spot';
  return 'very-large';
}
