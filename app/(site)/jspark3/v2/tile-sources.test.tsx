import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import { sep } from 'node:path';
import test from 'node:test';

// The page renders server-side; its stylesheets mean nothing here.
require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

// The tiles as the release may choose them: one from another set, named by its weights, and one from a RigMark
// row. The synced facts stand in, with the release's tile keys set here; their RigMark rows give every column.
const jsonPath = require.resolve('../glm-facts.json');
const synced = readFileSync(jsonPath, 'utf8');
const PROSE = 'decode_short_tok_s.prose';
const PREFILL = 'rigmark.prefill_64k';
const WEIGHTS = 'ablit weights';
const FOOTER_TAIL = ' unless marked';

function load(change: (facts: Record<string, any>) => void) {
  const data = JSON.parse(synced);
  const facts = data.facts;
  facts.rigmark.publish = true;
  facts.site_tiles = ['decode_short_tok_s.code', PROSE, PREFILL, 'concurrency_aggregate_tok_s.c8'];
  facts.site_tile_labels = { [PREFILL]: 'Cold prefill, 64K prompt (RigMark)' };
  facts.site_tile_sets = { [PROSE]: { set: 'O-D', label: WEIGHTS } };
  facts.site_tile_sources = { [PREFILL]: { rigmark_row: 'prefill_64k', set: 'V-D' } };
  facts.site_card_footer_public = `${facts.result_sets['V-D'].label_public}${FOOTER_TAIL}`;
  change(facts);
  const mocked = new Module(jsonPath);
  Object.assign(mocked, { filename: jsonPath, loaded: true, exports: data });
  require.cache[jsonPath] = mocked;
  delete require.cache[require.resolve('../glm-facts')];
  return { facts, module: require('../glm-facts') as typeof import('../glm-facts') };
}

test('a tile from another set shows that set\'s figure and names its weights; a RigMark tile shows the default set\'s column only', async () => {
  const { facts, module } = load(() => {});
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: HubPage } = await import('./HubPage');
  const html = renderToStaticMarkup(React.createElement(HubPage));
  const tileOf = (key: string) => html.match(new RegExp(`<span class="spark-hub-figure" data-metric-id="${key.replace(/\./g, '\\.')}">(.*?)</span></span>(?=<span class="spark-hub-figure"|</span>)`))?.[1] ?? '';
  assert.deepEqual(module.TILES, facts.site_tiles);

  const prose = tileOf(PROSE);
  assert.ok(prose.includes(`${facts.result_sets['O-D'].metrics.decode_short_tok_s.prose}<small>`), 'the prose tile does not show the O-D figure');
  // The tile's closing tags end the match, so its last line has no closing tag of its own.
  assert.ok(prose.includes(`<span class="spark-hub-figure-weights">${WEIGHTS}`), 'the prose tile does not name its weights');
  assert.ok(!tileOf('decode_short_tok_s.code').includes('spark-hub-figure-weights'), 'a default-set tile names weights');

  const row = facts.rigmark_rows.find((item: Record<string, string>) => item.id === 'prefill_64k');
  assert.ok(row['V-D'] !== row['O-D'] && row['V-D'] !== row.v1_8_4, 'the control row needs three different columns');
  const prefill = tileOf(PREFILL);
  assert.ok(prefill.includes(`${row['V-D']}<small>${row.unit}</small>`), `the RigMark tile does not show ${row['V-D']}`);
  const figures = html.match(/<span class="spark-hub-figures" data-figure="facts">[\s\S]*?<\/span><\/span><\/span>/)?.[0] ?? '';
  assert.ok(figures.includes(prefill), 'the tiles are not where the test looks');
  assert.ok(!figures.includes(row['O-D']) && !figures.includes(row.v1_8_4), 'a tile shows another RigMark column');
  assert.ok(!prefill.includes('spark-hub-figure-weights') && !prefill.includes('spark-hub-figure-caption'));
  assert.ok(prefill.includes('(RigMark)'));

  assert.ok(html.includes(`<span class="spark-hub-release-detail">${facts.site_card_footer_public}</span>`), 'the line under the tiles is not the release\'s');

  // The release page's hero leads with the re-measured figures, each captioned with its label, then keeps the
  // release tiles it names. Without the re-measurement it shows the hub's tiles and line.
  const { default: GlmFactsPage } = await import('./GlmFactsPage');
  const { REMEASURED_ON, resolve } = await import('./Remeasured');
  const { HERO, HERO_RELEASE_TILES } = await import('./remeasured-data');
  const page = renderToStaticMarkup(React.createElement(GlmFactsPage));
  const hero = page.match(/<div class="glm-tiles">[\s\S]*?<p class="glm-tiles-line">[\s\S]*?<\/p><\/div>/)?.[0] ?? '';
  const heroTiles = [...hero.matchAll(/data-metric-id="([^"]+)"[^>]*><dt>([^<]*)<\/dt>/g)].map(match => [match[1], match[2]]);
  const natural = REMEASURED_ON ? resolve(HERO) : [];
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/'/g, '&#x27;');
  if (natural.length) {
    const kept = module.TILE_FIGURES.filter(tile => HERO_RELEASE_TILES.includes(tile.key));
    assert.deepEqual(heroTiles, [...natural.map(item => [`remeasured.${item.chart.id}.${item.group.key}`, item.figure.label]), ...kept.map(tile => [tile.key, tile.label])]);
    // The line calls the kept tiles RigMark, and every hero tile ran on the default set.
    assert.ok(kept.every(tile => tile.key.startsWith('rigmark.') && tile.label.includes('(RigMark)') && !tile.weights));
    assert.ok(!hero.includes('glm-tile-weights'), 'a hero tile names other weights');
    for (const item of natural) {
      assert.ok(hero.includes(`<dd class="glm-tile-value">${item.figure.value}<small>${item.figure.unit}</small></dd>`), `the hero does not show ${item.figure.value}`);
      assert.ok(item.smallPrint && hero.includes(escape(item.smallPrint)), `the hero's ${item.figure.label} tile is shown without its label`);
    }
    assert.ok(hero.includes('<p class="glm-tiles-line">base weights + draft model · '), 'the hero\'s line does not name its weights');
    assert.ok(!hero.includes(row['V-D']) && !hero.includes(row['O-D']) && !hero.includes(row.v1_8_4), 'the hero still shows the RigMark prefill tile');
  } else {
    assert.deepEqual(heroTiles, module.TILE_FIGURES.map(tile => [tile.key, tile.label]));
    assert.ok(hero.includes(`<dd class="glm-tile-value">${facts.result_sets['O-D'].metrics.decode_short_tok_s.prose}<small>`), 'the hero\'s prose tile does not show the O-D figure');
    assert.ok(hero.includes(`<dd class="glm-tile-weights">${WEIGHTS}</dd>`), 'the hero\'s prose tile does not name its weights');
    assert.ok(hero.includes(`<dd class="glm-tile-value">${row['V-D']}<small>${row.unit}</small></dd>`), `the hero's RigMark tile does not show ${row['V-D']}`);
    assert.ok(!hero.includes(row['O-D']) && !hero.includes(row.v1_8_4), 'a hero tile shows another RigMark column');
    assert.ok(hero.includes(`<p class="glm-tiles-line">${facts.site_card_footer_public}</p>`), 'the hero\'s line is not the release\'s');
  }
});

