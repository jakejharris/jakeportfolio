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
});
