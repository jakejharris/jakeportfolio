'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '@/app/lib/utils';
import {
  rgba,
  type RgbTriplet,
  useCanvasColors,
} from '@/app/components/blog-components/canvas-theme';

const LANES = [1, 2, 3, 4];
const LOOP_MS = 5200;
const TRAIL_STEPS = 9;
const TRAIL_SPACING = 4.2;
const REVIEW_GLOW_WINDOW = 9;

interface Point {
  x: number;
  y: number;
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerY: number;
}

interface CubicPath {
  start: Point;
  c1: Point;
  c2: Point;
  end: Point;
  samples: PathSample[];
  length: number;
}

interface PathSample {
  t: number;
  distance: number;
  point: Point;
}

interface PathSequence {
  paths: CubicPath[];
  length: number;
}

interface FlowGeometry {
  width: number;
  height: number;
  dpr: number;
  fanOut: CubicPath[];
  fanIn: CubicPath[];
  reviewPath: CubicPath;
  mainPath: CubicPath;
  sequences: PathSequence[];
  reviewBoundaries: number[];
}

interface CanvasPalette {
  accent: RgbTriplet;
  fg: RgbTriplet;
  isDark: boolean;
  ready: boolean;
}

function cubicPoint(path: Pick<CubicPath, 'start' | 'c1' | 'c2' | 'end'>, t: number): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;

  return {
    x: a * path.start.x + b * path.c1.x + c * path.c2.x + d * path.end.x,
    y: a * path.start.y + b * path.c1.y + c * path.c2.y + d * path.end.y,
  };
}

function createMeasuredPath(
  start: Point,
  c1: Point,
  c2: Point,
  end: Point
): CubicPath {
  const base = { start, c1, c2, end };
  const samples: PathSample[] = [{ t: 0, distance: 0, point: start }];
  let previous = start;
  let distance = 0;

  for (let i = 1; i <= 48; i += 1) {
    const t = i / 48;
    const point = cubicPoint(base, t);
    distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    samples.push({ t, distance, point });
    previous = point;
  }

  return { ...base, samples, length: distance };
}

function createConnector(start: Point, end: Point): CubicPath {
  const midX = (start.x + end.x) / 2;

  return createMeasuredPath(
    start,
    { x: midX, y: start.y },
    { x: midX, y: end.y },
    end
  );
}

function createLine(start: Point, end: Point): CubicPath {
  return createMeasuredPath(
    start,
    {
      x: start.x + (end.x - start.x) / 3,
      y: start.y + (end.y - start.y) / 3,
    },
    {
      x: start.x + ((end.x - start.x) * 2) / 3,
      y: start.y + ((end.y - start.y) * 2) / 3,
    },
    end
  );
}

function sequenceFrom(paths: CubicPath[]): PathSequence {
  return {
    paths,
    length: paths.reduce((sum, path) => sum + path.length, 0),
  };
}

function pointAtPathDistance(path: CubicPath, distance: number): Point {
  if (distance <= 0) return path.start;
  if (distance >= path.length) return path.end;

  for (let i = 1; i < path.samples.length; i += 1) {
    const sample = path.samples[i];
    const previous = path.samples[i - 1];

    if (sample.distance >= distance) {
      const span = sample.distance - previous.distance || 1;
      const mix = (distance - previous.distance) / span;

      return {
        x: previous.point.x + (sample.point.x - previous.point.x) * mix,
        y: previous.point.y + (sample.point.y - previous.point.y) * mix,
      };
    }
  }

  return path.end;
}

function pointAtSequenceDistance(sequence: PathSequence, distance: number) {
  if (distance < 0 || distance > sequence.length) return null;
  let cursor = distance;

  for (const path of sequence.paths) {
    if (cursor <= path.length) {
      return pointAtPathDistance(path, cursor);
    }
    cursor -= path.length;
  }

  return sequence.paths[sequence.paths.length - 1]?.end ?? null;
}

function terminalAngle(path: CubicPath) {
  return Math.atan2(path.end.y - path.c2.y, path.end.x - path.c2.x);
}

