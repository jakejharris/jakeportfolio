// Drawing helpers shared by the compression figures. Every figure draws
// tokens as cells on a pixel lattice, like the site's water: square, crisp,
// in the page's own foreground and accent colors.

import type { RgbTriplet } from '../canvas-theme';

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Progress through [start, end] of a timeline, 0 before and 1 after. */
export const span = (t: number, start: number, end: number) => clamp01((t - start) / (end - start));

export const easeOut = (t: number) => 1 - (1 - t) ** 3;

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** A small seeded generator, so a figure draws the same every time. */
export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffle a copy of `items` with a seeded generator. */
export function shuffled<T>(items: readonly T[], random: () => number) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function mixRgb(a: RgbTriplet, b: RgbTriplet, t: number): RgbTriplet {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * Size a canvas's backing store to its css box and return a context that
 * draws in css px. Full device pixel ratio keeps one-pixel cells crisp.
 */
export function prepare(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const backingWidth = Math.max(1, Math.round(width * dpr));
  const backingHeight = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return ctx;
}

/** The figure's monospace family, for text drawn on a canvas. */
export function monoFamily(element: Element) {
  return getComputedStyle(element).fontFamily || 'ui-monospace, monospace';
}

/** A dotted line, one dot every `step` px, like the shore's contours. */
export function dotted(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  step: number
) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const dots = Math.max(1, Math.floor(length / step));
  for (let i = 0; i <= dots; i++) {
    const t = i / dots;
    ctx.fillRect(Math.round(lerp(from.x, to.x, t)), Math.round(lerp(from.y, to.y, t)), 1, 1);
  }
}
