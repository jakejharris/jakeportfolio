'use client';

// "Every tier compresses information for the tier above it." Each agent is
// drawn as its own context window, one cell per 100 tokens. Ten Haiku agents
// read 4,000 tokens of code each and reply with 300: a reference, not the
// file. Each Sonnet reads five replies, 1,500 tokens, and writes a plan. Opus
// reads the plans and decides. The windows shrink as the models get smarter:
// the most expensive model thinks against the smallest, densest input.

import { useEffect, useMemo, useRef, useState } from 'react';

import { rgba, useCanvasColors } from '../canvas-theme';
import {
  ACCENT,
  Choice,
  DIM,
  Figure,
  Replay,
  useAnimator,
  useBox,
  useFontsReady,
  useReducedMotion,
  useSeen,
} from './figure';
import {
  HAIKU_PER_SONNET,
  HAIKU_READS,
  HAIKU_RETURNS,
  SONNET_READS,
  SONNETS,
  TIER_EXAMPLES,
  TOKENS_PER_CELL,
} from './figures';
import { dotted, easeInOut, easeOut, lerp, monoFamily, prepare, seeded, span } from './lattice';

type Tier = 'opus' | 'sonnet' | 'haiku';
type Part = Tier | 'rest';

const STORY_MS = 7000;
const READ: [number, number] = [0.04, 0.3];
const REPLY: [number, number] = [0.3, 0.37];
const CLIMB: [number, number] = [0.37, 0.53];
const PLAN: [number, number] = [0.57, 0.65];
const RISE: [number, number] = [0.65, 0.79];
const DECIDE: [number, number] = [0.84, 0.94];

// Windows, in cells: a Haiku window holds what it read, 4,000 tokens; a
// Sonnet window the five replies; the Opus window the two plans.
const HAIKU_COLS = 5;
const HAIKU_CELLS = HAIKU_READS / TOKENS_PER_CELL;
const HAIKU_ROWS = HAIKU_CELLS / HAIKU_COLS;
const REPLY_CELLS = HAIKU_RETURNS / TOKENS_PER_CELL;
const REPLY_COL = 2;
const PLAN_COL = Math.floor(HAIKU_PER_SONNET / 2);
const PLAN_CELLS = 3;
const HAIKUS = SONNETS * HAIKU_PER_SONNET;

const fmt = (tokens: number) => tokens.toLocaleString('en-US');

const PARTS: Part[] = ['rest', 'haiku', 'sonnet', 'opus'];

