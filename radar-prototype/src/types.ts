/**
 * Core types for the Project Radar prototype.
 *
 * Isolated from the production app on purpose — nothing here is imported by `app/`, and nothing
 * in `app/` is imported here. See radar-prototype/README.md for why and how this is run.
 *
 * Source of truth for the design this implements: docs/project-radar-mvp.md
 */

/** One of Rubikon's 5 service directions, or 'other' when nothing matches confidently. */
export type OpportunityCategory =
  | 'angary'
  | 'zernoskhovyshcha'
  | 'metalokonstruktsii'
  | 'betonni-roboty'
  | 'pokrivelni-roboty'
  | 'other';

/**
 * What a SourceAdapter's fetchRaw() returns — the shape a real scraper would produce before any
 * normalization, scoring, or identity computation happens. Deliberately loose/optional on most
 * fields, since real sources rarely provide everything cleanly.
 */
export type RawItem = {
  /** The source's own identifier for this listing, if it exposes one. Empty string/undefined if not —
   *  see dedupe.ts for how identity is computed when this is missing. */
  sourceItemId?: string;
  url: string;
  title: string;
  description?: string;
  region?: string;
  /** ISO date string, if the source states one. */
  publishedAt?: string;
  /** ISO date string, if the source states one. */
  deadlineAt?: string;
  /** Free text — sources rarely give a clean structured number. e.g. "500 000 грн", "не вказано". */
  budgetHint?: string;
};

export type IdentityStrategy = 'stable-id' | 'content-hash-fallback';

/**
 * The canonical shape every source adapter normalizes into — this is what gets deduplicated,
 * scored, stored, and alerted on. Matches the `opportunities` table design in
 * docs/project-radar-mvp.md, minus the DB-only bookkeeping columns (id, last_seen_at, status)
 * that don't exist until there's a real database.
 */
export type NormalizedOpportunity = {
  source: string;
  sourceItemId: string;
  /** `${source}:${sourceItemId}` for stable-id sources, or a content-hash fallback identity —
   *  see dedupe.ts. This is what dedup actually keys on. */
  identityKey: string;
  identityStrategy: IdentityStrategy;
  url: string;
  title: string;
  description: string;
  category: OpportunityCategory;
  categoryConfidence: 'strong' | 'weak' | 'none';
  region: string | null;
  publishedAt: string | null;
  deadlineAt: string | null;
  budgetHint: string | null;
  firstSeenAt: string;
};

/**
 * The contract every source implements. A real Rabotniki.ua adapter (not built yet — see
 * docs/project-radar-mvp.md's explicit non-goals) would implement this exactly the same way the
 * FixtureSourceAdapter here does, which is the point: this prototype proves the contract works
 * end-to-end without touching a real source.
 */
export interface SourceAdapter {
  id: string;
  fetchRaw(): Promise<RawItem[]> | RawItem[];
  normalize(raw: RawItem): NormalizedOpportunity;
}

export type ScoreBreakdown = {
  categoryMatch: number;
  regionFit: number;
  deadlineRunway: number;
  budgetSignal: number;
  keywordStrength: number;
};

export type Classification = 'HIGH_PRIORITY' | 'REVIEW' | 'IGNORE';

export type ScoreResult = {
  total: number;
  breakdown: ScoreBreakdown;
  classification: Classification;
};

export type ScoreConfig = {
  weights: {
    categoryMatch: number;
    regionFit: number;
    deadlineRunway: number;
    budgetSignal: number;
    keywordStrength: number;
  };
  thresholds: {
    /** total >= this => HIGH_PRIORITY */
    highPriority: number;
    /** total >= this (and below highPriority) => REVIEW; below this => IGNORE */
    review: number;
  };
  primaryRegion: string;
  neighboringRegions: string[];
  strongKeywords: string[];
};
