import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkClockSpan,
  checkOverlap,
  checkScale,
  checkTimelineLanes,
  clockPercent,
  decimalsOf,
  formatClock,
  formatClockRange,
  formatDelta,
  niceScale,
  overlapCells,
  parseClock,
  safeHref,
  scalePercent,
  statColumns,
  timelineOrder,
  timelineScale,
} from './post-figures';

test('clock times parse to minutes after midnight and refuse anything else', () => {
  assert.equal(parseClock('00:00'), 0);
  assert.equal(parseClock('07:05'), 425);
  assert.equal(parseClock('23:59'), 1439);
  for (const bad of ['24:00', '7:05', '07:60', '0705', '', undefined, 705]) assert.equal(parseClock(bad), null, String(bad));
});

test('clock labels read as a person would say them', () => {
  assert.equal(formatClock(0), '12:00 AM');
  assert.equal(formatClock(12 * 60), '12:00 PM');
  assert.equal(formatClock(13 * 60 + 5), '1:05 PM');
  assert.equal(formatClock(13 * 60, { short: true }), '1 PM');
  assert.equal(formatClockRange(8 * 60 + 15), '8:15 AM');
  assert.equal(formatClockRange(8 * 60, 10 * 60 + 30), '8:00 to 10:30 AM');
  assert.equal(formatClockRange(11 * 60, 14 * 60), '11:00 AM to 2:00 PM');
});

test('a timeline axis covers its times in whole hours with at most eight ticks', () => {
  const scale = timelineScale([{ start: '06:20' }, { start: '08:00', end: '17:40' }]);
  assert.equal(scale.from, 6 * 60);
  assert.equal(scale.to, 18 * 60);
  assert.equal(scale.step, 2);
  assert.deepEqual(scale.ticks.map((t) => t.label), ['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM']);
  // Half the ticks are minor for a narrow screen, and the last one always shows.
  assert.deepEqual(scale.ticks.map((t) => t.minor), [false, true, false, true, false, true, false]);

  const short = timelineScale([{ start: '09:10' }, { start: '10:40' }]);
  assert.deepEqual([short.from, short.to, short.step], [9 * 60, 11 * 60, 1]);
  assert.ok(timelineScale([{ start: '00:30' }, { start: '23:30' }]).ticks.length <= 8);
});

test('times sit at their share of the axis, clamped to it', () => {
  const scale = { from: 600, to: 720 };
  assert.equal(clockPercent(600, scale), 0);
  assert.equal(clockPercent(630, scale), 25);
  assert.equal(clockPercent(700, scale), 83.33);
  assert.equal(clockPercent(900, scale), 100);
  assert.equal(clockPercent(0, scale), 0);
});

test('events and gaps list in time order, an event before a gap that starts with it', () => {
  const rows = timelineOrder(
    [{ start: '10:00', id: 'b' }, { start: '08:00', id: 'a' }, { start: '12:00', id: 'c' }],
    [{ start: '10:00', end: '11:00', id: 'gap' }]
  );
  assert.deepEqual(rows.map((r) => r.item.id), ['a', 'b', 'gap', 'c']);
});

test('timeline checks catch bad spans and unknown lanes', () => {
  assert.equal(checkClockSpan({ start: '08:00' }), true);
  assert.equal(checkClockSpan({ start: '08:00', end: '09:00' }), true);
  assert.match(String(checkClockSpan({ start: '8am' })), /24-hour/);
  assert.match(String(checkClockSpan({ start: '09:00', end: '08:00' })), /later than start/);
  assert.match(String(checkClockSpan({ start: '09:00' }, true)), /end time is required/);
  assert.equal(checkTimelineLanes(['North', 'South'], [{ lane: 'North' }, { lane: 'South' }]), true);
  assert.match(String(checkTimelineLanes(['North'], [{ lane: 'East' }])), /Not found: East/);
  assert.match(String(checkTimelineLanes([], [])), /one to three/);
  assert.match(String(checkTimelineLanes(['A', 'B', 'C', 'D'], [])), /one to three/);
  assert.match(String(checkTimelineLanes(['A', 'A'], [])), /differ/);
});

test('stat columns never leave a lone gap in an even grid', () => {
  assert.deepEqual(statColumns(2), { phone: 2, wide: 2 });
  assert.deepEqual(statColumns(3), { phone: 1, wide: 3 });
  assert.deepEqual(statColumns(4), { phone: 2, wide: 2 });
  assert.deepEqual(statColumns(6), { phone: 2, wide: 3 });
  assert.deepEqual(statColumns(2, 110), { phone: 1, wide: 2 }, 'long labels get the full phone width');
});

