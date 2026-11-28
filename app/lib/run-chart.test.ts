import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRunChart,
  checkRunChart,
  runClockLabel,
  runMinutes,
  runPercent,
  runRangeLabel,
  runWindow,
} from './run-chart';

let n = 0;
const k = () => `k${++n}`;

/** A small generic run: two parts, two makers, one person's row. */
function sample(overrides: Record<string, unknown> = {}) {
  return {
    _type: 'runChart',
    _key: 'r',
    start: '08:10',
    groups: [
      { _key: k(), key: 'me', label: 'Me' },
      { _key: k(), key: 'p1', label: 'Part 1', heading: 'Two Parts' },
      { _key: k(), key: 'p2', label: 'Part 2' },
    ],
    categories: [
      { _key: k(), key: 'a', label: 'Maker A' },
      { _key: k(), key: 'b', label: 'Maker B' },
    ],
    lanes: [
      { _key: k(), key: 'me', label: 'Me', group: 'me' },
      { _key: k(), key: 'p1-1', label: 'Agent 1', group: 'p1' },
      { _key: k(), key: 'p1-2', label: 'Agent 2', group: 'p1', thin: true },
      { _key: k(), key: 'p2-1', label: 'Agent 3', group: 'p2' },
    ],
    spans: [
      { _key: k(), lane: 'p1-1', start: '08:30', end: '09:00', category: 'a' },
      { _key: k(), lane: 'p1-2', start: '09:10', end: '09:20', category: 'b' },
      { _key: k(), lane: 'p2-1', start: '10:00', end: '11:40', category: 'a' },
      { _key: k(), lane: 'p1-1', start: '08:15', end: '08:20', category: 'a' },
    ],
    markers: [
      { _key: k(), lane: 'me', time: '08:10', kind: 'accent', label: 'The Start' },
      { _key: k(), lane: 'me', time: '11:00', kind: 'dot' },
    ],
    milestones: [
      { _key: k(), time: '11:30', label: 'Done' },
      { _key: k(), time: '08:30', label: 'First Bar' },
      { _key: k(), time: '18:00', label: 'Much Later' },
    ],
    ...overrides,
  };
}

test('run times count from the run start and wrap past midnight', () => {
  assert.equal(runMinutes('08:30', 8 * 60), 510);
  assert.equal(runMinutes('07:59', 8 * 60), 7 * 60 + 59 + 1440, 'earlier than the start is the next day');
  assert.equal(runMinutes('00:10', 23 * 60), 1450);
  assert.equal(runMinutes('8:30', 480), null);
  assert.equal(runMinutes('08:30', null), null);
  assert.equal(runClockLabel(1450), '12:10 AM');
  assert.equal(runClockLabel(14 * 60, true), '2 PM');
  assert.equal(runRangeLabel(190, 218), '3:10 to 3:38 AM');
  assert.equal(runRangeLabel(23 * 60 + 50, 1450), '11:50 PM to 12:10 AM');
});

test('the axis runs in whole hours, keeps to the tick budget and ends on a shown tick', () => {
  const w = runWindow(109, 778); // 1:49 AM to 12:58 PM
  assert.equal(w.from, 60);
  assert.equal(w.to, 13 * 60);
  assert.equal(w.step, 1);
  assert.equal(w.ticks.length, 13);
  assert.equal(w.ticks[0].label, '1 AM');
  assert.equal(w.ticks.at(-1)!.label, '1 PM');
  assert.equal(w.ticks.at(-1)!.minor, false, 'the last tick shows on narrow charts');
  assert.equal(w.ticks.filter((t) => !t.minor).length, 7);
  assert.deepEqual(
    w.ticks.filter((t) => !t.minor).map((t) => (t.meridiem ? t.label : t.label.split(' ')[0])),
    ['1 AM', '3', '5', '7', '9', '11', '1 PM'],
    'the narrowest axis keeps AM or PM only at the ends and where it changes'
  );

  const odd = runWindow(60, 60 * 4 + 1); // 3 hours and a bit, rounds to an even count
  assert.equal((odd.to - odd.from) / 60 / odd.step % 2, 0);
  assert.equal(odd.ticks.at(-1)!.minor, false);

  const long = runWindow(0, 20 * 60, null, 9);
  assert.ok(long.ticks.length <= 9);
  assert.equal(long.step, 3);

  const tiny = runWindow(600, 600);
  assert.deepEqual([tiny.from, tiny.to, tiny.ticks.length], [600, 660, 2]);
  assert.equal(tiny.ticks[1].minor, false, 'a one-step axis keeps both ends');

  assert.equal(runWindow(60, 300, 600).to, 660, 'a later end widens the axis (to an even step count)');
  assert.equal(runWindow(60, 300, 120).to, 300, 'an earlier end is ignored');

  const overnight = runWindow(22 * 60, 26 * 60 + 30);
  assert.equal(overnight.ticks[0].label, '10 PM');
  assert.ok(overnight.ticks.some((t) => t.label === '12 AM'));
});

