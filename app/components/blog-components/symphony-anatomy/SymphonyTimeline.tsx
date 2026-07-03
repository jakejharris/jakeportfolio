'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import {
  rgba,
  type RgbTriplet,
  useCanvasColors,
} from '@/app/components/blog-components/canvas-theme';

type Kind = 'build' | 'integrate' | 'verify';

interface Phase {
  label: string;
  minutes: number;
  kind: Kind;
}

interface Row extends Phase {
  start: number;
  duration: number;
}

interface TrackRect extends Row {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TimelineGeometry {
  width: number;
  height: number;
  dpr: number;
  axis: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
  };
  tracks: TrackRect[];
}

interface CanvasPalette {
  accent: RgbTriplet;
  fg: RgbTriplet;
  isDark: boolean;
  ready: boolean;
}

const PHASES: Phase[] = [
  { label: 'Wave 1, 2 Agents', minutes: 10, kind: 'build' },
  { label: 'Wave 2, 4 Agents + 4 Reviewers', minutes: 15, kind: 'build' },
  { label: 'Integrate', minutes: 5, kind: 'integrate' },
  { label: 'Wave 3, 2 Agents', minutes: 10, kind: 'build' },
  { label: 'Integrate', minutes: 3, kind: 'integrate' },
  { label: 'PR 8, Largest Slice', minutes: 15, kind: 'build' },
  { label: 'Integrate', minutes: 3, kind: 'integrate' },
  { label: 'Smoke Test + Race Fix', minutes: 10, kind: 'verify' },
];

const RAW_TOTAL = PHASES.reduce((sum, phase) => sum + phase.minutes, 0);
const AXIS_TOTAL = 70;
const SWEEP_MS = 6200;
const PAUSE_MS = 1200;
const LOOP_MS = SWEEP_MS + PAUSE_MS;

const LEGEND: { kind: Kind; label: string }[] = [
  { kind: 'build', label: 'Parallel Build' },
  { kind: 'integrate', label: 'Integration' },
  { kind: 'verify', label: 'Verification' },
];

function buildRows(): Row[] {
  let elapsed = 0;

  return PHASES.map((phase) => {
    const start = (elapsed / RAW_TOTAL) * AXIS_TOTAL;
    const duration = (phase.minutes / RAW_TOTAL) * AXIS_TOTAL;
    elapsed += phase.minutes;

    return { ...phase, start, duration };
  });
}

function kindBaseStyle(kind: Kind): CSSProperties {
  if (kind === 'build') {
    return {
      backgroundColor: 'color-mix(in srgb, var(--accent-color) 22%, transparent)',
      border: '1px solid color-mix(in srgb, var(--accent-color) 34%, transparent)',
    };
  }

  if (kind === 'integrate') {
    return {
      backgroundColor:
        'color-mix(in srgb, hsl(var(--foreground)) 12%, transparent)',
      border:
        '1px solid color-mix(in srgb, hsl(var(--foreground)) 18%, transparent)',
    };
  }

  return {
    backgroundColor: 'transparent',
    border:
      '1px solid color-mix(in srgb, hsl(var(--foreground)) 48%, transparent)',
  };
}

