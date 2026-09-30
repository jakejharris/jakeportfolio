'use client';

// "A graduated reading protocol (tree → rg → sed -n) uses about 670 tokens
// where reading all relevant files would cost 15,000+." The relevant files
// are drawn as strips of cells, one cell per 25 tokens, two lines of code
// each. Reading every file lights all 600 of them. The protocol lights 27:
// the map from tree, the five lines rg matches, and the lines sed prints
// around the definition. Both reads fill a context bar underneath.

import { useEffect, useRef, useState } from 'react';

import { rgba, useCanvasColors } from '../canvas-theme';
import {
  ACCENT,
  DIM,
  FAINT,
  Figure,
  Replay,
  useAnimator,
  useBox,
  useFontsReady,
  useReducedMotion,
  useSeen,
} from './figure';
import {
  FULL_READ_TOKENS,
  GRADUATED_TOKENS,
  MATCHES,
  REPO,
  SED_LINES,
  STEPS,
  TOKENS_PER_READ_CELL,
  cellOfLine,
  savedShare,
  type StepId,
} from './figures';
import { easeOut, lerp, monoFamily, prepare, span } from './lattice';

const STORY_MS = 7200;
const CAT: [number, number] = [0.03, 0.3];
const CLEAR: [number, number] = [0.33, 0.42];
const PHASES: Record<StepId, [number, number]> = {
  tree: [0.45, 0.55],
  rg: [0.58, 0.7],
  sed: [0.73, 0.9],
};

const TOTAL_CELLS = REPO.reduce((sum, file) => sum + file.cells, 0);
const STEP_CELLS = STEPS.map((step) => step.cells);
const GRADUATED_CELLS = STEP_CELLS.reduce((sum, cells) => sum + cells, 0);
const SED_FILE = 0;
const SED_CELLS: [number, number] = [cellOfLine(SED_LINES[0]), cellOfLine(SED_LINES[1])];
const HITS = MATCHES.map(([file, line]) => ({ file, cell: cellOfLine(line) }));

const fmt = (tokens: number) => tokens.toLocaleString('en-US');
const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1);

interface Strip {
  x: number;
  y: number;
  name: string;
  nameX: number;
  nameY: number;
  /** Where this file's cells start in the order `cat` reads them. */
  offset: number;
  cells: number;
}

interface Bar {
  x: number;
  y: number;
  rows: number;
  cols: number;
  labelX: number;
  labelY: number;
  countX: number;
  countY: number;
  countAlign: CanvasTextAlign;
}

interface Layout {
  width: number;
  height: number;
  wide: boolean;
  pitch: number;
  cell: number;
  cols: number;
  strips: Strip[];
  bars: [Bar, Bar];
  font: number;
}

const BAR_PITCH = 3;

function barShape(room: number) {
  const cols = Math.floor((room + 1) / BAR_PITCH);
  const rows = Math.ceil(TOTAL_CELLS / cols);
  return { rows, cols: Math.ceil(TOTAL_CELLS / rows) };
}

