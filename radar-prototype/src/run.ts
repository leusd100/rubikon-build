import { FixtureSourceAdapter } from './adapters/fixtureAdapter.js';
import { fixtures } from './fixtures.js';
import { DEFAULT_SCORE_CONFIG, scoreOpportunity } from './score.js';
import { formatTelegramAlert } from './telegramFormatter.js';
import type { NormalizedOpportunity, ScoreResult } from './types.js';

/**
 * Local prototype runner — no network calls, no database, no Telegram API. Prints the pipeline's
 * output to the console so the design in docs/project-radar-mvp.md can be inspected end-to-end.
 *
 * Run after building (see radar-prototype/README.md):
 *   node radar-prototype/dist/src/run.js
 */

// Fixed "now" so every run produces identical, comparable output — a real deployment would use
// the actual current time (scoreOpportunity()'s `now` parameter defaults to `new Date()`).
const PROTOTYPE_NOW = new Date('2026-08-30T00:00:00Z');

function runPoll(adapter: FixtureSourceAdapter, seen: Map<string, NormalizedOpportunity>, label: string) {
  console.log(`\n=== ${label} ===`);
  const raw = adapter.fetchRaw();
  let newCount = 0;
  let dedupedCount = 0;

  for (const item of raw) {
    const normalized = adapter.normalize(item);

    if (seen.has(normalized.identityKey)) {
      dedupedCount++;
      continue;
    }

    seen.set(normalized.identityKey, normalized);
    newCount++;

    const score = scoreOpportunity(normalized, DEFAULT_SCORE_CONFIG, PROTOTYPE_NOW);
    printOpportunity(normalized, score);
  }

  console.log(`\n${label} summary: ${newCount} new, ${dedupedCount} already-seen (deduped by identityKey)`);
}

function printOpportunity(opportunity: NormalizedOpportunity, score: ScoreResult) {
  console.log(`\n[${score.classification}] ${opportunity.title}`);
  console.log(`  score: ${score.total}/100`);
  console.log(
    `  breakdown: category=${score.breakdown.categoryMatch} region=${score.breakdown.regionFit} ` +
      `deadline=${score.breakdown.deadlineRunway} budget=${score.breakdown.budgetSignal} ` +
      `keywords=${score.breakdown.keywordStrength}`,
  );
  console.log(`  identity: ${opportunity.identityKey} (${opportunity.identityStrategy})`);
}

function main() {
  const adapter = new FixtureSourceAdapter('fixture-demo', fixtures);
  const seen = new Map<string, NormalizedOpportunity>();

  // Poll #1: everything is new.
  runPoll(adapter, seen, 'Poll #1');

  // Poll #2: simulates the adapter's next scheduled run against the same source with no new
  // listings — every item should be recognized as already-seen via identityKey, nothing re-scored,
  // nothing re-alerted. This is the dedup guarantee described in docs/project-radar-mvp.md.
  runPoll(adapter, seen, 'Poll #2 (simulated re-poll of the same listings)');

  // One Telegram alert preview, for the highest-scoring HIGH_PRIORITY opportunity.
  const scored = [...seen.values()].map((opportunity) => ({
    opportunity,
    score: scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, PROTOTYPE_NOW),
  }));
  const best = scored
    .filter((entry) => entry.score.classification === 'HIGH_PRIORITY')
    .sort((a, b) => b.score.total - a.score.total)[0];

  if (best) {
    console.log('\n=== Telegram alert preview (formatted only — no network call made) ===\n');
    console.log(formatTelegramAlert(best.opportunity, best.score));
  }

  const counts = scored.reduce(
    (acc, entry) => {
      acc[entry.score.classification]++;
      return acc;
    },
    { HIGH_PRIORITY: 0, REVIEW: 0, IGNORE: 0 },
  );
  console.log(`\n=== Classification totals ===\n${JSON.stringify(counts, null, 2)}`);
}

main();