function legendStyle(kind: Kind): CSSProperties {
  if (kind === 'build') {
    return { backgroundColor: 'var(--accent-color)' };
  }

  if (kind === 'integrate') {
    return {
      backgroundColor:
        'color-mix(in srgb, hsl(var(--foreground)) 28%, transparent)',
    };
  }

  return {
    backgroundColor: 'transparent',
    border:
      '1px solid color-mix(in srgb, hsl(var(--foreground)) 55%, transparent)',
  };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillColor(kind: Kind, palette: CanvasPalette) {
  if (kind === 'build') return rgba(palette.accent, palette.ready ? 0.72 : 0.52);
  if (kind === 'integrate') return rgba(palette.fg, palette.isDark ? 0.32 : 0.26);
  return rgba(palette.fg, palette.isDark ? 0.44 : 0.38);
}

function drawTrackFill(
  ctx: CanvasRenderingContext2D,
  track: TrackRect,
  progressMinutes: number,
  palette: CanvasPalette
) {
  const phaseStart = track.start;
  const phaseEnd = track.start + track.duration;
  const filledMinutes = Math.max(
    0,
    Math.min(progressMinutes, phaseEnd) - phaseStart
  );

  if (filledMinutes <= 0) return;

  const barLeft = track.left + (phaseStart / AXIS_TOTAL) * track.width;
  const barRight = track.left + (phaseEnd / AXIS_TOTAL) * track.width;
  const fillRight = track.left + ((phaseStart + filledMinutes) / AXIS_TOTAL) * track.width;
  const fillWidth = Math.max(0, Math.min(fillRight, barRight) - barLeft);

  if (fillWidth <= 0) return;

  ctx.save();
  roundedRect(ctx, barLeft, track.top, barRight - barLeft, track.height, 3);
  ctx.clip();
  ctx.fillStyle = fillColor(track.kind, palette);
  roundedRect(ctx, barLeft, track.top, fillWidth, track.height, 3);
  ctx.fill();

  if (track.kind === 'build') {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(palette.accent, 0.14);
    roundedRect(ctx, barLeft, track.top - 1, fillWidth, track.height + 2, 4);
    ctx.fill();
  }

  ctx.restore();
}

function drawSweepHead(
  ctx: CanvasRenderingContext2D,
  geometry: TimelineGeometry,
  progressMinutes: number,
  palette: CanvasPalette,
  showHead: boolean
) {
  if (!showHead) return;

  const x =
    geometry.axis.left + (progressMinutes / AXIS_TOTAL) * geometry.axis.width;
  const top = geometry.axis.top - 6;
  const bottom = geometry.axis.bottom + 6;

  ctx.save();
  const glow = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
  glow.addColorStop(0, rgba(palette.accent, 0));
  glow.addColorStop(0.5, rgba(palette.accent, 0.16));
  glow.addColorStop(1, rgba(palette.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - 20, top, 40, bottom - top);

  ctx.shadowColor = rgba(palette.accent, 0.55);
  ctx.shadowBlur = 12;
  ctx.strokeStyle = rgba(palette.accent, 0.9);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();

  ctx.fillStyle = rgba(palette.accent, 0.95);
  ctx.beginPath();
  ctx.arc(x, top + 2, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFrame(
  canvas: HTMLCanvasElement,
  geometry: TimelineGeometry,
  palette: CanvasPalette,
  progressMinutes: number,
  showHead: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(geometry.dpr, 0, 0, geometry.dpr, 0, 0);
  ctx.clearRect(0, 0, geometry.width, geometry.height);

  for (const track of geometry.tracks) {
    drawTrackFill(ctx, track, progressMinutes, palette);
  }

  drawSweepHead(ctx, geometry, progressMinutes, palette, showHead);
}

function readGeometry(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  trackNodes: HTMLDivElement[],
  rows: Row[]
): TimelineGeometry | null {
  const containerRect = container.getBoundingClientRect();
  if (!containerRect.width || !containerRect.height) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = containerRect.width;
  const height = containerRect.height;
  const backingWidth = Math.max(1, Math.round(width * dpr));
  const backingHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;

  const tracks = trackNodes.map((node, index) => {
    const rect = node.getBoundingClientRect();
    const left = rect.left - containerRect.left;
    const top = rect.top - containerRect.top;

    return {
      ...rows[index],
      left,
      top,
      width: rect.width,
      height: rect.height,
    };
  });

  const first = tracks[0];
  const last = tracks[tracks.length - 1];

  if (!first || !last) return null;

  return {
    width,
    height,
    dpr,
    axis: {
      left: first.left,
      right: first.left + first.width,
      top: first.top,
      bottom: last.top + last.height,
      width: first.width,
    },
    tracks,
  };
}

export default function SymphonyTimeline() {
  const rows = useMemo(buildRows, []);
  const colors = useCanvasColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRefs = useRef<Array<HTMLDivElement | null>>([]);
  const geometryRef = useRef<TimelineGeometry | null>(null);
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
    const tracks = trackRefs.current.filter(
      (track): track is HTMLDivElement => Boolean(track)
    );

    if (!container || !canvas || tracks.length !== rows.length) return;

    const geometry = readGeometry(container, canvas, tracks, rows);
    if (!geometry) return;

    geometryRef.current = geometry;
    setLayoutVersion((version) => version + 1);
    drawFrame(canvas, geometry, getPalette(), AXIS_TOTAL, false);
  }, [getPalette, rows]);

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

    if (!canvas || !geometry) return;

    drawFrame(canvas, geometry, getPalette(), AXIS_TOTAL, false);
  }, [colors, getPalette, layoutVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const geometry = geometryRef.current;

    if (!canvas || !geometry) return;

    if (reducedMotion) {
      drawFrame(canvas, geometry, getPalette(), AXIS_TOTAL, false);
      return;
    }

    if (!visible) return;

    let frame = 0;
    const tick = (time: number) => {
      const latestCanvas = canvasRef.current;
      const latestGeometry = geometryRef.current;

      if (latestCanvas && latestGeometry) {
        const loopTime = time % LOOP_MS;
        const progressMinutes =
          loopTime <= SWEEP_MS ? (loopTime / SWEEP_MS) * AXIS_TOTAL : AXIS_TOTAL;

        drawFrame(
          latestCanvas,
          latestGeometry,
          getPalette(),
          progressMinutes,
          true
        );
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [getPalette, layoutVersion, reducedMotion, visible]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-foreground/10 p-4 font-mono sm:p-6"
      role="img"
      aria-label="Timeline of a 70 minute Symphony run from 15:08 to 16:18: three waves of parallel agent builds, short integration steps between them, one large final slice, and a closing smoke test that caught a race condition"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        aria-hidden="true"
      />

      <div className="relative z-10 mb-4 flex items-baseline justify-between gap-3 text-[10px] text-muted-foreground sm:text-[11px]">
        <span>15:08</span>
        <span className="text-center text-foreground/70">
          10 PRs, ~6,800 LOC, 34 Tests
        </span>
        <span>16:18</span>
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-y-3 sm:grid-cols-[210px_1fr] sm:gap-x-3 sm:gap-y-2">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="flex flex-col gap-1 sm:contents">
            <div className="flex min-w-0 items-center justify-between gap-2 text-[10px] leading-tight text-muted-foreground sm:text-[10px]">
              <span className="min-w-0 whitespace-nowrap">{row.label}</span>
              <span className="shrink-0 text-foreground/40">{row.minutes}m</span>
            </div>
            <div
              ref={(node) => {
                trackRefs.current[index] = node;
              }}
              className="relative h-3.5 sm:h-4"
            >
              <div
                className="absolute inset-y-0 rounded-[3px]"
                style={{
                  left: `${(row.start / AXIS_TOTAL) * 100}%`,
                  width: `${(row.duration / AXIS_TOTAL) * 100}%`,
                  ...kindBaseStyle(row.kind),
                }}
              />
            </div>
          </div>
        ))}

        <div aria-hidden="true" className="hidden sm:block" />
        <div className="flex justify-between border-t border-foreground/10 pt-1 text-[9px] text-foreground/40 sm:text-[10px]">
          <span>0m</span>
          <span>35m</span>
          <span>70m</span>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {LEGEND.map(({ kind, label }) => (
          <span
            key={kind}
            className="flex items-center gap-1.5 text-[9px] text-muted-foreground sm:text-[10px]"
          >
            <span
              className="inline-block h-2 w-3 rounded-[2px]"
              style={legendStyle(kind)}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
