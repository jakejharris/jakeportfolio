/**
 * The release's copy rules as the sync applies them, with their exemptions.
 *
 *   node --test scripts/glm-facts-hygiene.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { COPY_RULES, copyRuleIssues, publicIssues } from './glm-facts-hygiene.mjs';

const claim = 'This is the only release on DGX Sparks.';
const both = 'This is the only release on DGX Sparks, faster than vLLM.';
const rules = allow_sentences => ({ ...COPY_RULES, allow_patterns: [], allow_sentences });
const kinds = (text, ruleset) => copyRuleIssues(text, ruleset).map(issue => issue.split(' in ')[0]);

test('the rules refuse a claim and a comparison', () => {
  assert.deepEqual(kinds(claim, rules([])), ['a first/only/unique claim']);
  assert.deepEqual(kinds(both, rules([])), ['a first/only/unique claim', 'a comparison with a third-party build or engine']);
});

test('a bare allowed sentence is exempt from every rule', () => {
  assert.deepEqual(kinds(both, rules([both])), []);
});

test('an allowed sentence written as an entry is exempt only from the rules it lists', () => {
  assert.deepEqual(kinds(both, rules([{ sentence: both, rules: ['claims'] }])), ['a comparison with a third-party build or engine']);
  assert.deepEqual(kinds(claim, rules([{ sentence: claim }])), []);
});

test('an entry scoped to other surfaces does not exempt the sentence on this site', () => {
  assert.deepEqual(kinds(claim, rules([{ sentence: claim, surfaces: ['docs/OPERATIONS.md'], rules: ['claims'] }])), ['a first/only/unique claim']);
  assert.deepEqual(kinds(claim, rules([{ sentence: claim, surfaces: ['jakejh.com drafts'], rules: ['claims'] }])), []);
});

test('the RigMark comparison copy passes the rules', () => {
  for (const sentence of ['Appliance comparison: different model IDs, not a same-weights claim.', 'v1.8.4 is about 2% faster on this row.']) assert.deepEqual(kinds(sentence, COPY_RULES), []);
});

test('the reasoning-token prose time to first token never passes, in a figure or a sentence', () => {
  const figure = ['0', '293'].join('.');
  assert.match(publicIssues(`RigMark reports ${figure} s.`, 'note').join(), /reasoning-token prose time to first token/);
  assert.match(publicIssues('Its first token (0.31 s) marks the first reasoning token, not visible text.', 'note').join(), /a time to the first reasoning token/);
  assert.deepEqual(publicIssues(`It took 10.${'293'} s and ${figure}5 s.`, 'note'), []);
  for (const sentence of [
    "v1.8.4 shows prose text about 0.10 s sooner; v2.0.1 takes about 1.27x as long. RigMark's own prose time to first token marks the first reasoning token, not visible text, so it is not shown.",
    'Time to first token is measured to the first streamed token, reasoning or text; most replies begin with a short reasoning passage, so visible text can arrive later.',
  ]) assert.deepEqual(publicIssues(sentence, 'note'), []);
});
