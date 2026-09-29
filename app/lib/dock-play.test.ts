import assert from 'node:assert/strict';
import test from 'node:test';
import { BURST_GAP_MS, Burst, DOT, dropFlight, dropsFor, heatOf } from './dock-play';

test('quick presses make a burst; a pause starts a new one', () => {
  const burst = new Burst();
  assert.equal(burst.press(0), 1);
  assert.equal(burst.press(100), 2);
  assert.equal(burst.press(100 + BURST_GAP_MS - 1), 3);
  assert.equal(burst.press(100 + BURST_GAP_MS * 3), 1);
  assert.equal(burst.heat, 0);
});

test('a burst heats up from the third press and drops follow', () => {
  assert.deepEqual([1, 2, 3, 6, 10, 40].map(heatOf), [0, 0, 0.125, 0.5, 1, 1]);
  assert.deepEqual([1, 2, 3, 6, 10, 40].map(dropsFor), [0, 0, 1, 2, 3, 3]);
});

test('a drop hops on the dot grid, arcs over, and lands on a cell up and left', () => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const [x, y] of [[1300, 860], [331, 806], [61, 203], [20, 40]]) {
    for (let i = 0; i < 50; i++) {
      const flight = dropFlight(x, y, random);
      const { path } = flight;
      assert.deepEqual(path[0], { x: 0, y: 0 });
      assert.equal(flight.left % DOT, 0);
      assert.equal(flight.top % DOT, 0);
      assert.ok(Math.abs(flight.left + DOT / 2 - x) <= DOT / 2, 'leaves from where it was flicked');
      for (const step of path) {
        assert.equal(Math.abs(step.x % DOT), 0);
        assert.equal(Math.abs(step.y % DOT), 0);
      }
      const end = path[path.length - 1];
      // The center dot of a cell: 6px in from the cell's corner.
      assert.equal((flight.left + end.x) % 18, DOT);
      assert.equal((flight.top + end.y) % 18, DOT);
      assert.equal(flight.x, flight.left + end.x + DOT / 2);
      assert.equal(flight.y, flight.top + end.y + DOT / 2);
      assert.ok(flight.x <= x + 18 && flight.y <= y + 18, 'lands up and to the left');
      assert.ok(flight.x >= Math.min(x, 24), 'stays clear of the left edge');
      if (y > 150) assert.ok(Math.min(...path.map((p) => p.y)) < Math.min(0, end.y), 'arcs over');
      assert.ok(flight.duration >= 380 && flight.duration <= 760);
    }
  }
});
