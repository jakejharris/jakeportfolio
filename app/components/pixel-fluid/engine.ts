// The pixel water. One canvas pixel per 18px lattice cell; CSS scales the
// canvas up with crisp edges, so a frame costs a few thousand array writes.
//
// The look is the original field: a slow three-wave swell drawn as a
// checkerboard, dashed drafting-pen contours, and rare accent glints on the
// crests. What changed is the physics around text. Elements marked
// data-fluid-island are dry land: cells near their glyphs are never drawn,
// the swell shoals out across a shelf before it reaches them, and ripples
// reflect off them.

import type { IslandField } from './islands';
import { Paint } from './paint';
import { islandDistance } from './islands';
import { cellDistance, cellNoise, TideFront } from './tide-front';

export const CELL = 18;

export type Rgb = [number, number, number];

export interface FluidColors {
  background: Rgb;
  accent: Rgb;
  isDark: boolean;
}

export interface FluidOptions {
  /** Homepage art direction: formations upper left and right edge. */
  heroMode: boolean;
  /** Share of cells kept as still negative space, chosen away from the edges. */
  quietShare: number;
  /** How long the swell takes to rise after the first frame. */
  rampMs?: number;
  /**
   * Draw the water as a chart: only its contour lines, as small dots at the
   * cell centers, on the bare page. No checkerboard, no coastline.
   */
  chart?: boolean;
}

// Wave amplitude ramps 0 -> 1 on mount, then the drift settles to ambient.
const RAMP_MS = 4000;
// Water that comes back with a page rises behind its front, much faster,
// and the front itself breaks as a band of foam.
const FLOOD_RAMP_MS = 360;
const FOAM_BAND = CELL * 1.5;
const SETTLE_DELAY_MS = 8000;
const SETTLE_MS = 6000;
// Radians per second: half the old per-frame steps at 60 fps, which read as busy.
const SPEED = {
  desktop: { intro: 0.216, ambient: 0.09 },
  mobile: { intro: 0.195, ambient: 0.072 },
};
const WAVE_SCALE = 0.09;
const CONTOUR_DENSITY = 12;
const CONTOUR_THICKNESS = 0.2;

// Shoreline, in CSS px from the (already widened) glyph outlines. Inside the
// beach nothing is drawn. Across the shelf the water deepens: crests thin
// out, contour lines bend to follow the coast and the pattern fades in.
const BEACH = 4;
const SHELF = { desktop: 72, mobile: 45 };
const SHALLOW_HEIGHT = 0.62;
const SHALLOW_INK = 0.35;
// Worst-case distance from a cell's center sample to its nearest corner.
const CELL_SLACK = (CELL / 2) * Math.SQRT2 + 2.2;

// Ripples: a damped wave equation on the lattice, stepped at a fixed rate.
const RIPPLE_HZ = 30;
const RIPPLE_DAMPING = 0.968;
const RIPPLE_GAIN = 0.3;
const RIPPLE_REST = 0.004;
// Crests above this catch the light, so a ring reads as a ring.
const RIPPLE_CREST = 0.04;
const RIPPLE_CREST_FULL = 0.22;

// A picked accent spreads from the swatch as a ring, this fast.
const DYE_SPEED = 1100;
const DYE_BAND = CELL * 1.5;

const FLASHLIGHT_RADIUS = 25;

// Chart drawing: each cell is a 3 x 3 grid of 6px dots and a contour is its
// middle dot. A dot is a ninth of a cell, so it carries more ink than a cell.
const SUB = 3;
const CHART_FLOOR = 0.5;
// Thin enough that a contour stays one dot wide where the swell is flat.
const CHART_THICKNESS = 0.13;
const CHART_PEN = { dark: 38, light: 64 };
// The swell's crests keep a faint checkerboard body, whole cells, much
// quieter than the old sea's; the troughs stay bare.
const CHART_BODY_FLOOR = 0.62;
const CHART_BODY = { dark: [6, 9], light: [97.5, 95] };
// Glints on a chart are scattered by a per-cell hash, not the old modulo
// rule that lined them up in columns.
const CHART_GLINT_SHARE = 0.05;
// The highest contour dots lean toward the accent.
const CHART_CREST = 0.88;
const CHART_CREST_TINT = 0.25;
// What a drawn cell becomes on the chart canvas.
const MARK_DOT = 1;
const MARK_CELL = 2;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function gaussian(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return Math.exp(-(dx * dx + dy * dy) * 2);
}