function layoutFor(width: number, height: number): Layout {
  // Wide figures set full paths and token counts beside the lattice:
  // 168 + 299 + 100 px, and a margin each side.
  const wide = width >= 592;
  const cols = wide ? 50 : 40;
  const nameW = wide ? 168 : 84;
  const countW = wide ? 100 : 0;
  // The smallest phones get a finer lattice, so the strips still fit.
  const pitch = wide ? 6 : nameW + cols * 5 + 23 <= width ? 5 : 4;
  const stripW = cols * pitch - 1;
  const contentW = nameW + stripW + countW;
  const left = Math.max(12, Math.round((width - contentW) / 2));
  const stripX = left + nameW;

  const strips: Strip[] = [];
  let y = wide ? 18 : 16;
  let offset = 0;
  for (const file of REPO) {
    const rows = Math.ceil(file.cells / cols);
    strips.push({
      x: stripX,
      y,
      name: wide ? file.path : basename(file.path),
      nameX: left,
      nameY: y + (pitch - 1) / 2,
      offset,
      cells: file.cells,
    });
    offset += file.cells;
    y += rows * pitch + (wide ? 10 : 8);
  }

  const shape = barShape(stripW);
  const barH = shape.rows * BAR_PITCH - 1;
  const bars = [0, 1].map((i): Bar => {
    if (wide) {
      const barY = y + 12 + i * (barH + 14);
      return {
        x: stripX,
        y: barY,
        ...shape,
        labelX: left,
        labelY: barY + barH / 2,
        countX: stripX + stripW + 12,
        countY: barY + barH / 2,
        countAlign: 'left',
      };
    }
    const barY = y + 16 + i * (barH + 22);
    return {
      x: stripX,
      y: barY,
      ...shape,
      labelX: left,
      labelY: barY + barH / 2,
      countX: stripX + stripW,
      countY: barY - 8,
      countAlign: 'right',
    };
  }) as [Bar, Bar];

  return {
    width,
    height,
    wide,
    pitch,
    cell: pitch - 1,
    cols,
    strips,
    bars,
    font: wide ? 11 : 10,
  };
}

function cellIn(strip: Strip, index: number, layout: Layout) {
  return {
    x: strip.x + (index % layout.cols) * layout.pitch,
    y: strip.y + Math.floor(index / layout.cols) * layout.pitch,
  };
}

/** Bars fill column by column, so they grow left to right. */
function slotIn(bar: Bar, index: number) {
  return {
    x: bar.x + Math.floor(index / bar.rows) * BAR_PITCH,
    y: bar.y + (index % bar.rows) * BAR_PITCH,
  };
}

/** Which step of the protocol is playing at `value`, if any. */
function stepAt(value: number): StepId | null {
  for (const step of STEPS) {
    const [start, end] = PHASES[step.id];
    if (value >= start && value < end + 0.02) return step.id;
  }
  return null;
}

