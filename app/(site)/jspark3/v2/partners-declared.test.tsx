import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import test from 'node:test';

// The figures render server-side; their stylesheets mean nothing here.
require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

// A pair the release declares only in its facts (metrics_template._first_token_partners, synced as
// first_token_partners) reaches the page with no code edit. The control pair is the 8-stream stall median,
// which no code pairs: the synced facts declare it, V-D writes its sentence and O-D's is still to come.
const PAIR = { metric: 'c8_stall_s.median', partner: 'c8_stall_partner_public' };
const SENTENCE = 'The worst pause in those runs was 0.75 s.';

const jsonPath = require.resolve('../glm-facts.json');
const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
data.facts.first_token_partners = { ...data.facts.first_token_partners, [PAIR.metric]: { partner: PAIR.partner, keys: ['c8_stall_s.max'] } };
data.facts.result_sets['V-D'].metrics[PAIR.partner] = SENTENCE;
data.facts.result_sets['O-D'].metrics[PAIR.partner] = '{{TBD}}';
const declared = new Module(jsonPath);
Object.assign(declared, { filename: jsonPath, loaded: true, exports: data });
require.cache[jsonPath] = declared;

test('a pair declared only in the facts puts its partner beneath the figure, with no code edit', async () => {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { PARTNERS, PARTNER_FLOOR, SETS, TILES, cell } = await import('../glm-facts');
  const { SetFigure } = await import('./FactsCharts');
  assert.equal(PARTNERS[PAIR.metric], PAIR.partner);
  assert.ok(!Object.hasOwn(PARTNER_FLOOR, PAIR.metric), 'the control pair must not be in the code');
  const html = renderToStaticMarkup(React.createElement(SetFigure, { metric: PAIR.metric }));
  const shown = SETS.filter(set => cell(set, PAIR.metric).state !== 'absent').map(set => set.id);
  assert.ok(shown.includes('V-D') && shown.includes('O-D'), `shown: ${shown}`);
  const lines = html.split(/(?=<p class="glm-vs)/);
  for (const id of shown) {
    const at = lines.findIndex(line => line.includes(`data-set="${id}"`));
    assert.ok(lines[at + 1]?.startsWith(`<p class="glm-vs glm2-partner" data-partner-of="${id}">`), `${id} figure renders without its partner`);
  }
  // V-D prints its sentence; O-D's is still to come, so its partner is a visible TBD, never final copy.
  const partnerOf = (id: string) => lines.find(line => line.startsWith(`<p class="glm-vs glm2-partner" data-partner-of="${id}">`)) ?? '';
  assert.ok(partnerOf('V-D').includes(SENTENCE));
  assert.match(partnerOf('O-D'), /jspark-tbd/);
  // A partnered figure is never a hub tile, though the release lists the stall median as one.
  assert.ok(!TILES.includes(PAIR.metric));
  // The c8 pair stands beside it.
  assert.equal(PARTNERS.c8_ttft_p50_s, 'c8_ttft_partner_public');
});
