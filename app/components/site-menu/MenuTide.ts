// Drives the menu's tide. The state is where the front is, from 0 at its
// origin to 1 past the far corner, and it moves a frame at a time toward
// whatever was asked for last. A request only changes the target, so a burst
// of taps turns the same front around instead of stacking animations, and
// the menu ends where the last tap pointed.

import { CELL, type FluidColors, type Rgb } from "../pixel-fluid/engine";
import { FOAM, LEAD, tideCells, tideField, tidePath, type TideField } from "../../lib/menu-tide";

// Going out, the front leaves fast and eases into the far corner. Coming
// back it also leaves fast, so a close shows at once, and eases into its
// origin. A turn mid-way starts from where the front is, so nothing jumps.
const OPEN_MS = 560;
const LEAVE_MS = 540;
const BACK_MS = 420;
// Nothing of the menu shows through this.
const COVER_NOTHING = "path('M0 0')";

function pack([r, g, b]: Rgb, alpha = 255) {
  return ((alpha << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
}

export class MenuTide {
  /** How much of the menu shows, 0 to 1. */
  level = 0;
  target = 0;
  private travel = 0;
  private hole = false;
  private field: TideField | null = null;
  private origin = { x: 0, y: 0 };
  private width = 0;
  private height = 0;
  private cells = new Uint8Array(0);
  private drawn = new Uint8Array(0);
  private ctx: CanvasRenderingContext2D | null;
  private image: ImageData | null = null;
  private pixels: Uint32Array = new Uint32Array(0);
  private foamShowing = false;
  private frame = 0;
  private last = -1;
  private clip = "";
  private palette = { lead: 0, foamEven: 0, foamOdd: 0 };

  constructor(
    private root: HTMLElement,
    private foam: HTMLCanvasElement,
    private onRest: (level: number) => void
  ) {
    this.ctx = foam.getContext("2d");
    this.setClip(COVER_NOTHING);
  }

  /** Foam is the water's own checkerboard; the leading edge wears the accent. */
  setColors({ background, accent, isDark }: FluidColors) {
    const over = (color: Rgb, alpha: number): Rgb =>
      color.map((channel, i) => background[i] + (channel - background[i]) * alpha) as Rgb;
    const level = (percent: number): Rgb => [percent * 2.55, percent * 2.55, percent * 2.55];
    this.palette = {
      lead: pack(over(accent, 0.9)),
      foamEven: pack(level(isDark ? 10 : 96)),
      foamOdd: pack(level(isDark ? 15 : 92)),
    };
    if (this.foamShowing && this.field) this.paintFoam(this.field);
  }

  /**
   * Head for `target` (0 closed, 1 open). From rest the front starts at
   * (x, y): a flood, or a hole when the menu leaves through a link. Mid-tide
   * the same front turns around, wherever the request came from.
   */
  go(target: 0 | 1, x: number, y: number, hole: boolean, instant: boolean) {
    if (this.frame === 0 && this.level !== target) {
      this.hole = hole;
      this.travel = hole ? 1 - this.level : this.level;
      const { width, height } = this.viewport();
      this.origin = { x: x / width, y: y / height };
      this.resize(width, height);
    }
    this.target = target;
    if (instant) {
      this.stop();
      this.level = target;
      this.travel = this.hole ? 1 - target : target;
      this.draw();
      this.onRest(target);
      return;
    }
    if (this.frame === 0 && this.level !== target) {
      this.last = -1;
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private tick = (now: number) => {
    const { width, height } = this.viewport();
    if (this.width !== width || this.height !== height) this.resize(width, height);
    // A slow phone drops frames, not time: the front keeps its schedule.
    const dt = this.last < 0 ? 1000 / 60 : Math.min(64, now - this.last);
    this.last = now;
    const goal = this.hole ? 1 - this.target : this.target;
    if (goal > this.travel) {
      const time = 1 - Math.sqrt(1 - this.travel) + dt / (this.hole ? LEAVE_MS : OPEN_MS);
      this.travel = time >= 1 ? 1 : 1 - (1 - time) * (1 - time);
    } else {
      const time = 1 - Math.sqrt(this.travel) + dt / BACK_MS;
      this.travel = time >= 1 ? 0 : (1 - time) * (1 - time);
    }
    this.level = this.hole ? 1 - this.travel : this.travel;
    this.draw();
    if (this.level === this.target) {
      this.frame = 0;
      this.onRest(this.level);
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private setClip(clip: string) {
    if (clip === this.clip) return;
    this.clip = clip;
    this.root.style.clipPath = clip;
  }

  private viewport() {
    // Before React reveals the root it has no box. The document's client
    // size, unlike innerWidth, excludes enlarged content overflowing a phone.
    return {
      width: this.root.clientWidth || document.documentElement.clientWidth,
      height: this.root.clientHeight || document.documentElement.clientHeight,
    };
  }

  private resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.field = tideField(this.width, this.height, this.origin.x * this.width, this.origin.y * this.height, CELL);
    this.cells = new Uint8Array(this.field.cols * this.field.rows);
    this.drawn = new Uint8Array(this.cells.length);
    this.sizeFoam(this.field);
  }

  private sizeFoam({ cols, rows }: TideField) {
    const { ctx, foam } = this;
    if (!ctx) return;
    if (foam.width !== cols || foam.height !== rows) {
      foam.width = cols;
      foam.height = rows;
      foam.style.width = `${cols * CELL}px`;
      foam.style.height = `${rows * CELL}px`;
    }
    this.image = ctx.createImageData(cols, rows);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.foamShowing = false;
  }

  private draw() {
    const { field } = this;
    if (!field || this.level <= 0) {
      this.setClip(COVER_NOTHING);
      this.clearFoam();
      return;
    }
    if (this.level >= 1) {
      this.setClip("");
      this.clearFoam();
      return;
    }
    tideCells(field, this.travel, this.hole, this.cells);
    // Near the end of its run the front covers less than a cell a frame;
    // nothing to redraw until one flips.
    if (this.foamShowing && this.cells.every((state, i) => state === this.drawn[i])) return;
    this.drawn.set(this.cells);
    this.setClip(tidePath(this.cells, field.cols, field.rows, CELL));
    this.paintFoam(field);
  }

  private paintFoam({ cols }: TideField) {
    const { ctx, image, pixels, cells, palette } = this;
    if (!ctx || !image) return;
    for (let i = 0; i < cells.length; i++) {
      const state = cells[i];
      if (state === LEAD) pixels[i] = palette.lead;
      else if (state === FOAM) {
        const col = i % cols;
        pixels[i] = (col + (i - col) / cols) % 2 === 0 ? palette.foamEven : palette.foamOdd;
      } else pixels[i] = 0;
    }
    ctx.putImageData(image, 0, 0);
    this.foamShowing = true;
  }

  private clearFoam() {
    if (!this.foamShowing || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.foam.width, this.foam.height);
    this.foamShowing = false;
  }
}