test('positions are percent of the axis, clamped', () => {
  const w = { from: 60, to: 780 };
  assert.equal(runPercent(60, w), 0);
  assert.equal(runPercent(420, w), 50);
  assert.equal(runPercent(10, w), 0);
  assert.equal(runPercent(900, w), 100);
  assert.equal(runPercent(61, w), 0.14);
});

test('a run chart model groups rows, places bars and dots, and colors by legend order', () => {
  const model = buildRunChart(sample())!;
  assert.ok(model);
  assert.deepEqual(model.groups.map((g) => [g.label, g.rows]), [['Me', 1], ['Part 1', 2], ['Part 2', 1]]);
  assert.equal(model.groups[1].heading, 'Two Parts');
  assert.deepEqual([model.window.from, model.window.to], [8 * 60, 12 * 60]);

  const part1 = model.groups[1];
  assert.equal(part1.bars.length, 3);
  assert.deepEqual(part1.bars[0], { row: 0, left: runPercent(495, model.window), width: 2.08, slot: 0, thin: false });
  assert.equal(part1.bars.find((b) => b.row === 1)!.slot, 1);
  assert.equal(part1.bars.find((b) => b.row === 1)!.thin, true);
  assert.deepEqual(part1.lanes[0].spans, ['8:15 to 8:20 AM', '8:30 to 9:00 AM'], 'spans read in time order');
  assert.deepEqual(part1.lanes[1].categories, ['Maker B']);

  const me = model.groups[0];
  assert.deepEqual(me.dots.map((d) => [d.left, d.accent]), [[runPercent(490, model.window), true], [75, false]]);
  assert.deepEqual(me.lanes[0].markers, ['8:10 AM (The Start)', '11:00 AM']);

  assert.deepEqual(model.milestones.map((m) => [m.label, m.anchor]), [['First Bar', 'start'], ['Done', 'end']]);
  assert.deepEqual(model.later, [{ label: 'Much Later', time: '6:00 PM' }]);
  assert.deepEqual(model.categories, [{ label: 'Maker A', slot: 0 }, { label: 'Maker B', slot: 1 }]);
  assert.equal(model.total, 4);
  assert.equal(model.hasThin, true);
});

test('the readout counts spans that have ended by each hour on the axis', () => {
  const model = buildRunChart(sample())!;
  assert.deepEqual(model.readout, [
    { minutes: 480, label: '8 AM', done: 0 },
    { minutes: 540, label: '9 AM', done: 2 },
    { minutes: 600, label: '10 AM', done: 3 },
    { minutes: 660, label: '11 AM', done: 3 },
    { minutes: 720, label: '12 PM', done: 4 },
  ]);
});

test('malformed data never throws and keeps what can be drawn', () => {
  for (const bad of [null, undefined, 3, 'x', {}, { start: 'soon' }, { start: '08:00' }, { start: '08:00', spans: 'no' }]) {
    assert.equal(buildRunChart(bad), null, JSON.stringify(bad));
  }
  const messy = sample({
    groups: [null, { key: 'p1', label: 'Part 1' }, { key: 'p1', label: 'Twice' }, { key: '', label: 'No Key' }],
    lanes: [
      { key: 'p1-1', label: 'Agent 1', group: 'p1' },
      { key: 'p1-x', label: 'Lost', group: 'nowhere' },
      7,
    ],
    spans: [
      { lane: 'p1-1', start: '08:30', end: '09:00', category: 'a' },
      { lane: 'p1-1', start: '09:00', end: '08:30', category: 'a' },
      { lane: 'p1-1', start: '09:00', end: '09:30', category: 'nope' },
      { lane: 'ghost', start: '09:00', end: '09:30', category: 'a' },
      { lane: 'p1-1', start: 'late', end: '09:30', category: 'a' },
      null,
    ],
    markers: [{ lane: 'ghost', time: '09:00' }, { lane: 'p1-1', time: 900 }],
    milestones: 'none',
  });
  const model = buildRunChart(messy)!;
  assert.deepEqual(model.groups.map((g) => g.label), ['Part 1']);
  assert.equal(model.groups[0].bars.length, 1);
  assert.equal(model.groups[0].dots.length, 0);
  assert.deepEqual(model.milestones, []);
});

