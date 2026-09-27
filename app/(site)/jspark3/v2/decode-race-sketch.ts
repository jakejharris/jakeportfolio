import type P5 from 'p5';
import type { RaceData, RaceLane, RaceStart } from './decode-race-data';

/** Colors and the mono font, read from decode-race.css so the canvas follows the page's palette. */
export interface RacePalette {
  bg: string;
  track: string;
  muted: string;
  text: string;
  gold: string;
  band: string;
  link: string;
  pulse: string;
  token: string;
  chassis: string;
  vent: string;
  placeholder: string;
  mono: string;
}

export interface RaceSketch {
  /** Run the race from the start, or the neutral placeholder motion when the start has no measured lane. */
  play(): void;
  /** Hold the current frame. */
  pause(): void;
  /** Draw the end state once and hold it: every lane at its low end, the band, the band text. */
  still(): void;
  /** Show another start from the beginning of its race. */
  show(key: string): void;
  resize(): void;
  remove(): void;
}

type Mode = 'play' | 'pause' | 'still';

/**
 * The race's timing, in seconds. These are design constants that set the pace of the picture; none is printed.
 * A lane's full width stands for scaleEnd tok/s over RUN seconds, so each lane grows at its measured rate and
 * ends at lo / scaleEnd of the width, where the page's own bar ends.
 */
const RUN = 6;
const REVEAL = 0.6;
const HOLD = 2.5;
const FADE = 0.7;
const CYCLE = RUN + REVEAL + HOLD + FADE;
const FLIGHT = 0.5;
const SHIMMER = 4.5;
/** A frame longer than this (a stalled tab) is not caught up in one step. */
const MAX_DT = 0.25;
/** Live token particles, fewer on narrow screens. Growth never depends on them. */
const PARTICLES_WIDE = 320;
const PARTICLES_NARROW = 160;
/** Spawns per lane per frame, so a very long frame cannot flood the pool. */
const SPAWN_BURST = 48;

interface LaneBox {
  lane: RaceLane;
  /** The top of each strand. */
  strands: number[];
  strandH: number;
  /** The middles of the label line and of the row end's text. */
  textY: number;
  bandY: number;
  /** The label's width, measured once per layout. */
  labelW: number;
}

interface Layout {
  w: number;
  h: number;
  narrow: boolean;
  x0: number;
  x1: number;
  bandX: number;
  lanes: LaneBox[];
  nodes: { x: number; y: number }[];
  node: { w: number; h: number };
  emit: { x: number; y: number };
  font: string;
  bold: string;
  /** Width of the placeholder mark's box, measured once per layout. */
  markW: number;
}

