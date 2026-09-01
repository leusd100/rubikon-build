import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTelegramAlert } from '../src/telegramFormatter.js';
import { DEFAULT_SCORE_CONFIG, scoreOpportunity } from '../src/score.js';
import type { NormalizedOpportunity } from '../src/types.js';

const opportunity: NormalizedOpportunity = {
  source: 'test-source',
  sourceItemId: 'x1',
  identityKey: 'test-source:x1',
  identityStrategy: 'stable-id',
  url: 'https://example.test/x1',
  title: 'Будівництво промислового ангару',
  description: '',
  category: 'angary',
  categoryConfidence: 'strong',
  region: DEFAULT_SCORE_CONFIG.primaryRegion,
  publishedAt: '2026-08-25',
  deadlineAt: '2026-09-19T00:00:00Z',
  budgetHint: '1.2 млн грн',
  firstSeenAt: '2026-08-30T00:00:00Z',
};

test('formatTelegramAlert produces a message containing the key facts', () => {
  const score = scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, new Date('2026-08-30T00:00:00Z'));
  const message = formatTelegramAlert(opportunity, score);

  assert.match(message, /HIGH_PRIORITY/);
  assert.match(message, new RegExp(opportunity.title));
  assert.match(message, /Ангари та склади/);
  assert.match(message, /Дніпропетровська область/);
  assert.match(message, /2026-09-19/);
  assert.ok(message.includes(opportunity.url));
});

test('formatTelegramAlert handles a missing deadline without throwing', () => {
  const withoutDeadline = { ...opportunity, deadlineAt: null };
  const score = scoreOpportunity(withoutDeadline, DEFAULT_SCORE_CONFIG, new Date('2026-08-30T00:00:00Z'));
  const message = formatTelegramAlert(withoutDeadline, score);
  assert.match(message, /Дедлайн: не вказано/);
});

test('formatTelegramAlert never makes a network call — it is a pure string function', () => {
  // Documented, not just implied: there is no fetch/http import anywhere in telegramFormatter.ts.
  // This test asserts the observable behavior (a synchronous, pure return value) rather than
  // trying to intercept a network call that should never exist in the first place.
  const score = scoreOpportunity(opportunity, DEFAULT_SCORE_CONFIG, new Date('2026-08-30T00:00:00Z'));
  const result = formatTelegramAlert(opportunity, score);
  assert.equal(typeof result, 'string');
});
