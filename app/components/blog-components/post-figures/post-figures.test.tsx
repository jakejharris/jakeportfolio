import assert from 'node:assert/strict';
import test from 'node:test';

require.extensions['.css'] = (module: NodeModule) => { module.exports = {}; };

async function render(name: string, value: object) {
  const React = await import('react');
  Object.assign(globalThis, { React });
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: Component } = await import(`./${name}`);
  return renderToStaticMarkup(React.createElement(Component, { value }));
}

const k = (i: number) => `k${i}`;

test('a timeline renders its moments as text in time order, with lanes for screen readers', async () => {
  const html = await render('Timeline', {
    _key: 't',
    title: 'A morning',
    label: 'Local time',
    lanes: ['North', 'South'],
    events: [
      { _key: k(1), start: '09:30', lane: 'South', text: 'Second thing' },
      { _key: k(2), start: '08:00', end: '08:45', lane: 'North', text: 'First thing' },
    ],
    gaps: [{ _key: k(3), start: '10:00', end: '11:00', label: 'A break' }],
  });
  assert.match(html, /data-post-figure="timeline"/);
  const list = html.slice(html.indexOf('<ol'));
  assert.ok(list.indexOf('First thing') < list.indexOf('Second thing'));
  assert.ok(list.indexOf('Second thing') < list.indexOf('A break'));
  assert.match(list, /8:00 to 8:45 AM/);
  assert.match(list, /<span class="sr-only">North: <\/span>First thing/);
  assert.match(html, /aria-hidden="true"/, 'the strip is hidden; the list carries it');
});

test('a timeline with no usable events renders nothing', async () => {
  assert.equal(await render('Timeline', { _key: 't', lanes: ['A'], events: [{ _key: 'x', start: 'soon', lane: 'A', text: 'x' }] }), '');
});

test('a stat grid prints every figure, unit and label', async () => {
  const html = await render('StatGrid', {
    _key: 's',
    stats: [
      { _key: k(1), value: '12', unit: 'boats', label: 'In the harbor' },
      { _key: k(2), value: '3.5', label: 'Average Knots', detail: 'Measured at noon.', note: 'Calm day' },
    ],
  });
  for (const text of ['12', 'boats', 'In the harbor', '3.5', 'Average Knots', 'Measured at noon.', 'Calm day']) assert.ok(html.includes(text), text);
  assert.match(html, /--pf-cols-phone:2/);
});

test('study cards link only web sources and tag then and now', async () => {
  const html = await render('StudyCards', {
    _key: 'c',
    cards: [
      { _key: k(1), era: 'then', date: '2001', studyTitle: 'An Old Study', finding: 'Something held.', url: 'https://example.com/a' },
      { _key: k(2), era: 'now', date: '2026', studyTitle: 'A New Study', finding: 'It still holds.', url: 'javascript:alert(1)', quote: 'it holds' },
    ],
  });
  assert.match(html, /href="https:\/\/example.com\/a"/);
  assert.ok(!html.includes('javascript:'));
  assert.match(html, /data-era="then">Then</);
  assert.match(html, /data-era="now">Now</);
  assert.match(html, /data-count="2"/);
  assert.match(html, /&quot;it holds&quot;|“it holds”/);
});

test('an overlap grid says in words what its grids show, and marks an illustration', async () => {
  const html = await render('OverlapGrid', {
    _key: 'o', total: 100, aName: 'Left', aMisses: 6, bName: 'Right', bMisses: 4, shared: 1,
  });
  assert.match(html, /Illustration, not measured data/);
  assert.match(html, /Left misses 6 and Right misses 4/);
  assert.match(html, /1 question is missed by both/);
  assert.equal((html.match(/class="pf-cell-ring"/g) ?? []).length, 3 + 1, 'one shared cell ringed in each grid, plus the legend');
  assert.equal(await render('OverlapGrid', { _key: 'o', total: 100, aName: 'L', aMisses: 1, bName: 'R', bMisses: 1, shared: 2 }), '');
});

test('a before and after chart carries a data table and signed changes', async () => {
  const html = await render('BeforeAfter', {
    _key: 'b',
    title: 'Scores',
    valueSuffix: '%',
    rows: [
      { _key: k(1), label: 'Up', before: 40, after: 55.5 },
      { _key: k(2), label: 'Down', before: 60, after: 52 },
      { _key: k(3), label: 'Same', before: 50, after: 50 },
    ],
  });
  assert.match(html, /<div class="sr-only"><table><caption>Scores<\/caption>/);
  assert.match(html, /<td>40.0%<\/td><td>55.5%<\/td><td>\+15.5<\/td>/);
  assert.match(html, /<td>60.0%<\/td><td>52.0%<\/td><td>−8.0<\/td>/);
  assert.match(html, /<td>No Change<\/td>/);
});
