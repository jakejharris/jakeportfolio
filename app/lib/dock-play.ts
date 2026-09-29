// The appearance dock as a toy. Presses in quick succession make a burst,
// and a burst heats up: from the third press the dock flicks drops of paint
// out over the page, and the hotter it gets, the more the water takes the
// color it is given (see pixel-fluid/paint.ts).

import { TIDE_CELL } from './pixel-tide';

/** Presses closer together than this continue a burst. */
export const BURST_GAP_MS = 450;
/** The lattice's dot, a third of a cell. Drops hop from dot to dot. */
export const DOT = 6;
/** Drops in the air at once. */
export const MAX_DROPS = 24;

/** How hot a burst of `count` presses is: 0 until the third, 1 by the tenth. */
export function heatOf(count: number) {
  return Math.min(1, Math.max(0, (count - 2) / 8));
}

/** Drops flicked out by the `count`th press of a burst. */
export function dropsFor(count: number) {
  return count < 3 ? 0 : 1 + Math.round(heatOf(count) * 2);
}

/** The tempo of presses on the dock. */
export class Burst {
  count = 0;
  private last = -Infinity;

  /** Count a press at `now` (ms); returns how many came in a row. */
  press(now: number) {
    this.count = now - this.last < BURST_GAP_MS ? this.count + 1 : 1;
    this.last = now;
    return this.count;
  }

  get heat() {
    return heatOf(this.count);
  }
}

export interface DropFlight {
  /** The drop's top left corner as it leaves, viewport px, on the dot grid. */
  left: number;
  top: number;
  /** Offsets from there, px, one per step. The last is a cell's center dot. */
  path: Array<{ x: number; y: number }>;
  duration: number;
  /** The center of the cell it lands in, viewport px. */
  x: number;
  y: number;
}

function snap(value: number) {
  // + 0 turns -0 into 0.
  return Math.round(value / DOT) * DOT + 0;
}

/**
 * A drop flicked from (x, y), viewport px, arcing up and to the left and
 * landing on the page below its peak. Every step sits on the lattice's dot
 * grid (which starts at the viewport's corner), so it hops from dot to dot,
 * and it lands on the center dot of a cell, where the water shows its dots.
 * `random` returns [0, 1).
 */
export function dropFlight(x: number, y: number, random: () => number = Math.random): DropFlight {
  const left = snap(x - DOT / 2);
  const top = snap(y - DOT / 2);
  // Keep clear of the left edge and of the navbar at the top.
  const across = Math.max(0, x - 30);
  const lift = 36 + random() * 100;
  const room = Math.max(0, y - 90 - lift);
  const col = Math.floor((x - Math.min(across, 48 + random() * Math.min(420, across))) / TIDE_CELL);
  const row = Math.floor((y - Math.min(room, 18 + random() * Math.min(380, room))) / TIDE_CELL);
  const dx = col * TIDE_CELL + DOT - left;
  const dy = row * TIDE_CELL + DOT - top;
  // A projectile: steady across, and up then down. Its peak is `lift` above
  // the landing.
  const rise = lift - Math.min(0, dy) / 2;
  const duration = Math.round(Math.min(760, 380 + Math.hypot(dx, dy) * 0.6));
  const steps = Math.max(8, Math.round(duration / 32));
  const path: DropFlight['path'] = [];
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    path.push({ x: snap(dx * t), y: snap(dy * t - 4 * rise * t * (1 - t)) });
  }
  return { left, top, path, duration, x: col * TIDE_CELL + TIDE_CELL / 2, y: row * TIDE_CELL + TIDE_CELL / 2 };
}
