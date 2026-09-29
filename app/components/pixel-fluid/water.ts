// The site's one body of water. It lives in the layout, so it never
// disappears between pages; it changes shape with the page it is under. The
// open sea (the engine) fills the screen behind the pages that list work.
// The shore (shore.ts) lies on the pages people read.
//
// A tap on a link starts the page's water running out from under the
// finger. When the next page arrives, its water comes in from the same
// point. Old water only stays on screen past that moment when it already
// knows where the new page's text is (sea to sea); otherwise it goes with
// the page it belonged to.

import { CELL, PixelFluid, type FluidColors } from './engine';
import { measureIslands } from './islands';
import { measureLand, rasterizeLand } from './land';
import { isSea, seaOptions, type WaterShape } from './shapes';
import { Shore } from './shore';

const AMBIENT_FRAME_MS = 1000 / 30;
const BUSY_FRAME_MS = 1000 / 60;
// The shore keeps this far (px) from anything on the page, and fades in over
// the next cells.
const SHORE_BEACH = 30;
const SHORE_CAP = 140;

export interface WaterParts {
  seaFrame: HTMLElement;
  seaCanvas: HTMLCanvasElement;
  shoreFrame: HTMLElement;
  shoreCanvas: HTMLCanvasElement;
}

export interface WaterArrival {
  shape: WaterShape;
  kind: 'load' | 'push' | 'restore';
  x?: number;
  y?: number;
  /** Arrived under the mobile menu: nothing to animate, it is hidden. */
  covered: boolean;
}

export class SiteWater {
  shape: WaterShape;
  readonly sea: PixelFluid;
  readonly shore: Shore;
  private seaOn = false;
  private shoreOn = false;
  private seaDirty = true;
  private shoreFull = false;
  private frame = 0;
  private measureFrame = 0;
  private lastSea = -Infinity;
  private lastShore = -Infinity;
  private shoreRow = { offset: 0, first: 0 };
  private disposed = false;

  constructor(private parts: WaterParts, shape: WaterShape, private canRun: () => boolean) {
    this.shape = shape;
    const options = isSea(shape) ? seaOptions(shape) : seaOptions('hero');
    // Behind the site's pages the sea is drawn as a chart: its contour
    // lines in dots on the bare page, mostly still black.
    this.sea = new PixelFluid(parts.seaCanvas, { ...options, chart: true });
    this.shore = new Shore(parts.shoreCanvas);
  }

  get still() {
    return this.sea.still;
  }

  set still(value: boolean) {
    this.sea.still = value;
    this.shore.still = value;
    // A front caught mid-way would otherwise hold as it is.
    if (value) {
      this.sea.settleFront();
      this.shore.settleFront();
    }
    this.sea.clearPointer();
    this.seaDirty = true;
    this.shoreFull = true;
  }

  setColors(colors: FluidColors) {
    this.sea.setColors(colors);
    this.shore.setColors(colors);
    this.seaDirty = true;
    this.kick();
  }

  /** First paint: the water for the page the site was opened on. */
  load() {
    this.arrive({ shape: this.shape, kind: 'load', covered: false });
  }

  resize(width: number, height: number) {
    this.sea.resize(width, height);
    this.shore.setViewport(width);
    this.seaDirty = true;
    this.kick();
  }

  // ---- page changes ----------------------------------------------------

  /** A link was tapped at (x, y), viewport px. */
  depart(x: number, y: number) {
    if (this.still) return;
    const now = performance.now();
    if (this.seaOn) this.sea.recede(x, y, now);
    if (this.shoreOn) {
      const point = this.toShore(x, y);
      this.shore.recede(point.x, point.y, now);
    }
    this.kick();
  }

  arrive({ shape, kind, x, y, covered }: WaterArrival) {
    const previous = this.shape;
    const wasSea = this.seaOn && isSea(previous);
    this.shape = shape;
    const now = performance.now();
    const quiet = this.still || covered || kind !== 'push' || x === undefined || y === undefined;
    cancelAnimationFrame(this.measureFrame);

    if (isSea(shape)) {
      const { heroMode, quietShare } = seaOptions(shape);
      this.sea.setShape(heroMode, quietShare);
      this.setSea(true);
      if (kind === 'load') {
        // The site's own slow tide-in starts with the engine's first frame.
      } else if (quiet) this.sea.rise(now, covered || this.still);
      // Sea to sea, the old water drains around the new page's islands;
      // otherwise the sea comes back from nothing.
      else this.sea.flood(x as number, y as number, now, !wasSea);
      // Paint now, so a sea coming back never shows a stale frame.
      if (kind !== 'load') this.drawSea(now);
    } else if (this.seaOn) {
      this.setSea(false);
    }

    // The shore's land is the new page's; none of the old page's water may
    // show over it. It shows again once it is traced and sized, so its
    // canvas never appears at a wrong size.
    this.shore.clearLand();
    this.setShore(false);

    // Land is laid out now; trace it in the next frame, off the frame that
    // puts the new page on screen.
    this.measureFrame = requestAnimationFrame(() => {
      if (this.disposed) return;
      const later = performance.now();
      if (isSea(shape)) {
        this.sea.setIslands(measureIslands());
        this.seaDirty = true;
      }
      if (shape === 'shore') {
        this.measureShore(true);
        if (quiet) this.shore.riseInPlace(later, covered || this.still);
        else {
          const point = this.toShore(x as number, y as number);
          this.shore.flood(point.x, point.y, later);
        }
      }
      // Under the menu the loop rests; draw once so the page it reveals
      // already has its own water.
      if (covered) this.drawOnce(later);
      this.kick();
    });
    this.kick();
  }

