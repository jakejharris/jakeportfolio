import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// The page renders server-side; its stylesheets mean nothing here.
require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('only cells the table marks PUBLISHABLE are drawn; a group or chart left empty is dropped', async () => {
  const { publishable } = await import('./remeasured-figures');
  const bar = (name: string, screen: 'PUBLISHABLE' | 'DIAGNOSTIC' | 'HOLD') => ({ name, tone: 'default' as const, value: '1.0', screen, source: 'row 1' });
  const charts = publishable([
    { id: 'a', ruler: 'user-visible', title: 'A', unit: 'tok/s', better: 'higher', methods: 'm', groups: [
      { key: 'kept', label: 'Kept', bars: [bar('ok', 'PUBLISHABLE'), bar('looped', 'DIAGNOSTIC')] },
      { key: 'held', label: 'Held', bars: [bar('held', 'HOLD')] },
    ] },
    { id: 'b', ruler: 'resume', title: 'B', unit: 's', better: 'lower', methods: 'm', groups: [{ key: 'held', label: 'Held', bars: [bar('held', 'HOLD')] }] },
  ]);
  assert.deepEqual(charts.map(chart => chart.id), ['a']);
  assert.deepEqual(charts[0].groups.map(group => group.key), ['kept']);
  assert.deepEqual(charts[0].groups[0].bars.map(item => item.name), ['ok']);
});

test('placeholder figures stay off in production and show only in a local preview; "0" leaves the section out', async () => {
  const { remeasuredShown } = await import('./remeasured-figures');
  assert.equal(remeasuredShown(true, undefined), false);
  assert.equal(remeasuredShown(true, '1'), true);
  assert.equal(remeasuredShown(false, undefined), true);
  // "0" leaves the re-measurement out: the release's own page, which the tile tests render.
  assert.equal(remeasuredShown(false, '0'), false);
});

test('every figure has a table row, a label and a methods line; every lead comes from its group', async () => {
  const { CHARTS, LEAD } = await import('./remeasured-data');
  for (const chart of CHARTS) {
    assert.ok(chart.methods.trim(), `${chart.id} has no methods line`);
    for (const group of chart.groups) {
      assert.ok(group.smallPrint ?? chart.smallPrint, `${chart.id}.${group.key} has no label`);
      for (const bar of group.bars) assert.match(bar.source, /^row \d+[a-z]?$|^glm-v180\.json /, `${chart.id}.${group.key} ${bar.name} has no source`);
      // A figure beside v1.8.0's always says how the two runs differ.
      if (group.bars.some(bar => bar.tone === 'before') && group.bars.some(bar => bar.screen === 'PUBLISHABLE')) assert.ok(group.notes?.length && (group.smallPrint ?? chart.smallPrint), `${chart.id}.${group.key} compares without its notes`);
    }
  }
  for (const lead of LEAD) {
    const group = CHARTS.find(chart => chart.id === lead.chart)?.groups.find(item => item.key === lead.group);
    assert.ok(group, `${lead.label} names no group`);
    assert.ok(group.bars.some(bar => bar.value === lead.value) || group.condition?.includes(`${lead.value} ${lead.unit}`), `${lead.label} ${lead.value} is not in its group`);
  }
});

