'use client';

// "Context is the bottleneck, not intelligence." A 500 line error log, drawn
// the way an editor's minimap draws a file. Fifteen of its lines explain the
// bug; the rest is health checks and cache chatter. The noise is erased the
// way grep reads a file, top to bottom, and the fifteen lines gather and come
// up to reading size: a migration renamed a field and the code still reads
// the old name. Same model, same question; only the context changed.

import { useEffect, useMemo, useRef, useState } from 'react';

import { rgba, useCanvasColors } from '../canvas-theme';
import {
  ACCENT,
  Choice,
  FAINT,
  Figure,
  Replay,
  useAnimator,
  useBox,
  useFontsReady,
  useReducedMotion,
  useSeen,
} from './figure';
import { buildLog, LOG_LENGTH, RELEVANT_COUNT, signalShare, type LogLine } from './figures';
import { clamp01, easeInOut, lerp, mixRgb, monoFamily, prepare, seeded, span } from './lattice';

type Mode = 'log' | 'grep';

const STORY_MS = 4600;
// Parts of the story, as fractions of it.
const ERASE: [number, number] = [0.1, 0.52];
const GATHER: [number, number] = [0.54, 0.74];
const RESOLVE: [number, number] = [0.74, 0.96];
// How much of the erase one line takes to go, and how its words trail.
const LINE_FADE = 0.06;
const WORD_STAGGER = 0.004;
// Characters of line number and space before each line's text.
const GUTTER = 5;
// Characters that fill a minimap column.
const COLUMN_CHARS = 58;

interface Line {
  log: LogLine;
  label: string;
  /** Words, as [first character, length]. */
  words: Array<[number, number]>;
  /** A little randomness in when the line is erased. */
  jitter: number;
  /** Place among the fifteen, top to bottom. */
  order: number;
}

function labelOf(line: LogLine) {
  const gutter = String(line.n).padStart(3, ' ');
  return line.level ? `${gutter}  ${line.level.padEnd(5)} ${line.text}` : `${gutter}  ${line.text}`;
}

function wordsOf(label: string) {
  const words: Array<[number, number]> = [];
  for (const match of label.matchAll(/\S+/g)) words.push([match.index ?? 0, match[0].length]);
  return words;
}

interface Layout {
  width: number;
  height: number;
  cols: number;
  perCol: number;
  pitch: number;
  bar: number;
  top: number;
  colX: number[];
  colWidth: number;
  charWidth: number;
  /** The fifteen lines at reading size. */
  font: number;
  advance: number;
  leading: number;
  blockX: number;
  blockY: number;
  /** The fifteen lines gathered, still at minimap size. */
  gatherY: number;
}

/**
 * The largest size, in half pixels up to `max`, at which `chars` characters
 * of the mono face fit in `room`, and the advance of one character at that
 * size. Measured at each size, because small sizes round their advances.
 */
function fitType(
  ctx: CanvasRenderingContext2D,
  family: string,
  chars: number,
  room: number,
  max: number
) {
  const sample = '0'.repeat(chars);
  let font = max;
  for (; font > 6; font -= 0.5) {
    ctx.font = `${font}px ${family}`;
    if (ctx.measureText(sample).width <= room) break;
  }
  ctx.font = `${font}px ${family}`;
  return { font, advance: ctx.measureText(sample).width / chars };
}

function layoutFor(
  width: number,
  height: number,
  type: { font: number; advance: number },
  longest: number
): Layout {
  const wide = width >= 480;
  const cols = wide ? 5 : 4;
  const perCol = Math.ceil(LOG_LENGTH / cols);
  const padX = wide ? 24 : 14;
  const gap = wide ? 18 : 12;
  const pitch = Math.max(2, Math.floor((height - 16) / perCol));
  const top = Math.round((height - perCol * pitch) / 2);
  const colWidth = (width - padX * 2 - gap * (cols - 1)) / cols;
  const colX = Array.from({ length: cols }, (_, i) => Math.round(padX + i * (colWidth + gap)));

  const { font, advance } = type;
  const leading = Math.round(font * 1.5);
  const blockX = Math.round(Math.max(12, (width - longest * advance) / 2));
  const blockY = Math.round((height - RELEVANT_COUNT * leading) / 2 + (leading - font) / 2);
  const gatherY = Math.round(height / 2 - (RELEVANT_COUNT * pitch) / 2);

  return {
    width,
    height,
    cols,
    perCol,
    pitch,
    bar: pitch - 1,
    top,
    colX,
    colWidth,
    charWidth: colWidth / COLUMN_CHARS,
    font,
    advance,
    leading,
    blockX,
    blockY,
    gatherY,
  };
}

