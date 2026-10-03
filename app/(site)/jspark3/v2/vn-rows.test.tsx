import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import test from 'node:test';

// The figures render server-side; their stylesheets mean nothing here.
require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

// V-N's c8 first token leaves its hold one of two ways, each by a sync alone. The synced facts
// here carry both at once, as scripts/sync-glm-facts.mjs writes them: row B on V-N (a figure, the gap sentence as
// its partner, the estimator note; the card-only pointer already dropped) and row C on O-D ("not published", no partner).
const GAP = 'Visible text arrived about 0.4 s after the first token (median of paired replies); 3 of 24 short replies spent their 96-token limit on reasoning and showed no text.';
const ESTIMATORS = 'Without the draft model the partner gives the gap from first token to visible text, paired by reply.';
const jsonPath = require.resolve('../glm-facts.json');
const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
const metrics = (id: string) => data.facts.result_sets[id].metrics;
Object.assign(metrics('V-N'), { c8_ttft_p50_s: '1.9', c8_no_text_replies: '3 of 24', c8_ttft_partner_public: GAP });
delete metrics('V-N').c8_visible_text_p50_s;
Object.assign(metrics('O-D'), { c8_ttft_p50_s: 'not published', c8_visible_text_p50_s: 'not published', c8_no_text_replies: 'not published' });
delete metrics('O-D').c8_ttft_partner_public;
data.facts.metric_conditions = { ...data.facts.metric_conditions, first_token_partner_estimators: ESTIMATORS };
const synced = new Module(jsonPath);
Object.assign(synced, { filename: jsonPath, loaded: true, exports: data });
require.cache[jsonPath] = synced;

test('row B: the figure, its gap sentence beneath it, and the estimator note once under the last set', async () => {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { SetFigure } = await import('./FactsCharts');
  const html = renderToStaticMarkup(React.createElement(SetFigure, { metric: 'c8_ttft_p50_s' }));
  const lines = html.split(/(?=<p class="glm-vs)/);
  const at = lines.findIndex(line => line.includes('data-set="V-N"'));
  assert.match(lines[at], /: 1\.9 s<\/p>/);
  assert.ok(lines[at + 1].startsWith('<p class="glm-vs glm2-partner" data-partner-of="V-N">') && lines[at + 1].includes(GAP));
  assert.equal(html.split('glm2-partner-note').length - 1, 1);
  assert.ok(lines.at(-1)!.startsWith('<p class="glm-vs glm2-partner-note">') && lines.at(-1)!.includes(ESTIMATORS));
  assert.ok(!/see the note/i.test(html));
});

test('row C: "Not published", with no unit and no partner, and never "Not measured"', async () => {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { SETS, cell, partner } = await import('../glm-facts');
  const { SetFigure } = await import('./FactsCharts');
  const html = renderToStaticMarkup(React.createElement(SetFigure, { metric: 'c8_ttft_p50_s' }));
  const line = html.split(/(?=<p class="glm-vs)/).find(item => item.includes('data-set="O-D"')) ?? '';
  assert.match(line, /: Not published<\/p>$/);
  assert.ok(!html.includes('data-partner-of="O-D"') && !html.includes('Not measured'));
  const od = SETS.find(set => set.id === 'O-D');
  assert.equal(partner(od, 'c8_ttft_p50_s'), null);
  assert.deepEqual(cell(od, 'c8_ttft_p50_s'), { state: 'absent', slot: { text: 'Not published', pending: false } });
});