test('overlap cells hold exactly the misses asked for, the same on every render', () => {
  const cells = overlapCells(100, 8, 6, 3);
  const count = (kind: string) => cells.filter((c) => c === kind).length;
  assert.equal(cells.length, 100);
  assert.equal(count('both'), 3);
  assert.equal(count('a'), 5);
  assert.equal(count('b'), 3);
  assert.equal(count('hit'), 89);
  assert.deepEqual(overlapCells(100, 8, 6, 3), cells);
  assert.deepEqual(overlapCells(40, 4, 4, 0).filter((c) => c === 'both'), []);
});

test('overlap checks refuse numbers a grid cannot draw', () => {
  assert.equal(checkOverlap({ total: 100, aMisses: 4, bMisses: 4, shared: 4 }), true);
  assert.match(String(checkOverlap({ total: 100, aMisses: 4, bMisses: 3, shared: 4 })), /Shared/);
  assert.match(String(checkOverlap({ total: 95, aMisses: 1, bMisses: 1, shared: 0 })), /tens/);
  assert.match(String(checkOverlap({ total: 20, aMisses: 21, bMisses: 1, shared: 0 })), /exceed the total/);
  assert.match(String(checkOverlap({ total: 20, aMisses: 1.5, bMisses: 1, shared: 0 })), /whole/);
  assert.throws(() => overlapCells(100, 2, 2, 3));
});

test('a scale rounds out around the values with an even step', () => {
  const scale = niceScale([42.5, 61.2, 58, 47]);
  assert.deepEqual([scale.min, scale.max, scale.step], [40, 70, 5]);
  assert.deepEqual(scale.ticks, [40, 45, 50, 55, 60, 65, 70]);
  assert.equal(niceScale([41, 59]).max, 60, 'an even count of steps stays as it is');
  const fixed = niceScale([12, 30], 5, 0, 100);
  assert.deepEqual([fixed.min, fixed.max], [0, 100]);
  // Steps of 20 would make five intervals and hide 100 on phones; 25 makes four.
  assert.deepEqual(fixed.ticks, [0, 25, 50, 75, 100]);
  const flat = niceScale([7, 7]);
  assert.ok(flat.min < 7 && flat.max > 7);
  assert.equal(scalePercent(50, { min: 40, max: 60 }), 50);
  assert.equal(scalePercent(70, { min: 40, max: 60 }), 100);
});

test('values line up to one precision, and changes carry a sign', () => {
  assert.equal(decimalsOf([3, 4.25, 10.5]), 2);
  assert.equal(decimalsOf([3, 4]), 0);
  assert.equal(formatDelta(40.2, 55.9, 1), '+15.7');
  assert.equal(formatDelta(55.9, 40.2, 1), '−15.7');
  assert.equal(formatDelta(12.3, 12.3, 1), null);
  assert.equal(checkScale({ scaleMin: 0, scaleMax: 100, rows: [{ before: 10, after: 90 }] }), true);
  assert.match(String(checkScale({ scaleMin: 20, rows: [{ before: 10, after: 30 }] })), /below/);
  assert.match(String(checkScale({ scaleMin: 5, scaleMax: 5 })), /above scale min/);
});

test('only web links render', () => {
  assert.equal(safeHref('https://example.com/paper'), 'https://example.com/paper');
  assert.equal(safeHref('javascript:alert(1)'), undefined);
  assert.equal(safeHref('/relative'), undefined);
  assert.equal(safeHref(undefined), undefined);
});

test('an automatic scale keeps round ticks', () => {
  assert.deepEqual(niceScale([3, 12, 15, 9]).ticks, [0, 5, 10, 15, 20]);
});

// ---- boundary cases from review

const ticksOf = (starts: string[]) => timelineScale(starts.map((start) => ({ start }))).ticks;

test('a one-hour timeline keeps both end ticks on phones', () => {
  const ticks = ticksOf(['09:30']);
  assert.deepEqual(ticks.map((t) => t.label), ['9 AM', '10 AM']);
  assert.ok(ticks.every((t) => !t.minor), 'no tick is minor, so a phone hides neither');
});

test('timeline spans that round to seven steps stay within eight ticks and end on a major tick', () => {
  for (const [a, b] of [['01:10', '07:50'], ['01:10', '13:50'], ['00:10', '19:50'], ['02:00', '22:30']]) {
    const ticks = ticksOf([a, b]);
    assert.ok(ticks.length <= 8, `${a} to ${b}: ${ticks.length} ticks`);
    assert.equal(ticks.at(-1)!.minor, false, `${a} to ${b}: last tick is shown on phones`);
  }
});