test('the rendered section keeps its rules: speeds after the first token say so, held figures stay off, no em dash', async () => {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: Remeasured } = await import('./Remeasured');
  const { ANCHOR, CHARTS, PLACEHOLDER } = await import('./remeasured-data');
  const html = renderToStaticMarkup(React.createElement(Remeasured));
  if (PLACEHOLDER && process.env.JSPARK3_REMEASURED_PREVIEW !== '1') return assert.equal(html, '');
  assert.match(html, new RegExp(`<section[^>]* id="${ANCHOR}"`));
  const copy = text(html);
  assert.ok(!copy.includes(String.fromCodePoint(0x2014)), 'em dash in the section');
  assert.ok(!/\bvLLM\b|\babli/i.test(copy), 'names vLLM or the ablit weights');
  // Each held or diagnostic figure is absent (none of them shares its value with a shown one).
  const shown = new Set(CHARTS.flatMap(chart => chart.groups.flatMap(group => group.bars.filter(bar => bar.screen === 'PUBLISHABLE').map(bar => bar.value))));
  for (const chart of CHARTS) for (const group of chart.groups) for (const bar of group.bars) {
    if (bar.screen !== 'PUBLISHABLE' && !shown.has(bar.value)) assert.ok(!copy.includes(bar.value), `${chart.id}.${group.key} ${bar.name} (${bar.screen}) renders`);
  }
  // A group with nothing drawn shows none of its lines either.
  for (const chart of CHARTS) for (const group of chart.groups) {
    if (group.bars.some(bar => bar.screen === 'PUBLISHABLE') || !group.condition) continue;
    assert.ok(!copy.includes(group.condition), `${chart.id}.${group.key} condition renders without its figures`);
  }
  // No speedup is computed, and no figure for several requests at once appears anywhere in the section.
  assert.ok(!copy.includes('%'), 'a percentage renders');
  assert.ok(!/\b(?:eight|8)\b[^.]*\b(?:requests|users|agents|streams)\b|per request|at once/i.test(copy), 'a several-at-once figure renders');
  // A reply rate measured after the first token never shows without saying so (table row 6).
  for (const match of copy.matchAll(/streamed at [\d.,]+ tok\/s[^.;]*/g)) assert.match(match[0], /\(after the first token\)/, match[0]);
  // Row 2's first streamed token was reasoning: it never shows without the time its answer text began.
  for (const line of html.split(/<\/p>/)) if (line.includes('0.26 s')) assert.match(line, /first answer text by 0\.62 s/, text(line));
  // Row 7 is the server's prefill, never a first-token time, and never "back in" a session.
  const resume = html.match(new RegExp(`<figure[^>]* id="${ANCHOR}-resume"[\\s\\S]*?</figure>`))?.[0] ?? '';
  assert.match(resume, /server prefill 2\.3 s with disk cache vs 56\.7 s fresh/);
  assert.ok(!/time to first token|back in/i.test(text(resume)), 'the resume chart reads as a first-token time');
});