test('a span crossing midnight draws after the start, not before it', () => {
  const model = buildRunChart(
    sample({
      start: '22:00',
      spans: [{ _key: 'a', lane: 'p1-1', start: '23:30', end: '00:30', category: 'a' }],
      markers: [],
      milestones: [],
    })
  )!;
  assert.deepEqual([model.window.from, model.window.to], [22 * 60, 26 * 60]);
  const part = model.groups.find((g) => g.label === 'Part 1')!;
  assert.deepEqual(part.bars[0], { row: 0, left: 37.5, width: 25, slot: 0, thin: false });
  assert.deepEqual(part.lanes[0].spans, ['11:30 PM to 12:30 AM']);
});

test('the Studio check names the first problem', () => {
  assert.equal(checkRunChart(sample()), true);
  assert.equal(checkRunChart(undefined), true);
  assert.match(String(checkRunChart(sample({ start: '8am' }))), /Start must be/);
  assert.match(String(checkRunChart(sample({ categories: [{ key: 'a', label: 'A' }, { key: 'a', label: 'B' }] }))), /"a" is used twice/);
  assert.match(String(checkRunChart(sample({ lanes: [{ key: 'x', label: 'X', group: 'zzz' }] }))), /group "zzz"/);
  assert.match(
    String(checkRunChart(sample({ groups: [...sample().groups, { _key: 'g', key: 'empty', label: 'Empty' }] }))),
    /Group "empty" has no rows/
  );
  const span = (s: object) => sample({ spans: [{ _key: 's', lane: 'p1-1', start: '08:30', end: '09:00', category: 'a', ...s }] });
  assert.match(String(checkRunChart(span({ lane: 'ghost' }))), /Span 1 names row "ghost"/);
  assert.match(String(checkRunChart(span({ category: 'z' }))), /category "z"/);
  assert.match(String(checkRunChart(span({ start: '8:30' }))), /Span 1 start: use a 24-hour time/);
  assert.match(String(checkRunChart(span({ start: '08:00' }))), /must end after it starts/, 'before the run start is the next day');
  assert.match(String(checkRunChart(sample({ end: '09:00' }))), /after the chart's end/);
  assert.match(String(checkRunChart(sample({ markers: [{ _key: 'm', lane: 'me', time: 'x' }] }))), /Marker 1/);
  assert.match(String(checkRunChart(sample({ milestones: [{ _key: 'm', time: '25:00', label: 'X' }] }))), /Milestone 1/);
  assert.match(String(checkRunChart(sample({ spans: [], markers: [] }))), /at least one/);
});

test('Studio refuses names that are only spaces, which the page would drop', () => {
  // The page drops this group, then its row and span, and draws nothing.
  const blankGroup = {
    _type: 'runChart', _key: 'r1', start: '09:00',
    groups: [{ _key: 'g1', key: 'g1', label: '   ' }],
    categories: [{ _key: 'c1', key: 'c1', label: 'Maker A' }],
    lanes: [{ _key: 'l1', key: 'l1', label: 'Agent 1', group: 'g1' }],
    spans: [{ _key: 's1', lane: 'l1', start: '09:10', end: '09:30', category: 'c1' }],
  };
  assert.equal(buildRunChart(blankGroup), null);
  assert.match(String(checkRunChart(blankGroup)), /Group "g1" needs a name/);
  const s = sample();
  assert.match(String(checkRunChart(sample({ categories: [s.categories[0], { ...s.categories[1], label: ' ' }] }))), /Category "b" needs a name/);
  assert.match(String(checkRunChart(sample({ lanes: [...s.lanes.slice(0, 3), { ...s.lanes[3], label: '' }] }))), /Row "p2-1" needs a name/);
  assert.match(String(checkRunChart(sample({ milestones: [{ _key: 'm', time: '09:00', label: '  ' }] }))), /Milestone 1 needs a name/);
});

test('a run of a day or more still gives each readout step its own key', () => {
  const model = buildRunChart({
    _type: 'runChart', _key: 'r24', start: '08:30',
    groups: [{ _key: 'g1', key: 'g1', label: 'Part 1' }],
    categories: [{ _key: 'c1', key: 'c1', label: 'Maker A' }],
    lanes: [{ _key: 'l1', key: 'l1', label: 'Agent 1', group: 'g1' }],
    spans: [{ _key: 's1', lane: 'l1', start: '09:00', end: '08:15', category: 'c1' }],
  })!;
  const labels = model.readout.map((step) => step.label);
  assert.ok(new Set(labels).size < labels.length, 'clock labels repeat past 24 hours');
  const minutes = model.readout.map((step) => (step as { minutes?: number }).minutes);
  assert.ok(minutes.every((m) => typeof m === 'number'), 'each step carries its run minute');
  assert.equal(new Set(minutes).size, minutes.length);
});
