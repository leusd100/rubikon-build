import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SCORE_CONFIG, scoreOpportunity } from '../src/score.js';
import type { NormalizedOpportunity } from '../src/types.js';

const NOW = new Date('2026-08-30T00:00:00Z');

function makeOpportunity(overrides: Partial<NormalizedOpportunity> = {}): NormalizedOpportunity {
  return {
    source: 'test-source',
    sourceItemId: 'x1',
    identityKey: 'test-source:x1',
    identityStrategy: 'stable-id',
    url: 'https://example.test/x1',
    title: 'Тестова можливість',
    description: '',
    category: 'angary',
    categoryConfidence: 'strong',
    region: DEFAULT_SCORE_CONFIG.primaryRegion,
    publishedAt: '2026-08-25',
    deadlineAt: '2026-09-19', // 20 days after NOW
    budgetHint: '1.2 млн грн',
    firstSeenAt: '2026-08-30T00:00:00Z',
    ...overrides,
  };
}

test('a strong-fit opportunity classifies as HIGH_PRIORITY', () => {
  const opportunity = makeOpportunity({ title: 'Будівництво ангару', description: 'промислового призначення' });
  const result = scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, NOW);
  assert.equal(result.classification, 'HIGH_PRIORITY');
  assert.ok(result.total >= DEFAULT_SCORE_CONFIG.thresholds.highPriority);
});

test('an unrelated category with no other strong signals classifies as IGNORE', () => {
  const opportunity = makeOpportunity({
    category: 'other',
    categoryConfidence: 'none',
    region: 'м. Київ',
    deadlineAt: '2026-09-01', // 2 days — too tight
    budgetHint: '95 тис грн', // too small
    title: 'Ремонт офісу',
    description: '',
  });
  const result = scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, NOW);
  assert.equal(result.classification, 'IGNORE');
});

test('scoring is deterministic — identical input produces identical output', () => {
  const opportunity = makeOpportunity();
  const first = scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, NOW);
  const second = scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, NOW);
  assert.deepEqual(first, second);
});

test('score breakdown fields sum to the total', () => {
  const opportunity = makeOpportunity();
  const result = scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, NOW);
  const sum = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
  assert.equal(sum, result.total);
});

test('a missing deadline scores zero deadline-runway points, same as a too-tight one', () => {
  const withDeadline = makeOpportunity({ deadlineAt: '2026-08-31' }); // 1 day — too tight
  const withoutDeadline = makeOpportunity({ deadlineAt: null });
  const a = scoreOpportunity(withDeadline, DEFAULT_SCORE_CONFIG, NOW);
  const b = scoreOpportunity(withoutDeadline, DEFAULT_SCORE_CONFIG, NOW);
  assert.equal(a.breakdown.deadlineRunway, 0);
  assert.equal(b.breakdown.deadlineRunway, 0);
});

test('an unparseable/missing budget scores zero, not a penalty relative to a mid-value one', () => {
  const noBudget = makeOpportunity({ budgetHint: null });
  const result = scoreOpportunity(noBudget, DEFAULT_SCORE_CONFIG, NOW);
  assert.equal(result.breakdown.budgetSignal, 0);
});

test('a distant region with a large budget still earns partial region-fit points', () => {
  const opportunity = makeOpportunity({ region: 'Волинська область', budgetHint: '12 млн грн' });
  const result = scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, NOW);
  assert.ok(result.breakdown.regionFit > 0, 'expected a non-zero region-fit bonus for a large distant opportunity');
});

test('a distant region with a small budget earns zero region-fit points', () => {
  const opportunity = makeOpportunity({ region: 'Волинська область', budgetHint: '95 тис грн' });
  const result = scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, NOW);
  assert.equal(result.breakdown.regionFit, 0);
});

test('a custom ScoreConfig changes classification thresholds as expected', () => {
  // This strong-fit fixture scores 100/100 (see the first test above) — so proving a
  // stricter config actually changes the outcome requires a threshold *above* 100, not just a
  // high-looking number that 100 would still clear.
  const opportunity = makeOpportunity({ title: 'Будівництво ангару', description: 'промислового призначення' });
  const strictConfig = {
    ...DEFAULT_SCORE_CONFIG,
    thresholds: { highPriority: 101, review: 95 },
  };
  const result = scoreOpportunity(opportunity, strictConfig, NOW);
  assert.notEqual(result.classification, 'HIGH_PRIORITY');
  assert.equal(result.classification, 'REVIEW');
});
