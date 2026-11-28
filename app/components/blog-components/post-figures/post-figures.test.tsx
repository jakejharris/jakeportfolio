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

// ---- boundary cases from review

test('the overlap summary does not repeat the default third label, and keeps a custom one as written', async () => {
  const base = { _key: 'o', total: 100, aName: 'Left', aMisses: 5, bName: 'Right', bMisses: 5, shared: 2 };
  const plain = await render('OverlapGrid', base);
  assert.match(plain, /2 questions are missed by both\.<\/p>/);
  assert.doesNotMatch(plain, /missed by both: missed by both/i);
  const custom = await render('OverlapGrid', { ...base, bothLabel: 'Missed by GPT Checks' });
  assert.match(custom, /missed by both, shown as Missed by GPT Checks\./);
  const none = await render('OverlapGrid', { ...base, shared: 0 });
  assert.match(none, /None of their misses are the same, so 0 questions are missed by both\./);
  assert.doesNotMatch(none, /Missed by Both<\/li>/, 'no legend entry when nothing is shared');
});

test('equal checker names still render three panels without a key clash', async () => {
  const errors: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const html = await render('OverlapGrid', { _key: 'o', total: 100, aName: 'Same', aMisses: 5, bName: 'Same', bMisses: 4, shared: 2 });
    assert.equal(html.match(/class="pf-panel"/g)?.length, 3);
  } finally {
    console.error = original;
  }
  assert.equal(errors.length, 0, 'no React key warning');
});

test('before and after draws nothing for bounds Studio refuses', async () => {
  const row = (before: number, after: number) => [{ _key: 'r', label: 'Row', before, after }];
  assert.equal(await render('BeforeAfter', { _key: 'b', scaleMin: 100, scaleMax: 60, rows: row(70, 90) }), '');
  assert.equal(await render('BeforeAfter', { _key: 'b', scaleMin: 50, scaleMax: 50, rows: row(50, 50) }), '');
  assert.equal(await render('BeforeAfter', { _key: 'b', scaleMin: 80, scaleMax: 100, rows: row(60, 90) }), '');
  const ok = await render('BeforeAfter', { _key: 'b', scaleMin: null, scaleMax: null, rows: row(70, 90) });
  assert.match(ok, /data-post-figure="beforeAfter"/);
  assert.doesNotMatch(ok, /NaN/);
});

test('before and after always shows its last tick on phones', async () => {
  // 63 to 100 has no step that lands evenly on both ends.
  const html = await render('BeforeAfter', { _key: 'b', scaleMin: 63, scaleMax: 100, rows: [{ _key: 'r', label: 'Row', before: 70, after: 99 }] });
  const axis = html.slice(html.indexOf('pf-db-axis'));
  const spans = [...axis.matchAll(/<span([^>]*)>([^<]+)<\/span>/g)];
  const last = spans.at(-1)!;
  assert.equal(last[2], '100');
  assert.doesNotMatch(last[1], /data-minor/);
});

test('timeline drops blank lanes, inverted gaps and backward ends', async () => {
  const html = await render('Timeline', {
    _key: 't',
    lanes: ['', 'Me'],
    events: [
      { _key: k(1), start: '14:00', lane: 'Me', text: 'Started' },
      { _key: k(2), start: '15:00', end: '13:00', lane: 'Me', text: 'Backward' },
    ],
    gaps: [{ _key: k(3), start: '14:00', end: '09:00', label: 'Inverted' }],
  });
  assert.match(html, /pf-mark pf-lane-0/, 'Me keeps the first lane');
  assert.doesNotMatch(html, /Inverted/);
  assert.doesNotMatch(html, /9 AM/, 'the axis is not stretched back');
  assert.doesNotMatch(html, /pf-span/, 'a backward end draws a point, not a span');
});

test('a gap label is kept inside the strip near either end', async () => {
  const html = await render('Timeline', {
    _key: 't',
    lanes: ['Me'],
    events: [{ _key: k(1), start: '08:00', end: '16:00', lane: 'Me', text: 'Shift' }],
    gaps: [{ _key: k(2), start: '15:30', end: '16:00', label: 'Closed for Equipment Servicing' }],
  });
  const style = /class="pf-timeline-gap-label" style="([^"]+)"/.exec(html)![1];
  const left = Number(/left:([\d.]+)%/.exec(style)![1]);
  assert.ok(left > 90);
  assert.match(style, new RegExp(`translateX\\(-${left}%\\)`), 'shifted by the same share of its width');
});