const TIERS: Array<{ value: Tier; label: string }> = [
  { value: 'haiku', label: 'Haiku' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
];

const CAPTIONS: Record<Part, { text: string; example?: string }> = {
  rest: {
    text: 'Every tier compresses for the tier above it, so the most expensive model reads the least.',
  },
  haiku: {
    text: `Each Haiku reads ${fmt(HAIKU_READS)} tokens of code in its own window and returns ${fmt(HAIKU_RETURNS)}: a reference, not the file.`,
    example: TIER_EXAMPLES.haiku,
  },
  sonnet: {
    text: `Each Sonnet reads the replies of five Haiku, ${fmt(SONNET_READS)} tokens, and writes a plan.`,
    example: TIER_EXAMPLES.sonnet,
  },
  opus: {
    text: 'Opus reads the plans and makes the decision.',
    example: TIER_EXAMPLES.opus,
  },
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Layout {
  width: number;
  height: number;
  pitch: number;
  cell: number;
  wide: boolean;
  haiku: Rect[];
  sonnet: Rect[];
  opus: Rect;
  decision: Rect;
  rows: Record<Tier, { top: number; bottom: number; center: number }>;
}

function gridRect(cx: number, top: number, cols: number, rows: number, pitch: number): Rect {
  const w = cols * pitch - 1;
  const h = rows * pitch - 1;
  return { x: Math.round(cx - w / 2), y: Math.round(top), w, h };
}

/** Where the labels go: beside the rows when there is room, else over them. */
const LABEL_COLUMN = 124;

function layoutFor(width: number, height: number): Layout {
  // The wide layout stacks the tiers with room to spare; the canvas only
  // grows tall enough for it at the sm breakpoint.
  const wide = width >= 600 && height >= 280;
  const agentGap = wide ? 8 : 4;
  const groupGap = wide ? 30 : 14;
  const room = wide ? width - 2 * LABEL_COLUMN : width - 24;
  const rowWidth = (pitch: number) => {
    const groupW = HAIKU_PER_SONNET * (HAIKU_COLS * pitch - 1) + (HAIKU_PER_SONNET - 1) * agentGap;
    return SONNETS * groupW + (SONNETS - 1) * groupGap;
  };
  let pitch = 7;
  while (pitch > 4 && rowWidth(pitch) > room) pitch--;
  const cell = pitch - 1;
  const haikuW = HAIKU_COLS * pitch - 1;
  const groupW = HAIKU_PER_SONNET * haikuW + (HAIKU_PER_SONNET - 1) * agentGap;
  const left = Math.round((width - rowWidth(pitch)) / 2);

  const haikuH = HAIKU_ROWS * pitch - 1;
  const haikuTop = height - (wide ? 22 : 14) - haikuH;
  const sonnetTop = Math.round(haikuTop - (wide ? 84 : 62) - REPLY_CELLS * pitch);
  // Narrow figures put a line of text over the decision, so Opus hangs from the top.
  const opusTop = wide ? Math.round(sonnetTop - 60 - PLAN_CELLS * pitch) : 48;

  const haiku: Rect[] = [];
  const sonnet: Rect[] = [];
  for (let s = 0; s < SONNETS; s++) {
    const groupX = left + s * (groupW + groupGap);
    for (let h = 0; h < HAIKU_PER_SONNET; h++) {
      haiku.push({ x: groupX + h * (haikuW + agentGap), y: haikuTop, w: haikuW, h: haikuH });
    }
    sonnet.push(gridRect(groupX + groupW / 2, sonnetTop, HAIKU_PER_SONNET, REPLY_CELLS, pitch));
  }
  const opus = gridRect(width / 2, opusTop, SONNETS, PLAN_CELLS, pitch);
  const decision = gridRect(width / 2, opusTop - (wide ? 28 : 20), 1, 1, pitch);

  const band = (rect: Rect, extra: number) => ({
    top: rect.y - extra,
    bottom: rect.y + rect.h + extra,
    center: rect.y + rect.h / 2,
  });

  return {
    width,
    height,
    pitch,
    cell,
    wide,
    haiku,
    sonnet,
    opus,
    decision,
    rows: {
      opus: { ...band(opus, 16), top: decision.y - 14 },
      sonnet: band(sonnet[0], 18),
      haiku: band(haiku[0], 16),
    },
  };
}

function cellAt(rect: Rect, cols: number, index: number, pitch: number) {
  return { x: rect.x + (index % cols) * pitch, y: rect.y + Math.floor(index / cols) * pitch };
}

interface Label {
  tier: Tier;
  text: string;
  x: number;
  y: number;
  align: 'left' | 'right';
  strong: boolean;
}

const WORDS: Record<Tier, { name: string; role: string; reads: string; returns: string }> = {
  opus: { name: 'Opus', role: 'coordinates', reads: 'reads 2 plans', returns: 'decides' },
  sonnet: {
    name: 'Sonnet',
    role: 'implements',
    reads: `reads ${fmt(SONNET_READS)}`,
    returns: 'writes a plan',
  },
  haiku: {
    name: 'Haiku',
    role: 'reads code',
    reads: `reads ${fmt(HAIKU_READS)}`,
    returns: `returns ${HAIKU_RETURNS}`,
  },
};

/** Names on the left, what each tier reads and returns on the right. */
function labelsFor(layout: Layout): Label[] {
  const labels: Label[] = [];
  for (const tier of ['opus', 'sonnet', 'haiku'] as Tier[]) {
    const row = layout.rows[tier];
    const words = WORDS[tier];
    if (layout.wide) {
      const left = 20;
      const right = layout.width - 20;
      labels.push(
        { tier, text: words.name, x: left, y: row.center - 7, align: 'left', strong: true },
        { tier, text: words.role, x: left, y: row.center + 8, align: 'left', strong: false },
        { tier, text: words.reads, x: right, y: row.center - 7, align: 'right', strong: false },
        { tier, text: words.returns, x: right, y: row.center + 8, align: 'right', strong: false }
      );
    } else {
      const y = row.top - 1;
      labels.push(
        { tier, text: words.name, x: 12, y, align: 'left', strong: true },
        {
          tier,
          text: `${words.reads}, ${words.returns}`,
          x: layout.width - 12,
          y,
          align: 'right',
          strong: false,
        }
      );
    }
  }
  return labels;
}

const topOf = (rect: Rect) => ({ x: rect.x + rect.w / 2, y: rect.y - 4 });
const bottomOf = (rect: Rect) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h + 4 });

