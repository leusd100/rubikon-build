import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeIdentity } from '../src/dedupe.js';

test('computeIdentity uses the stable-id strategy when sourceItemId is present', () => {
  const result = computeIdentity('rabotniki-ua', {
    sourceItemId: 'abc-123',
    url: 'https://example.test/1',
    title: 'Будівництво ангару',
  });

  assert.equal(result.strategy, 'stable-id');
  assert.equal(result.identityKey, 'rabotniki-ua:abc-123');
});

test('computeIdentity falls back to a content hash when sourceItemId is missing', () => {
  const result = computeIdentity('rabotniki-ua', {
    url: 'https://example.test/2',
    title: 'Зерносховище на новому майданчику',
    region: 'Полтавська область',
    publishedAt: '2026-08-23',
  });

  assert.equal(result.strategy, 'content-hash-fallback');
  assert.match(result.identityKey, /^rabotniki-ua:hash:[0-9a-f]{16}$/);
});

test('the fallback hash is deterministic for the same title/region/date', () => {
  const raw = {
    url: 'https://example.test/3',
    title: 'Зерносховище на новому майданчику',
    region: 'Полтавська область',
    publishedAt: '2026-08-23',
  };

  const first = computeIdentity('rabotniki-ua', raw);
  const second = computeIdentity('rabotniki-ua', raw);

  assert.equal(first.identityKey, second.identityKey);
});

test('the fallback hash is case/whitespace-insensitive on title', () => {
  const a = computeIdentity('rabotniki-ua', { url: 'x', title: 'Зерносховище   тест' });
  const b = computeIdentity('rabotniki-ua', { url: 'x', title: 'зерносховище тест' });

  assert.equal(a.identityKey, b.identityKey);
});

test('an empty-string sourceItemId is treated as missing, not as a stable id', () => {
  const result = computeIdentity('rabotniki-ua', { sourceItemId: '   ', url: 'x', title: 'Ангар' });
  assert.equal(result.strategy, 'content-hash-fallback');
});
