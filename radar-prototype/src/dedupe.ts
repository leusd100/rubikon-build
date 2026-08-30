import { createHash } from 'node:crypto';
import type { IdentityStrategy, RawItem } from './types.js';

/**
 * Deduplication identity, per docs/project-radar-mvp.md §Deduplication strategy.
 *
 * Primary strategy: `${source}:${sourceItemId}` when the source provides a stable per-listing ID —
 * the exact same idempotency pattern already used for `leads.submission_id` in Step 01, deliberately
 * reused rather than inventing a new one.
 *
 * Fallback strategy (documented, not incidental): when a source doesn't expose a stable ID, hash a
 * normalized combination of title + region + published date. This is a deliberate approximation —
 * it will not catch every real-world duplicate (e.g. a listing re-posted with a slightly reworded
 * title), and it is not meant to. Cross-source dedup and fuzzy matching are explicit non-goals for
 * the MVP; this fallback only needs to survive *the same source re-showing the same listing on
 * repeat polls*, which is the actual problem it exists to solve.
 */
export function computeIdentity(
  source: string,
  raw: RawItem,
): { identityKey: string; strategy: IdentityStrategy } {
  const stableId = raw.sourceItemId?.trim();

  if (stableId) {
    return { identityKey: `${source}:${stableId}`, strategy: 'stable-id' };
  }

  const basis = [normalizeForHash(raw.title), normalizeForHash(raw.region ?? ''), (raw.publishedAt ?? '').slice(0, 10)].join(
    '|',
  );
  const hash = createHash('sha256').update(basis).digest('hex').slice(0, 16);

  return { identityKey: `${source}:hash:${hash}`, strategy: 'content-hash-fallback' };
}

function normalizeForHash(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}