  // ---- the page's land ---------------------------------------------------

  measureSeaIslands() {
    if (!this.seaOn) return;
    this.sea.setIslands(measureIslands());
    this.seaDirty = true;
    this.kick();
  }

  /**
   * Trace what is on the page and give the shore the cells left clear.
   * `show`: the page just arrived; reveal the shore once it is sized.
   */
  measureShore(show = false) {
    if (this.shape !== 'shore' || (!this.shoreOn && !show)) return;
    const { shoreFrame, shoreCanvas } = this.parts;
    const container = shoreFrame.parentElement;
    if (!container) return;
    // The shore fills its container (main), so the container's box is its
    // box, even while it is hidden.
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const docTop = rect.top + window.scrollY;
    // Rows sit on the document's 18px lattice, like the sea's at the top.
    const offset = ((docTop % CELL) + CELL) % CELL;
    const first = Math.round((docTop - offset) / CELL);
    const cols = Math.ceil(rect.width / CELL);
    const rows = Math.ceil((rect.height + offset) / CELL);
    this.shoreRow = { offset, first };
    shoreCanvas.style.top = `${-offset}px`;
    const rects = measureLand(container, rect.left, rect.top - offset);
    const land = rasterizeLand(rects, cols, rows, CELL, SHORE_BEACH, SHORE_CAP);
    this.shore.setLand(land.dry, land.reach, cols, rows, first);
    this.shoreFull = true;
    if (show) this.setShore(true);
    this.kick();
  }

  // ---- touch ------------------------------------------------------------

  splash(x: number, y: number, strength: number) {
    if (this.seaOn) this.sea.splash(x, y, strength);
    if (this.shoreOn) {
      const point = this.toShore(x, y);
      this.shore.splash(point.x, point.y, strength);
    }
    this.kick();
  }

  pointer(x: number, y: number) {
    if (this.seaOn) this.sea.movePointer(x, y);
  }

  clearPointer() {
    this.sea.clearPointer();
  }

  dropDye(x: number, y: number, from: [number, number, number]) {
    const now = performance.now();
    if (this.seaOn) this.sea.dropDye(x, y, from, now);
    if (this.shoreOn) {
      const point = this.toShore(x, y);
      this.shore.dropDye(point.x, point.y, now);
    }
    this.kick();
  }

  /** The sea's presence follows the scroll; the shore scrolls with the page. */
  scrolled() {
    if (this.seaOn && this.sea.still) {
      this.seaDirty = true;
      this.kick();
    }
  }

  // ---- frames -----------------------------------------------------------

  kick() {
    if (this.frame || this.disposed || !this.canRun()) return;
    this.frame = requestAnimationFrame(this.loop);
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    cancelAnimationFrame(this.measureFrame);
  }

  private loop = (now: number) => {
    this.frame = 0;
    if (this.disposed || !this.canRun()) return;
    let again = false;

    if (this.seaOn) {
      if (this.sea.still) {
        if (this.seaDirty) this.drawSea(now);
      } else {
        const interval = this.sea.busy ? BUSY_FRAME_MS : AMBIENT_FRAME_MS;
        if (now - this.lastSea >= interval - 1) this.drawSea(now);
        again = true;
      }
    }

    if (this.shoreOn) {
      const busy = this.shore.busy(now);
      if (this.shore.still) {
        if (busy || this.shoreFull) this.drawShore(now, true);
      } else if (busy) {
        const interval = this.shore.fast(now) ? BUSY_FRAME_MS : AMBIENT_FRAME_MS;
        if (now - this.lastShore >= interval - 1) this.drawShore(now, false);
        this.shoreFull = true;
        again = true;
      } else if (this.shoreFull) {
        // Settled: one full pass, so rows off screen are right too.
        this.drawShore(now, true);
      }
    }

    if (again) this.frame = requestAnimationFrame(this.loop);
  };

  private drawOnce(now: number) {
    if (this.seaOn) this.drawSea(now);
    if (this.shoreOn) this.drawShore(now, true);
  }

  private drawSea(now: number) {
    this.lastSea = now;
    this.seaDirty = false;
    this.sea.render(now, window.scrollX, window.scrollY, window.innerHeight);
  }

  private drawShore(now: number, full: boolean) {
    this.lastShore = now;
    if (full) {
      this.shoreFull = false;
      this.shore.render(now);
      return;
    }
    // Only the rows on screen, give or take, while it moves.
    const container = this.parts.shoreFrame.parentElement ?? this.parts.shoreFrame;
    const top = -container.getBoundingClientRect().top + this.shoreRow.offset;
    const from = Math.floor(top / CELL) - 2;
    this.shore.render(now, from, from + Math.ceil(window.innerHeight / CELL) + 4);
  }

  private setSea(on: boolean) {
    if (on === this.seaOn) return;
    this.seaOn = on;
    this.parts.seaFrame.dataset.water = on ? 'on' : 'off';
    if (on) this.seaDirty = true;
  }

  private setShore(on: boolean) {
    if (on === this.shoreOn) return;
    this.shoreOn = on;
    this.parts.shoreFrame.dataset.water = on ? 'on' : 'off';
  }

  /** Viewport px to the shore lattice's px. */
  private toShore(x: number, y: number) {
    const rect = (this.parts.shoreFrame.parentElement ?? this.parts.shoreFrame).getBoundingClientRect();
    return { x: x - rect.left, y: y - rect.top + this.shoreRow.offset };
  }
}