test('five stats fill the empty cell so the row rule runs across', async () => {
  const stats = Array.from({ length: 5 }, (_, i) => ({ _key: k(i), value: String(i), label: `Stat ${i}` }));
  assert.match(await render('StatGrid', { _key: 's', stats }), /data-fill=""/);
  assert.doesNotMatch(await render('StatGrid', { _key: 's', stats: stats.slice(0, 3) }), /data-fill/);
});

test('malformed blocks render nothing or skip the bad items instead of throwing', async () => {
  assert.equal(await render('StatGrid', { _key: 's', stats: [null] }), '');
  assert.equal(await render('StatGrid', { _key: 's', stats: 'oops' }), '');
  assert.equal(await render('StudyCards', { _key: 'c', cards: [null, 5] }), '');
  assert.equal(await render('BeforeAfter', { _key: 'b', rows: { a: 1 } }), '');
  assert.equal(await render('BeforeAfter', { _key: 'b', rows: [null] }), '');
  assert.equal(await render('Timeline', { _key: 't', lanes: 'Me', events: [] }), '');
  assert.equal(await render('Timeline', { _key: 't', lanes: ['Me'], events: [null], gaps: 'x' }), '');
  const kept = await render('Timeline', {
    _key: 't',
    lanes: ['Me'],
    events: [null, { _key: k(1), start: '09:00', lane: 'Me', text: 'Kept' }],
    gaps: [null],
  });
  assert.match(kept, /Kept/);
  const odd = await render('OverlapGrid', { _key: 'o', total: 100, aMisses: 5, bMisses: 5, shared: 2, bothLabel: 123 });
  assert.match(odd, /missed by both\./);
});

// ---- motion

test('only the timeline, overlap grid and before and after charts carry the motion flag', async () => {
  const timeline = await render('Timeline', { _key: 't', lanes: ['Me'], events: [{ _key: k(1), start: '09:00', lane: 'Me', text: 'One' }] });
  const overlap = await render('OverlapGrid', { _key: 'o', total: 100, aMisses: 5, bMisses: 5, shared: 2 });
  const dumbbell = await render('BeforeAfter', { _key: 'b', rows: [{ _key: 'r', label: 'Row', before: 40, after: 60 }] });
  const stats = await render('StatGrid', { _key: 's', stats: [{ _key: k(1), value: '1', label: 'One' }, { _key: k(2), value: '2', label: 'Two' }] });
  const cards = await render('StudyCards', { _key: 'c', cards: [{ _key: k(1), studyTitle: 'A Study', finding: 'It held.' }] });
  for (const html of [timeline, overlap, dumbbell]) assert.match(html, /<figure class="post-figure" data-post-figure="\w+" data-pf-motion=""/);
  for (const html of [stats, cards]) assert.doesNotMatch(html, /data-pf-motion/);
});