test('the round-once audit: withdrawn figures stay off, timings say fresh or cached, estimates say so', async () => {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: Remeasured } = await import('./Remeasured');
  const { RemeasuredSetChart } = await import('./Remeasured');
  const { SET_CHARTS } = await import('./remeasured-data');
  const { HERO_SUMMARY } = await import('./remeasured-figures');
  const sets = SET_CHARTS.map(chart => renderToStaticMarkup(React.createElement(RemeasuredSetChart, { id: chart.id }))).join('');
  const copy = `${text(renderToStaticMarkup(React.createElement(Remeasured)))} ${text(sets)} ${HERO_SUMMARY ?? ''}`;
  // Rounded twice (73.6, decode 92.9, the re-run's 96.1, 158.3), or a mean of a fresh run with cached ones
  // (0.15 / 0.13 s, 102.7 / 71.1, decode 115.3 / 75.8, 175.8).
  for (const figure of ['73.6', '92.9', '96.1', '158.3', '0.15 s', '0.13 s', '102.7', '71.1', '115.3', '75.8', '175.8']) assert.ok(!copy.includes(figure), `${figure} renders`);
  // Row 6's reading rates are estimates: never shown without the sign, and the hero's names its estimator.
  for (const match of copy.matchAll(/(.)2,1(?:49|02)/g)) assert.equal(match[1], '≈', `${match[0]} shows without ≈`);
  assert.match(HERO_SUMMARY ?? '', /≈2,149 tok\/s/);
  // Row 4 was measured only with the prompt already cached: its label says so wherever it shows.
  const cached = 'Replies forced to 2,000 tokens, thinking requested off, prompt already cached';
  for (const match of copy.matchAll(/Replies forced to 2,000 tokens, thinking requested off/g)) assert.equal(copy.slice(match.index, match.index + cached.length), cached);
  // Every rate names its prompt: 92.5 (row 2) was a fresh prompt, 73.5 (rows 4 and 5) a cached one, here, in the
  // hero and the hub card, and in the page's description.
  const { default: GlmFactsPage } = await import('./GlmFactsPage');
  const { default: HubPage } = await import('./HubPage');
  const hero = renderToStaticMarkup(React.createElement(GlmFactsPage)).match(/<div class="glm-tiles">[\s\S]*?<p class="glm-tiles-line">[\s\S]*?<\/p><\/div>/)?.[0] ?? '';
  const card = renderToStaticMarkup(React.createElement(HubPage)).match(/<span class="spark-hub-figures" data-figure="facts">[\s\S]*?<span class="spark-hub-release-action">/)?.[0] ?? '';
  const rates = `${copy} ${text(hero)} ${text(card)}`;
  for (const [figure, status] of [['92.5', /fresh prompt/], ['73.5', /cached/]] as const) {
    const near = [...rates.matchAll(new RegExp(figure.replace('.', '\\.'), 'g'))].map(match => rates.slice(Math.max(0, match.index - 120), match.index + 200));
    assert.ok(near.length >= 4, `${figure} shows ${near.length} times`);
    for (const line of near) assert.match(line, status, line);
  }
  assert.ok(HERO_SUMMARY?.includes('Code, one request, fresh prompt: 92.5 tok/s') && HERO_SUMMARY.includes('Prose, one request, prompt cached: 73.5 tok/s') && HERO_SUMMARY.includes('Reading a 32K-token prompt, fresh: ≈2,149 tok/s'), HERO_SUMMARY ?? 'no description');
  // Row 5's cached-prompt rates show only beside the fresh ones, saying so.
  for (const match of copy.matchAll(/108\.5/g)) assert.match(copy.slice(match.index - 40, match.index), /already cached: code $/, 'a cached rate shows alone');
  // The cached-prompt time never shows alone, and the short replies' first token always says it is a fresh prompt.
  const after = (pattern: RegExp, length: number) => [...copy.matchAll(pattern)].map(match => copy.slice(match.index, match.index + length));
  // The range keeps its non-breaking hyphen, so it never wraps.
  assert.ok(!copy.includes('0.07-0.08'), 'the cached-prompt range can wrap at its hyphen');
  for (const line of after(/0\.07\u20110\.08 s/g, 45)) assert.match(line, /^0\.07\u20110\.08 s when the prompt is already cached/, line);
  const fresh = after(/0\.31 s/g, 65);
  assert.ok(fresh.length, 'the short replies\' first token is not shown');
  for (const line of fresh) assert.match(line, /fresh prompt/, line);
  // Row 8: the one-stream pair names each side's prompt cache in the audit's words, and the claim that v1.8
  // never repeated a prompt is gone. Its two- to eight-stream cells stay off until the fresh-against-fresh recompute.
  const ladder = 'Prompt cache: v1.8 fresh, v2.0.1 cached. At one stream the rate is timed from the first token, so the cache doesn\'t enter it (v2.0.1 one-stream code measured 107.7 fresh vs 107.8 cached).';
  assert.ok(!/repeated the same prompts|did not repeat/i.test(copy), 'v1.8 is said never to have repeated a prompt');
  const pair = [...copy.matchAll(/(?:49\.1|67\.9) tok\/s/g)];
  assert.ok(pair.length >= 2, 'the one-stream pair is not shown');
  for (const match of pair) assert.ok(copy.slice(match.index, match.index + 400).includes(ladder), `${match[0]} shows without its prompt cache`);
  for (const figure of ['138.0', '87.4', '147.9', '102.5', '156.3', '113.1', '205.0', '142.4']) assert.ok(!copy.includes(figure), `row 8's ${figure} renders`);
});