export default function TokenCompression() {
  const colors = useCanvasColors();
  const reduced = useReducedMotion();
  const fontsReady = useFontsReady();
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepRefs = useRef<Partial<Record<StepId, HTMLButtonElement | null>>>({});
  const layoutRef = useRef<Layout | null>(null);
  const box = useBox(canvasRef);
  const seen = useSeen(figureRef, 0.5);
  const [focus, setFocus] = useState<StepId | null>(null);
  const focusRef = useRef<StepId | null>(null);

  const markStep = (active: StepId | null, value: number) => {
    for (const step of STEPS) {
      const element = stepRefs.current[step.id];
      if (!element) continue;
      // A step is lit while it plays and once it has played.
      const done = value >= PHASES[step.id][0];
      element.dataset.state = active === step.id ? 'active' : done ? 'done' : 'waiting';
    }
  };

  const draw = (value: number) => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout || !colors.ready) return;
    const ctx = prepare(canvas, layout.width, layout.height);
    if (!ctx) return;

    const { fg, accent, isDark } = colors;
    const { cell } = layout;
    const selected = focusRef.current;
    const dim = (step: StepId) => (selected && selected !== step ? 0.25 : 1);

    const catRead = Math.floor(span(value, ...CAT) * TOTAL_CELLS);
    const cleared = easeOut(span(value, ...CLEAR));
    const phase = (step: StepId) => span(value, ...PHASES[step]);
    const tree = phase('tree');
    const rg = phase('rg');
    const sed = phase('sed');

    const faint = rgba(fg, isDark ? 0.14 : 0.12);
    const read = rgba(fg, isDark ? 0.5 : 0.42);
    const ink = rgba(accent, 1);

    // The files: every cell faint until something reads it.
    const catAlpha = 1 - cleared;
    for (const strip of layout.strips) {
      for (let i = 0; i < strip.cells; i++) {
        const { x, y } = cellIn(strip, i, layout);
        ctx.globalAlpha = selected ? 0.6 : 1;
        ctx.fillStyle = faint;
        ctx.fillRect(x, y, cell, cell);
        if (strip.offset + i < catRead && catAlpha > 0) {
          ctx.globalAlpha = catAlpha;
          ctx.fillStyle = read;
          ctx.fillRect(x, y, cell, cell);
        }
      }
    }

    // rg: the five matching lines, one after another.
    ctx.fillStyle = ink;
    HITS.forEach((hit, k) => {
      const shown = easeOut(span(rg, k / HITS.length, (k + 0.6) / HITS.length));
      if (shown <= 0) return;
      const { x, y } = cellIn(layout.strips[hit.file], hit.cell, layout);
      ctx.globalAlpha = shown * dim('rg');
      ctx.fillRect(x, y, cell, cell);
      if (selected === 'rg') {
        ctx.strokeStyle = rgba(accent, 0.6);
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 2.5, y - 2.5, cell + 5, cell + 5);
      }
    });

    // sed: lines 138 to 160 of user.py, in order.
    const sedCount = SED_CELLS[1] - SED_CELLS[0] + 1;
    for (let j = 0; j < sedCount; j++) {
      const shown = easeOut(span(sed, j / sedCount, (j + 2) / sedCount));
      if (shown <= 0) continue;
      const { x, y } = cellIn(layout.strips[SED_FILE], SED_CELLS[0] + j, layout);
      ctx.globalAlpha = shown * dim('sed');
      ctx.fillStyle = ink;
      ctx.fillRect(x, y, cell, cell);
    }

    // Names: tree reads them, and nothing else.
    const family = monoFamily(canvas);
    ctx.font = `${layout.font}px ${family}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const named = easeOut(tree);
    for (const strip of layout.strips) {
      ctx.globalAlpha = dim('tree');
      ctx.fillStyle = rgba(fg, lerp(0.45, 0.85, named));
      ctx.fillText(strip.name, strip.nameX, strip.nameY);
    }

    // Two context bars, 600 slots each: every file, and the protocol.
    const [catBar, stepBar] = layout.bars;
    const dot = rgba(fg, isDark ? 0.24 : 0.22);
    const drawSlots = (
      bar: Bar,
      filled: (index: number) => string | null,
      alpha: (index: number) => number
    ) => {
      for (let i = 0; i < TOTAL_CELLS; i++) {
        const { x, y } = slotIn(bar, i);
        const color = filled(i);
        if (color) {
          ctx.globalAlpha = alpha(i);
          ctx.fillStyle = color;
          ctx.fillRect(x, y, BAR_PITCH - 1, BAR_PITCH - 1);
        } else {
          ctx.globalAlpha = selected ? 0.6 : 1;
          ctx.fillStyle = dot;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    };
    drawSlots(
      catBar,
      (i) => (i < catRead ? read : null),
      () => (selected ? 0.4 : 1)
    );
    const stepCounts = [
      Math.round(tree * STEP_CELLS[0]),
      Math.round(rg * STEP_CELLS[1]),
      Math.round(sed * STEP_CELLS[2]),
    ];
    const stepOf = (i: number) =>
      i < STEP_CELLS[0] ? 0 : i < STEP_CELLS[0] + STEP_CELLS[1] ? 1 : 2;
    const starts = [0, STEP_CELLS[0], STEP_CELLS[0] + STEP_CELLS[1]];
    drawSlots(
      stepBar,
      (i) => {
        if (i >= GRADUATED_CELLS) return null;
        const s = stepOf(i);
        if (i - starts[s] >= stepCounts[s]) return null;
        return s === 0 ? rgba(fg, 0.75) : ink;
      },
      (i) => (i < GRADUATED_CELLS ? dim(STEPS[stepOf(i)].id) : 1)
    );

    // Bar labels and running totals.
    const litSteps = stepCounts.reduce((sum, count) => sum + count, 0);
    const bars: Array<[Bar, string, string, boolean]> = [
      [catBar, 'cat every file', `${fmt(catRead * TOKENS_PER_READ_CELL)} tokens`, catRead > 0],
      [
        stepBar,
        layout.wide ? 'tree → rg → sed -n' : 'tree → rg → sed',
        `${fmt(Math.round((litSteps / GRADUATED_CELLS) * GRADUATED_TOKENS))} tokens`,
        litSteps > 0,
      ],
    ];
    for (const [bar, label, count, started] of bars) {
      ctx.globalAlpha = selected ? 0.6 : 1;
      ctx.textAlign = 'left';
      ctx.fillStyle = rgba(fg, 0.85);
      ctx.fillText(label, bar.labelX, layout.wide ? bar.labelY : bar.countY);
      if (started) {
        ctx.textAlign = bar.countAlign;
        ctx.fillStyle = rgba(fg, 0.6);
        ctx.fillText(count, bar.countX, bar.countY);
      }
    }
    ctx.globalAlpha = 1;

    if (!selected) markStep(stepAt(value), value);
  };

  const animator = useAnimator(draw, STORY_MS);

  useEffect(() => {
    if (!box) return;
    layoutRef.current = layoutFor(box.width, box.height);
    animator.redraw();
  }, [animator, box, colors, fontsReady]);

  useEffect(() => {
    if (reduced) {
      animator.to(1, true);
      return;
    }
    if (!seen) return;
    const timer = window.setTimeout(() => animator.to(1), 300);
    return () => window.clearTimeout(timer);
  }, [animator, reduced, seen]);

  useEffect(() => {
    focusRef.current = focus;
    if (focus) {
      for (const step of STEPS) {
        const element = stepRefs.current[step.id];
        if (element) element.dataset.state = step.id === focus ? 'active' : 'done';
      }
    }
    animator.redraw();
  }, [animator, focus]);

  return (
    <Figure
      figureRef={figureRef}
      label={`Six relevant files drawn as cells, one cell per 25 tokens. Reading every file costs ${fmt(FULL_READ_TOKENS)} tokens. The graduated protocol, tree then rg then sed -n, reads the map, five matching lines and the lines around line 142 of user.py: about ${GRADUATED_TOKENS} tokens, ${savedShare()}% less.`}
      title="Reading for one bug"
      meta={`1 cell = ${TOKENS_PER_READ_CELL} tokens`}
      footer={
        <>
          <div
            role="group"
            aria-label="The graduated reading protocol"
            className="-mx-2 basis-full"
          >
            {STEPS.map((step) => (
              <button
                key={step.id}
                ref={(element) => {
                  stepRefs.current[step.id] = element;
                }}
                type="button"
                aria-pressed={focus === step.id}
                onClick={() => setFocus((current) => (current === step.id ? null : step.id))}
                data-state="waiting"
                className="group flex min-h-8 w-full flex-col gap-x-4 rounded-sm sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between px-2 py-1.5 text-left text-[11px] leading-snug transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-[color:var(--accent-color)] aria-pressed:bg-[color-mix(in_srgb,var(--accent-color)_14%,transparent)]"
              >
                <span className="break-all text-foreground/45 transition-colors duration-200 group-data-[state=active]:text-foreground group-data-[state=done]:text-foreground/85">
                  <span style={{ color: FAINT }}>$ </span>
                  {step.command}
                </span>
                <span className="text-foreground/35 transition-colors duration-200 group-data-[state=active]:text-[color:var(--accent-color)] group-data-[state=done]:text-foreground/55">
                  {step.what}
                </span>
              </button>
            ))}
          </div>
          <span className="flex-1 basis-56" style={{ color: DIM }}>
            About {GRADUATED_TOKENS} tokens instead of {fmt(FULL_READ_TOKENS)}:{' '}
            <span style={{ color: ACCENT }}>{savedShare()}% less</span>, and only the lines it
            needs.
          </span>
          <Replay onClick={() => animator.run(0, 1)} />
        </>
      }
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block h-[244px] w-full" />
    </Figure>
  );
}
