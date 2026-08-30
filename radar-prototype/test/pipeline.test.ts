import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FixtureSourceAdapter } from '../src/adapters/fixtureAdapter.js';
import { fixtures } from '../src/fixtures.js';
import { DEFAULT_SCORE_CONFIG, scoreOpportunity } from '../src/score.js';
import type { NormalizedOpportunity } from '../src/types.js';

const NOW = new Date('2026-08-30T00:00:00Z');

test('there are 15-20 fixtures, as required for business-rule calibration', () => {
  assert.ok(fixtures.length >= 15 && fixtures.length <= 20, `expected 15-20 fixtures, got ${fixtures.length}`);
});

test('every fixture URL uses the reserved .invalid TLD, never a real domain', () => {
  for (const raw of fixtures) {
    assert.match(raw.url, /\.invalid\//, `fixture URL is not clearly synthetic: ${raw.url}`);
  }
});

test('normalizing every fixture produces a valid category for each', () => {
  const adapter = new FixtureSourceAdapter('fixture-demo', fixtures);
  for (const raw of adapter.fetchRaw()) {
    const normalized = adapter.normalize(raw);
    assert.ok(
      ['angary', 'zernoskhovyshcha', 'metalokonstruktsii', 'betonni-roboty', 'pokrivelni-roboty', 'other'].includes(
        normalized.category,
      ),
    );
  }
});

test('re-polling the same fixtures a second time dedupes every item', () => {
  const adapter = new FixtureSourceAdapter('fixture-demo', fixtures);
  const seen = new Map<string, NormalizedOpportunity>();

  let firstPassNew = 0;
  for (const raw of adapter.fetchRaw()) {
    const normalized = adapter.normalize(raw);
    if (!seen.has(normalized.identityKey)) {
      seen.set(normalized.identityKey, normalized);
      firstPassNew++;
    }
  }
  assert.equal(firstPassNew, fixtures.length, 'first pass should treat every fixture as new');

  let secondPassNew = 0;
  let secondPassDeduped = 0;
  for (const raw of adapter.fetchRaw()) {
    const normalized = adapter.normalize(raw);
    if (seen.has(normalized.identityKey)) secondPassDeduped++;
    else secondPassNew++;
  }

  assert.equal(secondPassNew, 0, 'second pass should find zero new items');
  assert.equal(secondPassDeduped, fixtures.length, 'second pass should recognize every item as already-seen');
});

test('the fixture without a sourceItemId still gets a stable, reusable identity', () => {
  const adapter = new FixtureSourceAdapter('fixture-demo', fixtures);
  const withoutId = fixtures.find((item) => !item.sourceItemId);
  assert.ok(withoutId, 'expected at least one fixture with no sourceItemId, to exercise the fallback path');

  const first = adapter.normalize(withoutId!);
  const second = adapter.normalize(withoutId!);
  assert.equal(first.identityStrategy, 'content-hash-fallback');
  assert.equal(first.identityKey, second.identityKey);
});

test('scoring every fixture produces at least one HIGH_PRIORITY, one REVIEW, and one IGNORE', () => {
  const adapter = new FixtureSourceAdapter('fixture-demo', fixtures);
  const classifications = adapter
    .fetchRaw()
    .map((raw) => adapter.normalize(raw))
    .map((opportunity) => scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, NOW).classification);

  assert.ok(classifications.includes('HIGH_PRIORITY'), 'expected at least one HIGH_PRIORITY fixture');
  assert.ok(classifications.includes('REVIEW'), 'expected at least one REVIEW fixture');
  assert.ok(classifications.includes('IGNORE'), 'expected at least one IGNORE fixture');
});
