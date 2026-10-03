/**
 * First-token pairs as the release declares them: one entry per set in, one pair per figure out.
 *
 *   node --test scripts/glm-partners.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { CARD_POINTER, FLOOR, UNPUBLISHED, partnersOf, partnersWith } from './glm-partners.mjs';

const entry = (set, figure, partner, keys) => ({
  figure: `result_sets.${set}.metrics.${figure}`,
  partner_public: `result_sets.${set}.metrics.${partner}`,
  partner_keys: keys.map(key => `result_sets.${set}.metrics.${key}`),
});
const C8 = ['V-D', 'O-D', 'V-N'].map(set => entry(set, 'c8_ttft_p50_s', 'c8_ttft_partner_public', ['c8_visible_text_p50_s', 'c8_no_text_replies']));

test('the facts list (a084a0ba shape) becomes one pair per figure, the same as the floor', () => {
  const { pairs, problems } = partnersOf(C8);
  assert.deepEqual(problems, []);
  assert.deepEqual(pairs, FLOOR);
  assert.deepEqual(partnersWith(pairs), FLOOR);
});

test('facts without a list keep the floor', () => {
  assert.deepEqual(partnersOf(undefined), { pairs: {}, problems: [] });
  assert.deepEqual(partnersWith({}), FLOOR);
});

test('a new pair declared only in the facts is in force beside the floor', () => {
  const { pairs, problems } = partnersOf([...C8, entry('V-D', 'c8_stall_s.median', 'c8_stall_partner_public', ['c8_stall_s.max'])]);
  assert.deepEqual(problems, []);
  assert.deepEqual(partnersWith(pairs)['c8_stall_s.median'], { partner: 'c8_stall_partner_public', keys: ['c8_stall_s.max'] });
  assert.ok(partnersWith(pairs).c8_ttft_p50_s);
});

test('a set that names another partner sentence, a pair across sets, and a malformed entry are refused', () => {
  assert.match(partnersOf([...C8, entry('O-D', 'c8_ttft_p50_s', 'c8_other_public', ['c8_no_text_replies'])]).problems.join(), /gives c8_ttft_p50_s the partner c8_other_public, an earlier set c8_ttft_partner_public/);
  assert.match(partnersOf([{ ...C8[1], partner_public: C8[0].partner_public }]).problems.join(), /another set's cells/);
  assert.match(partnersOf([{ figure: 'c8_ttft_p50_s' }]).problems.join(), /needs figure, partner_public and partner_keys/);
  assert.match(partnersOf({}).problems.join(), /not a list/);
});

test('the same pair with its keys in another order is the same pair', () => {
  const swapped = { ...C8[1], partner_keys: [...C8[1].partner_keys].reverse() };
  assert.deepEqual(partnersOf([C8[0], swapped]).problems, []);
});

test('a set that names more keys (row B: the gap) adds them to what the sentence must give', () => {
  const { pairs, problems } = partnersOf([...C8.slice(0, 2), entry('V-N', 'c8_ttft_p50_s', 'c8_ttft_partner_public', ['c8_visible_text_p50_s', 'c8_visible_gap_p50_s', 'c8_no_text_replies'])]);
  assert.deepEqual(problems, []);
  assert.deepEqual(pairs.c8_ttft_p50_s, { partner: 'c8_ttft_partner_public', keys: ['c8_visible_text_p50_s', 'c8_no_text_replies', 'c8_visible_gap_p50_s'] });
});

test('the card-only pointer and "not published" are matched as written, and nothing else', () => {
  for (const text of ['see the note below the table', 'See the note below the table.']) assert.match(text, CARD_POINTER);
  for (const text of ['not published', 'Not published.']) assert.match(text, UNPUBLISHED);
  for (const text of ['see the note', '1.9', 'not measured', 'not published yet']) assert.ok(!CARD_POINTER.test(text) && !UNPUBLISHED.test(text), text);
});
