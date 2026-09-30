'use client';

// "If each pass preserves 95% of reasoning-relevant information, eight
// layers retain about 66% of the original signal. That sounds bad until you
// realize: the 34% you lost was the noise." Two runs of eight passes over the
// same hundred cells, 66 of signal and 34 of noise, each keeping 95% a pass.
// With the same prompt at every depth, what goes is chance: a third of the
// signal with it. With layer-aware prompts, only the noise goes. Same ratio,
// different instructions.

import { useEffect, useMemo, useRef, useState } from 'react';

import { rgba, useCanvasColors } from '../canvas-theme';
import {
  Choice,
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
  DRIFT_CELLS,
  DRIFT_KEPT,
  DRIFT_NOISE,
  PASSES,
  driftCells,
  type DriftCell,
  type DriftMode,
} from './figures';
import { clamp01, easeOut, monoFamily, prepare } from './lattice';

const MS_PER_PASS = 520;
const COLS = 10;
const GAP = 3;
const SIGNAL = DRIFT_CELLS - DRIFT_NOISE;

const PANELS: Array<{ mode: DriftMode; title: string; short: string }> = [
  { mode: 'same', title: 'Same prompt at every depth', short: 'Same prompt' },
  { mode: 'aware', title: 'Layer-aware prompts', short: 'Layer-aware' },
];

const PASS_OPTIONS = Array.from({ length: PASSES + 1 }, (_, pass) => ({
  value: String(pass),
  label: String(pass),
}));

interface Layout {
  width: number;
  height: number;
  wide: boolean;
  pitch: number;
  grids: Array<{ x: number; y: number; titleX: number }>;
  titleY: number;
  statsY: number;
  font: number;
}

function layoutFor(width: number, height: number): Layout {
  const wide = width >= 480;
  const font = wide ? 11 : 10;
  const titleY = 12;
  const gridTop = wide ? 30 : 26;
  const statsRoom = wide ? 44 : 40;
  const panelW = (width - (wide ? 24 : 12) * 3) / 2;
  const pitch = Math.max(
    6,
    Math.min(
      wide ? 15 : 13,
      Math.floor(panelW / COLS),
      Math.floor((height - gridTop - statsRoom) / COLS)
    )
  );
  const gridW = COLS * pitch - GAP;
  const grids = [0, 1].map((i) => {
    const panelX = (wide ? 24 : 12) * (i + 1) + panelW * i;
    const x = Math.round(panelX + (panelW - gridW) / 2);
    return { x, y: gridTop, titleX: x };
  });
  return {
    width,
    height,
    wide,
    pitch,
    grids,
    titleY,
    statsY: gridTop + COLS * pitch + 6,
    font,
  };
}

/** Cells of a pass go one after another, not all in one frame. */
const stagger = (index: number) => (((index * 37) % 23) / 23) * 0.4;

function counts(cells: DriftCell[], pass: number) {
  const alive = cells.filter((cell) => cell.dropped === 0 || cell.dropped > pass);
  const signal = alive.filter((cell) => !cell.noise).length;
  return { alive: alive.length, signal, noise: alive.length - signal };
}

