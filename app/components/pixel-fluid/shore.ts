// The shore: the water under the pages people read. Everything on the page is
// dry land (see land.ts), so the water only shows where the page leaves room:
// the margins of a wide screen, beside a short title, past the end of the
// text. There it is the sea's own swell drawn as its contour lines alone, in
// dots at the lattice's cell centers, like the depth lines on a chart: no
// checkerboard, no glints.
//
// It lies on the page rather than on the screen, so it scrolls with the text
// and scrolling costs nothing. It comes in from where the reader tapped,
// drifts for a moment and then holds still: nothing moves beside the words
// while they are read. A tap in open water, the cursor passing through it or
// a new accent sets it moving again, and it settles again by itself.

import { CELL, type FluidColors, type Rgb } from './engine';
import { Paint } from './paint';
import { cellDistance, farthest, TideFront } from './tide-front';

// Same swell as the sea, so contours line up across a front.
const WAVE_SCALE = 0.09;
const SPEED = { desktop: 0.09, mobile: 0.072 };
// The drift fades to nothing over this long after the water was last stirred.
const SETTLE_MS = 2600;
// How long a restored page's water takes to rise in place.
const RISE_MS = 520;
// Contours: four levels across the upper half of the swell.
const CONTOUR_FLOOR = 0.5;
const CONTOUR_DENSITY = 9;
const CONTOUR_THICKNESS = 0.2;
const DOT_FADE_MS = 400;
// Each cell is drawn on a 3 x 3 grid of 6px dots; a contour is its middle dot.
const SUB = 3;
// Ink rises from the shallows by the page to open water.
const SHELF = { desktop: 72, mobile: 40 };
const SHALLOW_INK = 0.2;
const INK = 0.62;
// Just behind the incoming front, every cell shows its dot: the lattice
// itself washes across the page and leaves the contours behind.
const FOAM = CELL * 1.5;
// Ripples: the same damped wave as the sea, stepped at a fixed rate.
const RIPPLE_HZ = 30;
const RIPPLE_DAMPING = 0.965;
const RIPPLE_REST = 0.004;
const RIPPLE_CREST = 0.035;
const RIPPLE_GAIN = 0.35;
// A picked accent spreads from the swatch as a ring, this fast (px/s).
const DYE_SPEED = 1100;
const DYE_BAND = CELL * 1.5;

type Pixel = number;

