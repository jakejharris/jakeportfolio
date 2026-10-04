import assert from 'node:assert/strict';
import test from 'node:test';

// The page renders server-side; its stylesheets mean nothing here.
require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('only cells the table marks PUBLISHABLE are drawn; a group or chart left empty is dropped', async () => {
  const { publishable } = await import('./Remeasured');
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

test('placeholder figures stay off in production and show only in a local preview', async () => {
  const { remeasuredShown } = await import('./Remeasured');
  assert.equal(remeasuredShown(true, undefined), false);
  assert.equal(remeasuredShown(true, '1'), true);
  assert.equal(remeasuredShown(false, undefined), true);
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
