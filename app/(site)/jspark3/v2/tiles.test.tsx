import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// The page renders server-side; its stylesheets mean nothing here.
require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

const root = join(__dirname, '../../../..');

test('a concurrency tile on the hub carries its condition from the release template, a RigMark tile the release\'s own; other tiles carry none', async () => {
  const React = await import('react');
  // The page's components use the classic JSX runtime, as in Next.
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { TILES, captionTemplate, tileCaption } = await import('../glm-facts');
  const { default: HubPage } = await import('./HubPage');
  const facts = JSON.parse(readFileSync(join(root, 'app/(site)/jspark3/glm-facts.json'), 'utf8')).facts;
  const html = renderToStaticMarkup(React.createElement(HubPage));
  let captioned = 0;
  for (const key of TILES) {
    const tile = html.match(new RegExp(`<span class="spark-hub-figure" data-metric-id="${key.replace(/\./g, '\\.')}">(.*?)</span></span>(?=<span class="spark-hub-figure"|</span>)`))?.[1] ?? '';
    assert.ok(tile, `${key} is not a hub tile`);
    const needs = captionTemplate(key);
    const own = facts.site_tile_captions?.[key];
    if (!needs) {
      assert.equal(tileCaption(key), null);
      if (own) assert.ok(tile.endsWith(`<span class="spark-hub-figure-caption">${own.replace(/'/g, '&#x27;')}`), `${key} renders without the release's "${own}"`);
      else assert.ok(!tile.includes('spark-hub-figure-caption'), `${key} needs no caption`);
      continue;
    }
    const template = facts.template_labels?.[needs.template];
    assert.equal(typeof template, 'string', `the synced facts have no ${needs.template}`);
    const expected = template.replace(/\{N\}/g, needs.n);
    // The caption closes the tile (its closing tags end the match).
    assert.ok(tile.endsWith(`<span class="spark-hub-figure-caption">${expected.replace(/'/g, '&#x27;')}`), `${key} renders without "${expected}"`);
    captioned += 1;
  }
  // The release's tiles include the 8-at-once total and the 8-at-once pause.
  if (TILES.includes('concurrency_aggregate_tok_s.c8') || TILES.some(key => key.startsWith('c8_stall_s.'))) assert.ok(captioned > 0);
});

test('every c8, c-ladder and stall figure on /jspark3/glm/ names its condition, with its own N, from the release template; a RigMark tile the release\'s own', async () => {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { PARTNER_FLOOR, STREAMS, captionTemplate } = await import('../glm-facts');
  const { default: GlmFactsPage } = await import('./GlmFactsPage');
  const facts = JSON.parse(readFileSync(join(root, 'app/(site)/jspark3/glm-facts.json'), 'utf8')).facts;
  const html = renderToStaticMarkup(React.createElement(GlmFactsPage));
  // RigMark's v1.8.4 comparison rows follow RigMark's own protocol under its scope line, not the release's templates:
  // rigmark.comparison_public.c1_ttft_row (rendered as c1_ttft) carries no condition, since a borrowed one would be false.
  const rigmark = html.match(/<figure class="[^"]*glm2-compare[^"]*"[\s\S]*?<\/figure>/);
  const inRigmark = (index: number) => !!rigmark && index >= rigmark.index! && index < rigmark.index! + rigmark[0].length;
  const figures = [...html.matchAll(/data-metric-id="([^"]+)"/g)].filter(match => !inRigmark(match.index!));
  const shown = figures.map(match => match[1]);
  // The closed set: the c8 first-token figure (the partnered floor, named only through PARTNER_FLOOR), the stall
  // figure and every c-ladder point.
  const firstToken = Object.keys(PARTNER_FLOOR).filter(key => captionTemplate(key));
  assert.equal(firstToken.length, 1, 'the c8 first-token figure is not the partnered floor');
  for (const key of [...firstToken, 'c8_stall_s.median', ...STREAMS.map(streams => `concurrency_aggregate_tok_s.${streams}`)]) assert.ok(shown.includes(key), `${key} is not on the page`);
  let conditioned = 0;
  figures.forEach((match, index) => {
    const key = match[1];
    // A figure runs from its own data-metric-id to the next one.
    const body = html.slice(match.index, figures[index + 1]?.index ?? html.length);
    const needs = captionTemplate(key);
    const own = facts.site_tile_captions?.[key];
    if (!needs) {
      if (!own) return assert.ok(!body.includes('data-condition-of='), `${key} needs no condition`);
      assert.ok(body.includes(`data-condition-of="${key}">${own.replace(/'/g, '&#x27;')}<`), `${key} is shown without the release's "${own}"`);
      conditioned += 1;
      return;
    }
    const template = facts.template_labels?.[needs.template];
    assert.equal(typeof template, 'string', `the synced facts have no ${needs.template}`);
    const expected = template.replace(/\{N\}/g, needs.n);
    assert.ok(body.includes(`data-condition-of="${key}">${expected.replace(/'/g, '&#x27;')}<`), `${key} is shown without "${expected}"`);
    conditioned += 1;
  });
  assert.ok(conditioned >= 2 + STREAMS.length);
  assert.equal(html.match(/data-condition-of=/g)?.length ?? 0, conditioned, 'a condition stands outside its figure');
});

test('the gate asks for the same templates the page uses', async () => {
  const { captionTemplate } = await import('../glm-facts');
  const gate = readFileSync(join(root, 'scripts/check-glm-facts.mjs'), 'utf8');
  const rule = gate.match(/const captionOf = (key => .*?);\n/)?.[1];
  assert.ok(rule, 'check-glm-facts.mjs has no captionOf');
  const captionOf = new Function(`return (${rule});`)() as (key: string) => string | null;
  for (const key of ['concurrency_aggregate_tok_s.c1', 'concurrency_aggregate_tok_s.c8', 'concurrency_aggregate_tok_s.c16', 'c8_stall_s.median', 'c8_stall_s.max', 'c4_ttft_p50_s', 'c8_visible_text_p50_s', 'c1_ttft_row', 'c8_stall_s', 'concurrency_label_template', 'cold_ttft_s.32k', 'decode_short_tok_s.code', 'max_context_tokens']) {
    assert.equal(captionOf(key), captionTemplate(key)?.template ?? null, key);
  }
  // A RigMark tile takes the release's own caption (site_tile_captions), never the prompt mix's, though its row is N at once.
  for (const key of ['rigmark.c4', 'rigmark.c8', 'rigmark.prefill_64k']) {
    assert.equal(captionOf(key), null, key);
    assert.equal(captionTemplate(key), null, key);
  }
});
