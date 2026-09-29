// Paint in the water. Every pour from the appearance dock is a ring of its
// color spreading from the swatch, and the glints it passes take that color.
// Pours do not replace each other: picked quickly, their rings travel out
// together as bands of color. A hot pour (the dock played fast) is a wider
// ring and also leaves its color in the water's own lines behind it, until
// the water washes it out a moment later.

import type { Rgb } from './engine';

// Pours alive at once. Played faster than they cross the screen, the oldest
// gives way.
export const MAX_POURS = 16;
// Behind a hot pour's ring its color fades out of the water over this long.
export const WASH_MS = 900;

interface Pour {
  x: number;
  y: number;
  start: number;
  color: Rgb;
  from: Rgb;
  heat: number;
  reach: number;
  // Where the ring is, refreshed by frame().
  radius: number;
  inner2: number;
  outer2: number;
  radius2: number;
  strength: number;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export class Paint {
  /** After sample(): the color of the ring whose band the point is on, or null. */
  ring: Rgb | null = null;
  /** After sample(): how strongly that band is drawn, 0 to 1. */
  strength = 0;
  /** After sample(): the accent the water shows at the point. */
  color: Rgb = [255, 255, 255];
  /** After sample(): how much of `color` the water's own lines take there, 0 to 1. */
  wash = 0;
  private pours: Pour[] = [];

  /** `speed` in px/s; `band` is the ring's half width in px. */
  constructor(private speed: number, private band: number) {}

  get active() {
    return this.pours.length > 0;
  }

  get count() {
    return this.pours.length;
  }

  /**
   * `color` spreads from (x, y), replacing `from`, until it has travelled
   * `reach` px. `heat` (0 to 1) is how fast the dock is being played.
   */
  pour(x: number, y: number, color: Rgb, from: Rgb, heat: number, now: number, reach: number) {
    if (this.pours.length >= MAX_POURS) this.pours.shift();
    this.pours.push({
      x, y, start: now, color, from, heat: clamp01(heat), reach,
      radius: 0, inner2: 0, outer2: 0, radius2: 0, strength: 1,
    });
  }

  clear() {
    this.pours.length = 0;
  }

  /** Move every ring to `now` and let go of spent ones. False when none is left. */
  frame(now: number) {
    const { speed } = this;
    let kept = 0;
    for (const pour of this.pours) {
      const radius = Math.max(0, ((now - pour.start) / 1000) * speed);
      const band = this.band * (1 + pour.heat);
      const tail = pour.heat > 0 ? (WASH_MS / 1000) * speed : 0;
      if (radius > pour.reach + band + tail) continue;
      const inner = Math.max(0, radius - band);
      pour.radius = radius;
      pour.radius2 = radius * radius;
      pour.inner2 = inner * inner;
      pour.outer2 = (radius + band) * (radius + band);
      // A cold ring thins out as it spreads; a hot one holds its ink.
      pour.strength = 1 - clamp01(radius / Math.max(pour.reach, 1)) * 0.55 * (1 - pour.heat);
      this.pours[kept++] = pour;
    }
    this.pours.length = kept;
    return kept > 0;
  }

  /** What the paint does at (px, py), in the same px as the pours. */
  sample(px: number, py: number) {
    const pours = this.pours;
    this.ring = null;
    this.wash = 0;
    // Youngest first: the youngest ring that has passed a point decides its
    // color, and older rings are all farther out.
    for (let k = pours.length - 1; k >= 0; k--) {
      const pour = pours[k];
      const dx = px - pour.x;
      const dy = py - pour.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= pour.outer2) continue;
      if (this.ring === null && d2 > pour.inner2) {
        this.ring = pour.color;
        this.strength = pour.strength;
      }
      if (d2 < pour.radius2) {
        this.color = pour.color;
        if (pour.heat > 0) {
          const behind = ((pour.radius - Math.sqrt(d2)) / this.speed) * 1000;
          const left = 1 - clamp01(behind / WASH_MS);
          this.wash = pour.heat * left * left;
        }
        return;
      }
    }
    // No ring has reached here yet: the color from before the first one.
    if (pours.length) this.color = pours[0].from;
  }
}
