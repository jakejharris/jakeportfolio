import assert from 'node:assert/strict';
import test from 'node:test';
import { FOAM, LEAD, PAGE, SEA, tideCells, tideField, tidePath } from './menu-tide';

const CELL = 18;

// `level` is how much of the menu shows: a flood travels out to cover it, a
// hole travels out to uncover it.
function cellsAt(level: number, hole: boolean, x = 366, y = 32) {
  const field = tideField(390, 844, x, y, CELL);
  const out = new Uint8Array(field.cols * field.rows);
  tideCells(field, hole ? 1 - level : level, hole, out);
  return { field, out };
}

// Parse the path back into rectangles and test cell centers against them.
function rects(clip: string) {
  const body = clip.slice("path('".length, -"')".length);
  return [...body.matchAll(/M(-?[\d.]+) (-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)h(-?[\d.]+)z/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
    w: Number(m[3]),
    h: Number(m[4]),
  }));
}

test('a closed tide shows only the page and an open one only the sea', () => {
  for (const hole of [false, true]) {
    assert.ok(cellsAt(0, hole).out.every((state) => state === PAGE), `level 0, hole ${hole}`);
    assert.ok(cellsAt(1, hole).out.every((state) => state === SEA), `level 1, hole ${hole}`);
  }
});

test('a flood covers cells near its origin first', () => {
  const { field, out } = cellsAt(0.3, false);
  const originCell = 1 * field.cols + Math.floor(366 / CELL);
  const farCell = (field.rows - 1) * field.cols;
  assert.equal(out[originCell], SEA);
  assert.equal(out[farCell], PAGE);
});

test('a hole uncovers cells near its origin first', () => {
  const { field, out } = cellsAt(0.7, true, 100, 700);
  const originCell = Math.floor(700 / CELL) * field.cols + Math.floor(100 / CELL);
  const farCell = field.cols - 1;
  assert.equal(out[originCell], PAGE);
  assert.equal(out[farCell], SEA);
});

test('the lead band is a checkerboard and the foam sits on the menu side', () => {
  for (const [level, hole] of [[0.25, false], [0.5, false], [0.6, true]] as const) {
    const { field, out } = cellsAt(level, hole);
    let leads = 0;
    let foams = 0;
    out.forEach((state, i) => {
      const col = i % field.cols;
      const row = Math.floor(i / field.cols);
      if (state === LEAD) {
        leads++;
        assert.equal((col + row) % 2, 0, `lead cell ${col},${row} is off the checkerboard`);
      }
      if (state === FOAM) foams++;
    });
    assert.ok(leads > 0 && foams > 0, `level ${level} hole ${hole} has a front`);
  }
});

test('coverage only grows as the level rises', () => {
  for (const hole of [false, true]) {
    let previous = -1;
    for (let level = 0; level <= 1.0001; level += 0.05) {
      const covered = cellsAt(level, hole).out.filter((state) => state !== PAGE).length;
      assert.ok(covered >= previous, `hole ${hole} level ${level.toFixed(2)}`);
      previous = covered;
    }
  }
});

test('tidePath covers exactly the covered cells', () => {
  for (const [level, hole] of [[0.2, false], [0.55, false], [0.4, true], [1, false]] as const) {
    const { field, out } = cellsAt(level, hole);
    const boxes = rects(tidePath(out, field.cols, field.rows, CELL));
    for (let row = 0; row < field.rows; row++) {
      for (let col = 0; col < field.cols; col++) {
        const cx = col * CELL + CELL / 2;
        const cy = row * CELL + CELL / 2;
        const inside = boxes.some((b) => cx > b.x && cx < b.x + b.w && cy > b.y && cy < b.y + b.h);
        assert.equal(inside, out[row * field.cols + col] !== PAGE, `cell ${col},${row} at ${level}`);
      }
    }
  }
});

test('tidePath of an uncovered page is a valid empty path', () => {
  const { field, out } = cellsAt(0, false);
  assert.equal(tidePath(out, field.cols, field.rows, CELL), "path('M0 0')");
});