test('tonight\'s rows in every measured set: base + draft from the band, other sets not yet re-measured until a figure drops in', async () => {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { RemeasuredSetChart } = await import('./Remeasured');
  const { CHARTS, DATE, MEASURED_SET, SET_CHARTS } = await import('./remeasured-data');
  const { SETS } = await import('../glm-facts');
  assert.ok(SETS.some(set => set.id === MEASURED_SET), 'the measured set is not a result set');
  for (const chart of SET_CHARTS) for (const row of chart.rows) {
    const from = CHARTS.find(item => item.id === row.from.chart);
    assert.ok(from?.groups.find(group => group.key === row.from.group)?.bars.some(bar => bar.name === row.from.bar), `${chart.id}.${row.key} names no band figure`);
    assert.equal(from?.ruler, chart.ruler, `${chart.id}.${row.key} mixes two measurements`);
  }
  const groups = (id: string) => renderToStaticMarkup(React.createElement(RemeasuredSetChart, { id })).split('<div class="glm-group"').slice(1);
  const [reply] = SET_CHARTS;
  const before = groups(reply.id);
  assert.equal(before.length, reply.rows.length);
  for (const group of before) {
    assert.ok(group.includes(`measured ${DATE}`), 'a row is not dated');
    assert.equal(group.match(/data-state="value"/g)?.length, 1, 'a row draws a set the table did not measure');
    assert.equal(group.match(/Not yet re-measured/g)?.length, SETS.length - 1);
  }
  // An ablit figure drops in as data only; a figure that is not PUBLISHABLE does not.
  const other = SETS.find(set => set.id !== MEASURED_SET)!;
  const row = reply.rows[0];
  try {
    row.sets = { [other.id]: { value: '12.3', screen: 'PUBLISHABLE', source: 'row 2' } };
    const dropped = groups(reply.id)[0];
    assert.equal(dropped.match(/data-state="value"/g)?.length, 2);
    assert.ok(dropped.includes('12.3'));
    row.sets = { [other.id]: { value: '12.3', screen: 'DIAGNOSTIC', source: 'row 2' } };
    assert.ok(!groups(reply.id)[0].includes('12.3'), 'a diagnostic figure drops in');
  } finally {
    delete row.sets;
  }
});

test('the GLM page leads with the natural figures: hero, the re-measured band, every set, RigMark against v1.8.4, then the rest in order', async () => {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: GlmFactsPage } = await import('./GlmFactsPage');
  const { RIGMARK_SHOWN } = await import('../glm-facts');
  const { ANCHOR } = await import('./remeasured-data');
  const html = renderToStaticMarkup(React.createElement(GlmFactsPage));
  const order = ['class="glm-tiles"', 'id="results"', `id="${ANCHOR}"`, 'id="results-title"', 'id="sets"', ...(RIGMARK_SHOWN ? ['id="against-v184"'] : []), 'id="weights"', 'id="draft-model"', 'id="compatibility"', 'id="install"', 'id="known-issues"', 'id="built-on"', 'id="why-glm"', 'id="history"'];
  const at = order.map(marker => html.indexOf(marker));
  order.forEach((marker, index) => assert.ok(at[index] > (index ? at[index - 1] : -1), `${marker} is out of order`));
  // The hero is user-visible figures: no server prefill, no first streamed reasoning.
  const hero = html.match(/<div class="glm-tiles">[\s\S]*?<\/dl>/)?.[0] ?? '';
  assert.ok(hero && !/prefill|0\.26 s|56\.7/.test(text(hero)), 'the hero shows a server-side or reasoning-first figure');
});

