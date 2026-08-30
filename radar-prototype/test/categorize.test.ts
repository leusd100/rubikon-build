import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categorize } from '../src/categorize.js';

test('detects a strong angary match with two keyword hits', () => {
  const result = categorize('Будівництво ангару, складські приміщення для логістики');
  assert.equal(result.category, 'angary');
  assert.equal(result.confidence, 'strong');
});

test('detects a weak match with a single keyword hit', () => {
  const result = categorize('Загальнобудівельні роботи, монолітн і подальше опорядження');
  assert.equal(result.category, 'betonni-roboty');
  assert.equal(result.confidence, 'weak');
});

test('returns other/none when nothing matches', () => {
  const result = categorize('Ремонт офісного приміщення в бізнес-центрі');
  assert.equal(result.category, 'other');
  assert.equal(result.confidence, 'none');
});

test('is case-insensitive', () => {
  const result = categorize('ЗЕРНОСХОВИЩЕ ТА ЕЛЕВАТОР');
  assert.equal(result.category, 'zernoskhovyshcha');
  assert.equal(result.confidence, 'strong');
});
