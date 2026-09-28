import assert from 'node:assert/strict';
import test from 'node:test';
import { TIDE_CELL, tidePolygon } from './pixel-tide';

function vertices(polygon: string) {
  const body = polygon.slice('polygon('.length, -1);
  return body.split(', ').map((pair) => pair.split(' ').map((value) => parseFloat(value)) as [number, number]);
}

// Even-odd ray cast; cell centers never sit on the lattice edges.
function inside(points: Array<[number, number]>, x: number, y: number) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

test('tidePolygon covers exactly the cells whose centers are inside the radius', () => {
  const width = 400;
  const height = 300;
  for (const [x, y, radius] of [[200, 150, 60], [390, 290, 250], [9, 9, 100], [123.4, 77.7, 41]]) {
    const points = vertices(tidePolygon(x, y, radius, height));
    for (let row = 0; row * TIDE_CELL < height; row++) {
      for (let col = 0; col * TIDE_CELL < width + TIDE_CELL; col++) {
        const cx = col * TIDE_CELL + TIDE_CELL / 2;
        const cy = row * TIDE_CELL + TIDE_CELL / 2;
        const expected = Math.hypot(cx - x, cy - y) <= radius;
        assert.equal(inside(points, cx, cy), expected, `cell ${col},${row} for ${x},${y} r${radius}`);
      }
    }
  }
});

test('tidePolygon keeps every vertex on the lattice', () => {
  for (const [x, y] of vertices(tidePolygon(700, 400, 333, 900))) {
    assert.equal(x % TIDE_CELL, 0);
    assert.equal(y % TIDE_CELL, 0);
  }
});

test('tidePolygon is empty until the radius reaches a cell center', () => {
  // (0, 0) is a lattice corner; the nearest center is 12.7px away.
  assert.equal(tidePolygon(0, 0, 12, 300), 'polygon(0 0, 0 0, 0 0)');
  assert.notEqual(tidePolygon(0, 0, 13, 300), 'polygon(0 0, 0 0, 0 0)');
});
