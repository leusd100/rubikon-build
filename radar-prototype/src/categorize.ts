import type { OpportunityCategory } from './types.js';

/**
 * Keyword substrings (lowercase, Ukrainian) that suggest each direction. Deliberately simple
 * substring matching, not stemming/NLP — matches the "deterministic and transparent" requirement
 * for Score v1. Tune by adding/removing keywords, not by rewriting the matching logic.
 */
const CATEGORY_KEYWORDS: Record<Exclude<OpportunityCategory, 'other'>, string[]> = {
  angary: ['ангар', 'логістичний центр', 'складськ'],
  zernoskhovyshcha: ['зерносховищ', 'елеватор', 'зерносклад'],
  metalokonstruktsii: ['металоконструкц', 'сталев', 'металевий каркас'],
  'betonni-roboty': ['бетон', 'фундамент', 'монолітн'],
  'pokrivelni-roboty': ['покрівл', 'дах ', 'покрівельн'],
};

export function categorize(text: string): {
  category: OpportunityCategory;
  confidence: 'strong' | 'weak' | 'none';
} {
  const lower = text.toLowerCase();
  let best: { category: OpportunityCategory; hits: number } = { category: 'other', hits: 0 };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [Exclude<OpportunityCategory, 'other'>, string[]]
  >) {
    const hits = keywords.filter((keyword) => lower.includes(keyword)).length;
    if (hits > best.hits) best = { category, hits };
  }

  if (best.hits >= 2) return { category: best.category, confidence: 'strong' };
  if (best.hits === 1) return { category: best.category, confidence: 'weak' };
  return { category: 'other', confidence: 'none' };
}