function drawPath(ctx: CanvasRenderingContext2D, path: CubicPath) {
  ctx.beginPath();
  ctx.moveTo(path.start.x, path.start.y);
  ctx.bezierCurveTo(path.c1.x, path.c1.y, path.c2.x, path.c2.y, path.end.x, path.end.y);
  ctx.stroke();
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  tip: Point,
  angle: number,
  color: string
) {
  const size = 5.5;
  const spread = 0.74;

  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(
    tip.x - Math.cos(angle - spread) * size,
    tip.y - Math.sin(angle - spread) * size
  );
  ctx.lineTo(
    tip.x - Math.cos(angle + spread) * size,
    tip.y - Math.sin(angle + spread) * size
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawPulse(
  ctx: CanvasRenderingContext2D,
  sequence: PathSequence,
  headDistance: number,
  accent: RgbTriplet
) {
  for (let i = TRAIL_STEPS; i >= 0; i -= 1) {
    const point = pointAtSequenceDistance(
      sequence,
      headDistance - i * TRAIL_SPACING
    );

    if (!point) continue;

    const alpha = (1 - i / (TRAIL_STEPS + 1)) * 0.52;
    const radius = i === 0 ? 2.7 : 1.9;

    ctx.beginPath();
    ctx.fillStyle = rgba(accent, alpha);
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const head = pointAtSequenceDistance(sequence, headDistance);
  if (!head) return;

  ctx.save();
  ctx.shadowColor = rgba(accent, 0.55);
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.fillStyle = rgba(accent, 0.95);
  ctx.arc(head.x, head.y, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function applyReviewGlow(
  el: HTMLElement,
  intensity: number,
  accent: RgbTriplet
) {
  if (intensity <= 0.02) {
    el.style.boxShadow = '';
    el.style.borderColor = '';
    return;
  }

  el.style.boxShadow = `0 0 ${4 + 8 * intensity}px ${rgba(accent, 0.5 * intensity)}`;
  el.style.borderColor = rgba(accent, 0.2 + 0.6 * intensity);
}

function drawFrame(
  canvas: HTMLCanvasElement,
  geometry: FlowGeometry,
  palette: CanvasPalette,
  time: number,
  animate: boolean
): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  ctx.setTransform(geometry.dpr, 0, 0, geometry.dpr, 0, 0);
  ctx.clearRect(0, 0, geometry.width, geometry.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const line = rgba(palette.fg, palette.isDark ? 0.23 : 0.3);
  const faintLine = rgba(palette.fg, palette.isDark ? 0.13 : 0.18);
  const arrow = rgba(palette.fg, palette.isDark ? 0.42 : 0.5);
  const accentLine = rgba(palette.accent, palette.ready ? 0.28 : 0.2);
  const allPaths = [
    ...geometry.fanOut,
    ...geometry.fanIn,
    geometry.reviewPath,
    geometry.mainPath,
  ];

  ctx.lineWidth = 1;
  ctx.strokeStyle = line;
  for (const path of geometry.fanOut) drawPath(ctx, path);
  for (const path of geometry.fanIn) drawPath(ctx, path);

  ctx.strokeStyle = faintLine;
  drawPath(ctx, geometry.reviewPath);
  drawPath(ctx, geometry.mainPath);

  ctx.lineWidth = 1.25;
  ctx.strokeStyle = accentLine;
  for (const path of geometry.fanOut) drawPath(ctx, path);
  for (const path of geometry.fanIn) drawPath(ctx, path);

  for (const path of allPaths) {
    drawArrowhead(ctx, path.end, terminalAngle(path), arrow);
  }

  if (!animate) return 0;

  const travel = (time % LOOP_MS) / LOOP_MS;
  let reviewGlow = 0;

  geometry.sequences.forEach((sequence, laneIndex) => {
    for (let wave = 0; wave < 2; wave += 1) {
      const progress = (travel + laneIndex * 0.075 + wave * 0.48) % 1;
      const headDistance = sequence.length * progress;
      drawPulse(ctx, sequence, headDistance, palette.accent);

      const diff = headDistance - geometry.reviewBoundaries[laneIndex];
      const intensity = Math.max(0, 1 - Math.abs(diff) / REVIEW_GLOW_WINDOW);
      reviewGlow = Math.max(reviewGlow, intensity);
    }
  });

  return reviewGlow;
}

function relativeBox(element: HTMLElement, container: DOMRect): Box {
  const rect = element.getBoundingClientRect();
  const top = rect.top - container.top;
  const bottom = rect.bottom - container.top;

  return {
    left: rect.left - container.left,
    right: rect.right - container.left,
    top,
    bottom,
    centerY: top + (bottom - top) / 2,
  };
}

function readGeometry(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  plan: HTMLDivElement,
  agents: HTMLDivElement[],
  onePr: HTMLDivElement,
  review: HTMLDivElement,
  main: HTMLSpanElement
): FlowGeometry | null {
  const containerRect = container.getBoundingClientRect();
  if (!containerRect.width || !containerRect.height) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = containerRect.width;
  const height = containerRect.height;
  const backingWidth = Math.max(1, Math.round(width * dpr));
  const backingHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;

  const planBox = relativeBox(plan, containerRect);
  const onePrBox = relativeBox(onePr, containerRect);
  const reviewBox = relativeBox(review, containerRect);
  const mainBox = relativeBox(main, containerRect);
  const agentBoxes = agents.map((agent) => relativeBox(agent, containerRect));

  const planAnchor = { x: planBox.right, y: planBox.centerY };
  const onePrLeft = { x: onePrBox.left, y: onePrBox.centerY };
  const onePrRight = { x: onePrBox.right, y: onePrBox.centerY };
  const reviewLeft = { x: reviewBox.left, y: reviewBox.centerY };
  const reviewRight = { x: reviewBox.right, y: reviewBox.centerY };
  const mainLeft = { x: mainBox.left, y: mainBox.centerY };

  const fanOut = agentBoxes.map((box) =>
    createConnector(planAnchor, { x: box.left, y: box.centerY })
  );
  const fanIn = agentBoxes.map((box) =>
    createConnector({ x: box.right, y: box.centerY }, onePrLeft)
  );
  const reviewPath = createLine(onePrRight, reviewLeft);
  const mainPath = createLine(reviewRight, mainLeft);
  const sequences = fanOut.map((path, index) =>
    sequenceFrom([path, fanIn[index], reviewPath, mainPath])
  );
  const reviewBoundaries = fanOut.map(
    (path, index) => path.length + fanIn[index].length + reviewPath.length
  );

  return {
    width,
    height,
    dpr,
    fanOut,
    fanIn,
    reviewPath,
    mainPath,
    sequences,
    reviewBoundaries,
  };
}

const NodeCard = forwardRef<
  HTMLDivElement,
  { title: string; sub?: string; accent?: boolean; compact?: boolean }
>(function NodeCard({ title, sub, accent = false, compact = false }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-md border bg-background/95 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-[box-shadow,border-color] duration-150',
        compact
          ? 'mx-1 px-1 py-0.5 sm:mx-2 sm:px-2 sm:py-1'
          : 'px-1.5 py-1 sm:px-3 sm:py-2'
      )}
      style={{
        borderColor: accent
          ? 'color-mix(in srgb, var(--accent-color) 55%, transparent)'
          : 'color-mix(in srgb, hsl(var(--foreground)) 15%, transparent)',
      }}
    >
      <div
        className={cn(
          'font-semibold leading-tight tracking-wide',
          compact ? 'text-[8px] sm:text-[9px]' : 'text-[10px] sm:text-[11px]'
        )}
        style={{
          color: accent ? 'var(--accent-color)' : 'hsl(var(--foreground))',
        }}
      >
        {title}
      </div>
      {sub && (
        <div className="mt-0.5 text-[8px] leading-tight text-muted-foreground sm:text-[9px]">
          {sub}
        </div>
      )}
    </div>
  );
});

export default function SymphonyFlow() {
  const colors = useCanvasColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const onePrRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLSpanElement>(null);
  const agentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const geometryRef = useRef<FlowGeometry | null>(null);
  const measureFrameRef = useRef(0);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const getPalette = useCallback((): CanvasPalette => {
    if (colors.ready) return colors;

    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark');

    return {
      accent: [96, 165, 250],
      fg: isDark ? [245, 245, 245] : [24, 24, 27],
      isDark,
      ready: false,
    };
  }, [colors]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const plan = planRef.current;
    const onePr = onePrRef.current;
    const review = reviewRef.current;
    const main = mainRef.current;
    const agents = agentRefs.current.filter(
      (agent): agent is HTMLDivElement => Boolean(agent)
    );

    if (
      !container ||
      !canvas ||
      !plan ||
      !onePr ||
      !review ||
      !main ||
      agents.length !== LANES.length
    ) {
      return;
    }

    const geometry = readGeometry(
      container,
      canvas,
      plan,
      agents,
      onePr,
      review,
      main
    );

    if (!geometry) return;

    geometryRef.current = geometry;
    setLayoutVersion((version) => version + 1);
    drawFrame(canvas, geometry, getPalette(), 0, false);
    applyReviewGlow(review, 0, getPalette().accent);
  }, [getPalette]);

  const scheduleMeasure = useCallback(() => {
    window.cancelAnimationFrame(measureFrameRef.current);
    measureFrameRef.current = window.requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(container);
    scheduleMeasure();

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) scheduleMeasure();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      window.cancelAnimationFrame(measureFrameRef.current);
    };
  }, [scheduleMeasure]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const geometry = geometryRef.current;
    const review = reviewRef.current;

    if (!canvas || !geometry) return;

    drawFrame(canvas, geometry, getPalette(), 0, false);
    if (review) applyReviewGlow(review, 0, getPalette().accent);
  }, [colors, getPalette, layoutVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const geometry = geometryRef.current;
    const review = reviewRef.current;

    if (!canvas || !geometry) return;

    if (reducedMotion) {
      drawFrame(canvas, geometry, getPalette(), 0, false);
      if (review) applyReviewGlow(review, 0, getPalette().accent);
      return;
    }

    if (!visible) return;

    let frame = 0;
    const tick = (time: number) => {
      const latestCanvas = canvasRef.current;
      const latestGeometry = geometryRef.current;
      const latestReview = reviewRef.current;

      if (latestCanvas && latestGeometry) {
        const palette = getPalette();
        const glow = drawFrame(latestCanvas, latestGeometry, palette, time, true);
        if (latestReview) applyReviewGlow(latestReview, glow, palette.accent);
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [getPalette, layoutVersion, reducedMotion, visible]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-foreground/10 p-3 font-mono sm:p-6"
      role="img"
      aria-label="Flow diagram: a locked plan fans out into four parallel agents, each in its own git worktree on a file-disjoint slice; their work fans back in to one consolidated pull request, which passes a review gate before merging to main"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        aria-hidden="true"
      />

      <div className="relative z-10 grid min-h-[138px] grid-cols-[minmax(54px,0.9fr)_minmax(62px,1fr)_minmax(48px,0.82fr)_minmax(38px,auto)_minmax(26px,auto)] items-center gap-x-1.5 sm:min-h-[176px] sm:grid-cols-[minmax(118px,0.95fr)_minmax(138px,1.1fr)_minmax(104px,0.85fr)_minmax(70px,auto)_minmax(42px,auto)] sm:gap-x-5">
        <NodeCard ref={planRef} title="Plan" sub="Locked, File-Disjoint Slices" />

        <div className="flex h-full flex-col justify-around gap-1 py-1 sm:gap-1.5 sm:py-2">
          {LANES.map((n, index) => (
            <div
              key={n}
              ref={(node) => {
                agentRefs.current[index] = node;
              }}
              className="rounded-md border border-foreground/15 bg-background/95 px-1.5 py-1 text-center sm:px-3"
            >
              <span className="text-[9px] text-foreground/80 sm:text-[10px]">
                Agent {n}
              </span>
              <span className="ml-1 hidden text-[8px] text-muted-foreground sm:inline sm:text-[9px]">
                Worktree
              </span>
            </div>
          ))}
        </div>

        <NodeCard ref={onePrRef} title="One PR" sub="Consolidated" accent />

        <NodeCard ref={reviewRef} title="Review" compact />

        <span
          ref={mainRef}
          className="text-[10px] font-semibold text-foreground sm:text-[11px]"
        >
          Main
        </span>
      </div>
    </div>
  );
}
