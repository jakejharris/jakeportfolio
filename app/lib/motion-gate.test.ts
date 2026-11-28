import assert from 'node:assert/strict';
import test from 'node:test';

import { MOTION_ROOT_MARGIN, MOTION_SELECTOR, startMotionGate } from './motion-gate';

type Gate = Parameters<typeof startMotionGate>;

class FakeVideo {
  muted = false;
  controls = true;
  playing = false;
  play() {
    this.playing = true;
    return Promise.resolve();
  }
  pause() {
    this.playing = false;
  }
}

class FakeElement {
  attrs = new Map<string, string>();
  constructor(public videos: FakeVideo[] = []) {}
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }
  querySelectorAll() {
    return this.videos;
  }
}

function setup(roots: FakeElement[], { withObserver = true } = {}) {
  const html = new FakeElement();
  const listeners = new Set<() => void>();
  const doc = {
    hidden: false,
    documentElement: html,
    selectors: [] as string[],
    querySelectorAll(selector: string) {
      this.selectors.push(selector);
      return roots;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  const observers: FakeObserver[] = [];
  class FakeObserver {
    observed: unknown[] = [];
    disconnected = false;
    constructor(
      public callback: (entries: Array<{ target: unknown; isIntersecting: boolean }>) => void,
      public options: IntersectionObserverInit
    ) {
      observers.push(this);
    }
    observe(target: unknown) {
      this.observed.push(target);
    }
    disconnect() {
      this.disconnected = true;
    }
  }
  const stop = startMotionGate(doc as unknown as Gate[0], withObserver ? (FakeObserver as unknown as Gate[1]) : undefined);
  const see = (target: FakeElement, isIntersecting: boolean) => observers[0].callback([{ target, isIntersecting }]);
  const setHidden = (hidden: boolean) => {
    doc.hidden = hidden;
    listeners.forEach((fn) => fn());
  };
  return { html, doc, observers, listeners, stop, see, setHidden };
}

const inview = (el: FakeElement) => el.getAttribute('data-pf-inview');

test('without IntersectionObserver the gate does nothing, so figures stay settled', () => {
  const root = new FakeElement();
  const { html, listeners } = setup([root], { withObserver: false });
  assert.equal(html.getAttribute('data-pf-js'), null);
  assert.equal(inview(root), null);
  assert.equal(listeners.size, 0);
});

test('the gate marks every motion figure out of view, then flags the page, and watches each figure once', () => {
  const roots = [new FakeElement(), new FakeElement()];
  const { html, doc, observers } = setup(roots);
  assert.deepEqual(doc.selectors, [MOTION_SELECTOR]);
  assert.equal(html.getAttribute('data-pf-js'), '');
  assert.deepEqual(roots.map(inview), ['false', 'false']);
  assert.equal(observers.length, 1, 'one observer for all figures');
  assert.deepEqual(observers[0].observed, roots);
  assert.equal(observers[0].options.rootMargin, MOTION_ROOT_MARGIN);
});

test('a figure runs only while it intersects', () => {
  const [a, b] = [new FakeElement(), new FakeElement()];
  const { see } = setup([a, b]);
  see(a, true);
  assert.deepEqual([inview(a), inview(b)], ['true', 'false']);
  see(a, false);
  see(b, true);
  assert.deepEqual([inview(a), inview(b)], ['false', 'true']);
});

test('a hidden page pauses every figure and showing it again restores what is in view', () => {
  const [a, b] = [new FakeElement(), new FakeElement()];
  const { see, setHidden } = setup([a, b]);
  see(a, true);
  setHidden(true);
  assert.deepEqual([inview(a), inview(b)], ['false', 'false']);
  see(b, true);
  assert.equal(inview(b), 'false', 'scrolling while hidden does not start anything');
  setHidden(false);
  assert.deepEqual([inview(a), inview(b)], ['true', 'true']);
});

test('a marked video plays muted without controls in view and pauses out of view', () => {
  const video = new FakeVideo();
  const root = new FakeElement([video]);
  const { see } = setup([root]);
  assert.equal(video.playing, false);
  see(root, true);
  assert.deepEqual([video.playing, video.muted, video.controls], [true, true, false]);
  see(root, false);
  assert.equal(video.playing, false);
});

test('under reduced motion a video keeps its controls and never autoplays', () => {
  const original = globalThis.matchMedia;
  globalThis.matchMedia = ((query: string) => ({ matches: query.includes('reduce') })) as typeof matchMedia;
  try {
    const video = new FakeVideo();
    const root = new FakeElement([video]);
    const { see } = setup([root]);
    see(root, true);
    assert.deepEqual([video.playing, video.controls], [false, true]);
  } finally {
    globalThis.matchMedia = original;
  }
});

test('cleanup disconnects the observer and the visibility listener', () => {
  const root = new FakeElement();
  const { stop, observers, listeners } = setup([root]);
  assert.equal(listeners.size, 1);
  stop();
  assert.equal(observers[0].disconnected, true);
  assert.equal(listeners.size, 0);
});

test('a page with no motion figures only flags itself', () => {
  const { html, observers, listeners } = setup([]);
  assert.equal(html.getAttribute('data-pf-js'), '');
  assert.equal(observers.length, 0);
  assert.equal(listeners.size, 0);
});
