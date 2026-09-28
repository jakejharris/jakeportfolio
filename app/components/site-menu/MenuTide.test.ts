import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { MenuTide } from "./MenuTide";

function harness(t: TestContext) {
  const originals = ["window", "requestAnimationFrame", "cancelAnimationFrame"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const
  );
  const viewport = { innerWidth: 390, innerHeight: 844 };
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  let now = 0;
  let painted = new Uint8ClampedArray();
  const root = {
    style: { clipPath: "" },
    get clientWidth() { return viewport.innerWidth; },
    get clientHeight() { return viewport.innerHeight; },
  };
  const foam = {
    width: 0, height: 0, style: {},
    getContext: () => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (image: ImageData) => { painted = image.data.slice(); },
      clearRect: () => { painted.fill(0); },
    }),
  };
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: viewport },
    requestAnimationFrame: { configurable: true, value: (cb: FrameRequestCallback) => {
      frames.set(++id, cb);
      return id;
    } },
    cancelAnimationFrame: { configurable: true, value: (key: number) => frames.delete(key) },
  });
  const rests: number[] = [];
  const tide = new MenuTide(root as unknown as HTMLElement, foam as unknown as HTMLCanvasElement, (level) => rests.push(level));
  tide.setColors({ background: [0, 0, 0], accent: [255, 0, 0], isDark: true });
  t.after(() => {
    tide.stop();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  const step = () => {
    now += 1000 / 60;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((cb) => cb(now));
  };
  const settle = () => {
    for (let i = 0; frames.size && i < 100; i++) step();
    assert.equal(frames.size, 0, "the animation settles without leaving a callback");
  };
  return { tide, viewport, root, foam, frames, rests, step, settle, pixels: () => painted };
}

test("rotation during a tide covers the new viewport before it settles", (t) => {
  const h = harness(t);
  h.tide.go(1, 366, 32, false, false);
  h.step();
  h.viewport.innerWidth = 700;
  h.viewport.innerHeight = 390;
  h.step();
  assert.equal(h.foam.width, Math.ceil(700 / 18));
  assert.equal(h.foam.height, Math.ceil(390 / 18));
  h.settle();
  assert.equal(h.root.style.clipPath, "");
  assert.deepEqual(h.rests, [1]);
});

test("an accent or theme change immediately recolors an unchanged wave front", (t) => {
  const h = harness(t);
  h.tide.go(1, 366, 32, false, false);
  for (let i = 0; i < 8; i++) h.step();
  const before = h.pixels();
  assert.ok(before.some((v) => v !== 0));
  h.tide.setColors({ background: [255, 255, 255], accent: [0, 0, 255], isDark: false });
  assert.notDeepEqual(h.pixels(), before);
});

test("rapid reversals and leaving through a link use one animation and honor the last request", (t) => {
  const h = harness(t);
  for (let i = 0; i < 301; i++) {
    h.tide.go(i % 2 ? 0 : 1, 366, 32, false, false);
    if (i % 7 === 0) h.step();
    assert.ok(h.frames.size <= 1);
  }
  h.settle();
  assert.equal(h.tide.level, 1);
  h.tide.go(0, 100, 600, true, false);
  h.step();
  h.tide.go(1, 366, 32, false, false);
  h.settle();
  assert.equal(h.tide.level, 1);
  h.tide.go(0, 366, 32, false, true);
  assert.equal(h.tide.level, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.rests.at(-1), 0);
});

test("stopping a running tide releases its frame", (t) => {
  const h = harness(t);
  h.tide.go(1, 366, 32, false, false);
  h.step();
  h.tide.stop();
  assert.equal(h.frames.size, 0);
});
