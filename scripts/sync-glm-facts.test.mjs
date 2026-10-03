/**
 * The sync on a small facts and results pair: V-N's c8 first token leaves its hold as row B or C
 * with no edit beyond the two files.
 *
 *   node --test scripts/sync-glm-facts.test.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const sync = new URL('./sync-glm-facts.mjs', import.meta.url).pathname;
const GAP = 'Visible text arrived about 0.4 s after the first token; 3 of 24 short replies showed no text.';
const pair = set => ({ figure: `result_sets.${set}.metrics.c8_ttft_p50_s`, partner_public: `result_sets.${set}.metrics.c8_ttft_partner_public`, partner_keys: [`result_sets.${set}.metrics.c8_visible_text_p50_s`, `result_sets.${set}.metrics.c8_no_text_replies`] });
const held = { c8_ttft_p50_s: '{{HOLD}}', c8_visible_text_p50_s: '{{HOLD}}', c8_no_text_replies: '{{HOLD}}', c8_ttft_partner_public: '{{HOLD}}' };
const cell = (display, extra = {}) => ({ unit: 's', display, raw: null, ...extra });

/**
 * Syncs facts and results written to a scratch directory; returns V-N's synced metrics and the conditions. The results
 * file is named for the facts it was rendered from, as cards name it, unless name says otherwise (the sha8 is %s).
 */
function synced(facts, results, name = 'results-v2.0.1.facts-%s.json') {
  const dir = mkdtempSync(join(tmpdir(), 'glm-sync-'));
  const text = `# facts\n\n\`\`\`json\n${JSON.stringify({ version: '2.0.1', metrics_template: { _first_token_partners: [pair('V-N')] }, ...facts })}\n\`\`\`\n`;
  writeFileSync(join(dir, 'facts.md'), text);
  const file = join(dir, name.replace('%s', createHash('sha256').update(text).digest('hex').slice(0, 8)));
  writeFileSync(file, JSON.stringify({ schema: 'jspark3-release-results/1', release_version: '2.0.1', ...results }));
  execFileSync('node', [sync, join(dir, 'facts.md'), '--results', file, '--out', join(dir, 'out.json')], { stdio: 'pipe' });
  const { facts: out } = JSON.parse(readFileSync(join(dir, 'out.json'), 'utf8'));
  return { metrics: out.result_sets['V-N'].metrics, conditions: out.metric_conditions };
}

test('row B: the cards fill the held cells, their partner field fills the partner, the card-only pointer never ships', () => {
  const { metrics, conditions } = synced({ result_sets: { 'V-N': { label_public: 'base', metrics: { ...held } } } }, {
    sets: { 'V-N': { metrics: { c8_ttft_p50_s: cell('1.9', { partner: GAP }), c8_visible_text_p50_s: cell('see the note below the table'), c8_no_text_replies: cell('3 of 24'), c8_visible_gap_p50_s: cell('0.4') } } },
    conditions: { public: 'How it was measured.', first_token_partner_estimators: 'Which estimator each partner uses.' },
  });
  assert.deepEqual(metrics, { c8_ttft_p50_s: '1.9', c8_no_text_replies: '3 of 24', c8_ttft_partner_public: GAP });
  assert.equal(conditions.first_token_partner_estimators, 'Which estimator each partner uses.');
});

test('row B with the gap named in the pair: the gap cell ships for the check', () => {
  const named = { ...pair('V-N'), partner_keys: [...pair('V-N').partner_keys, 'result_sets.V-N.metrics.c8_visible_gap_p50_s'] };
  const { metrics } = synced({ metrics_template: { _first_token_partners: [named] }, result_sets: { 'V-N': { label_public: 'base', metrics: { ...held } } } }, {
    sets: { 'V-N': { metrics: { c8_ttft_p50_s: cell('1.9', { partner: GAP }), c8_visible_text_p50_s: cell('see the note below the table'), c8_no_text_replies: cell('3 of 24'), c8_visible_gap_p50_s: cell('0.4') } } },
  });
  assert.equal(metrics.c8_visible_gap_p50_s, '0.4');
  assert.ok(!('c8_visible_text_p50_s' in metrics));
});

test('row C: "not published" fills the held cells, and the held partner of an unpublished figure does not ship', () => {
  const { metrics } = synced({ result_sets: { 'V-N': { label_public: 'base', metrics: { ...held } } } }, {
    sets: { 'V-N': { metrics: { c8_ttft_p50_s: cell('not published'), c8_visible_text_p50_s: cell('not published'), c8_no_text_replies: cell('not published') } } },
  });
  assert.deepEqual(metrics, { c8_ttft_p50_s: 'not published', c8_visible_text_p50_s: 'not published', c8_no_text_replies: 'not published' });
});

test('a partner sentence that disagrees with the facts, or for a figure with no pair, is refused', () => {
  const facts = { result_sets: { 'V-N': { label_public: 'base', metrics: { ...held, c8_ttft_partner_public: 'Another sentence.' } } } };
  assert.throws(() => synced(facts, { sets: { 'V-N': { metrics: { c8_ttft_p50_s: cell('1.9', { partner: GAP }) } } } }), /is Another sentence\. in the facts but/);
  assert.throws(() => synced({ result_sets: { 'V-N': { label_public: 'base', metrics: { ...held } } } }, { sets: { 'V-N': { metrics: { c8_stall_s: cell('0.5', { partner: GAP }) } } } }), /declare no first-token pair for c8_stall_s/);
});

test('a results file rendered from other facts, or naming none, does not sync', () => {
  const facts = { result_sets: { 'V-N': { label_public: 'base', metrics: { ...held } } } };
  const results = { sets: { 'V-N': { metrics: { c8_ttft_p50_s: cell('1.9', { partner: GAP }) } } } };
  assert.doesNotThrow(() => synced(facts, results));
  assert.doesNotThrow(() => synced(facts, results, 'results-v2.0.1.facts-%s.rigmark-no.json'));
  const refusal = (name, extra = {}) => { try { synced(facts, { ...results, ...extra }, name); return 'synced'; } catch (error) { return String(error.stderr); } };
  assert.match(refusal('results-v2.0.1.facts-0badface.json'), /REFUSED: the results file was rendered from facts 0badface, but facts\.md is [0-9a-f]{12}; sync the results file rendered from these facts/);
  assert.match(refusal('results.json'), /REFUSED: results\.json does not say which facts it was rendered from/);
  assert.match(refusal('results-v2.0.1.facts-%s.json', { source_facts_sha256: '0badface'.repeat(8) }), /REFUSED: the results file is named for facts [0-9a-f]{8} but records facts 0badface0bad/);
  assert.match(refusal('results.json', { facts_sha256: 'not a sha' }), /REFUSED: the results file records its source facts as "not a sha", not a sha256/);
});