export default function HeroCompression() {
  const colors = useCanvasColors();
  const reduced = useReducedMotion();
  const fontsReady = useFontsReady();
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const shareRef = useRef<HTMLSpanElement>(null);
  const layoutRef = useRef<Layout | null>(null);
  const box = useBox(canvasRef);
  const seen = useSeen(figureRef, 0.45);
  const [mode, setMode] = useState<Mode>('log');

  const lines = useMemo(() => {
    const random = seeded(15);
    let order = 0;
    return buildLog().map((log): Line => {
      const label = labelOf(log);
      return {
        log,
        label,
        words: wordsOf(label),
        jitter: random(),
        order: log.relevant ? order++ : -1,
      };
    });
  }, []);

  const longest = useMemo(
    () => Math.max(...lines.filter((line) => line.log.relevant).map((line) => line.label.length)),
    [lines]
  );

  const draw = (value: number) => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout || !colors.ready) return;
    const ctx = prepare(canvas, layout.width, layout.height);
    if (!ctx) return;

    const { fg, accent, isDark } = colors;
    const erase = span(value, ...ERASE);
    const gather = span(value, ...GATHER);
    const resolve = easeInOut(span(value, ...RESOLVE));

    // The noise, erased from the top of every column down; each line goes
    // word by word from its end, like a line being deleted.
    let remaining = RELEVANT_COUNT;
    const noiseInk = rgba(fg, isDark ? 0.27 : 0.22);
    const gutterInk = rgba(fg, isDark ? 0.13 : 0.11);
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (line.log.relevant) continue;
      const row = index % layout.perCol;
      const at = 0.78 * (row / layout.perCol) + 0.16 * line.jitter;
      const gone = clamp01((erase - at) / LINE_FADE);
      if (gone < 0.5) remaining++;
      if (gone >= 1) continue;
      const x = layout.colX[Math.floor(index / layout.perCol)];
      const y = layout.top + row * layout.pitch;
      const count = line.words.length;
      for (let w = 0; w < count; w++) {
        const [start, length] = line.words[w];
        const left = start * layout.charWidth;
        if (left >= layout.colWidth) break;
        const fade = clamp01((erase - at - (count - 1 - w) * WORD_STAGGER) / (LINE_FADE * 0.5));
        if (fade >= 1) continue;
        const right = Math.min(layout.colWidth, left + length * layout.charWidth);
        ctx.globalAlpha = 1 - fade;
        ctx.fillStyle = w === 0 ? gutterInk : noiseInk;
        ctx.fillRect(Math.round(x + left), y, Math.max(1, Math.round(right - left)), layout.bar);
      }
    }
    ctx.globalAlpha = 1;

    // The fifteen: faint while they are 3% of the window, brighter as the
    // noise goes, then gathered and brought up to reading size.
    const share = RELEVANT_COUNT / remaining;
    const presence = lerp(isDark ? 0.55 : 0.6, 1, clamp01((share - 0.03) / 0.25));
    const barsAlpha = 1 - span(resolve, 0.55, 0.9);
    const textAlpha = span(resolve, 0.62, 1);
    const settle = span(resolve, 0.15, 0.75);

    if (barsAlpha > 0) {
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (!line.log.relevant) continue;
        const k = line.order;
        const startX = layout.colX[Math.floor(index / layout.perCol)];
        const startY = layout.top + (index % layout.perCol) * layout.pitch;
        const g = easeInOut(clamp01(gather * 1.4 - (k / RELEVANT_COUNT) * 0.4));
        const x = lerp(startX, layout.blockX, g);
        const y = lerp(
          lerp(startY, layout.gatherY + k * layout.pitch, g),
          layout.blockY + k * layout.leading + layout.font * 0.28,
          resolve
        );
        const charWidth = lerp(layout.charWidth, layout.advance, resolve);
        const bar = lerp(layout.bar, Math.max(2, layout.font * 0.46), resolve);
        const limit = g === 0 && resolve === 0 ? layout.colWidth : Infinity;
        const ink = line.log.key ? accent : mixRgb(accent, fg, settle);
        ctx.globalAlpha = barsAlpha * presence * (line.log.key ? 1 : lerp(1, 0.6, settle));
        ctx.fillStyle = rgba(ink, 1);
        for (const [start, length] of line.words) {
          const left = start * charWidth;
          if (left >= limit) break;
          const right = Math.min(limit, left + length * charWidth);
          ctx.fillRect(
            Math.round(x + left),
            Math.round(y),
            Math.max(1, Math.round(right - left)),
            Math.max(1, Math.round(bar))
          );
        }
      }
      ctx.globalAlpha = 1;
    }

    if (textAlpha > 0) {
      ctx.globalAlpha = textAlpha;
      ctx.font = `${layout.font}px ${monoFamily(canvas)}`;
      ctx.textBaseline = 'top';
      for (const line of lines) {
        if (!line.log.relevant) continue;
        const y = layout.blockY + line.order * layout.leading;
        ctx.fillStyle = rgba(fg, isDark ? 0.36 : 0.42);
        ctx.fillText(line.label.slice(0, GUTTER), layout.blockX, y);
        ctx.fillStyle = line.log.key ? rgba(accent, 1) : rgba(fg, isDark ? 0.78 : 0.8);
        ctx.fillText(line.label.slice(GUTTER), layout.blockX + GUTTER * layout.advance, y);
      }
      ctx.globalAlpha = 1;
    }

    if (countRef.current) countRef.current.textContent = `${remaining} lines`;
    if (shareRef.current) shareRef.current.textContent = `${signalShare(remaining)}%`;
  };

  const animator = useAnimator(draw, STORY_MS);

  // Lay out for the canvas's size and the loaded font, then draw where the
  // story is.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Fifteen lines at 1.5 leading, with some air above and below.
    const tallest = Math.floor(((box.height - 40) / (RELEVANT_COUNT * 1.5)) * 2) / 2;
    const type = fitType(ctx, monoFamily(canvas), longest, box.width - 24, Math.min(12, tallest));
    layoutRef.current = layoutFor(box.width, box.height, type, longest);
    animator.redraw();
  }, [animator, box, colors, fontsReady, longest]);

  // Tell the story once, when the figure first comes into view.
  useEffect(() => {
    if (reduced) {
      setMode('grep');
      animator.to(1, true);
      return;
    }
    if (!seen) return;
    const timer = window.setTimeout(() => {
      setMode('grep');
      animator.to(1);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [animator, reduced, seen]);

  const choose = (next: Mode) => {
    setMode(next);
    animator.to(next === 'grep' ? 1 : 0, reduced, 2);
  };

  const replay = () => {
    setMode('grep');
    animator.run(0, 1);
  };

  return (
    <Figure
      figureRef={figureRef}
      label="A 500 line error log shrinks to the 15 lines that explain the bug: a migration renamed users.id to user_id, and process_data still reads id. Same model, same question; only the context changed."
      title={
        <>
          <span ref={countRef} className="tabular-nums">
            {LOG_LENGTH} lines
          </span>{' '}
          in context
        </>
      }
      meta={
        <>
          the {RELEVANT_COUNT} that matter:{' '}
          <span ref={shareRef} className="tabular-nums" style={{ color: ACCENT }}>
            {signalShare(LOG_LENGTH)}%
          </span>
        </>
      }
      footer={
        <>
          <span style={{ color: FAINT }}>Same model, same question. Only the context changed.</span>
          <span className="flex items-center gap-2">
            <Choice
              label="What goes into the context"
              value={mode}
              onChange={choose}
              options={[
                { value: 'log', label: 'Whole log' },
                { value: 'grep', label: 'grep' },
              ]}
            />
            <Replay onClick={replay} />
          </span>
        </>
      }
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block h-[272px] w-full sm:h-[328px]" />
      <pre className="sr-only">
        {lines
          .filter((line) => line.log.relevant)
          .map((line) => line.label.trim())
          .join('\n')}
      </pre>
    </Figure>
  );
}
