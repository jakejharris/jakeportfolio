import assert from 'node:assert/strict';
import test from 'node:test';
import { getPostModifiedAt } from './post-dates';

test('mixed timestamp precision cannot move modification before publication', () => {
  const wholeSecond = '2026-09-29T12:00:00Z';
  const fractionalSecond = '2026-09-29T12:00:00.500Z';

  assert.equal(getPostModifiedAt(fractionalSecond, wholeSecond), fractionalSecond);
  assert.equal(getPostModifiedAt(wholeSecond, fractionalSecond), fractionalSecond);
});

test('modification uses the later publication or edit instant', () => {
  const publishedAt = '2026-09-29T12:00:00.000Z';
  assert.equal(getPostModifiedAt(publishedAt, '2026-09-28T12:00:00Z'), publishedAt);
  assert.equal(getPostModifiedAt(publishedAt, '2026-09-30T12:00:00Z'), '2026-09-30T12:00:00Z');
});