test('a RigMark tile is dropped while RigMark is not published, or when it reads another column than the default set\'s', () => {
  for (const [name, change] of [
    ['not published', (facts: Record<string, any>) => { facts.rigmark.publish = false; }],
    ['undecided', (facts: Record<string, any>) => { delete facts.rigmark.publish; }],
    ['the O-D column', (facts: Record<string, any>) => { facts.site_tile_sources[PREFILL].set = 'O-D'; }],
    ['the v1.8.4 column', (facts: Record<string, any>) => { facts.site_tile_sources[PREFILL].set = 'v1_8_4'; }],
    ['a row the facts do not have', (facts: Record<string, any>) => { facts.site_tile_sources[PREFILL].rigmark_row = 'prefill_128k'; }],
  ] as const) {
    const { module } = load(change);
    assert.ok(!module.TILES.includes(PREFILL), `the RigMark tile shows with ${name}`);
    assert.equal(module.TILES.length, 3, name);
  }
});

test('a tile from a set the facts do not have is pending, never the default set\'s figure; mixed tiles need the release\'s line', () => {
  const missing = load(facts => { facts.site_tile_sets[PROSE].set = 'O-N'; }).module.TILE_FIGURES.find(tile => tile.key === PROSE)!;
  assert.equal(missing.value.state, 'pending');
  const unlabelled = load(facts => { delete facts.site_tile_sets[PROSE].label; }).module.TILE_FIGURES.find(tile => tile.key === PROSE)!;
  assert.equal(unlabelled.weights?.text, unlabelled.set?.label.text, 'without its own label, the tile names its set');
  const { module } = load(facts => { delete facts.site_card_footer_public; });
  assert.ok(module.TILES_LINE?.pending, 'mixed tiles show without the release\'s line');
});