test('the hub card and the share card show the GLM page\'s hero: the same figures, labels and line', async () => {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: GlmFactsPage } = await import('./GlmFactsPage');
  const { default: HubPage } = await import('./HubPage');
  const { HERO_FIGURES, HERO_LINE, HERO_SIGNATURE, HERO_TILES, REMEASURED_ON, SHARE_IMAGE, resolve } = await import('./remeasured-figures');
  const { HERO, HERO_RELEASE_TILES } = await import('./remeasured-data');
  const { SOCIAL_IMAGE, TILE_FIGURES } = await import('../glm-facts');
  const share = (await import('../glm-share.json')).default as { image: string; figures?: string[]; image_sha256?: string };
  if (!REMEASURED_ON) return;
  // The hero leads with the re-measured figures, each from its group, then keeps only the RigMark tiles named.
  assert.deepEqual(HERO_FIGURES.map(figure => figure.value), resolve(HERO).map(item => item.figure.value));
  assert.deepEqual(HERO_TILES.map(tile => tile.key), TILE_FIGURES.filter(tile => HERO_RELEASE_TILES.includes(tile.key)).map(tile => tile.key));
  assert.ok(HERO_TILES.every(tile => tile.key.startsWith('rigmark.') && tile.label.includes('(RigMark)') && !tile.weights), 'a kept tile is not a default-set RigMark tile');
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/'/g, '&#x27;');
  const page = renderToStaticMarkup(React.createElement(GlmFactsPage));
  const hub = renderToStaticMarkup(React.createElement(HubPage));
  const hero = page.match(/<div class="glm-tiles">[\s\S]*?<p class="glm-tiles-line">[\s\S]*?<\/p><\/div>/)?.[0] ?? '';
  const card = hub.match(/<span class="spark-hub-figures" data-figure="facts">[\s\S]*?<span class="spark-hub-release-action">/)?.[0] ?? '';
  const shown = (html: string, tag: string) => [...html.matchAll(new RegExp(`data-metric-id="([^"]+)"[^>]*><${tag}[^>]*>([^<]*)<`, 'g'))].map(match => [match[1], match[2]]);
  const want = [...HERO_FIGURES.map(figure => [figure.key, figure.label]), ...HERO_TILES.map(tile => [tile.key, tile.label])];
  assert.deepEqual(shown(hero, 'dt'), want, 'the hero shows other tiles');
  assert.deepEqual(shown(card, 'span'), want, 'the hub card shows other tiles than the hero');
  for (const figure of HERO_FIGURES) {
    assert.ok(hero.includes(`<dd class="glm-tile-value">${figure.value}<small>${figure.unit}</small></dd>`) && hero.includes(escape(figure.caption)), `the hero's ${figure.label} tile is shown without its value or label`);
    assert.ok(card.includes(`<span class="spark-hub-figure-value">${figure.value}<small>${figure.unit}</small></span>`) && card.includes(escape(figure.caption)), `the hub's ${figure.label} tile is shown without its value or label`);
  }
  assert.ok(HERO_LINE && hero.includes(`<p class="glm-tiles-line">${HERO_LINE.lead}`) && card.includes(`<span class="spark-hub-release-detail">${HERO_LINE.lead}${HERO_LINE.measured}</span>`), 'the hub and the hero say different things about their figures');
  assert.ok(HERO_LINE.lead.startsWith('base weights + draft model · '), 'the line does not name the weights');
  // No RigMark prefill tile, from any column, stands in the hero or the hub card.
  const synced = (await import('../glm-facts.json')).default as { facts: { rigmark_rows?: Record<string, string>[] } };
  const prefill = synced.facts.rigmark_rows?.find(row => row.id === 'prefill_64k');
  if (prefill) for (const html of [hero, card]) for (const column of ['V-D', 'O-D', 'v1_8_4']) if (prefill[column]) assert.ok(!html.includes(`>${prefill[column]}<`), `${prefill[column]} still shows`);
  // The share card was rendered with these figures, so the page uses it; a card with other figures falls back.
  assert.deepEqual(share.figures, HERO_SIGNATURE, 'the share card shows other figures than the hero; rerun scripts/render-glm-share.mjs');
  // Its address carries the image's hash, so a link preview cached with an earlier card fetches this one.
  const image = createHash('sha256').update(readFileSync(join(__dirname, '../../../../public', share.image))).digest('hex');
  assert.equal(share.image_sha256, image, 'glm-share.json records another image; rerun scripts/render-glm-share.mjs');
  assert.ok(SOCIAL_IMAGE && SHARE_IMAGE === `${SOCIAL_IMAGE}?v=${image.slice(0, 12)}`, 'the page does not use the share card at its versioned address');
});

