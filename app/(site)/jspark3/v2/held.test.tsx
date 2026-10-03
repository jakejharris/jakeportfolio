import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import test from 'node:test';

// The figures render server-side; their stylesheets mean nothing here.
require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

// A figure the release still owes reads as pending, never "Not measured", whether or not the synced facts still
// owe one. O-D's 8-at-once first token is held with its partner, a decode figure is TBD, and the results give
// no estimator note.
const owed: [string, string, string][] = [['O-D', 'c8_ttft_p50_s', '{{HOLD}}'], ['O-D', 'c8_visible_text_p50_s', '{{HOLD}}'], ['O-D', 'c8_no_text_replies', '{{HOLD}}'], ['O-D', 'c8_ttft_partner_public', '{{HOLD}}'], ['O-D', 'decode_long_tok_s', '{{TBD}}']];

const jsonPath = require.resolve('../glm-facts.json');
const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
for (const [id, key, value] of owed) data.facts.result_sets[id].metrics[key] = value;
if (data.facts.metric_conditions) delete data.facts.metric_conditions.first_token_partner_estimators;
const held = new Module(jsonPath);
Object.assign(held, { filename: jsonPath, loaded: true, exports: data });
require.cache[jsonPath] = held;

test('a held or TBD figure reads as pending, never "Not measured", and no estimator note shows without one', async () => {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { FIRST_TOKEN_ESTIMATORS, SETS, cell } = await import('../glm-facts');
  const { SetFigure } = await import('./FactsCharts');
  const set = (id: string) => SETS.find(item => item.id === id)!;
  for (const [id, key] of owed) if (!key.endsWith('_public')) assert.equal(cell(set(id), key).state, 'pending', `${id} ${key}`);
  assert.equal(FIRST_TOKEN_ESTIMATORS, null);
  for (const metric of ['c8_ttft_p50_s', 'decode_long_tok_s']) {
    const lines = renderToStaticMarkup(React.createElement(SetFigure, { metric })).split(/(?=<p class="glm-vs)/);
    const line = lines.find(item => item.includes('data-set="O-D"')) ?? '';
    assert.match(line, /jspark-tbd/, `O-D ${metric} is not pending`);
    assert.ok(!line.includes('Not measured'), `O-D ${metric} reads Not measured`);
    assert.ok(!lines.some(item => item.includes('glm2-partner-note')), `${metric} shows the estimator note without one`);
  }
  // The held figure keeps its partner line, pending too.
  const c8 = renderToStaticMarkup(React.createElement(SetFigure, { metric: 'c8_ttft_p50_s' })).split(/(?=<p class="glm-vs)/);
  assert.match(c8.find(item => item.startsWith('<p class="glm-vs glm2-partner" data-partner-of="O-D">')) ?? '', /jspark-tbd/);
});