test('a late-day timeline never runs past midnight into the next morning', () => {
  const scale = timelineScale([{ start: '03:00' }, { start: '23:30' }]);
  assert.ok(scale.to <= 24 * 60, `to = ${scale.to}`);
  assert.ok(scale.from <= 3 * 60);
  assert.equal(new Set(scale.ticks.slice(0, -1).map((t) => t.label)).size, scale.ticks.length - 1, 'no hour label repeats');
});

test('a clock span treats a null end as unset', () => {
  assert.equal(checkClockSpan({ start: '09:00', end: null as unknown as string }), true);
  assert.equal(checkClockSpan({ start: '09:00', end: null as unknown as string }, true), 'An end time is required.');
});

test('blank lane names fail validation', () => {
  assert.equal(checkTimelineLanes(['', 'Me'], [{ lane: 'Me' }]), 'Lane names cannot be empty.');
  assert.equal(checkTimelineLanes(['  ', 'A', 'B', 'C'], []), 'Lane names cannot be empty.');
  assert.equal(checkTimelineLanes(['Me', 7], [{ lane: 'Me' }]), 'Lane names cannot be empty.');
  assert.equal(checkTimelineLanes('Me', [{ lane: 'Me' }]), 'Give one to three lane names.');
  assert.equal(checkTimelineLanes(['Me'], [{ lane: 'Me' }]), true);
});

test('stat columns for one and five stats', () => {
  assert.deepEqual(statColumns(1), { phone: 1, wide: 1 });
  assert.deepEqual(statColumns(5), { phone: 1, wide: 3 });
});

const scaleOf = (values: number[], min?: number | null, max?: number | null) => niceScale(values, 5, min, max);
const endsOnMajor = (ticks: number[]) => (ticks.length - 1) % 2 === 0;

test('a scale with only a fixed max moves its free end so the max stays a major tick', () => {
  const scale = scaleOf([76.2, 98.1], undefined, 100);
  assert.equal(scale.max, 100);
  assert.equal(scale.ticks.at(-1), 100);
  assert.ok(endsOnMajor(scale.ticks), scale.ticks.join(','));
  assert.ok(scale.min <= 76.2);
});

test('a scale with only a fixed min moves its free end the same way', () => {
  const scale = scaleOf([12, 31], 10);
  assert.equal(scale.min, 10);
  assert.equal(scale.ticks[0], 10);
  assert.ok(endsOnMajor(scale.ticks), scale.ticks.join(','));
  assert.ok(scale.max >= 31);
});

test('a scale with both ends fixed picks a step that lands on both as major ticks', () => {
  const scale = scaleOf([62, 95], 50, 100);
  assert.equal(scale.ticks[0], 50);
  assert.equal(scale.ticks.at(-1), 100);
  assert.ok(endsOnMajor(scale.ticks), scale.ticks.join(','));
});

test('inverted, equal or missing fixed ends fall back to a scale around the data', () => {
  for (const [min, max] of [[100, 60], [50, 50], [null, null]] as const) {
    const scale = scaleOf([70, 90], min, max);
    assert.ok(scale.max > scale.min, `${min}..${max}`);
    assert.ok(scale.ticks.length >= 2 && scale.ticks.every(Number.isFinite), `${min}..${max}: ${scale.ticks}`);
    assert.ok(scale.min <= 70 && scale.max >= 90);
  }
  assert.equal(scalePercent(50, { min: 50, max: 50 }), 0, 'a zero-width scale never gives NaN');
  assert.equal(scalePercent(70, { min: 100, max: 60 }), 0);
});

test('checkScale treats null bounds as unset and refuses inverted ones', () => {
  assert.equal(checkScale({ scaleMin: null, scaleMax: null, rows: [{ before: 70, after: 90 }] }), true);
  assert.equal(checkScale({ scaleMin: 100, scaleMax: 60, rows: [] }), 'Scale max must be above scale min.');
  assert.equal(checkScale({ scaleMin: 50, scaleMax: 50, rows: [] }), 'Scale max must be above scale min.');
  assert.equal(checkScale({ scaleMin: 80, scaleMax: 100, rows: [{ before: 60, after: 90 }] }), 'A value (60) is below the scale min.');
  assert.equal(checkScale({ rows: [null, { before: 1, after: 2 }] }), true);
});