function pack(r: number, g: number, b: number, a = 255): Pixel {
  return ((a << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function easeOutCubic(t: number) {
  const k = clamp01(t);
  return 1 - (1 - k) * (1 - k) * (1 - k);
}

interface Layout {
  cols: number;
  rows: number;
  /** Document row of the lattice's first row. */
  firstRow: number;
  dry: Uint8Array;
  reach: Float32Array;
}

export class Shore {
  cols = 0;
  rows = 0;
  /** Reduced motion: drawn once, no drift, no ripples. */
  still = false;
  private ctx: CanvasRenderingContext2D | null;
  private image: ImageData | null = null;
  private pixels: Uint32Array = new Uint32Array(0);
  private dotFade = new Float32Array(0);
  private dotColor = new Uint32Array(0);
  private fading = false;
  private layout: Layout | null = null;
  private old: Layout | null = null;
  private front = new TideFront(CELL);
  private phase = 0;
  private stirred = -Infinity;
  private last = -1;
  private rise = -Infinity;
  private mobile = false;
  private ripple = new Float32Array(0);
  private rippleLast = new Float32Array(0);
  private rippleActive = false;
  private rippleClock = 0;
  // Accent pours from the dock, spreading through the water as rings.
  private paint = new Paint(DYE_SPEED, DYE_BAND);
  private colors: FluidColors = { background: [10, 10, 10], accent: [255, 255, 255], isDark: true };
  private dirty = true;
  private colWave = new Float32Array(0);
  private rowWave = new Float32Array(0);

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
  }

  /** Viewport width decides the phone pacing and shelf. */
  setViewport(width: number) {
    this.mobile = width < 768;
  }

  setColors(colors: FluidColors) {
    this.colors = colors;
    this.dirty = true;
  }

  /**
   * New land (a new page, or the same page laid out again). `firstRow` is the
   * document row the lattice starts at.
   */
  setLand(dry: Uint8Array, reach: Float32Array, cols: number, rows: number, firstRow: number) {
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols;
      this.rows = rows;
      this.canvas.width = Math.max(1, cols * SUB);
      this.canvas.height = Math.max(1, rows * SUB);
      this.canvas.style.width = `${cols * CELL}px`;
      this.canvas.style.height = `${rows * CELL}px`;
      this.image = this.ctx && cols && rows ? this.ctx.createImageData(cols * SUB, rows * SUB) : null;
      this.pixels = this.image ? new Uint32Array(this.image.data.buffer) : new Uint32Array(0);
      this.dotFade = new Float32Array(cols * rows);
      this.dotColor = new Uint32Array(cols * rows);
      this.ripple = new Float32Array(cols * rows);
      this.rippleLast = new Float32Array(cols * rows);
      this.rippleActive = false;
      if (this.old && (this.old.cols !== cols || this.old.rows !== rows)) this.old = null;
    }
    this.layout = { cols, rows, firstRow, dry, reach };
    this.dirty = true;
  }

  /** Forget the page: nothing drawn until the next setLand. */
  clearLand() {
    this.layout = null;
    this.old = null;
    this.front.clear();
    this.dotFade.fill(0);
    this.fading = false;
    this.dirty = true;
  }

  /** The water runs out from (x, y), in lattice px. */
  recede(x: number, y: number, now: number) {
    if (!this.layout) return;
    this.old = this.layout;
    this.front.recede(x, y, this.reachFrom(x, y), now);
    this.dirty = true;
  }

  /** The current page's water comes in from (x, y), in lattice px. */
  flood(x: number, y: number, now: number) {
    if (!this.front.active) this.old = null;
    this.front.flood(x, y, this.reachFrom(x, y), now);
    this.stir(now);
    this.dirty = true;
  }

  /**
   * Restored pages (back and forward): the water rises where it is, or is
   * simply there (`instant`, for a page that arrives out of sight).
   */
  riseInPlace(now: number, instant = false) {
    this.front.clear();
    this.old = null;
    this.rise = instant ? -Infinity : now;
    if (!instant) this.stir(now);
    this.dirty = true;
  }

  /** Finish any front and rise at once: the current page's water, whole. */
  settleFront() {
    this.front.clear();
    this.old = null;
    this.rise = -Infinity;
    this.dirty = true;
  }

  /** Disturb the water at (x, y), in lattice px. Land ignores it. */
  splash(x: number, y: number, strength: number) {
    const layout = this.layout;
    if (this.still || !layout) return false;
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    if (cx < 1 || cy < 1 || cx >= this.cols - 1 || cy >= this.rows - 1) return false;
    const i = cy * this.cols + cx;
    if (layout.dry[i]) return false;
    this.ripple[i] += strength;
    this.ripple[i - 1] += strength * 0.5;
    this.ripple[i + 1] += strength * 0.5;
    this.ripple[i - this.cols] += strength * 0.5;
    this.ripple[i + this.cols] += strength * 0.5;
    this.rippleActive = true;
    return true;
  }

  /**
   * An accent pours in from (x, y), in lattice px, until its ring has
   * travelled `reach` px. `heat` (0 to 1) is how fast the dock is being
   * played; a hot pour leaves its color in the water behind it.
   */
  dropDye(x: number, y: number, now: number, heat = 0, reach = this.reachFrom(x, y)) {
    if (this.still || !this.layout) return;
    this.paint.pour(x, y, this.colors.accent, this.colors.accent, heat, now, reach);
    this.splash(x, y, 0.9);
    this.stir(now);
  }

  /** Anything moving: the caller keeps asking for frames while this holds. */
  busy(now: number) {
    if (this.still) return this.dirty;
    return (
      this.dirty ||
      this.rippleActive ||
      this.paint.active ||
      this.fading ||
      (this.front.active && !this.front.settled(now) && !this.front.drained(now)) ||
      now - this.stirred < SETTLE_MS ||
      now - this.rise < RISE_MS
    );
  }

  /** Fronts, ripples and dye want every frame; a drift is fine at half. */
  fast(now: number) {
    return this.rippleActive || this.paint.active || (this.front.active && !this.front.settled(now));
  }

  /** The water drained away and nothing is coming back. */
  empty(now: number) {
    return !this.layout || this.front.drained(now);
  }

  private stir(now: number) {
    this.stirred = now;
  }

  private reachFrom(x: number, y: number) {
    // The front only has to cross the screen; beyond it the water can
    // simply appear.
    const width = this.cols * CELL;
    const height = Math.min(this.rows * CELL, Math.max(window.innerHeight * 2, y + window.innerHeight));
    return farthest(width, height, x, Math.min(y, height));
  }

  private stepRipples(dt: number, dry: Uint8Array) {
    if (!this.rippleActive || this.still) return;
    this.rippleClock += dt;
    const interval = 1000 / RIPPLE_HZ;
    const { cols, rows } = this;
    let steps = 0;
    while (this.rippleClock >= interval && steps < 4) {
      this.rippleClock -= interval;
      steps++;
      const cur = this.ripple;
      const next = this.rippleLast;
      let peak = 0;
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          // Land holds the surface flat, so waves reflect off the text.
          if (dry[i]) {
            next[i] = 0;
            continue;
          }
          const value = ((cur[i - 1] + cur[i + 1] + cur[i - cols] + cur[i + cols]) * 0.5 - next[i]) * RIPPLE_DAMPING;
          next[i] = value;
          const magnitude = value < 0 ? -value : value;
          if (magnitude > peak) peak = magnitude;
        }
      }
      this.ripple = next;
      this.rippleLast = cur;
      if (peak < RIPPLE_REST) {
        this.ripple.fill(0);
        this.rippleLast.fill(0);
        this.rippleActive = false;
        this.rippleClock = 0;
        break;
      }
    }
  }

  /**
   * Draw rows [from, to) of the lattice (the part on screen, give or take),
   * or all of them. Returns false when there was nothing to draw.
   */
  render(now: number, from = 0, to = this.rows) {
    const { ctx, image, pixels, cols, rows, colors } = this;
    if (!ctx || !image || !cols || !rows) return false;
    const layout = this.layout;
    const dt = this.last < 0 ? 0 : Math.min(100, Math.max(0, now - this.last));
    this.last = now;
    this.dirty = false;
    this.fading = false;

    if (!layout) {
      pixels.fill(0);
      ctx.putImageData(image, 0, 0);
      return true;
    }

    // Drift: the sea's ambient pace, fading to still after the last stir.
    if (!this.still) {
      const calm = easeOutCubic((now - this.stirred) / SETTLE_MS);
      const speed = this.mobile ? SPEED.mobile : SPEED.desktop;
      this.phase += speed * (1 - calm) * (dt / 1000);
    }
    this.stepRipples(dt, layout.dry);

    const t = this.phase;
    const amplitude = this.still ? 1 : easeOutCubic((now - this.rise) / RISE_MS);
    const { isDark, background } = colors;
    // A dot is a ninth of a cell, so it carries more ink than the sea's pen.
    const pen = (isDark ? 42 : 62) * 2.55;
    const lightSign = isDark ? 1 : -1;
    const [bgR, bgG, bgB] = background;
    const over = (level: number, alpha: number) => pack(
      bgR + (level - bgR) * alpha,
      bgG + (level - bgG) * alpha,
      bgB + (level - bgB) * alpha,
    );
    const tint = (color: Rgb, alpha: number) => pack(
      bgR + (color[0] - bgR) * alpha,
      bgG + (color[1] - bgG) * alpha,
      bgB + (color[2] - bgB) * alpha,
    );
    // A pen dot, taking `amount` of `color`.
    const washed = (color: Rgb, amount: number, alpha: number) => tint(
      [pen + (color[0] - pen) * amount, pen + (color[1] - pen) * amount, pen + (color[2] - pen) * amount],
      alpha,
    );
    const shelfWidth = this.mobile ? SHELF.mobile : SHELF.desktop;
    const front = this.front;
    const tiding = front.active;
    const radii = tiding ? front.radii(now) : { in: Infinity, out: Infinity };
    if (tiding && front.settled(now)) {
      front.clear();
      this.old = null;
    }
    const old = this.old;
    const ripple = this.ripple;
    const rippling = this.rippleActive;

    const paint = this.paint;
    const painting = !this.still && paint.active && paint.frame(now);

    const fadeStep = this.still || now - this.stirred >= SETTLE_MS + DOT_FADE_MS ? 1 : dt / DOT_FADE_MS;
    const start = Math.max(0, Math.floor(from));
    const end = Math.min(rows, Math.ceil(to));
    if (this.colWave.length !== cols) this.colWave = new Float32Array(cols);
    if (this.rowWave.length !== rows) this.rowWave = new Float32Array(rows);
    const sinCol = this.colWave;
    const cosRow = this.rowWave;
    for (let x = 0; x < cols; x++) sinCol[x] = Math.sin(x * WAVE_SCALE + t);
    for (let y = start; y < end; y++) cosRow[y] = Math.cos((y + layout.firstRow) * WAVE_SCALE * 0.7 - t * 0.4);

    const stride = cols * SUB;
    pixels.fill(0, start * SUB * stride, end * SUB * stride);
    // The middle dot of a cell, or the whole cell.
    const dot = (x: number, y: number, color: Pixel) => {
      pixels[(y * SUB + 1) * stride + x * SUB + 1] = color;
    };

    for (let y = start; y < end; y++) {
      const docRow = y + layout.firstRow;
      const rowWave = cosRow[y];
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        let land = layout;
        let foam = false;
        if (tiding) {
          const d = cellDistance(x, y, front.x, front.y, CELL);
          const side = front.side(d, radii);
          if (side === 'gap') { this.dotFade[i] = 0; continue; }
          if (side === 'old') {
            if (!old) { this.dotFade[i] = 0; continue; }
            land = old;
          } else foam = d > radii.in - FOAM;
        }
        if (land.dry[i]) { this.dotFade[i] = 0; continue; }
        const shelf = smoothstep(0, shelfWidth, land.reach[i]);
        const ink = INK * (SHALLOW_INK + (1 - SHALLOW_INK) * shelf);

        if (painting) {
          paint.sample(x * CELL + CELL / 2, y * CELL + CELL / 2);
          if (paint.ring && shelf > 0.3) {
            dot(x, y, tint(paint.ring, 0.9));
            this.dotFade[i] = 0;
            continue;
          }
        }

        if (foam) {
          dot(x, y, over(pen, ink * 0.8));
          this.dotFade[i] = 0;
          continue;
        }

        // Ripple crests catch the light: a ring of dots spreading out.
        if (rippling && ripple[i] > RIPPLE_CREST) {
          const k = clamp01((ripple[i] - RIPPLE_CREST) / 0.2);
          dot(x, y, over(pen + lightSign * k * 40 * 2.55, Math.min(1, ink * 1.3)));
          this.dotFade[i] = 0;
          continue;
        }

        let height = (sinCol[x] + rowWave + Math.sin((x - docRow) * WAVE_SCALE * 0.5 + t * 0.3) + 3) / 6;
        height *= amplitude;
        if (rippling) height += ripple[i] * RIPPLE_GAIN;
        const contour = height > CONTOUR_FLOOR && (height * CONTOUR_DENSITY) % 1 < CONTOUR_THICKNESS;
        const previous = this.dotFade[i];
        const opacity = contour ? Math.min(1, previous + fadeStep) : Math.max(0, previous - fadeStep);
        this.dotFade[i] = opacity;
        if (contour) {
          // Where a hot pour passed, the contour takes its color for a moment.
          this.dotColor[i] = painting && paint.wash > 0 ? washed(paint.color, paint.wash, ink) : over(pen, ink);
        }
        if (opacity > 0) {
          dot(x, y, (this.dotColor[i] & 0x00ffffff) | (Math.round(opacity * 255) << 24));
          if (opacity < 1) this.fading = true;
        }
      }
    }
    ctx.putImageData(image, 0, 0, 0, start * SUB, stride, (end - start) * SUB);
    return true;
  }
}
