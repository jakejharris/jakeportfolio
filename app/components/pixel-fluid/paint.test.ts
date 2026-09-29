import assert from 'node:assert/strict';
import test from 'node:test';
import type { Rgb } from './engine';
import { MAX_POURS, Paint, WASH_MS } from './paint';

const SPEED = 1000;
const BAND = 20;
const AMBER: Rgb = [230, 160, 60];
const RED: Rgb = [220, 60, 60];
const BLUE: Rgb = [60, 110, 230];

// Where the paint stands at a point `d` px straight left of the origin.
function at(paint: Paint, d: number) {
  paint.sample(1000 - d, 500);
  return { ring: paint.ring, color: paint.color, wash: paint.wash };
}

test('one pour: a ring of its color, glints behind it take the color', () => {
  const paint = new Paint(SPEED, BAND);
  paint.pour(1000, 500, RED, AMBER, 0, 0, 800);
  assert.equal(paint.frame(300), true);
  // The ring is 300px out.
  assert.deepEqual(at(paint, 100), { ring: null, color: RED, wash: 0 });
  assert.equal(at(paint, 295).ring, RED);
  assert.equal(at(paint, 310).ring, RED);
  assert.deepEqual(at(paint, 500), { ring: null, color: AMBER, wash: 0 });
  // Spent once it has crossed its reach.
  assert.equal(paint.frame(800 + BAND), true);
  assert.equal(paint.frame(1000), false);
  assert.equal(paint.active, false);
});

test('quick pours travel out together as bands, youngest inside', () => {
  const paint = new Paint(SPEED, BAND);
  paint.pour(1000, 500, RED, AMBER, 0, 0, 2000);
  paint.pour(1000, 500, BLUE, RED, 0, 150, 2000);
  paint.pour(1000, 500, RED, BLUE, 0, 300, 2000);
  paint.frame(600);
  // Rings at 600, 450 and 300px.
  assert.deepEqual(at(paint, 100).color, RED);
  assert.deepEqual(at(paint, 380).color, BLUE);
  assert.deepEqual(at(paint, 520).color, RED);
  assert.deepEqual(at(paint, 700).color, AMBER);
  assert.equal(at(paint, 300).ring, RED);
  assert.equal(at(paint, 450).ring, BLUE);
  assert.equal(at(paint, 600).ring, RED);
  assert.equal(at(paint, 200).ring, null);
  // Once all have crossed, everything shows the last color.
  paint.frame(2250);
  for (const d of [0, 400, 900, 1900]) assert.deepEqual(at(paint, d).color, RED);
});

test('pours stay bounded however fast they come', () => {
  const paint = new Paint(SPEED, BAND);
  for (let i = 0; i < 200; i++) paint.pour(1000, 500, i % 2 ? RED : BLUE, i % 2 ? BLUE : RED, 1, i * 5, 2000);
  assert.equal(paint.count, MAX_POURS);
  paint.frame(1000);
  // The newest pour (the 200th, red) is the one inside.
  assert.deepEqual(at(paint, 2).color, RED);
});

test('a hot pour leaves its color behind the ring and it washes out', () => {
  const paint = new Paint(SPEED, BAND);
  paint.pour(1000, 500, BLUE, RED, 1, 0, 5000);
  paint.frame(1000);
  // Just behind the front, full color; half the wash time behind, a quarter.
  assert.ok(at(paint, 995).wash > 0.95);
  const half = at(paint, 1000 - (WASH_MS / 2 / 1000) * SPEED).wash;
  assert.ok(Math.abs(half - 0.25) < 0.02, `half-way wash ${half}`);
  assert.equal(at(paint, 1000 - (WASH_MS / 1000) * SPEED - 1).wash, 0);
  // A cold pour leaves none, and a hot one is a wider ring.
  const cold = new Paint(SPEED, BAND);
  cold.pour(1000, 500, BLUE, RED, 0, 0, 5000);
  cold.frame(1000);
  assert.equal(at(cold, 990).wash, 0);
  assert.equal(at(cold, 1000 - BAND * 1.5).ring, null);
  assert.equal(at(paint, 1000 - BAND * 1.5).ring, BLUE);
  // A hot pour lives until its wash has crossed the reach too.
  assert.equal(paint.frame(5000 + BAND * 2 + WASH_MS - 1), true);
  assert.equal(paint.frame(5000 + BAND * 2 + WASH_MS + 1), false);
});

test('clear forgets every pour', () => {
  const paint = new Paint(SPEED, BAND);
  paint.pour(0, 0, RED, AMBER, 0.5, 0, 100);
  paint.clear();
  assert.equal(paint.active, false);
  assert.equal(paint.frame(10), false);
});
