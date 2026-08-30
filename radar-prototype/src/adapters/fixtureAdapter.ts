import { categorize } from '../categorize.js';
import { computeIdentity } from '../dedupe.js';
import type { NormalizedOpportunity, RawItem, SourceAdapter } from '../types.js';

/**
 * Stands in for a real source (e.g. a future Rabotniki.ua adapter — not built, per
 * docs/project-radar-mvp.md's explicit non-goals) so the SourceAdapter contract, dedup, and
 * scoring pipeline can be proven end-to-end without scraping anything real.
 *
 * A real adapter would implement fetchRaw() by actually requesting the source (after its own
 * §Privacy/legal checklist sign-off) and normalize() the same way this one does — that symmetry
 * is the point of the interface.
 */
export class FixtureSourceAdapter implements SourceAdapter {
  readonly id: string;
  private readonly items: RawItem[];

  constructor(id: string, items: RawItem[]) {
    this.id = id;
    this.items = items;
  }

  fetchRaw(): RawItem[] {
    return this.items;
  }

  normalize(raw: RawItem): NormalizedOpportunity {
    const identity = computeIdentity(this.id, raw);
    const combinedText = `${raw.title} ${raw.description ?? ''}`;
    const { category, confidence } = categorize(combinedText);

    return {
      source: this.id,
      sourceItemId: raw.sourceItemId ?? '',
      identityKey: identity.identityKey,
      identityStrategy: identity.strategy,
      url: raw.url,
      title: raw.title,
      description: raw.description ?? '',
      category,
      categoryConfidence: confidence,
      region: raw.region ?? null,
      publishedAt: raw.publishedAt ?? null,
      deadlineAt: raw.deadlineAt ?? null,
      budgetHint: raw.budgetHint ?? null,
      firstSeenAt: new Date().toISOString(),
    };
  }
}