test('known issues carry the numbers the copy cites: each is numbered and anchored, and every citation names one', async () => {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: GlmFactsPage } = await import('./GlmFactsPage');
  const { KNOWN_ISSUES } = await import('../glm-facts');
  const { ANCHOR } = await import('./remeasured-data');
  const html = renderToStaticMarkup(React.createElement(GlmFactsPage));
  const list = html.match(/<ol class="glm2-list glm2-issues">([\s\S]*?)<\/ol>/)?.[1] ?? '';
  const items = [...list.matchAll(/<li id="known-issue-(\d+)"><span class="glm2-issue-number">(\d+)<\/span><span>([\s\S]*?)<\/span><\/li>/g)];
  assert.equal(items.length, KNOWN_ISSUES.length, 'an issue is not numbered');
  items.forEach((match, index) => assert.deepEqual([match[1], match[2]], [`${index + 1}`, `${index + 1}`], `issue ${index + 1} carries another number`));
  // The release appends issues and never renumbers them: the copy's citations keep their place.
  assert.match(text(items[1][3]).trim(), /^`?response_format`? is ignored\./);
  assert.match(text(items[16][3]).trim(), /^Saving a conversation to the disk session store is best-effort\./);
  // Every "known issue N" the page cites is on the list, and every link to one lands on it.
  for (const match of text(html).matchAll(/known issue (\d+)/g)) assert.ok(Number(match[1]) >= 1 && Number(match[1]) <= items.length, `known issue ${match[1]} is cited but not listed`);
  for (const match of html.matchAll(/href="#(known-issue-\d+)"/g)) assert.ok(html.includes(`id="${match[1]}"`), `#${match[1]} leads nowhere`);
  // The session resume's disk save is known issue 17 (table row 7), linked to it.
  const resume = html.match(new RegExp(`<figure[^>]* id="${ANCHOR}-resume"[\\s\\S]*?</figure>`))?.[0] ?? '';
  assert.ok(resume.includes('<a href="#known-issue-17">known issue 17</a>'), 'the resume chart does not cite known issue 17');
  assert.ok(!/known issue 11/.test(resume), 'the resume chart still cites known issue 11');
});

test('the GLM page\'s description and link previews give the hero\'s figures with their labels, and no figure for requests at once', async () => {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { metadata } = await import('../glm/page');
  const { DESCRIBED_FIGURES, DESCRIBED_MEASURED, HERO_FIGURES, HERO_TILES, REMEASURED_ON } = await import('./remeasured-figures');
  const synced = (await import('../glm-facts.json')).default as { facts: { headline?: { cites?: { value: string }[] } } };
  if (!REMEASURED_ON) return;
  const og = metadata.openGraph as { description?: string };
  const twitter = metadata.twitter as { description?: string };
  const description = String(metadata.description);
  assert.equal(og.description, description);
  assert.equal(twitter.description, description);
  // Every figure it gives names its prompt's cache status; one without a status is left out, never listed bare.
  assert.equal(DESCRIBED_FIGURES.length, HERO_FIGURES.filter(figure => figure.prompt).length);
  for (const figure of DESCRIBED_FIGURES) assert.ok(description.includes(figure) && /, (?:fresh|fresh prompt|prompt cached): /.test(figure), `the description does not give "${figure}"`);
  for (const figure of [...HERO_FIGURES.filter(item => !item.prompt).map(item => item.value), ...HERO_TILES.map(tile => tile.value.slot.text)]) assert.ok(!description.includes(figure), `the description lists ${figure} without its cache status`);
  assert.ok(DESCRIBED_MEASURED && description.endsWith(DESCRIBED_MEASURED), 'the description does not say what its figures were measured with');
  // The release headline's figures are for eight requests at once; previews show none of them.
  for (const cite of synced.facts.headline?.cites ?? []) assert.ok(!description.includes(cite.value), `the description gives the headline's ${cite.value}`);
  assert.ok(!/\b(?:eight|8)\b[^.]*\b(?:concurrent|requests|users|agents|streams)\b|\bc8\b/i.test(description), 'the description gives a figure for eight at once');
  assert.ok(!description.includes(String.fromCodePoint(0x2014)), 'em dash in the description');
});

test('the share card names the product in its title and keeps the wordmark', () => {
  const script = readFileSync(join(__dirname, '../../../../scripts/render-glm-share.mjs'), 'utf8');
  assert.match(script, /<div class="tagline">JSpark3 \$\{escape\(VERSION\.text\)\}/);
  assert.match(script, /\.replace\('<span class="word">JSpark3<\/span>', '<span class="word">JSPARK3<\/span>'\)/);
});
