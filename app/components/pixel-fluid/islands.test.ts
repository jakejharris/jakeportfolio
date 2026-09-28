import assert from 'node:assert/strict';
import test from 'node:test';
import { distanceField, islandDistance, type IslandField } from './islands';

function bruteForce(mask: Uint8Array, cols: number, rows: number) {
  const land: Array<[number, number]> = [];
  for (let i = 0; i < mask.length; i++) if (mask[i]) land.push([i % cols, Math.floor(i / cols)]);
  return Array.from({ length: cols * rows }, (_, i) => {
    const x = i % cols;
    const y = Math.floor(i / cols);
    return Math.min(...land.map(([lx, ly]) => Math.hypot(x - lx, y - ly)));
  });
}

// Small deterministic generator so the random masks are the same every run.
function lcg(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

test('distanceField is exact for a single land cell', () => {
  const cols = 7;
  const rows = 5;
  const mask = new Uint8Array(cols * rows);
  mask[2 * cols + 3] = 1;
  const dist = distanceField(mask, cols, rows);
  assert.equal(dist[2 * cols + 3], 0);
  assert.equal(dist[2 * cols + 6], 3);
  assert.ok(Math.abs(dist[0] - Math.hypot(3, 2)) < 1e-5);
});

test('distanceField matches brute force on random masks', () => {
  const random = lcg(20260928);
  for (let round = 0; round < 12; round++) {
    const cols = 5 + Math.floor(random() * 20);
    const rows = 5 + Math.floor(random() * 20);
    const mask = new Uint8Array(cols * rows);
    for (let i = 0; i < mask.length; i++) mask[i] = random() < 0.08 ? 1 : 0;
    mask[Math.floor(random() * mask.length)] = 1;
    const expected = bruteForce(mask, cols, rows);
    const actual = distanceField(mask, cols, rows);
    expected.forEach((value, i) => {
      assert.ok(Math.abs(actual[i] - value) < 1e-4, `round ${round} cell ${i}: ${actual[i]} vs ${value}`);
    });
  }
});

test('distanceField with no land reports everything as far away', () => {
  const dist = distanceField(new Uint8Array(12), 4, 3);
  assert.ok(dist.every((value) => value > 1e6));
});

test('islandDistance samples the field and is infinite outside it', () => {
  const field: IslandField = {
    left: 100,
    top: 50,
    step: 3,
    cols: 2,
    rows: 2,
    dist: Float32Array.from([0, 3, 6, 9]),
  };
  assert.equal(islandDistance(field, 100, 50), 0);
  assert.equal(islandDistance(field, 104, 50), 3);
  assert.equal(islandDistance(field, 105.9, 55.9), 9);
  assert.equal(islandDistance(field, 99, 50), Infinity);
  assert.equal(islandDistance(field, 106, 50), Infinity);
  assert.equal(islandDistance(null, 100, 50), Infinity);
});