function pack(r: number, g: number, b: number) {
  // ImageData is RGBA in memory; Uint32 views are little-endian everywhere
  // this runs.
  return (255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r);
}

// Keep the homepage field art-directed as the waves move: a broad formation
// from the upper left and a smaller counterweight at the right edge.
function compositionBias(nx: number, ny: number, mobile: boolean) {
  if (mobile) {
    return gaussian(nx, ny, 0.83, 0.12, 0.5, 0.3) * 0.09
      + gaussian(nx, ny, -0.08, 0.06, 0.34, 0.26) * 0.05;
  }
  return gaussian(nx, ny, 0.08, 0.13, 0.34, 0.3) * 0.09
    + gaussian(nx, ny, 1.02, 0.24, 0.28, 0.3) * 0.085;
}

export class PixelFluid {
  cols = 0;
  rows = 0;
  private ctx: CanvasRenderingContext2D | null;
  private image: ImageData | null = null;
  private pixels: Uint32Array = new Uint32Array(0);
  // Chart drawing: the canvas image, three pixels per cell each way, and per
  // cell whether it is drawn as a dot or a whole cell.
  private dots: Uint32Array | null = null;
  private marks = new Uint8Array(0);
  private bias = new Float32Array(0);
  private water = new Uint8Array(0);
  private shore = new Float32Array(0);
  private shoreScroll = NaN;
  private islands: IslandField | null = null;
  private ripple = new Float32Array(0);
  private rippleLast = new Float32Array(0);
  private rippleActive = false;
  private rippleClock = 0;
  private colW = new Float32Array(0);
  private rowW = new Float32Array(0);
  private diagW = new Float32Array(0);
  private mobile = false;
  private speed = SPEED.desktop;
  private shelf = SHELF.desktop;
  private phase = 0;
  private start = -1;
  private rampMs = RAMP_MS;
  private last = -1;
  // A page change: the old composition drains ahead of a front while the
  // new one comes in behind it.
  private tide = new TideFront(CELL);
  private oldBias: Float32Array | null = null;
  private oldWater: Uint8Array | null = null;
  private colors: FluidColors = { background: [10, 10, 10], accent: [255, 255, 255], isDark: true };
  // Accent pours from the dock, spreading through the water as rings.
  private paint = new Paint(DYE_SPEED, DYE_BAND);
  private pointer = { x: 0, y: 0, active: false };
  /** Reduced motion: full amplitude, no drift, no ripples. */
  still = false;

  constructor(private canvas: HTMLCanvasElement, private options: FluidOptions) {
    this.ctx = canvas.getContext('2d');
    this.rampMs = options.rampMs ?? RAMP_MS;
  }

  /** Size the lattice to the viewport. Cheap to call on every resize. */
  resize(width: number, height: number) {
    const cols = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const mobile = width < 768;
    if (cols === this.cols && rows === this.rows && mobile === this.mobile) return;

    this.mobile = mobile;
    this.speed = mobile ? SPEED.mobile : SPEED.desktop;
    this.shelf = mobile ? SHELF.mobile : SHELF.desktop;
    this.cols = cols;
    this.rows = rows;
    const sub = this.options.chart ? SUB : 1;
    this.canvas.width = cols * sub;
    this.canvas.height = rows * sub;
    this.canvas.style.width = `${cols * CELL}px`;
    this.canvas.style.height = `${rows * CELL}px`;
    this.image = this.ctx ? this.ctx.createImageData(cols * sub, rows * sub) : null;
    if (this.options.chart) {
      this.pixels = new Uint32Array(cols * rows);
      this.marks = new Uint8Array(cols * rows);
      this.dots = this.image ? new Uint32Array(this.image.data.buffer) : null;
    } else {
      this.pixels = this.image ? new Uint32Array(this.image.data.buffer) : new Uint32Array(0);
      this.dots = null;
    }
    this.shore = new Float32Array(cols * rows);
    this.shoreScroll = NaN;
    this.ripple = new Float32Array(cols * rows);
    this.rippleLast = new Float32Array(cols * rows);
    this.rippleActive = false;
    this.colW = new Float32Array(cols);
    this.rowW = new Float32Array(rows);
    this.diagW = new Float32Array(cols + rows);

    this.oldBias = null;
    this.oldWater = null;
    this.compose();
  }