/** Progress of one reply's climb, staggered left to right within a group. */
const replyFlight = (climb: number, slot: number) => span(climb, slot * 0.05, 0.8 + slot * 0.05);
/** Progress of one plan's rise to Opus. */
const planFlight = (rise: number, s: number) => span(rise, s * 0.15, 0.85 + s * 0.15);
const landed = (flight: number) => flight >= 0.999;

export default function AgentHierarchy() {
  const colors = useCanvasColors();
  const reduced = useReducedMotion();
  const fontsReady = useFontsReady();
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRefs = useRef<Partial<Record<Part, HTMLSpanElement | null>>>({});
  const shownRef = useRef<Part>('rest');
  const layoutRef = useRef<Layout | null>(null);
  const box = useBox(canvasRef);
  const seen = useSeen(figureRef, 0.5);
  // A tier picked with the buttons or a tap stays until it is released; a
  // mouse over the canvas shows its tier only while it is there.
  const [picked, setPicked] = useState<Tier | null>(null);
  const [hovered, setHovered] = useState<Tier | null>(null);
  const focus = hovered ?? picked;
  const focusRef = useRef<Tier | null>(null);

  // Each Haiku starts reading a moment apart.
  const readStart = useMemo(() => {
    const random = seeded(4000);
    return Array.from({ length: HAIKUS }, () => random() * 0.12);
  }, []);

  const showCaption = (part: Part) => {
    if (shownRef.current === part) return;
    shownRef.current = part;
    for (const key of PARTS) {
      const element = captionRefs.current[key];
      if (element) element.style.visibility = key === part ? 'visible' : 'hidden';
    }
  };

  const draw = (value: number) => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout || !colors.ready) return;
    const ctx = prepare(canvas, layout.width, layout.height);
    if (!ctx) return;

    const { fg, accent, isDark } = colors;
    const { pitch, cell } = layout;
    const selected = focusRef.current;
    const dim = (tier: Tier) => (selected && selected !== tier ? 0.3 : 1);

    const read = span(value, ...READ);
    const reply = span(value, ...REPLY);
    const climb = span(value, ...CLIMB);
    const plan = span(value, ...PLAN);
    const rise = span(value, ...RISE);
    const decide = span(value, ...DECIDE);

    const ink = rgba(accent, 1);
    const code = rgba(fg, isDark ? 0.34 : 0.3);
    // Once a window has passed its reply up, what it read stays behind.
    const spent = (flight: number) => lerp(1, 0.45, easeOut(flight));

    // Every agent's own window.
    ctx.strokeStyle = rgba(fg, isDark ? 0.22 : 0.24);
    ctx.lineWidth = 1;
    const frame = (rect: Rect, tier: Tier) => {
      ctx.globalAlpha = dim(tier);
      ctx.strokeRect(rect.x - 2.5, rect.y - 2.5, rect.w + 5, rect.h + 5);
    };
    layout.haiku.forEach((rect) => frame(rect, 'haiku'));
    layout.sonnet.forEach((rect) => frame(rect, 'sonnet'));
    frame(layout.opus, 'opus');

    // Dotted connectors: who reports to whom.
    ctx.fillStyle = rgba(fg, isDark ? 0.3 : 0.32);
    ctx.globalAlpha = selected ? 0.5 : 1;
    layout.haiku.forEach((rect, i) =>
      dotted(ctx, topOf(rect), bottomOf(layout.sonnet[Math.floor(i / HAIKU_PER_SONNET)]), 3)
    );
    layout.sonnet.forEach((rect) => dotted(ctx, topOf(rect), bottomOf(layout.opus), 3));

    // Names and numbers. On a wide figure they sit beside the rows; on a
    // narrow one, over them, cut out of the connectors so they stay legible.
    const family = monoFamily(canvas);
    ctx.textBaseline = 'middle';
    ctx.font = `${layout.wide ? 11 : 10}px ${family}`;
    const texts = labelsFor(layout);
    if (!layout.wide) {
      for (const text of texts) {
        const width = ctx.measureText(text.text).width;
        const x = text.align === 'left' ? text.x : text.x - width;
        ctx.clearRect(x - 3, text.y - 7, width + 6, 14);
      }
    }

    // Haiku: each window fills with the code it reads, then three cells of it
    // light up, the reply, and climb to its Sonnet.
    layout.haiku.forEach((rect, agent) => {
      const s = Math.floor(agent / HAIKU_PER_SONNET);
      const slot = agent % HAIKU_PER_SONNET;
      const flight = replyFlight(climb, slot);
      const filled = Math.floor(
        span(read, readStart[agent], readStart[agent] + 0.86) * HAIKU_CELLS
      );
      for (let i = 0; i < filled; i++) {
        const isReply = i % HAIKU_COLS === REPLY_COL && Math.floor(i / HAIKU_COLS) < REPLY_CELLS;
        const { x, y } = cellAt(rect, HAIKU_COLS, i, pitch);
        ctx.globalAlpha = dim('haiku') * spent(flight);
        ctx.fillStyle = code;
        ctx.fillRect(x, y, cell, cell);
        if (isReply && reply > 0) {
          ctx.globalAlpha = dim('haiku') * easeOut(reply);
          ctx.fillStyle = ink;
          ctx.fillRect(x, y, cell, cell);
        }
      }
      if (flight > 0 && !landed(flight)) {
        const from = cellAt(rect, HAIKU_COLS, REPLY_COL, pitch);
        const to = cellAt(layout.sonnet[s], HAIKU_PER_SONNET, slot, pitch);
        const t = easeInOut(flight);
        ctx.globalAlpha = dim('haiku');
        ctx.fillStyle = ink;
        for (let k = 0; k < REPLY_CELLS; k++) {
          ctx.fillRect(
            Math.round(lerp(from.x, to.x, t)),
            Math.round(lerp(from.y, to.y, t)) + k * pitch,
            cell,
            cell
          );
        }
      }
    });

    // Sonnet: the five replies land column by column. The middle column
    // brightens into the plan, and the plan rises to Opus.
    layout.sonnet.forEach((rect, s) => {
      const flight = planFlight(rise, s);
      for (let slot = 0; slot < HAIKU_PER_SONNET; slot++) {
        if (!landed(replyFlight(climb, slot))) continue;
        const alpha =
          slot === PLAN_COL
            ? lerp(0.55, 1, easeOut(plan))
            : lerp(0.55, 0.4, easeOut(plan)) * spent(flight);
        ctx.globalAlpha = dim('sonnet') * alpha;
        ctx.fillStyle = ink;
        for (let k = 0; k < REPLY_CELLS; k++) {
          const { x, y } = cellAt(rect, HAIKU_PER_SONNET, slot + k * HAIKU_PER_SONNET, pitch);
          ctx.fillRect(x, y, cell, cell);
        }
      }
      if (flight > 0 && !landed(flight)) {
        const from = cellAt(rect, HAIKU_PER_SONNET, PLAN_COL, pitch);
        const to = cellAt(layout.opus, SONNETS, s, pitch);
        const t = easeInOut(flight);
        ctx.globalAlpha = dim('sonnet');
        ctx.fillStyle = ink;
        for (let k = 0; k < PLAN_CELLS; k++) {
          ctx.fillRect(
            Math.round(lerp(from.x, to.x, t)),
            Math.round(lerp(from.y, to.y, t)) + k * pitch,
            cell,
            cell
          );
        }
      }
    });

    // Opus holds the two plans, and decides.
    ctx.fillStyle = ink;
    for (let s = 0; s < SONNETS; s++) {
      if (!landed(planFlight(rise, s))) continue;
      ctx.globalAlpha = dim('opus');
      for (let k = 0; k < PLAN_CELLS; k++) {
        const { x, y } = cellAt(layout.opus, SONNETS, s + k * SONNETS, pitch);
        ctx.fillRect(x, y, cell, cell);
      }
    }
    if (decide > 0) {
      const d = layout.decision;
      const shown = easeOut(decide);
      const lift = Math.round((1 - shown) * 10);
      ctx.globalAlpha = dim('opus') * shown;
      ctx.fillRect(d.x, d.y + lift, cell, cell);
      ctx.strokeStyle = rgba(accent, 0.6);
      ctx.strokeRect(d.x - 3.5, d.y + lift - 3.5, cell + 7, cell + 7);
    }

    for (const text of texts) {
      ctx.globalAlpha = dim(text.tier);
      ctx.textAlign = text.align;
      ctx.fillStyle = rgba(fg, text.strong ? 0.85 : 0.5);
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;

    // The caption follows the story, then rests on the rule.
    if (!selected) {
      showCaption(
        value >= 1 || value < READ[0]
          ? 'rest'
          : value < CLIMB[0]
            ? 'haiku'
            : value < RISE[0]
              ? 'sonnet'
              : 'opus'
      );
    }
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
    if (focus) showCaption(focus);
    animator.redraw();
    // showCaption only touches refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animator, focus]);

  const tierAt = (clientY: number): Tier | null => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout) return null;
    const y = clientY - canvas.getBoundingClientRect().top;
    for (const tier of ['opus', 'sonnet', 'haiku'] as Tier[]) {
      const row = layout.rows[tier];
      if (y >= row.top && y <= row.bottom) return tier;
    }
    return null;
  };

  return (
    <Figure
      figureRef={figureRef}
      label="Three tiers of agents, each drawn as its own context window at one cell per 100 tokens. Ten Haiku agents each read 4,000 tokens of code and return 300. Two Sonnet agents each read five replies, 1,500 tokens, and write a plan. Opus reads the two plans and decides."
      title="Three tiers of agents"
      meta="1 cell = 100 tokens"
      footer={
        <>
          {/* Every caption shares one grid cell, so the figure keeps the
              height of the longest and never jumps as the story plays. */}
          <span className="grid basis-full">
            {PARTS.map((part) => (
              <span
                key={part}
                ref={(element) => {
                  captionRefs.current[part] = element;
                }}
                className="col-start-1 row-start-1"
                style={{ visibility: part === 'rest' ? 'visible' : 'hidden' }}
              >
                <span style={{ color: DIM }}>{CAPTIONS[part].text}</span>
                {CAPTIONS[part].example && (
                  <span className="mt-1 block break-words" style={{ color: ACCENT }}>
                    {CAPTIONS[part].example}
                  </span>
                )}
              </span>
            ))}
          </span>
          <Choice
            label="Show one tier"
            options={TIERS}
            value={picked}
            onChange={setPicked}
            onClear={() => setPicked(null)}
          />
          <Replay onClick={() => animator.run(0, 1)} />
          <span className="sr-only" aria-live="polite">
            {picked ? `${CAPTIONS[picked].text} ${CAPTIONS[picked].example ?? ''}` : ''}
          </span>
        </>
      }
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-[236px] w-full touch-manipulation sm:h-[300px]"
        onPointerMove={(event) => {
          if (event.pointerType === 'mouse') setHovered(tierAt(event.clientY));
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setHovered(null);
        }}
        onPointerUp={(event) => {
          if (event.pointerType === 'mouse') return;
          const tier = tierAt(event.clientY);
          setPicked((current) => (current === tier ? null : tier));
        }}
      />
    </Figure>
  );
}