const C4 = 'rigmark.c4';
const C4_CAPTION = 'short code, end-to-end, 256-token cap per agent';
const RATIO = /\d(?:\.\d+)?\s*[x×](?![\w/-])/;
/** The hub and the release page, rendered from the facts load() set last: every page module is loaded again. */
async function rendered() {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const facts = require.resolve('../glm-facts');
  for (const id of Object.keys(require.cache)) if (id.includes(`${sep}jspark3${sep}`) && id !== jsonPath && id !== facts) delete require.cache[id];
  const hub = renderToStaticMarkup(React.createElement(require('./HubPage').default));
  const page = renderToStaticMarkup(React.createElement(require('./GlmFactsPage').default));
  return {
    hub: (key: string) => hub.match(new RegExp(`<span class="spark-hub-figure" data-metric-id="${key.replace(/\./g, '\\.')}">(.*?)</span></span>(?=<span class="spark-hub-figure"|</span>)`))?.[1] ?? '',
    hero: (key: string) => page.match(new RegExp(`<div class="glm-tile" data-metric-id="${key.replace(/\./g, '\\.')}"[^>]*>(.*?)</div>`))?.[1] ?? '',
  };
}
const fourAtOnce = (facts: Record<string, any>) => {
  facts.site_tiles[3] = C4;
  facts.site_tile_labels[C4] = 'Four at once, end to end (RigMark)';
  facts.site_tile_sources[C4] = { rigmark_row: 'c4', set: 'V-D' };
  facts.site_tile_captions = { [C4]: C4_CAPTION };
};

test('a RigMark four-at-once tile carries the release\'s own caption word for word, never the prompt mix\'s, and the default column only', async () => {
  const { facts, module } = load(fourAtOnce);
  const tile = module.TILE_FIGURES.find(item => item.key === C4)!;
  assert.equal(tile.caption?.text, C4_CAPTION);
  // The prompt-mix rule reads N from a concurrency key; a RigMark key never matches it.
  assert.equal(module.captionTemplate(C4), null);
  const mix = module.tileCaption('concurrency_aggregate_tok_s.c4')?.text ?? '';
  assert.ok(mix && mix !== C4_CAPTION, 'the control needs the mix caption for N=4');
  const row = facts.rigmark_rows.find((item: Record<string, string>) => item.id === 'c4');
  assert.ok(row['V-D'] !== row['O-D'] && row['V-D'] !== row.v1_8_4, 'the control row needs three different columns');
  const { hub, hero } = await rendered();
  for (const [where, html, caption] of [['hub', hub(C4), `<span class="spark-hub-figure-caption">${C4_CAPTION}`], ['hero', hero(C4), `<dd class="glm-tile-condition" data-condition-of="${C4}">${C4_CAPTION}</dd>`]] as const) {
    assert.ok(html.includes(`${row['V-D']}<small>${row.unit}</small>`), `the ${where} tile does not show ${row['V-D']}`);
    assert.ok(html.includes(caption), `the ${where} tile does not carry the release's caption`);
    assert.ok(!html.includes(mix) && !html.includes('short prompts'), `the ${where} tile carries the prompt mix's caption`);
    assert.ok(!html.includes(row['O-D']) && !html.includes(row.v1_8_4) && !RATIO.test(html), `the ${where} tile shows another column or a ratio`);
  }
});

test('a RigMark four-at-once tile without its caption shows it as TBD, never bare', () => {
  for (const [name, change] of [
    ['no caption', (facts: Record<string, any>) => { delete facts.site_tile_captions; }],
    ['an empty caption', (facts: Record<string, any>) => { facts.site_tile_captions[C4] = ' '; }],
  ] as const) {
    const tile = load(facts => { fourAtOnce(facts); change(facts); }).module.TILE_FIGURES.find(item => item.key === C4)!;
    assert.ok(tile.caption?.pending, name);
  }
  // A RigMark row that is not N at once needs none.
  assert.equal(load(() => {}).module.TILE_FIGURES.find(item => item.key === PREFILL)?.caption, null);
});

test('every synced tile carries the caption its facts give: the release\'s own for a RigMark tile, the template\'s for a concurrency figure', async () => {
  const data = JSON.parse(synced);
  const mocked = new Module(jsonPath);
  Object.assign(mocked, { filename: jsonPath, loaded: true, exports: data });
  require.cache[jsonPath] = mocked;
  delete require.cache[require.resolve('../glm-facts')];
  const site = require('../glm-facts') as typeof import('../glm-facts');
  const facts = data.facts;
  const { hub, hero } = await rendered();
  for (const tile of site.TILE_FIGURES) {
    const source = facts.site_tile_sources?.[tile.key];
    const row = source && facts.rigmark_rows.find((item: Record<string, string>) => item.id === source.rigmark_row);
    const want = source ? facts.site_tile_captions?.[tile.key] ?? (/^c\d+$/.test(source.rigmark_row) ? 'TBD' : null) : site.tileCaption(tile.key)?.text ?? null;
    assert.equal(tile.caption?.text ?? null, want, tile.key);
    if (want) assert.ok(hub(tile.key).includes(want) && hero(tile.key).includes(want), `${tile.key} does not render its caption`);
    for (const html of [hub(tile.key), hero(tile.key)]) {
      assert.ok(!RATIO.test(html), `${tile.key} shows a ratio`);
      if (row) assert.ok(!html.includes(row['O-D']) && !html.includes(row.v1_8_4), `${tile.key} shows another RigMark column`);
    }
  }
});