  /** Change the art direction (homepage, hub or plain) of the same water. */
  setShape(heroMode: boolean, quietShare: number) {
    if (heroMode === this.options.heroMode && quietShare === this.options.quietShare) return;
    this.options = { ...this.options, heroMode, quietShare };
    this.compose();
  }

  private compose() {
    const { cols, rows, mobile } = this;
    this.bias = new Float32Array(cols * rows);
    if (this.options.heroMode && cols > 1 && rows > 1) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          this.bias[y * cols + x] = compositionBias(x / (cols - 1), y / (rows - 1), mobile);
        }
      }
    }

    this.water = new Uint8Array(cols * rows).fill(1);
    const { quietShare } = this.options;
    if (quietShare > 0) {
      // Keep the strongest edge formations by rank rather than by a wave
      // threshold, so coverage never changes over time. At .75, three cells
      // in four stay blank and the reading column sits between formations.
      const ranked = Array.from({ length: cols * rows }, (_, index) => {
        const nx = (index % cols) / Math.max(cols - 1, 1);
        const ny = Math.floor(index / cols) / Math.max(rows - 1, 1);
        const score = gaussian(nx, ny, -0.06, 0.16, 0.34, 0.48) + gaussian(nx, ny, 1.06, 0.72, 0.3, 0.52);
        return { index, score };
      }).sort((a, b) => b.score - a.score);
      this.water.fill(0);
      const count = Math.floor(ranked.length * (1 - clamp01(quietShare)));
      for (let i = 0; i < count; i++) this.water[ranked[i].index] = 1;
    }
  }

  /**
   * The page is being left from (x, y), viewport px: the water runs out from
   * there, cell by cell.
   */
  recede(x: number, y: number, now: number) {
    if (!this.cols) return;
    this.oldBias = this.bias;
    this.oldWater = this.water;
    this.tide.recede(x, y, this.reachFrom(x, y), now);
  }

  /**
   * A page arrived: its water (the current shape) comes in from (x, y),
   * behind whatever is left of the old. `rise`: there was no water showing,
   * so the swell also rises from nothing.
   */
  flood(x: number, y: number, now: number, rise: boolean) {
    if (!this.cols) return;
    if (rise) {
      // Whatever ran out of this water earlier is over; this front is new.
      this.tide.clear();
      this.oldBias = null;
      this.oldWater = null;
      this.start = now;
      this.last = now;
      this.rampMs = FLOOD_RAMP_MS;
    } else if (!this.tide.active) {
      this.oldBias = null;
      this.oldWater = null;
    }
    this.tide.flood(x, y, this.reachFrom(x, y), now);
  }

  /**
   * Show the current shape at once, with the swell rising in place, or
   * already risen (`instant`, for a page that arrives out of sight).
   */
  rise(now: number, instant = false) {
    this.tide.clear();
    this.oldBias = null;
    this.oldWater = null;
    this.rampMs = FLOOD_RAMP_MS;
    this.start = instant ? now - FLOOD_RAMP_MS : now;
    this.last = now;
  }

  /** Finish any page-change front at once: the current shape, whole. */
  settleFront() {
    this.tide.clear();
    this.oldBias = null;
    this.oldWater = null;
  }

  /** All the water has run out and none is coming back. */
  drained(now: number) {
    return this.tide.drained(now);
  }

  private reachFrom(x: number, y: number) {
    return Math.hypot(Math.max(x, this.cols * CELL - x), Math.max(y, this.rows * CELL - y)) + CELL * 4;
  }

  setIslands(field: IslandField | null) {
    this.islands = field;
    this.shoreScroll = NaN;
  }

  setColors(colors: FluidColors) {
    this.colors = colors;
  }

  /**
   * An accent pours in from (x, y), in viewport px: a new one replacing
   * `from`, or the same one again. `heat` (0 to 1) is how fast the dock is
   * being played; a hot pour leaves its color in the water behind it.
   */
  dropDye(x: number, y: number, from: Rgb, now: number, heat = 0, reach = this.reachFrom(x, y)) {
    this.paint.pour(x, y, this.colors.accent, from, heat, now, reach);
    this.splash(x, y, 0.9);
  }

  /** Disturb the water at (x, y), in viewport px. */
  splash(x: number, y: number, strength: number) {
    if (this.still || !this.cols) return;
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    if (cx < 1 || cy < 1 || cx >= this.cols - 1 || cy >= this.rows - 1) return;
    const i = cy * this.cols + cx;
    this.ripple[i] += strength;
    this.ripple[i - 1] += strength * 0.5;
    this.ripple[i + 1] += strength * 0.5;
    this.ripple[i - this.cols] += strength * 0.5;
    this.ripple[i + this.cols] += strength * 0.5;
    this.rippleActive = true;
  }

  movePointer(x: number, y: number) {
    this.pointer.x = x / CELL;
    this.pointer.y = y / CELL;
    this.pointer.active = true;
  }

  clearPointer() {
    this.pointer.active = false;
  }

  /** Anything moving faster than the ambient drift wants a full frame rate. */
  get busy() {
    return this.rippleActive || this.paint.active || this.tide.active;
  }

  /** Distance from each cell to land, refreshed when the page scrolls. */
  private updateShore(scrollX: number, scrollY: number) {
    const key = scrollX * 100003 + scrollY;
    if (key === this.shoreScroll) return;
    this.shoreScroll = key;
    const { cols, rows, shore, islands } = this;
    for (let y = 0; y < rows; y++) {
      const docY = y * CELL + CELL / 2 + scrollY;
      for (let x = 0; x < cols; x++) {
        const d = islandDistance(islands, x * CELL + CELL / 2 + scrollX, docY);
        shore[y * cols + x] = d - CELL_SLACK;
      }
    }
  }

  private stepRipples(dt: number) {
    if (!this.rippleActive || this.still) return;
    this.rippleClock += dt;
    const interval = 1000 / RIPPLE_HZ;
    const { cols, rows, shore } = this;
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
          // Land holds the surface flat, so waves reflect off the letters.
          if (shore[i] < BEACH) {
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

  render(now: number, scrollX: number, scrollY: number, viewportHeight: number) {
    const { ctx, image, cols, rows, pixels, shore, water, bias, colors, marks } = this;
    if (!ctx || !image || !cols) return;

    if (this.start < 0) {
      this.start = now;
      this.last = now;
    }
    const dt = Math.min(100, Math.max(0, now - this.last));
    this.last = now;
    const elapsed = now - this.start;
    const amplitude = this.still ? 1 : easeOutCubic(Math.min(1, elapsed / this.rampMs));
    const settle = this.still ? 1 : easeOutCubic(clamp01((elapsed - SETTLE_DELAY_MS) / SETTLE_MS));
    if (!this.still) this.phase += lerp(this.speed.intro, this.speed.ambient, settle) * dt / 1000;
    const scrollProgress = clamp01(scrollY / Math.max(viewportHeight * 1.1, 1));
    const quiet = this.options.quietShare > 0;
    const presence = lerp(1, 0.8, settle) * lerp(1, 0.58, scrollProgress) * (quiet ? amplitude : 1);

    this.updateShore(scrollX, scrollY);
    this.stepRipples(dt);

    // The swell is three sines: one per column, one per row, one per
    // diagonal. Evaluate each once per frame instead of once per cell.
    const t = this.phase;
    for (let x = 0; x < cols; x++) this.colW[x] = Math.sin(x * WAVE_SCALE + t);
    for (let y = 0; y < rows; y++) this.rowW[y] = Math.cos(y * WAVE_SCALE * 0.7 - t * 0.4);
    for (let k = 0; k < cols + rows; k++) this.diagW[k] = Math.sin((k - rows) * WAVE_SCALE * 0.5 + t * 0.3);

    const { isDark, background, accent } = colors;
    const [bgR, bgG, bgB] = background;
    const bgPixel = pack(bgR, bgG, bgB);
    // Every cell is its color laid over the page background at some strength.
    const over = (r: number, g: number, b: number, a: number) =>
      pack(bgR + (r - bgR) * a, bgG + (g - bgG) * a, bgB + (b - bgB) * a);
    const chart = this.options.chart === true;
    if (chart) marks.fill(MARK_DOT);
    const pen = (chart ? (isDark ? CHART_PEN.dark : CHART_PEN.light) : (isDark ? 22 : 88)) * 2.55;
    const toward = isDark ? 255 : 0;
    const lightSign = isDark ? 1 : -1;
    const pointer = this.pointer;
    const lit = pointer.active && !this.still;
    const ripple = this.ripple;
    const rippling = this.rippleActive;

    const tide = this.tide;
    if (tide.active && tide.settled(now)) {
      tide.clear();
      this.oldBias = null;
      this.oldWater = null;
    }
    const radii = tide.active ? tide.radii(now) : null;
    const { oldBias, oldWater } = this;

    const paint = this.paint;
    const painting = !this.still && paint.active && paint.frame(now);

    for (let y = 0; y < rows; y++) {
      const rowW = this.rowW[y];
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const coast = shore[i];
        let wet = water[i];
        let lift = bias[i];
        let foam = false;
        if (radii) {
          // Behind the incoming front, the new shape; beyond the outgoing
          // one, what is left of the old; between them, bare page.
          const d = cellDistance(x, y, tide.x, tide.y, CELL);
          if (d >= radii.in) {
            if (d < radii.out || !oldWater || !oldBias) {
              pixels[i] = bgPixel;
              continue;
            }
            wet = oldWater[i];
            lift = oldBias[i];
          } else foam = d > radii.in - FOAM_BAND && (x + y) % 2 === 0;
        }
        if (!wet || coast < BEACH) {
          pixels[i] = bgPixel;
          continue;
        }

        let height = ((this.colW[x] + rowW + this.diagW[x - y + rows] + 3) / 6) * amplitude + lift * amplitude;
        if (rippling) height += ripple[i] * RIPPLE_GAIN * amplitude;
        height = clamp01(height);
        const shelf = smoothstep(BEACH, BEACH + this.shelf, coast);
        const value = (quiet ? 0.52 + height * 0.42 : height) * lerp(SHALLOW_HEIGHT, 1, shelf);
        const ink = presence * lerp(SHALLOW_INK, 1, shelf);

        // Where an accent is being poured, its wavefront draws over open
        // water as a dashed ring, and glints behind it take its color.
        if (painting) {
          paint.sample(x * CELL + CELL / 2, y * CELL + CELL / 2);
          const ring = paint.ring;
          if (ring && (x + y) % 3 !== 0 && shelf > 0.5) {
            pixels[i] = over(ring[0], ring[1], ring[2], presence * paint.strength);
            continue;
          }
        }

        // The incoming front breaks as a checkerboard of foam.
        if (foam && shelf > 0.3) {
          const light = pen + lightSign * 26 * 2.55;
          pixels[i] = over(light, light, light, ink);
          continue;
        }

        // Ripple crests catch the light.
        if (rippling && ripple[i] > RIPPLE_CREST && shelf > 0.3) {
          const k = clamp01((ripple[i] - RIPPLE_CREST) / (RIPPLE_CREST_FULL - RIPPLE_CREST));
          const light = pen + lightSign * k * 26 * 2.55;
          pixels[i] = over(light, light, light, ink);
          continue;
        }

        // Where a swell reaches the shore it breaks as a dashed coastline.
        // A chart lets the water thin out instead.
        if (!chart && coast < BEACH + CELL && height > 0.56 && (x + y) % 3 !== 0) {
          pixels[i] = over(pen, pen, pen, presence * 0.8);
          continue;
        }

        if (value < 0.45) {
          pixels[i] = bgPixel;
          continue;
        }

        let illumination = 0;
        if (lit) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          if (dx < FLASHLIGHT_RADIUS && dx > -FLASHLIGHT_RADIUS && dy < FLASHLIGHT_RADIUS && dy > -FLASHLIGHT_RADIUS) {
            illumination = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / FLASHLIGHT_RADIUS);
          }
        }

        let r: number;
        let g: number;
        let b: number;
        const contour = value > (chart ? CHART_FLOOR : 0.58)
          && (value * CONTOUR_DENSITY) % 1 < (chart ? CHART_THICKNESS : CONTOUR_THICKNESS);
        if (contour && (chart || (x + y) % 3 !== 0)) {
          const glint = painting ? paint.color : accent;
          const peak = chart ? cellNoise(x, y) < CHART_GLINT_SHARE : (x * y) % 13 === 0;
          if (value > 0.8 && peak && shelf === 1) {
            // Peak glints: the only place the accent appears whole.
            const shine = illumination * 0.25;
            r = glint[0] + (toward - glint[0]) * shine;
            g = glint[1] + (toward - glint[1]) * shine;
            b = glint[2] + (toward - glint[2]) * shine;
            if (chart) marks[i] = MARK_CELL;
          } else {
            // Neutral drafting-pen contour; on a chart the crests lean
            // toward the accent.
            r = g = b = pen + lightSign * illumination * 15 * 2.55;
            if (chart && value > CHART_CREST) {
              r += (glint[0] - r) * CHART_CREST_TINT;
              g += (glint[1] - g) * CHART_CREST_TINT;
              b += (glint[2] - b) * CHART_CREST_TINT;
            }
          }
        } else if (chart) {
          // Near land the body thins out cell by cell rather than stopping at
          // a line, so the text never sits in a cut-out box.
          if (value < CHART_BODY_FLOOR || cellNoise(y, x) > shelf * shelf) {
            pixels[i] = bgPixel;
            continue;
          }
          // The crest's body: a quiet checkerboard of whole cells.
          const [low, high] = isDark ? CHART_BODY.dark : CHART_BODY.light;
          const level = (x + y) % 2 === 0 ? high : low;
          r = g = b = (level + lightSign * illumination * 6) * 2.55;
          marks[i] = MARK_CELL;
        } else {
          // Checkerboard, sparser at the fading edge of each formation.
          const even = (x + y) % 2 === 0;
          const level = value < 0.52
            ? (even ? (isDark ? 4 : 100) : (isDark ? 10 : 96))
            : (even ? (isDark ? 10 : 96) : (isDark ? 15 : 92));
          r = g = b = (level + lightSign * illumination * 8) * 2.55;
        }

        // Where a hot pour passed, the water takes its color for a moment,
        // each cell as strongly as it stands out from the page: the pen's
        // lines take the full color, a quiet cell only a trace of it.
        if (painting && paint.wash > 0) {
          const tint = paint.color;
          const strength = Math.min(1, Math.max(Math.abs(r - bgR), Math.abs(g - bgG), Math.abs(b - bgB))
            / Math.max(1, Math.abs(pen - bgR)));
          r += (bgR + (tint[0] - bgR) * strength - r) * paint.wash;
          g += (bgG + (tint[1] - bgG) * strength - g) * paint.wash;
          b += (bgB + (tint[2] - bgB) * strength - b) * paint.wash;
        }

        pixels[i] = over(r, g, b, ink);
      }
    }

    const dots = this.dots;
    if (chart && dots) {
      // A drawn cell becomes the dot at its center, or the whole cell.
      dots.fill(bgPixel);
      const stride = cols * SUB;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const color = pixels[i];
          if (color === bgPixel) continue;
          const top = y * SUB * stride + x * SUB;
          if (marks[i] === MARK_CELL) {
            for (let row = 0; row < SUB; row++) dots.fill(color, top + row * stride, top + row * stride + SUB);
          } else {
            dots[top + stride + 1] = color;
          }
        }
      }
    }
    ctx.putImageData(image, 0, 0);
  }
}