const LEGS: ReadonlyArray<[number, number, number]> = [
  // from, to, period in seconds: each leg carries a pulse both ways, on its own clock.
  [1, 0, 1.9],
  [2, 0, 2.3],
  [1, 2, 2.9],
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function createDecodeRace(
  P5Ctor: typeof P5,
  host: HTMLElement,
  options: { data: RaceData; startKey: string; palette: RacePalette },
): RaceSketch {
  const { data, palette } = options;
  const scaleEnd = data.scaleEnd;
  let current: RaceStart | null = data.starts.find(entry => entry.key === options.startKey) ?? data.initial;
  let mode: Mode = 'pause';
  let ready = false;
  let layout: Layout | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let p: P5 | null = null;

  // Clocks: `clock` drives the illustrative pulses and shimmer, `race` the race itself.
  let last = 0;
  let clock = 0;
  let race = 0;
  let accrued: number[] = [];
  let turns: number[] = [];

  // Particles, pooled as flat arrays: start point, age, lane and strand.
  const cap = () => (layout?.narrow ? PARTICLES_NARROW : PARTICLES_WIDE);
  const px = new Float32Array(PARTICLES_WIDE);
  const py = new Float32Array(PARTICLES_WIDE);
  const age = new Float32Array(PARTICLES_WIDE);
  const pl = new Uint8Array(PARTICLES_WIDE);
  const ps = new Uint8Array(PARTICLES_WIDE);
  const at = new Float32Array(PARTICLES_WIDE * 2);
  let live = 0;

  function resetRace() {
    race = 0;
    live = 0;
    accrued = current ? current.lanes.map(() => 0) : [];
    turns = current ? current.lanes.map(() => 0) : [];
  }

  function measure(w: number, h: number): Layout {
    const narrow = w < 600;
    const pad = narrow ? 12 : 22;
    const glyphW = narrow ? 58 : 150;
    const bandW = narrow ? 0 : 150;
    // Each lane's label sits above its strands, so the tokens' flight from the glyph crosses no text.
    const x0 = pad + glyphW + (narrow ? 14 : 44);
    const x1 = w - pad - bandW;
    const lanes = current?.lanes ?? [];
    const top = pad;
    const rowH = (h - pad * 2) / Math.max(lanes.length, 1);
    const boxes = lanes.map((lane, index) => {
      const rowTop = top + index * rowH;
      const room = rowH - 28;
      let strandH = narrow ? 2 : 2.5;
      let gap = narrow ? 1.2 : 1.5;
      const bundle = lane.streams * strandH + (lane.streams - 1) * gap;
      if (bundle > room) {
        const shrink = room / bundle;
        strandH *= shrink;
        gap *= shrink;
      }
      const height = lane.streams * strandH + (lane.streams - 1) * gap;
      const bundleTop = rowTop + 22 + (room - height) / 2;
      const textY = rowTop + 10;
      return {
        lane,
        strandH,
        strands: Array.from({ length: lane.streams }, (_, k) => bundleTop + k * (strandH + gap)),
        textY,
        bandY: narrow ? textY : bundleTop + height / 2,
        labelW: 0,
      };
    });
    const cy = h / 2;
    const node = narrow ? { w: 24, h: 16 } : { w: 46, h: 30 };
    const spread = Math.min(narrow ? 54 : 70, h / 2 - pad - node.h);
    const nodes = narrow
      ? [{ x: pad + glyphW - node.w / 2, y: cy }, { x: pad + node.w / 2, y: cy - spread }, { x: pad + node.w / 2, y: cy + spread }]
      : [{ x: pad + glyphW - node.w / 2 - 4, y: cy }, { x: pad + node.w / 2 + 4, y: cy - spread }, { x: pad + node.w / 2 + 4, y: cy + spread }];
    const size = narrow ? 12 : 13;
    const layoutNext: Layout = {
      w, h, narrow, x0, x1,
      bandX: w - pad,
      lanes: boxes,
      nodes,
      node,
      emit: { x: nodes[0].x + node.w / 2, y: cy },
      font: `500 ${size}px ${palette.mono}`,
      bold: `600 ${size + 1}px ${palette.mono}`,
      markW: 0,
    };
    if (ctx) {
      ctx.font = layoutNext.font;
      for (const box of boxes) box.labelW = ctx.measureText(box.lane.label).width;
      ctx.font = layoutNext.bold;
      layoutNext.markW = ctx.measureText(boxes[0]?.lane.band ?? '').width + 10;
    }
    return layoutNext;
  }

  /** Where a lane's strands end at race time `t`: lo tok/s for t seconds, on a width of scaleEnd tok/s for RUN seconds. */
  function reach(lane: RaceLane, t: number) {
    if (!layout || lane.lo === null || !scaleEnd) return 0;
    return ((layout.x1 - layout.x0) * lane.lo * Math.min(t, RUN)) / (scaleEnd * RUN);
  }

  function drawGlyph(c: CanvasRenderingContext2D, L: Layout, moving: boolean) {
    c.lineWidth = L.narrow ? 1.5 : 2;
    c.strokeStyle = palette.link;
    c.beginPath();
    for (const [from, to] of LEGS) {
      c.moveTo(L.nodes[from].x, L.nodes[from].y);
      c.lineTo(L.nodes[to].x, L.nodes[to].y);
    }
    c.stroke();
    if (moving) {
      // Illustrative fabric pulses, both ways on every leg, like the hero's. They carry no data.
      const r = L.narrow ? 1.6 : 2.2;
      c.fillStyle = palette.pulse;
      c.beginPath();
      for (const [from, to, period] of LEGS) {
        const a = L.nodes[from];
        const b = L.nodes[to];
        for (const phase of [0, 0.5]) {
          const f = (clock / period + phase) % 1;
          const k = phase ? 1 - f : f;
          c.rect(a.x + (b.x - a.x) * k - r, a.y + (b.y - a.y) * k - r, r * 2, r * 2);
        }
      }
      c.fill();
    }
    const { w, h } = L.node;
    for (const [index, at] of L.nodes.entries()) {
      const x = at.x - w / 2;
      const y = at.y - h / 2;
      c.fillStyle = palette.chassis;
      c.fillRect(x, y, w, h);
      c.fillStyle = palette.vent;
      c.fillRect(x + w * 0.1, y + h * 0.28, w * 0.62, h * 0.5);
      c.fillStyle = index === 0 && moving ? palette.pulse : palette.muted;
      c.fillRect(x + w * 0.8, y + h * 0.42, Math.max(2, w * 0.07), Math.max(2, w * 0.07));
    }
  }

  function strandsPath(c: CanvasRenderingContext2D, from: (box: LaneBox) => number, to: (box: LaneBox) => number) {
    c.beginPath();
    for (const box of layout!.lanes) {
      const a = from(box);
      const b = to(box);
      if (b - a <= 0) continue;
      for (const y of box.strands) c.rect(a, y, b - a, box.strandH);
    }
  }

  function dashedLanes(c: CanvasRenderingContext2D, L: Layout, only?: (box: LaneBox) => boolean) {
    c.setLineDash(L.narrow ? [4, 4] : [6, 5]);
    c.lineWidth = 1;
    c.beginPath();
    for (const box of L.lanes) {
      if (only && !only(box)) continue;
      for (const y of box.strands) {
        // On the pixel grid, so a one-pixel dash stays crisp.
        const mid = Math.round(y + box.strandH / 2) + 0.5;
        c.moveTo(L.x0, mid);
        c.lineTo(L.x1, mid);
      }
    }
    c.stroke();
    c.setLineDash([]);
  }

  /** Lane labels, drawn over a patch of the panel so the tokens pass behind them. */
  function drawLabels(c: CanvasRenderingContext2D, L: Layout) {
    c.fillStyle = palette.bg;
    for (const box of L.lanes) c.fillRect(L.x0 - 4, box.textY - 9, box.labelW + 8, 18);
    c.font = L.font;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillStyle = palette.text;
    for (const box of L.lanes) c.fillText(box.lane.label, L.x0, box.textY);
  }

  /** The row end as the page prints it: the band text, or the unmeasured mark. */
  function drawBands(c: CanvasRenderingContext2D, L: Layout, alpha: number, placeholder: boolean) {
    c.font = L.bold;
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    for (const box of L.lanes) {
      const unmeasured = box.lane.lo === null;
      c.globalAlpha = unmeasured ? 1 : alpha;
      if (placeholder) {
        // The page's placeholder mark: amber, with a dashed edge.
        c.strokeStyle = palette.placeholder;
        c.setLineDash([3, 2]);
        c.strokeRect(L.bandX - L.markW + 0.5, box.bandY - 10.5, L.markW - 1, 21);
        c.setLineDash([]);
        c.fillStyle = palette.text;
        c.fillText(box.lane.band, L.bandX - 5, box.bandY + 1);
      } else {
        c.fillStyle = unmeasured ? palette.muted : palette.gold;
        c.fillText(box.lane.band, L.bandX, box.bandY + 1);
      }
    }
    c.globalAlpha = 1;
  }

  function spawn(dt: number, L: Layout) {
    if (!current) return;
    const limit = cap();
    for (const [index, box] of L.lanes.entries()) {
      const { lo, streams } = box.lane;
      if (lo === null) continue;
      // The lane's combined rate, dealt across its streams in turn.
      accrued[index] += lo * dt;
      const due = Math.min(Math.floor(accrued[index]), SPAWN_BURST);
      accrued[index] -= Math.floor(accrued[index]);
      for (let n = 0; n < due && live < limit; n++) {
        px[live] = L.emit.x;
        py[live] = L.emit.y + (Math.random() - 0.5) * L.node.h * 0.5;
        age[live] = Math.random() * dt;
        pl[live] = index;
        ps[live] = turns[index]++ % streams;
        live++;
      }
    }
  }

  function drawParticles(c: CanvasRenderingContext2D, L: Layout, dt: number) {
    const halo = L.narrow ? 4 : 5;
    const core = L.narrow ? 2 : 2.4;
    for (let i = 0; i < live; i++) {
      age[i] += dt;
      if (age[i] >= FLIGHT) {
        // Arrived: the last live particle takes this slot.
        live--;
        px[i] = px[live]; py[i] = py[live]; age[i] = age[live]; pl[i] = pl[live]; ps[i] = ps[live];
        i--;
        continue;
      }
    }
    for (let i = 0; i < live; i++) {
      const box = L.lanes[pl[i]];
      const tx = L.x0 + reach(box.lane, race);
      const ty = box.strands[ps[i]] + box.strandH / 2;
      const t = age[i] / FLIGHT;
      at[i * 2] = px[i] + (tx - px[i]) * easeOut(t);
      at[i * 2 + 1] = py[i] + (ty - py[i]) * easeOut(Math.min(1, t * 1.7));
    }
    c.fillStyle = palette.pulse;
    c.globalAlpha = 0.22;
    c.beginPath();
    for (let i = 0; i < live; i++) c.rect(at[i * 2] - halo / 2, at[i * 2 + 1] - halo / 2, halo, halo);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = palette.token;
    c.beginPath();
    for (let i = 0; i < live; i++) c.rect(at[i * 2] - core / 2, at[i * 2 + 1] - core / 2, core, core);
    c.fill();
  }

  function frame(dt: number) {
    const c = ctx;
    const L = layout;
    if (!c || !L || !p) return;
    const density = p.pixelDensity();
    c.setTransform(density, 0, 0, density, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = palette.bg;
    c.fillRect(0, 0, L.w, L.h);
    const still = mode === 'still';
    drawGlyph(c, L, !still);

    // No measured lane: dashed lanes, one neutral shimmer at the same place on every lane, and the mark.
    if (!current?.measured || !scaleEnd) {
      c.strokeStyle = palette.muted;
      c.globalAlpha = 0.45;
      dashedLanes(c, L);
      c.globalAlpha = 1;
      if (!still) {
        const span = L.x1 - L.x0 + 160;
        const x = L.x0 - 80 + ((clock % SHIMMER) / SHIMMER) * span;
        c.save();
        c.beginPath();
        c.rect(x - 56, 0, 112, L.h);
        c.clip();
        c.strokeStyle = palette.gold;
        dashedLanes(c, L);
        c.restore();
      }
      drawLabels(c, L);
      drawBands(c, L, 1, true);
      return;
    }

    const t = still ? RUN + REVEAL : race;
    const reveal = still ? 1 : clamp01((t - RUN) / REVEAL);
    const fade = still ? 1 : 1 - clamp01((t - RUN - REVEAL - HOLD) / FADE);

    // The empty track under every strand, and dashed lanes where a row was not measured.
    c.fillStyle = palette.track;
    strandsPath(c, () => L.x0, box => (box.lane.lo === null ? L.x0 : L.x1));
    c.fill();
    c.strokeStyle = palette.muted;
    c.globalAlpha = 0.45;
    dashedLanes(c, L, box => box.lane.lo === null);

    // The range across sweeps, lo to hi, as the page's lighter bar, with its high end marked.
    const high = (box: LaneBox) => (box.lane.hi === null ? 0 : L.x0 + ((L.x1 - L.x0) * box.lane.hi) / scaleEnd);
    c.globalAlpha = reveal * fade;
    c.fillStyle = palette.band;
    strandsPath(c, box => L.x0 + reach(box.lane, RUN), high);
    c.fill();
    c.fillStyle = palette.token;
    strandsPath(c, box => high(box) - 1.5, high);
    c.fill();

    // The solid run to lo.
    c.globalAlpha = fade;
    c.fillStyle = palette.gold;
    strandsPath(c, () => L.x0, box => L.x0 + reach(box.lane, t));
    c.fill();

    if (!still && t < RUN) {
      c.fillStyle = palette.token;
      strandsPath(c, box => L.x0 + reach(box.lane, t) - 3, box => L.x0 + reach(box.lane, t));
      c.fill();
      spawn(dt, L);
    }
    c.globalAlpha = 1;
    if (!still && live) drawParticles(c, L, dt);
    drawLabels(c, L);
    drawBands(c, L, reveal * fade, false);
  }

  const instance = new P5Ctor((sketch: P5) => {
    p = sketch;
    sketch.setup = () => {
      sketch.createCanvas(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1));
      sketch.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
      ctx = sketch.drawingContext as CanvasRenderingContext2D;
      layout = measure(sketch.width, sketch.height);
      resetRace();
      ready = true;
      apply();
    };
    sketch.draw = () => {
      const now = performance.now();
      const dt = mode === 'play' ? Math.min((now - last) / 1000, MAX_DT) : 0;
      last = now;
      clock += dt;
      if (mode === 'play') {
        race += dt;
        if (race >= CYCLE) resetRace();
      }
      frame(dt);
    };
  }, host);

  function apply() {
    if (!ready || !p) return;
    if (mode === 'play') {
      last = performance.now();
      p.loop();
    } else {
      p.noLoop();
      if (mode === 'still') p.redraw();
    }
  }

  return {
    play() {
      mode = 'play';
      resetRace();
      apply();
    },
    pause() {
      mode = 'pause';
      apply();
    },
    still() {
      mode = 'still';
      live = 0;
      apply();
    },
    show(key) {
      current = data.starts.find(entry => entry.key === key) ?? current;
      if (layout) layout = measure(layout.w, layout.h);
      resetRace();
      if (ready && p && mode !== 'play') p.redraw();
    },
    resize() {
      if (!ready || !p) return;
      p.resizeCanvas(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1), true);
      layout = measure(p.width, p.height);
      resetRace();
      if (mode !== 'play') p.redraw();
    },
    remove() {
      ready = false;
      instance.remove();
    },
  };
}
