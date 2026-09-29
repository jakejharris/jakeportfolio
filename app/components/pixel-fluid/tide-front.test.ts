import assert from 'node:assert/strict';
import test from 'node:test';
import { cellDistance, farthest, IN_MS, OUT_MS, TideFront } from './tide-front';

test('cellDistance stays within the jitter of the exact distance and is stable', () => {
  for (let col = 0; col < 30; col++) {
    for (let row = 0; row < 20; row++) {
      const exact = Math.hypot(col * 18 + 9 - 100, row * 18 + 9 - 50);
      const d = cellDistance(col, row, 100, 50);
      assert.ok(Math.abs(d - exact) <= 0.4 * 18 + 1e-9, `cell ${col},${row} strayed`);
      assert.equal(d, cellDistance(col, row, 100, 50));
    }
  }
});

test('a recede with no flood drains, and nothing new appears', () => {
  const front = new TideFront();
  const reach = farthest(400, 300, 10, 10);
  front.recede(10, 10, reach, 0);
  assert.equal(front.flooding, false);
  const early = front.radii(OUT_MS / 4);
  assert.equal(early.in, -Infinity);
  assert.ok(early.out > 0 && early.out < reach);
  assert.equal(front.drained(OUT_MS / 4), false);
  assert.equal(front.drained(OUT_MS), true);
  assert.equal(front.side(5, front.radii(OUT_MS)), 'gap');
});

test('incoming water never overtakes the water going out', () => {
  const front = new TideFront();
  const reach = 1000;
  front.recede(0, 0, reach, 0);
  // The page arrives almost at once: the old water is barely gone.
  front.flood(0, 0, reach, 16);
  for (let t = 16; t <= 16 + IN_MS; t += 8) {
    const radii = front.radii(t);
    assert.ok(radii.out >= radii.in + 36 - 1e-9, `at ${t}ms the new water caught the old`);
  }
  assert.equal(front.settled(16 + IN_MS), true);
});

test('a flood without a recede starts from its own origin', () => {
  const front = new TideFront();
  front.flood(120, 80, 500, 100);
  assert.equal(front.x, 120);
  assert.equal(front.y, 80);
  const radii = front.radii(100);
  assert.equal(radii.in, 0);
  // Right at the start, everything beyond the gap is still the old side.
  assert.equal(front.side(200, radii), 'old');
  assert.equal(front.side(20, radii), 'gap');
});

test('a flood after a recede keeps the recede origin', () => {
  const front = new TideFront();
  front.recede(40, 60, 800, 0);
  front.flood(300, 300, 800, 50);
  assert.equal(front.x, 40);
  assert.equal(front.y, 60);
});

test('clear forgets both fronts', () => {
  const front = new TideFront();
  front.recede(0, 0, 100, 0);
  front.flood(0, 0, 100, 10);
  front.clear();
  assert.equal(front.active, false);
  assert.equal(front.flooding, false);
});
