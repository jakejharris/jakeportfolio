import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

// The figures render server-side; their stylesheets mean nothing here.
require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

const root = join(__dirname, '../../../..');
const PARTNER_LINE = /<p class="glm-vs glm2-partner" data-partner-of="([^"]+)">/g;

/** The sets whose figure line in a SetFigure has no partner line directly beneath it. */
function unpaired(html: string, sets: string[]) {
  const lines = html.split(/(?=<p class="glm-vs)/);
  return sets.filter(id => {
    const at = lines.findIndex(line => line.includes(`data-set="${id}"`));
    return at < 0 || !lines[at + 1]?.startsWith(`<p class="glm-vs glm2-partner" data-partner-of="${id}">`);
  });
}

test('a partnered figure never renders without its partner, directly beneath each set that shows it', async () => {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { PARTNERS, PARTNER_FLOOR, SETS, cell, partner, TILES } = await import('../glm-facts');
  const { SetFigure } = await import('./FactsCharts');
  for (const metric of Object.keys(PARTNERS)) {
    const html = renderToStaticMarkup(React.createElement(SetFigure, { metric }));
    const shown = SETS.filter(set => cell(set, metric).state !== 'absent').map(set => set.id);
    // The floor's figure is on the page; a pair the facts declare may name a figure no set gives yet.
    if (Object.hasOwn(PARTNER_FLOOR, metric)) assert.ok(shown.length > 0, `no set shows ${metric}`);
    assert.deepEqual(unpaired(html, shown), [], `${metric} renders without its partner`);
    assert.deepEqual([...html.matchAll(PARTNER_LINE)].map(match => match[1]), shown);
    for (const set of SETS.filter(item => shown.includes(item.id))) assert.ok(html.includes(partner(set, metric)!.text.replace(/&/g, '&amp;')), `${set.id} partner text`);
    // Negative control: the same figure with its partner lines taken out is caught.
    assert.deepEqual(unpaired(html.replace(/<p class="glm-vs glm2-partner"[^>]*>.*?<\/p>/g, ''), shown), shown);
    // A hub tile and the share card have no room for the sentence.
    assert.ok(!TILES.includes(metric), `${metric} is a hub tile`);
  }
});

test('the page and the gate share the floor pair', async () => {
  const { PARTNER_FLOOR } = await import('../glm-facts');
  const { FLOOR } = await import('../../../../scripts/glm-partners.mjs');
  assert.deepEqual(PARTNER_FLOOR, Object.fromEntries(Object.entries(FLOOR).map(([key, pair]) => [key, pair.partner])));
});

test('no other surface names a partnered figure', async () => {
  const { PARTNERS, PARTNER_FLOOR } = await import('../glm-facts');
  const allowed = new Set(['app/(site)/jspark3/glm-facts.ts', 'app/(site)/jspark3/v2/GlmFactsPage.tsx', 'app/(site)/jspark3/v2/partners.test.tsx', 'app/(site)/jspark3/v2/partners-declared.test.tsx', 'app/(site)/jspark3/v2/held.test.tsx', 'app/(site)/jspark3/v2/vn-rows.test.tsx', 'scripts/glm-partners.mjs', 'scripts/glm-partners.test.mjs', 'scripts/sync-glm-facts.test.mjs']);
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => (entry.isDirectory() ? files(join(dir, entry.name)) : /\.(tsx?|mjs)$/.test(entry.name) ? [join(dir, entry.name)] : []));
  for (const file of [...files(join(root, 'app')), ...files(join(root, 'scripts'))]) {
    const path = relative(root, file);
    if (allowed.has(path) || path === 'scripts/check-glm-facts.mjs') continue;
    for (const metric of Object.keys(PARTNERS)) assert.ok(!readFileSync(file, 'utf8').includes(metric), `${path} names ${metric}; render it with SetFigure, which prints its partner`);
  }
  // On the v2.0.1 page the figure is a SetFigure, the one renderer that prints the partner. A pair the facts
  // declare for a figure the page does not name yet has nothing to pair until it does.
  const page = readFileSync(join(root, 'app/(site)/jspark3/v2/GlmFactsPage.tsx'), 'utf8');
  for (const metric of Object.keys(PARTNERS)) if (Object.hasOwn(PARTNER_FLOOR, metric) || page.includes(`'${metric}'`)) assert.match(page, new RegExp(`SINGLE_FIGURES = \\[[^\\]]*\\{ metric: '${metric.replace(/\./g, '\\.')}' \\}`));
});

test('a held or TBD figure reads as pending, never "Not measured", and no estimator note shows without one', async () => {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { FIRST_TOKEN_ESTIMATORS, PARTNERS, SETS, cell } = await import('../glm-facts');
  const { SetFigure } = await import('./FactsCharts');
  const owed = /^\{\{(?:HOLD|TBD)\b/;
  const leaves = (value: unknown, prefix = ''): [string, unknown][] => (value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value).flatMap(([key, item]) => leaves(item, `${prefix}${key}.`)) : [[prefix.slice(0, -1), value]]);
  let checked = 0;
  for (const set of SETS) for (const [path, value] of leaves(set.metrics)) {
    if (typeof value !== 'string' || !owed.test(value.trim())) continue;
    assert.equal(cell(set, path).state, 'pending', `${set.id} ${path} (${value})`);
    checked += 1;
  }
  // Once every figure is filled there is nothing owed here; held.test.tsx checks owed cells it writes itself.
  if (!checked) return;
  for (const metric of Object.keys(PARTNERS)) {
    const html = renderToStaticMarkup(React.createElement(SetFigure, { metric }));
    for (const set of SETS.filter(item => typeof item.metrics[metric] === 'string' && owed.test(String(item.metrics[metric])))) {
      const line = html.split(/(?=<p class="glm-vs)/).find(item => item.includes(`data-set="${set.id}"`)) ?? '';
      assert.match(line, /jspark-tbd/, `${set.id} ${metric} is not pending`);
      assert.ok(!line.includes('Not measured'), `${set.id} ${metric} reads Not measured`);
    }
    if (!FIRST_TOKEN_ESTIMATORS) assert.ok(!html.includes('glm2-partner-note'));
  }
});