test('the timeline draws its marks a second time inside the hidden strip, for the sweep', async () => {
  const html = await render('Timeline', {
    _key: 't',
    lanes: ['North', 'South'],
    events: [
      { _key: k(1), start: '08:00', end: '09:00', lane: 'North', text: 'Span' },
      { _key: k(2), start: '10:00', lane: 'South', text: 'Point' },
    ],
  });
  const strip = html.slice(html.indexOf('pf-timeline-strip'), html.indexOf('<ol'));
  const reveal = strip.slice(strip.indexOf('pf-timeline-reveal'));
  assert.equal((strip.match(/class="pf-(mark|span) /g) ?? []).length, 4, 'two marks, each drawn twice');
  assert.equal((reveal.match(/class="pf-(mark|span) /g) ?? []).length, 2, 'the copy sits in the reveal window');
  assert.match(reveal, /pf-timeline-playhead/);
  assert.match(html, /<div class="pf-timeline-strip" aria-hidden="true">/, 'the strip and its copy stay hidden from screen readers');
});

test('the last overlap grid keeps the misses the other checker caught, with no sum signs', async () => {
  const html = await render('OverlapGrid', { _key: 'o', total: 100, aName: 'Left', aMisses: 6, bName: 'Right', bMisses: 4, shared: 1 });
  const panel = (id: string) => html.slice(html.indexOf(`data-panel="${id}"`)).split('pf-panel-name')[0];
  assert.equal((panel('a').match(/data-mark="(miss|both)"/g) ?? []).length, 6);
  assert.equal((panel('b').match(/data-mark="(miss|both)"/g) ?? []).length, 4);
  assert.equal((panel('both').match(/data-mark="both"/g) ?? []).length, 1);
  assert.equal((panel('both').match(/data-mark="caught"/g) ?? []).length, 6 + 4 - 2 * 1);
  assert.match(html, /Caught by Other<\/li>/);
  assert.doesNotMatch(html, />\s*[+=]\s*</, 'the third grid is the overlap, not a sum');
  const none = await render('OverlapGrid', { _key: 'o', total: 100, aMisses: 3, bMisses: 3, shared: 3 });
  assert.doesNotMatch(none, /Caught by Other/, 'no legend entry when every miss is shared');
});

test('each after dot rides a layer offset back to its before value; unchanged rows hold still', async () => {
  const html = await render('BeforeAfter', {
    _key: 'b',
    scaleMin: 0,
    scaleMax: 100,
    rows: [
      { _key: k(1), label: 'Up', before: 20, after: 70 },
      { _key: k(2), label: 'Down', before: 90, after: 60 },
      { _key: k(3), label: 'Same', before: 50, after: 50 },
    ],
  });
  const offsets = [...html.matchAll(/class="pf-db-travel" style="--pf-from:(-?[\d.]+)%"/g)].map((m) => Number(m[1]));
  assert.deepEqual(offsets, [-50, 30]);
  // The bar's window ends at the after dot (left of it going up, right of it going down)
  // and the copy inside sits back on the track's origin.
  const windows = [...html.matchAll(/class="pf-db-reach" style="left:(-?[\d.]+)%"><span class="pf-db-reach-copy" style="left:(-?[\d.]+)%"/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.deepEqual(windows, [[-30, 30], [60, -60]]);
  assert.match(html, /style="--pf-row:2"/);
  assert.equal((html.match(/pf-db-travel/g) ?? []).length, 2, 'no travel layer for the unchanged row');
});

// ---- the stylesheet: Title Case labels and the motion contract

const css = require('node:fs').readFileSync(require('node:path').join(__dirname, '../../../css/post-figures.css'), 'utf8') as string;

function keyframes(source: string) {
  const out: Record<string, Array<{ at: string[]; decls: string }>> = {};
  for (const block of source.matchAll(/@keyframes ([\w-]+) \{([\s\S]*?)\n\}/g)) {
    out[block[1]] = [...block[2].matchAll(/([\d%, ]+)\{([^}]*)\}/g)].map((m) => ({
      at: m[1].split(',').map((s) => s.trim()),
      decls: m[2].trim().replace(/\s+/g, ' '),
    }));
  }
  return out;
}

test('no label in the figures is set in capitals by the stylesheet', () => {
  assert.doesNotMatch(css, /text-transform:\s*uppercase/);
});

test('figure animations touch only transform and opacity, and start and end on the settled frame', () => {
  const frames = keyframes(css);
  assert.ok(Object.keys(frames).length >= 9);
  for (const [name, steps] of Object.entries(frames)) {
    for (const step of steps) {
      for (const property of step.decls.split(';').map((d) => d.split(':')[0].trim()).filter(Boolean)) {
        assert.ok(['transform', 'opacity'].includes(property), `${name} animates ${property}`);
      }
    }
    const first = steps.find((s) => s.at.includes('0%'));
    const last = steps.find((s) => s.at.includes('100%'));
    assert.ok(first && last, `${name} has a first and last frame`);
    assert.equal(first.decls, last.decls, `${name} loops without a jump`);
  }
});

test('every animation runs only without a reduced-motion preference, behind the gate', () => {
  const gated = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference) {'), css.indexOf('@keyframes'));
  const outside = css.replace(gated, '');
  assert.doesNotMatch(outside, /animation(-name)?:/, 'no animation is set outside the media block');
  const rules = [...gated.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*animation[^{}]*)\}/g)];
  assert.ok(rules.length > 0);
  for (const [, selector] of rules) assert.match(selector.trim(), /^\[data-pf-js\] \[data-pf-motion\]/, selector.trim());
  assert.match(gated, /\[data-pf-motion\] \{\s*--pf-play: paused;/);
  assert.match(gated, /\[data-pf-motion\]\[data-pf-inview="true"\] \{\s*--pf-play: running;/);
  for (const [, , body] of rules) {
    if (/animation-duration/.test(body)) assert.match(body, /animation-play-state: var\(--pf-play\)/);
  }
});

test('each moving chart reserves one Play/Pause row between its drawing and its source line', async () => {
  const timeline = await render('Timeline', { _key: 't', lanes: ['Me'], events: [{ _key: k(1), start: '09:00', lane: 'Me', text: 'One' }] });
  const overlap = await render('OverlapGrid', { _key: 'o', total: 100, aMisses: 5, bMisses: 5, shared: 2 });
  const dumbbell = await render('BeforeAfter', { _key: 'b', sourceTitle: 'A Paper', rows: [{ _key: 'r', label: 'Row', before: 40, after: 60 }] });
  const stats = await render('StatGrid', { _key: 's', stats: [{ _key: k(1), value: '1', label: 'One' }, { _key: k(2), value: '2', label: 'Two' }] });
  for (const html of [timeline, overlap, dumbbell]) {
    assert.equal(html.match(/<div class="pf-bar is-motion"><\/div>/g)?.length, 1);
    assert.doesNotMatch(html, /<button/, 'the button arrives with the script');
  }
  assert.match(dumbbell, /<div class="pf-bar is-motion"><\/div><div class="post-figure-foot">/);
  assert.doesNotMatch(stats, /pf-bar/);
});

test("a reader's pause stops a figure on its settled picture, and the row shows only when there is motion to stop", () => {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const gated = plain.slice(plain.indexOf('@media (prefers-reduced-motion: no-preference) {'), plain.indexOf('@keyframes'));
  const rules = [...gated.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, , body]) => /animation|opacity|display: block/.test(body));
  assert.ok(rules.length > 0);
  for (const [, selector] of rules) {
    assert.match(selector.trim(), /^\[data-pf-js\] \[data-pf-motion\]:not\(\[data-pf-paused\]\)/, selector.trim());
  }
  assert.match(plain, /@media \(scripting: none\) \{\s*\.pf-bar \{\s*display: none;/);
  assert.match(plain, /@media \(prefers-reduced-motion: reduce\) \{\s*\.pf-bar\.is-motion \{\s*display: none;/);
  const bar = plain.match(/\.pf-bar \{([^}]*)\}/)?.[1] ?? '';
  assert.match(bar, /min-height: calc\(32px \+ 0\.9rem \+ 1px\)/, 'the reserved height counts the button, the padding and the rule');
});

test('the caught cells keep a full-strength accent outline, for 3:1 on every accent', () => {
  const rule = css.match(/\.pf-cell-caught \{([^}]*)\}/)?.[1] ?? '';
  assert.match(rule, /stroke: var\(--pf-accent\);/);
});

test('the Studio preview of a study card writes Then and Now in Title Case', async () => {
  const { studyCards } = await import('@/sanity-schemas/post-figures');
  const card = (studyCards.fields as Array<{ of?: Array<{ preview?: { prepare: (v: object) => { subtitle: string } } }> }>)
    .flatMap((f) => f.of ?? [])
    .find((o) => o.preview);
  assert.ok(card?.preview);
  assert.equal(card.preview.prepare({ title: 'A Study', era: 'now', authors: 'Lee', date: '2026' }).subtitle, 'Now · Lee · 2026');
  assert.equal(card.preview.prepare({ title: 'A Study', era: 'then' }).subtitle, 'Then');
});
