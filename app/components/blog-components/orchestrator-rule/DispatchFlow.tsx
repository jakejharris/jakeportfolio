'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  rgba,
  type RgbTriplet,
  useCanvasColors,
} from '@/app/components/blog-components/canvas-theme';

const STEPS: { name: string; detail: string }[] = [
  { name: 'Orchestrator', detail: 'Writes the Prompt' },
  { name: 'Worker', detail: 'Edits the Code' },
  { name: 'Review', detail: 'Finds What Slipped' },
  { name: 'Orchestrator', detail: 'Merges' },
];

const LOOP_MS = 3600;
const BLOCKED_LOOP_MS = 2600;
const TRAIL_STEPS = 10;
const TRAIL_SPACING = 5;

type Side = 'left' | 'right' | 'top' | 'bottom';

interface Point {
  x: number;
  y: number;
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

interface Segment {
  start: Point;
  end: Point;
  length: number;
}

interface Geometry {
  width: number;
  height: number;
  dpr: number;
  allowedConnectors: Segment[];
  allowedTravel: Segment[];
  blockedConnector: Segment;
  blockedTravel: Segment;
  blockedBarrier: Point;
}

interface CanvasPalette {
  accent: RgbTriplet;
  fg: RgbTriplet;
  isDark: boolean;
  ready: boolean;
}

const lineColor = 'color-mix(in srgb, hsl(var(--foreground)) 14%, transparent)';
const faintText = 'color-mix(in srgb, hsl(var(--foreground)) 50%, transparent)';
const dimText = 'color-mix(in srgb, hsl(var(--foreground)) 80%, transparent)';
const flowLine = 'color-mix(in srgb, var(--accent-color) 55%, transparent)';

function segment(start: Point, end: Point): Segment {
  return {
    start,
    end,
    length: Math.hypot(end.x - start.x, end.y - start.y),
  };
}

function relativeBox(element: HTMLElement, container: DOMRect): Box {
  const rect = element.getBoundingClientRect();
  const left = rect.left - container.left;
  const right = rect.right - container.left;
  const top = rect.top - container.top;
  const bottom = rect.bottom - container.top;

  return {
    left,
    right,
    top,
    bottom,
    centerX: left + (right - left) / 2,
    centerY: top + (bottom - top) / 2,
  };
}

function anchor(box: Box, side: Side): Point {
  if (side === 'left') return { x: box.left, y: box.centerY };
  if (side === 'right') return { x: box.right, y: box.centerY };
  if (side === 'top') return { x: box.centerX, y: box.top };
  return { x: box.centerX, y: box.bottom };
}

function pointAlong(segmentValue: Segment, distance: number): Point {
  if (segmentValue.length <= 0) return segmentValue.end;

  const t = Math.max(0, Math.min(1, distance / segmentValue.length));

  return {
    x: segmentValue.start.x + (segmentValue.end.x - segmentValue.start.x) * t,
    y: segmentValue.start.y + (segmentValue.end.y - segmentValue.start.y) * t,
  };
}

function sequenceLength(segments: Segment[]) {
  return segments.reduce((sum, current) => sum + current.length, 0);
}

function pointAtSequenceDistance(segments: Segment[], distance: number) {
  if (distance < 0) return null;

  let cursor = distance;

  for (const current of segments) {
    if (cursor <= current.length) {
      return pointAlong(current, cursor);
    }

    cursor -= current.length;
  }

  return null;
}

function terminalAngle(segmentValue: Segment) {
  return Math.atan2(
    segmentValue.end.y - segmentValue.start.y,
    segmentValue.end.x - segmentValue.start.x
  );
}

function drawLine(ctx: CanvasRenderingContext2D, segmentValue: Segment) {
  ctx.beginPath();
  ctx.moveTo(segmentValue.start.x, segmentValue.start.y);
  ctx.lineTo(segmentValue.end.x, segmentValue.end.y);
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

function drawPulsePoint(
  ctx: CanvasRenderingContext2D,
  point: Point,
  accent: RgbTriplet,
  alpha: number,
  radius: number
) {
  ctx.beginPath();
  ctx.fillStyle = rgba(accent, alpha);
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawAllowedPulse(
  ctx: CanvasRenderingContext2D,
  segments: Segment[],
  distance: number,
  accent: RgbTriplet
) {
  for (let i = TRAIL_STEPS; i >= 0; i -= 1) {
    const point = pointAtSequenceDistance(segments, distance - i * TRAIL_SPACING);
    if (!point) continue;

    const alpha = (1 - i / (TRAIL_STEPS + 1)) * 0.58;
    const radius = i === 0 ? 3 : 2;
    drawPulsePoint(ctx, point, accent, alpha, radius);
  }

  const head = pointAtSequenceDistance(segments, distance);
  if (!head) return;

  ctx.save();
  ctx.shadowColor = rgba(accent, 0.65);
  ctx.shadowBlur = 12;
  drawPulsePoint(ctx, head, accent, 0.98, 3.2);
  ctx.restore();
}

function drawBlockedPulse(
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  progress: number,
  accent: RgbTriplet
) {
  const impactStart = 0.72;
  const travelProgress = Math.min(progress / impactStart, 1);
  const distance = geometry.blockedTravel.length * travelProgress;
  const fade = progress > impactStart ? 1 - (progress - impactStart) / 0.28 : 1;
  const alphaScale = Math.max(0, fade);

  if (alphaScale > 0) {
    for (let i = TRAIL_STEPS; i >= 0; i -= 1) {
      const point = pointAlong(geometry.blockedTravel, distance - i * TRAIL_SPACING);
      const alpha = (1 - i / (TRAIL_STEPS + 1)) * 0.48 * alphaScale;
      const radius = i === 0 ? 2.9 : 1.8;
      drawPulsePoint(ctx, point, accent, alpha, radius);
    }
  }

  if (progress < impactStart) return;

  const burst = 1 - Math.min(1, (progress - impactStart) / 0.28);
  if (burst <= 0) return;

  ctx.save();
  ctx.strokeStyle = rgba(accent, 0.48 * burst);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(geometry.blockedBarrier.x, geometry.blockedBarrier.y, 7 + (1 - burst) * 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFrame(
  canvas: HTMLCanvasElement,
  geometry: Geometry,
  palette: CanvasPalette,
  time: number,
  animate: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(geometry.dpr, 0, 0, geometry.dpr, 0, 0);
  ctx.clearRect(0, 0, geometry.width, geometry.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const allowedLine = rgba(palette.accent, palette.ready ? 0.42 : 0.28);
  const mutedLine = rgba(palette.fg, palette.isDark ? 0.2 : 0.26);
  const blockedLine = rgba(palette.fg, palette.isDark ? 0.18 : 0.22);
  const arrow = rgba(palette.fg, palette.isDark ? 0.48 : 0.54);

  ctx.lineWidth = 1.1;
  ctx.setLineDash([]);
  ctx.strokeStyle = allowedLine;
  for (const connector of geometry.allowedConnectors) {
    drawLine(ctx, connector);
    drawArrowhead(ctx, connector.end, terminalAngle(connector), allowedLine);
  }

  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = blockedLine;
  drawLine(ctx, geometry.blockedConnector);
  ctx.setLineDash([]);
  drawArrowhead(
    ctx,
    geometry.blockedConnector.end,
    terminalAngle(geometry.blockedConnector),
    mutedLine
  );

  if (!animate) return;

  const allowedDistance =
    sequenceLength(geometry.allowedTravel) * ((time % LOOP_MS) / LOOP_MS);
  drawAllowedPulse(ctx, geometry.allowedTravel, allowedDistance, palette.accent);

  const blockedProgress = (time % BLOCKED_LOOP_MS) / BLOCKED_LOOP_MS;
  drawBlockedPulse(ctx, geometry, blockedProgress, palette.accent);
}

function readGeometry(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  allowedNodes: HTMLDivElement[],
  blockedStart: HTMLDivElement,
  blockedSource: HTMLDivElement,
  blockedBarrier: HTMLSpanElement,
  isDesktop: boolean
): Geometry | null {
  const containerRect = container.getBoundingClientRect();
  if (!containerRect.width || !containerRect.height) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = containerRect.width;
  const height = containerRect.height;
  const backingWidth = Math.max(1, Math.round(width * dpr));
  const backingHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;

  const allowedBoxes = allowedNodes.map((node) => relativeBox(node, containerRect));
  const blockedStartBox = relativeBox(blockedStart, containerRect);
  const blockedSourceBox = relativeBox(blockedSource, containerRect);
  const blockedBarrierBox = relativeBox(blockedBarrier, containerRect);
  const startSide: Side = isDesktop ? 'right' : 'bottom';
  const targetSide: Side = isDesktop ? 'left' : 'top';
  const throughTarget: Side = isDesktop ? 'left' : 'top';
  const throughSource: Side = isDesktop ? 'right' : 'bottom';
  const allowedConnectors: Segment[] = [];
  const allowedTravel: Segment[] = [];

  for (let i = 0; i < allowedBoxes.length - 1; i += 1) {
    const source = anchor(allowedBoxes[i], startSide);
    const target = anchor(allowedBoxes[i + 1], targetSide);
    const connector = segment(source, target);

    allowedConnectors.push(connector);
    allowedTravel.push(connector);

    if (i + 1 < allowedBoxes.length - 1) {
      allowedTravel.push(
        segment(
          anchor(allowedBoxes[i + 1], throughTarget),
          anchor(allowedBoxes[i + 1], throughSource)
        )
      );
    }
  }

  const blockedConnector = segment(
    anchor(blockedStartBox, startSide),
    anchor(blockedSourceBox, targetSide)
  );
  const blockedBarrierPoint = {
    x: blockedBarrierBox.centerX,
    y: blockedBarrierBox.centerY,
  };
  const blockedTravel = segment(blockedConnector.start, blockedBarrierPoint);

  return {
    width,
    height,
    dpr,
    allowedConnectors,
    allowedTravel,
    blockedConnector,
    blockedTravel,
    blockedBarrier: blockedBarrierPoint,
  };
}

const StepNode = forwardRef<
  HTMLDivElement,
  { name: string; detail: string; className?: string }
>(function StepNode({ name, detail, className = '' }, ref) {
  return (
    <div
      ref={ref}
      className={`rounded border bg-background px-3 py-2 text-xs leading-none ${className}`}
      style={{ borderColor: flowLine, color: dimText }}
    >
      <div>{name}</div>
      <div className="mt-1.5 text-[10px] leading-tight" style={{ color: faintText }}>
        {detail}
      </div>
    </div>
  );
});

const BlockedNode = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; strike?: boolean; className?: string }
>(function BlockedNode({ children, strike = false, className = '' }, ref) {
  return (
    <div
      ref={ref}
      className={`rounded border border-dashed bg-background px-3 py-1.5 text-xs leading-none ${
        strike ? 'line-through' : ''
      } ${className}`}
      style={{ borderColor: lineColor, color: faintText }}
    >
      {children}
    </div>
  );
});

export default function DispatchFlow() {
  const colors = useCanvasColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desktopAllowedRefs = useRef<Array<HTMLDivElement | null>>([]);
  const mobileAllowedRefs = useRef<Array<HTMLDivElement | null>>([]);
  const desktopBlockedStartRef = useRef<HTMLDivElement>(null);
  const desktopBlockedSourceRef = useRef<HTMLDivElement>(null);
  const desktopBarrierRef = useRef<HTMLSpanElement>(null);
  const mobileBlockedStartRef = useRef<HTMLDivElement>(null);
  const mobileBlockedSourceRef = useRef<HTMLDivElement>(null);
  const mobileBarrierRef = useRef<HTMLSpanElement>(null);
  const geometryRef = useRef<Geometry | null>(null);
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
    if (!container || !canvas) return;

    const isDesktop = window.matchMedia('(min-width: 640px)').matches;
    const allowedNodes = (
      isDesktop ? desktopAllowedRefs.current : mobileAllowedRefs.current
    ).filter((node): node is HTMLDivElement => Boolean(node));
    const blockedStart = isDesktop
      ? desktopBlockedStartRef.current
      : mobileBlockedStartRef.current;
    const blockedSource = isDesktop
      ? desktopBlockedSourceRef.current
      : mobileBlockedSourceRef.current;
    const blockedBarrier = isDesktop
      ? desktopBarrierRef.current
      : mobileBarrierRef.current;

    if (
      allowedNodes.length !== STEPS.length ||
      !blockedStart ||
      !blockedSource ||
      !blockedBarrier
    ) {
      return;
    }

    const geometry = readGeometry(
      container,
      canvas,
      allowedNodes,
      blockedStart,
      blockedSource,
      blockedBarrier,
      isDesktop
    );

    if (!geometry) return;

    geometryRef.current = geometry;
    setLayoutVersion((version) => version + 1);
    drawFrame(canvas, geometry, getPalette(), 0, false);
  }, [getPalette]);

  const scheduleMeasure = useCallback(() => {
    window.cancelAnimationFrame(measureFrameRef.current);
    measureFrameRef.current = window.requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(scheduleMeasure);
    const media = window.matchMedia('(min-width: 640px)');
    const onMediaChange = () => scheduleMeasure();

    observer.observe(container);
    media.addEventListener('change', onMediaChange);
    scheduleMeasure();

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) scheduleMeasure();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      media.removeEventListener('change', onMediaChange);
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
    if (!canvas || !geometry) return;

    drawFrame(canvas, geometry, getPalette(), 0, false);
  }, [colors, getPalette, layoutVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const geometry = geometryRef.current;
    if (!canvas || !geometry) return;

    if (reducedMotion) {
      drawFrame(canvas, geometry, getPalette(), 0, false);
      return;
    }

    if (!visible) return;

    let frame = 0;
    const tick = (time: number) => {
      const latestCanvas = canvasRef.current;
      const latestGeometry = geometryRef.current;

      if (latestCanvas && latestGeometry) {
        drawFrame(latestCanvas, latestGeometry, getPalette(), time, true);
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [getPalette, layoutVersion, reducedMotion, visible]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border px-5 py-6 font-mono"
      style={{ borderColor: lineColor }}
      aria-label="Diagram of the dispatch flow: the orchestrator writes a prompt, a worker edits the code, a review checks it, and the orchestrator merges. The orchestrator's direct edit path into source code is blocked."
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        aria-hidden="true"
      />

      <div className="relative z-10 sm:hidden">
        <div className="mx-auto w-[178px] max-w-full">
          <div className="flex flex-col items-start gap-5">
            {STEPS.map((step, index) => (
              <StepNode
                key={`${step.name}-${index}-mobile`}
                ref={(node) => {
                  mobileAllowedRefs.current[index] = node;
                }}
                name={step.name}
                detail={step.detail}
                className="w-[178px] max-w-full"
              />
            ))}
          </div>

          <div className="mt-7 flex flex-col items-start gap-3">
            <BlockedNode ref={mobileBlockedStartRef} className="w-[132px]">
              Orchestrator
            </BlockedNode>
            <span
              ref={mobileBarrierRef}
              className="ml-[58px] rounded-full bg-background px-1 text-sm leading-none"
              style={{ color: faintText }}
              aria-hidden="true"
            >
              &times;
            </span>
            <BlockedNode ref={mobileBlockedSourceRef} strike className="w-[132px]">
              Source Code
            </BlockedNode>
            <div className="text-[10px]" style={{ color: faintText }}>
              Direct Edit: Forbidden by Rule
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 hidden sm:block">
        <div className="flex items-start justify-between gap-4">
          {STEPS.map((step, index) => (
            <StepNode
              key={`${step.name}-${index}-desktop`}
              ref={(node) => {
                desktopAllowedRefs.current[index] = node;
              }}
              name={step.name}
              detail={step.detail}
              className="w-[132px] shrink-0 text-center"
            />
          ))}
        </div>

        <div className="mt-7 flex items-center">
          <BlockedNode ref={desktopBlockedStartRef} className="shrink-0">
            Orchestrator
          </BlockedNode>
          <div className="flex min-h-5 flex-1 items-center justify-center">
            <span
              ref={desktopBarrierRef}
              className="rounded-full bg-background px-1 text-sm leading-none"
              style={{ color: faintText }}
              aria-hidden="true"
            >
              &times;
            </span>
          </div>
          <BlockedNode ref={desktopBlockedSourceRef} strike className="shrink-0">
            Source Code
          </BlockedNode>
        </div>
        <div className="mt-1.5 text-right text-[10px]" style={{ color: faintText }}>
          Direct Edit: Forbidden by Rule
        </div>
      </div>
    </div>
  );
}
