import assert from 'node:assert/strict';
import test from 'node:test';
import { CALM_MS, TIDE_AGAIN_MS, TIDE_CELL, TIDE_MS, tidePolygon, floodTheme, isThemeFloodActive } from './pixel-tide';

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

const settle = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

test('theme floods stay bounded, run to the end, and the last request wins', async (t) => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const transitions: Array<{
    update: () => void;
    ready: ReturnType<typeof deferred>;
    finished: ReturnType<typeof deferred>;
    skipped: boolean;
  }> = [];
  let reduce = false;
  let unsettled = 0;
  const durations: number[] = [];
  let cancellations = 0;
  const doc: { documentElement: unknown; startViewTransition?: unknown } = {
    documentElement: {
      animate: (_frames: unknown, options: { duration: number }) => {
        durations.push(options.duration);
        return { cancel: () => cancellations++ };
      },
    },
    startViewTransition: (update: () => void) => {
      assert.equal(unsettled, 0, 'never two unsettled transitions');
      unsettled++;
      const ready = deferred();
      const finished = deferred();
      const entry = { update, ready, finished, skipped: false };
      transitions.push(entry);
      finished.promise.then(() => unsettled--, () => unsettled--);
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

  // The dock: every click asks for the other theme; the page shows one.
  let requested = false;
  let shown = false;
  let switches = 0;
  const apply = () => { shown = requested; switches++; };
  const pending = () => requested !== shown;
  const click = () => { requested = !requested; floodTheme(apply, 1400, 860, pending); };

  // A burst before the browser has captured the page: one transition, which
  // applies the newest request when it is ready for it.
  for (let i = 0; i < 301; i++) click();
  assert.equal(transitions.length, 1);
  assert.equal(isThemeFloodActive(), true);
  transitions[0].update();
  assert.equal(shown, true);
  transitions[0].ready.resolve();
  await settle();
  assert.deepEqual(durations, [TIDE_MS], 'the flood runs');

  // Clicks while it runs neither cut it short nor start another.
  click(); click(); click();
  assert.equal(transitions.length, 1);
  assert.equal(transitions[0].skipped, false);
  assert.equal(cancellations, 0);
  assert.equal(shown, true, 'the page does not flip back mid-sweep');

  // When it ends, the newest request differs, so one quicker flood follows.
  transitions[0].finished.resolve();
  await settle();
  assert.equal(transitions.length, 2);
  transitions[1].update();
  assert.equal(shown, false);
  transitions[1].ready.resolve();
  await settle();
  assert.deepEqual(durations, [TIDE_MS, TIDE_AGAIN_MS]);
  transitions[1].finished.resolve();
  await settle();
  assert.equal(transitions.length, 2, 'nothing left to show');
  assert.equal(isThemeFloodActive(), false);

  // An even burst while the page is captured: nothing to reveal, so the
  // transition is skipped and nothing follows.
  click(); click();
  assert.equal(transitions.length, 3);
  transitions[2].update();
  assert.equal(shown, false);
  transitions[2].ready.resolve();
  await settle();
  assert.equal(transitions[2].skipped, true);
  assert.equal(durations.length, 2);
  transitions[2].finished.resolve();
  await settle();
  assert.equal(transitions.length, 3);

  // A browser that skips before ready still releases the next request.
  click();
  transitions[3].update();
  transitions[3].ready.reject(new Error('skipped'));
  transitions[3].finished.resolve();
  await settle();
  assert.equal(isThemeFloodActive(), false);
  click();
  assert.equal(transitions.length, 5, 'a skipped transition does not lock the control');
  transitions[4].update();
  transitions[4].ready.resolve();
  transitions[4].finished.resolve();
  await settle();
  assert.equal(shown, requested);

  // Reduced motion: the first switch is instant, a burst is held apart and
  // only its newest request counts.
  reduce = true;
  const before = transitions.length;
  switches = 0;
  click();
  assert.equal(shown, requested, 'instant');
  click(); click(); click();
  assert.equal(switches, 1, 'held apart');
  await new Promise((resolve) => setTimeout(resolve, CALM_MS + 40));
  assert.equal(shown, requested);
  assert.equal(switches, 2);
  click(); click();
  await new Promise((resolve) => setTimeout(resolve, CALM_MS + 40));
  assert.equal(shown, requested);
  assert.equal(switches, 2, 'an even burst changes nothing');
  assert.equal(transitions.length, before, 'reduced motion never captures');

  // No View Transitions API: the same instant path.
  reduce = false;
  doc.startViewTransition = undefined;
  await new Promise((resolve) => setTimeout(resolve, CALM_MS + 40));
  click();
  assert.equal(shown, requested);
});
