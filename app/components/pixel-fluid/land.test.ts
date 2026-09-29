import assert from 'node:assert/strict';
import test from 'node:test';
import { rasterizeLand } from './land';

const CELL = 18;

test('a cell is dry exactly when it comes within the beach of a rect', () => {
  const cols = 20;
  const rows = 12;
  const beach = 10;
  const rect = { left: 100, top: 50, right: 190, bottom: 80 };
  const { dry } = rasterizeLand([rect], cols, rows, CELL, beach, 200);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = col * CELL;
      const y0 = row * CELL;
      const touches =
        x0 < rect.right + beach && x0 + CELL > rect.left - beach &&
        y0 < rect.bottom + beach && y0 + CELL > rect.top - beach;
      assert.equal(dry[row * cols + col], touches ? 1 : 0, `cell ${col},${row}`);
    }
  }
});

test('rects off the lattice are clipped, empty ones ignored', () => {
  const { dry } = rasterizeLand(
    [
      { left: -500, top: -500, right: 5, bottom: 5 },
      { left: 1000, top: 1000, right: 2000, bottom: 2000 },
      { left: 50, top: 50, right: 40, bottom: 60 },
    ],
    6,
    4,
    CELL,
    0,
    100
  );
  assert.equal(dry[0], 1);
  assert.equal(dry.reduce((sum, value) => sum + value, 0), 1);
});

test('reach grows away from land in cell steps and is capped', () => {
  const cols = 12;
  const rows = 3;
  const { dry, reach } = rasterizeLand([{ left: 0, top: 0, right: 18, bottom: 54 }], cols, rows, CELL, 0, 90);
  assert.equal(dry[1 * cols + 0], 1);
  assert.equal(reach[1 * cols + 0], 0);
  assert.equal(reach[1 * cols + 1], 18);
  assert.equal(reach[1 * cols + 3], 54);
  assert.equal(reach[1 * cols + 11], 90);
  for (let i = 1; i < cols; i++) assert.ok(reach[cols + i] >= reach[cols + i - 1]);
});

test('with no land anywhere every cell is at the cap', () => {
  const { dry, reach } = rasterizeLand([], 4, 4, CELL, 20, 120);
  assert.ok(dry.every((value) => value === 0));
  assert.ok(reach.every((value) => value === 120));
});
