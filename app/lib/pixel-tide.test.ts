import assert from 'node:assert/strict';
import test from 'node:test';
import { TIDE_CELL, tidePolygon, floodTheme } from './pixel-tide';

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

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('theme floods stay bounded and the latest request wins', async (t) => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const transitions: Array<{
    update: () => void;
    ready: ReturnType<typeof deferred>;
    finished: ReturnType<typeof deferred>;
    skipped: boolean;
  }> = [];
  let reduce = false;
  let animations = 0;
  let cancellations = 0;
  const doc = {
    documentElement: {
      animate: () => { animations++; return { cancel: () => cancellations++ }; },
    },
    startViewTransition: (update: () => void) => {
      const ready = deferred();
      const finished = deferred();
      const entry = { update, ready, finished, skipped: false };
      transitions.push(entry);
      return { ready: ready.promise, finished: finished.promise, skipTransition: () => { entry.skipped = true; } };
    },
  };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { innerWidth: 1440, innerHeight: 900, matchMedia: () => ({ matches: reduce }) },
  });
  t.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });

  let selected = -1;
  // The browser has not run the first update callback yet. It must not
  // overwrite the newest request when it finally runs.
  for (let i = 0; i < 301; i++) floodTheme(() => { selected = i; }, 1400, 860);
  assert.equal(transitions.length, 1, 'only one unsettled browser transition');
  assert.equal(transitions[0].skipped, true);
  transitions[0].update();
  transitions[0].ready.resolve();
  await Promise.resolve();
  assert.equal(selected, -1, 'a skipped callback cannot restore stale state');
  assert.equal(animations, 0, 'a superseded ready callback cannot animate');
  transitions[0].finished.resolve();
  await Promise.resolve();
  assert.equal(selected, 300, 'apply only the latest request once snapshots are released');

  // A normal flood still animates after the burst has drained.
  floodTheme(() => { selected = 301; }, 1400, 860);
  assert.equal(transitions.length, 2);
  transitions[1].update();
  transitions[1].ready.resolve();
  await Promise.resolve();
  assert.equal(selected, 301);
  assert.equal(animations, 1);
  floodTheme(() => { selected = 302; }, 1400, 860);
  assert.equal(cancellations, 1, 'release the running pseudo-element animation');
  assert.equal(transitions.length, 2);
  transitions[1].finished.resolve();
  await Promise.resolve();
  assert.equal(selected, 302);

  // A browser that skips before ready still releases the guard.
  floodTheme(() => { selected = 303; }, 0, 0);
  transitions[2].update();
  transitions[2].ready.reject(new Error('skipped'));
  transitions[2].finished.resolve();
  await Promise.resolve();
  await Promise.resolve();
  reduce = true;
  floodTheme(() => { selected = 304; }, 0, 0);
  assert.equal(selected, 304);
  assert.equal(transitions.length, 3, 'reduced motion is immediate');
  reduce = false;
  floodTheme(() => { selected = 305; }, 0, 0);
  assert.equal(transitions.length, 4, 'a skipped transition does not lock the control');
  transitions[3].update();
  transitions[3].ready.resolve();
  transitions[3].finished.resolve();
  await Promise.resolve();
});