export default function LossyDrift() {
  const colors = useCanvasColors();
  const reduced = useReducedMotion();
  const fontsReady = useFontsReady();
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const metaRef = useRef<HTMLSpanElement>(null);
  const layoutRef = useRef<Layout | null>(null);
  const box = useBox(canvasRef);
  const seen = useSeen(figureRef, 0.5);
  const [pass, setPass] = useState(0);
  const passRef = useRef(0);

  const runs = useMemo(() => PANELS.map((panel) => driftCells(panel.mode)), []);

  const draw = (value: number) => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout || !colors.ready) return;
    const ctx = prepare(canvas, layout.width, layout.height);
    if (!ctx) return;

    const { fg, accent, isDark } = colors;
    const { pitch } = layout;
    const size = pitch - GAP;
    const signalInk = rgba(accent, 1);
    const noiseInk = rgba(fg, isDark ? 0.34 : 0.3);
    const family = monoFamily(canvas);
    const reached = Math.floor(value + 1e-6);

    runs.forEach((cells, i) => {
      const grid = layout.grids[i];

      cells.forEach((cell, index) => {
        const x = grid.x + (index % COLS) * pitch;
        const y = grid.y + Math.floor(index / COLS) * pitch;
        const gone =
          cell.dropped === 0
            ? 0
            : easeOut(clamp01((value - (cell.dropped - 1) - stagger(index)) / 0.6));
        const ink = cell.noise ? noiseInk : signalInk;
        if (gone < 1) {
          ctx.globalAlpha = 1 - gone;
          ctx.fillStyle = ink;
          ctx.fillRect(x, y, size, size);
        }
        if (gone > 0) {
          // What a pass dropped stays as an outline, so the loss can be read.
          ctx.globalAlpha = gone * (cell.noise ? 0.9 : 0.75);
          ctx.strokeStyle = ink;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
        }
      });

      // Title and running counts.
      ctx.globalAlpha = 1;
      ctx.font = `${layout.font}px ${family}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = rgba(fg, 0.85);
      const panel = PANELS[i];
      ctx.fillText(layout.wide ? panel.title : panel.short, grid.titleX, layout.titleY);

      const now = counts(cells, reached);
      const lead = layout.font + 5;
      const line = (label: string, count: number, total: number, y: number, strong: boolean) => {
        ctx.fillStyle = rgba(fg, 0.5);
        ctx.fillText(label, grid.x, y);
        const labelWidth = ctx.measureText(label).width;
        ctx.fillStyle = strong ? rgba(accent, 1) : rgba(fg, 0.85);
        ctx.fillText(`${count}`, grid.x + labelWidth, y);
        const countWidth = ctx.measureText(`${count}`).width;
        ctx.fillStyle = rgba(fg, 0.5);
        ctx.fillText(` of ${total}`, grid.x + labelWidth + countWidth, y);
      };
      line(layout.wide ? 'signal kept ' : 'signal ', now.signal, SIGNAL, layout.statsY + 6, true);
      line(
        layout.wide ? 'noise kept ' : 'noise ',
        now.noise,
        DRIFT_NOISE,
        layout.statsY + 6 + lead,
        false
      );
    });

    if (metaRef.current) {
      metaRef.current.textContent = `${DRIFT_KEPT[Math.min(PASSES, reached)]} of ${DRIFT_CELLS} left`;
    }
    if (reached !== passRef.current) {
      passRef.current = reached;
      setPass(reached);
    }
  };

  const animator = useAnimator(draw, MS_PER_PASS);

  useEffect(() => {
    if (!box) return;
    layoutRef.current = layoutFor(box.width, box.height);
    animator.redraw();
  }, [animator, box, colors, fontsReady]);

  useEffect(() => {
    if (reduced) {
      animator.to(PASSES, true);
      return;
    }
    if (!seen) return;
    const timer = window.setTimeout(() => animator.to(PASSES), 350);
    return () => window.clearTimeout(timer);
  }, [animator, reduced, seen]);

  return (
    <Figure
      figureRef={figureRef}
      label={`Two runs of eight compression passes over the same 100 cells, ${SIGNAL} of signal and ${DRIFT_NOISE} of noise. Each pass keeps 95%, so both end with 66 cells. With the same prompt at every depth, 44 of the 66 signal cells survive. With layer-aware prompts, all 66 survive and the 34 cells lost are all noise.`}
      title="Eight passes, 95% kept each"
      meta={
        <span ref={metaRef}>
          {DRIFT_CELLS} of {DRIFT_CELLS} left
        </span>
      }
      footer={
        <>
          <span className="flex-1 basis-72" style={{ color: DIM }}>
            Both keep 95% a pass and end with 66 cells. The same prompt everywhere loses a third of
            the signal; layer-aware prompts lose only the noise.
          </span>
          <span className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="flex items-center gap-2 max-[479px]:w-full">
              <span style={{ color: FAINT }}>Pass</span>
              <Choice
                label="Show the cells after this many passes"
                options={PASS_OPTIONS}
                fill
                value={String(pass)}
                onChange={(next) => animator.to(Number(next), reduced, 2)}
              />
            </span>
            <Replay onClick={() => animator.run(0, PASSES)} />
          </span>
        </>
      }
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block h-[206px] w-full sm:h-[224px]" />
      <Legend />
    </Figure>
  );
}

function Legend() {
  const swatch = 'inline-block h-[9px] w-[9px] align-[-1px]';
  return (
    <div
      aria-hidden="true"
      className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-1 pt-1 text-[11px] sm:px-4"
      style={{ color: FAINT }}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className={swatch} style={{ backgroundColor: 'var(--accent-color)' }} />
        signal
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className={swatch}
          style={{ backgroundColor: 'color-mix(in srgb, hsl(var(--foreground)) 32%, transparent)' }}
        />
        noise
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={swatch} style={{ outline: `1px solid ${FAINT}`, outlineOffset: '-1px' }} />
        dropped
      </span>
    </div>
  );
}
