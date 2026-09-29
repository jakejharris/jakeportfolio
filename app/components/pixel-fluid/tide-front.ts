// A page change moves the water. When a reader taps a link, the page's water
// runs out from under their finger; when the next page arrives, its water
// comes in from the same place. Each front is a ring of lattice cells,
// roughened per cell so the edge reads as water rather than a drawn circle,
// and the incoming water never overtakes the water still going out.

export const FRONT_CELL = 18;
// The old water clears the screen fast; the new water takes its time.
export const OUT_MS = 380;
export const IN_MS = 640;
// Cells of bare page between the retreating water and the arriving water.
const GAP_CELLS = 2;
// How far, in cells, a cell's distance is nudged so the front is ragged.
// Fixed per cell: the same shoreline every time.
const JITTER = 0.8;

// Deterministic noise in [0, 1) per cell.
export function cellNoise(col: number, row: number) {
  let h = Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Roughened distance, in px, from a cell's center to (x, y). */
export function cellDistance(col: number, row: number, x: number, y: number, cell = FRONT_CELL) {
  const exact = Math.hypot(col * cell + cell / 2 - x, row * cell + cell / 2 - y);
  return exact + (cellNoise(col, row) - 0.5) * JITTER * cell;
}

/** Distance from (x, y) past the farthest corner of a width x height box. */
export function farthest(width: number, height: number, x: number, y: number, cell = FRONT_CELL) {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + (GAP_CELLS + 1 + JITTER) * cell;
}

function easeOutQuad(t: number) {
  const k = Math.min(1, Math.max(0, t));
  return 1 - (1 - k) * (1 - k);
}

export type CellSide = 'new' | 'gap' | 'old';

/**
 * One water front per layer. `out` is how far the old water has gone from
 * the origin, `in` how far the new water has come; a cell nearer than `in`
 * shows the new water, one beyond `out` still shows the old.
 */
export class TideFront {
  x = 0;
  y = 0;
  reach = 0;
  private outStart = NaN;
  private inStart = NaN;
  private cell: number;

  constructor(cell = FRONT_CELL) {
    this.cell = cell;
  }

  get active() {
    return !Number.isNaN(this.outStart) || !Number.isNaN(this.inStart);
  }

  get flooding() {
    return !Number.isNaN(this.inStart);
  }

  /** The old water starts to run out from (x, y). */
  recede(x: number, y: number, reach: number, now: number) {
    this.x = x;
    this.y = y;
    this.reach = reach;
    this.outStart = now;
    this.inStart = NaN;
  }

  /** The new water comes in from the recede origin, or from (x, y) if none. */
  flood(x: number, y: number, reach: number, now: number) {
    if (Number.isNaN(this.outStart)) {
      this.x = x;
      this.y = y;
      this.outStart = now;
    }
    this.reach = Math.max(this.reach, reach);
    this.inStart = now;
  }

  clear() {
    this.outStart = NaN;
    this.inStart = NaN;
  }

  /** Radii in px at `now`. Before a flood, `in` is below zero: nothing new yet. */
  radii(now: number) {
    const gap = GAP_CELLS * this.cell;
    const incoming = Number.isNaN(this.inStart) ? -Infinity : this.reach * easeOutQuad((now - this.inStart) / IN_MS);
    const outgoing = Number.isNaN(this.outStart) ? -Infinity : this.reach * easeOutQuad((now - this.outStart) / OUT_MS);
    return { in: incoming, out: Math.max(outgoing, incoming + gap) };
  }

  /** Both fronts have crossed the whole surface. */
  settled(now: number) {
    return this.flooding && this.radii(now).in >= this.reach;
  }

  /** The old water is all gone and nothing new is coming (yet). */
  drained(now: number) {
    return !this.flooding && !Number.isNaN(this.outStart) && this.radii(now).out >= this.reach;
  }

  side(distance: number, radii: { in: number; out: number }): CellSide {
    if (distance < radii.in) return 'new';
    if (distance < radii.out) return 'gap';
    return 'old';
  }
}
