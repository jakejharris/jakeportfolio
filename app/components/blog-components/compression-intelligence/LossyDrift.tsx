'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// --- Constants ---

// Percentage remaining at each stage (before filter 1, after filters 1-8)
const STAGE_PERCENTAGES = [100, 95, 90.25, 85.74, 81.45, 77.38, 73.51, 69.83, 66.34];

// 8 filter positions (normalized x, 0-1), evenly spaced with margins
const FILTER_POSITIONS = Array.from({ length: 8 }, (_, i) => 0.14 + (i * 0.72) / 7);

// Responsive particle counts
const PARTICLE_COUNT_MOBILE = 40;
const PARTICLE_COUNT_TABLET = 70;
const PARTICLE_COUNT_DESKTOP = 100;

// Timing
const PHASE_DURATION = 1.2;
const NOISE_FALL_DURATION = 0.9;
const SETTLE_DURATION = 0.8;

// Stream positioning (normalized)
const STREAM_CENTER_Y = 0.38;
const STREAM_SPREAD = 0.18;
const START_X = 0.04;
const END_X = 0.96;

// --- Types ---

type ParticleState = 'waiting' | 'flowing' | 'dissolving' | 'arrived' | 'gone';

interface Particle {
  type: 'signal' | 'noise';
  x: number;
  y: number;
  baseY: number;
  radius: number;
  baseRadius: number;
  baseOpacity: number;
  currentOpacity: number;
  r: number;
  g: number;
  b: number;
  speed: number;
  phase: number;
  jitter: number;
  state: ParticleState;
  filterCaughtAt: number; // -1 for signal
  dissolveStartTime: number;
  startX: number;
  targetX: number;
}

// --- Helpers ---

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInQuad(t: number): number {
  return t * t;
}

function getParticleCount(width: number): number {
  if (width < 480) return PARTICLE_COUNT_MOBILE;
  if (width < 768) return PARTICLE_COUNT_TABLET;
  return PARTICLE_COUNT_DESKTOP;
}

// --- Particle creation ---

function createParticles(count: number, width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  const centerY = height * STREAM_CENTER_Y;
  const spread = height * STREAM_SPREAD;
  const startX = width * START_X;

  // Calculate how many noise particles die at each filter
  const noisePerFilter: number[] = [];
  let remaining = count;
  for (let k = 0; k < 8; k++) {
    const dies = Math.max(1, Math.round(remaining * 0.05));
    noisePerFilter.push(dies);
    remaining -= dies;
  }

  let idx = 0;

  // Noise particles — assigned to specific filters
  for (let filterIdx = 0; filterIdx < 8; filterIdx++) {
    for (let j = 0; j < noisePerFilter[filterIdx]; j++) {
      const baseY = centerY + (seededRandom(idx, 0) - 0.5) * 2 * spread;
      const opacityBase = 0.25 + seededRandom(idx, 1) * 0.2;
      particles.push({
        type: 'noise',
        x: startX + (seededRandom(idx, 2) - 0.5) * width * 0.03,
        y: baseY,
        baseY,
        radius: 1.2 + seededRandom(idx, 3) * 1.0,
        baseRadius: 1.2 + seededRandom(idx, 3) * 1.0,
        baseOpacity: opacityBase,
        currentOpacity: opacityBase,
        r: lerp(180, 255, seededRandom(idx, 4)),
        g: lerp(70, 110, seededRandom(idx, 5)),
        b: lerp(40, 65, seededRandom(idx, 6)),
        speed: 0.6 + seededRandom(idx, 7) * 0.3,
        phase: seededRandom(idx, 8) * Math.PI * 2,
        jitter: 2.5 + seededRandom(idx, 9) * 2.0,
        state: 'waiting',
        filterCaughtAt: filterIdx,
        dissolveStartTime: 0,
        startX: startX + (seededRandom(idx, 2) - 0.5) * width * 0.03,
        targetX: FILTER_POSITIONS[filterIdx] * width,
      });
      idx++;
    }
  }

  // Signal particles
  const signalCount = count - idx;
  for (let j = 0; j < signalCount; j++) {
    const baseY = centerY + (seededRandom(idx, 0) - 0.5) * 2 * spread;
    const opacityBase = 0.6 + seededRandom(idx, 1) * 0.3;
    particles.push({
      type: 'signal',
      x: startX + (seededRandom(idx, 2) - 0.5) * width * 0.03,
      y: baseY,
      baseY,
      radius: 1.8 + seededRandom(idx, 3) * 1.5,
      baseRadius: 1.8 + seededRandom(idx, 3) * 1.5,
      baseOpacity: opacityBase,
      currentOpacity: opacityBase,
      r: lerp(90, 140, seededRandom(idx, 4)),
      g: lerp(150, 210, seededRandom(idx, 5)),
      b: 255,
      speed: 0.6 + seededRandom(idx, 7) * 0.25,
      phase: seededRandom(idx, 8) * Math.PI * 2,
      jitter: 0.4 + seededRandom(idx, 9) * 0.4,
      state: 'waiting',
      filterCaughtAt: -1,
      dissolveStartTime: 0,
      startX: startX + (seededRandom(idx, 2) - 0.5) * width * 0.03,
      targetX: width * END_X,
    });
    idx++;
  }

  return particles;
}

// Deterministic pseudo-random for stable particle positions
function seededRandom(index: number, seed: number): number {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// --- Particle update ---

function updateParticles(
  particles: Particle[],
  dt: number,
  time: number,
  currentPhase: number,
  width: number,
  height: number,
) {
  const totalTravelTime = 8 * PHASE_DURATION;

  for (const p of particles) {
    // --- Waiting ---
    if (p.state === 'waiting') {
      p.y = p.baseY + Math.sin(time * 1.5 + p.phase) * p.jitter;
      p.x = p.startX + Math.sin(time * 0.8 + p.phase * 1.7) * p.jitter * 0.5;

      if (currentPhase >= 1) {
        p.state = 'flowing';
      }
      continue;
    }

    // --- Flowing ---
    if (p.state === 'flowing') {
      if (p.type === 'signal') {
        const travelSpeed = (width * (END_X - START_X)) / totalTravelTime;
        p.x += travelSpeed * dt;
        p.y = p.baseY + Math.sin(time * 1.5 + p.phase) * p.jitter;

        if (p.x >= p.targetX) {
          p.x = p.targetX;
          p.state = 'arrived';
          p.dissolveStartTime = time; // reuse for glow timing
        }
      } else {
        // Noise particle: travel from start to its assigned filter
        const filterPhase = p.filterCaughtAt + 1;
        const travelTime = filterPhase * PHASE_DURATION;
        const travelSpeed = (p.targetX - p.startX) / travelTime;
        p.x += travelSpeed * dt;
        p.y = p.baseY
          + Math.sin(time * 2.5 + p.phase) * p.jitter
          + Math.cos(time * 3.7 + p.phase * 0.6) * p.jitter * 0.5;

        if (p.x >= p.targetX) {
          p.x = p.targetX;
          p.state = 'dissolving';
          p.dissolveStartTime = time;
        }
      }
      continue;
    }

    // --- Dissolving (noise only) ---
    if (p.state === 'dissolving') {
      const elapsed = time - p.dissolveStartTime;
      const t = Math.min(elapsed / NOISE_FALL_DURATION, 1.0);
      const easedT = easeInQuad(t);

      // Drift downward with gravity
      p.y += (40 + (p.filterCaughtAt * 4)) * dt * (0.3 + easedT);
      // Slight horizontal scatter
      p.x += Math.sin(time * 3 + p.phase) * 0.3 * (1 - easedT);
      // Fade
      p.currentOpacity = p.baseOpacity * (1 - easedT);
      // Shrink
      p.radius = p.baseRadius * (1 - easedT * 0.4);

      if (t >= 1.0 || p.y > height) {
        p.state = 'gone';
        p.currentOpacity = 0;
      }
      continue;
    }

    // --- Arrived (signal) ---
    if (p.state === 'arrived') {
      p.y = p.baseY + Math.sin(time * 1.2 + p.phase) * p.jitter * 0.3;

      if (currentPhase >= 9) {
        const glowElapsed = time - p.dissolveStartTime;
        const glowT = Math.min(glowElapsed / SETTLE_DURATION, 1.0);
        p.currentOpacity = Math.min(1.0, p.baseOpacity + 0.25 * easeOutCubic(glowT));
      }
    }
  }
}

// --- Reduced motion static frame ---

function drawReducedMotion(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0a0a14');
  bgGrad.addColorStop(0.5, '#0d0d1a');
  bgGrad.addColorStop(1, '#0a0a14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Draw 8 faded filter lines
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(80, 140, 220, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const fx = FILTER_POSITIONS[i] * width;
    ctx.beginPath();
    ctx.moveTo(fx, height * 0.08);
    ctx.lineTo(fx, height * 0.70);
    ctx.stroke();
  }
  ctx.restore();

  const centerY = height * 0.40;
  const leftCenterX = width * 0.07;
  const rightCenterX = width * 0.93;

  // Left cluster: mixed signal + noise (golden angle spiral)
  const leftCount = 20;
  for (let i = 0; i < leftCount; i++) {
    const isNoise = i < 7;
    const angle = i * 2.399963;
    const rSpread = Math.sqrt(i / leftCount) * Math.min(width * 0.04, 30);
    const px = leftCenterX + Math.cos(angle) * rSpread;
    const py = centerY + Math.sin(angle) * rSpread * 1.8;
    const r = isNoise ? 1.3 : 2.0;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = isNoise
      ? 'rgba(230, 90, 55, 0.35)'
      : 'rgba(100, 170, 255, 0.7)';
    ctx.fill();
  }

  // Right cluster: only signal, brighter
  const rightCount = 13;
  for (let i = 0; i < rightCount; i++) {
    const angle = i * 2.399963;
    const rSpread = Math.sqrt(i / rightCount) * Math.min(width * 0.03, 22);
    const px = rightCenterX + Math.cos(angle) * rSpread;
    const py = centerY + Math.sin(angle) * rSpread * 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120, 200, 255, 0.85)';
    ctx.fill();

    // Glow
    const glowR = 8;
    const glow = ctx.createRadialGradient(px, py, 0, px, py, glowR);
    glow.addColorStop(0, 'rgba(120, 200, 255, 0.25)');
    glow.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Arrow
  const arrowY = centerY;
  ctx.strokeStyle = 'rgba(160, 175, 220, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(width * 0.15, arrowY);
  ctx.lineTo(width * 0.85, arrowY);
  ctx.moveTo(width * 0.82, arrowY - 5);
  ctx.lineTo(width * 0.85, arrowY);
  ctx.lineTo(width * 0.82, arrowY + 5);
  ctx.stroke();

  // Labels
  const fontSize = Math.max(10, Math.min(13, width * 0.022));
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(180, 200, 240, 0.6)';
  ctx.fillText('100%', leftCenterX, height * 0.78);
  ctx.fillStyle = 'rgba(140, 210, 255, 0.85)';
  ctx.fillText('66.34%', rightCenterX, height * 0.78);

  // Subtitle labels
  const subFontSize = Math.max(8, Math.min(10, width * 0.016));
  ctx.font = `${subFontSize}px ui-monospace, SFMono-Regular, monospace`;
  ctx.fillStyle = 'rgba(160, 175, 220, 0.35)';
  ctx.fillText('signal + noise', leftCenterX, height * 0.84);
  ctx.fillStyle = 'rgba(140, 210, 255, 0.5)';
  ctx.fillText('pure signal', rightCenterX, height * 0.84);
}

// --- Component ---

export default function LossyDrift() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const phaseRef = useRef(0);
  const phaseStartTimeRef = useRef(0);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const time = timeRef.current;
    const particles = particlesRef.current;
    const currentPhase = phaseRef.current;

    // --- Background ---
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a0a14');
    bgGrad.addColorStop(0.5, '#0d0d1a');
    bgGrad.addColorStop(1, '#0a0a14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // --- Filter barriers ---
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const fx = FILTER_POSITIONS[i] * width;
      const isActive = currentPhase >= i + 1;

      // Dashed vertical line
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = isActive
        ? 'rgba(80, 140, 220, 0.25)'
        : 'rgba(80, 140, 220, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx, height * 0.08);
      ctx.lineTo(fx, height * 0.68);
      ctx.stroke();

      // Glow band when active
      if (isActive) {
        const glowGrad = ctx.createLinearGradient(fx - 10, 0, fx + 10, 0);
        glowGrad.addColorStop(0, 'rgba(80, 140, 220, 0)');
        glowGrad.addColorStop(0.5, 'rgba(80, 140, 220, 0.05)');
        glowGrad.addColorStop(1, 'rgba(80, 140, 220, 0)');
        ctx.fillStyle = glowGrad;
        ctx.setLineDash([]);
        ctx.fillRect(fx - 10, height * 0.08, 20, height * 0.60);
      }

      // Filter label
      const fontSize = Math.max(8, Math.min(11, width * 0.018));
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, monospace`;
      ctx.fillStyle = isActive
        ? 'rgba(160, 175, 220, 0.5)'
        : 'rgba(160, 175, 220, 0.25)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.setLineDash([]);
      ctx.fillText(`L${i + 1}`, fx, height * 0.71);
    }
    ctx.restore();

    // --- Percentage labels ---
    ctx.save();
    const pctFontSize = Math.max(8, Math.min(11, width * 0.017));
    ctx.font = `${pctFontSize}px ui-monospace, SFMono-Regular, monospace`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    for (let i = 0; i < STAGE_PERCENTAGES.length; i++) {
      let px: number;
      if (i === 0) {
        px = width * START_X;
      } else if (i === 8) {
        px = width * END_X;
      } else {
        px = ((FILTER_POSITIONS[i - 1] + FILTER_POSITIONS[i]) / 2) * width;
      }

      const isReached = currentPhase >= i;
      const isFinal = i === 8 && currentPhase >= 9;

      ctx.fillStyle = isFinal
        ? `rgba(140, 210, 255, ${0.75 + 0.1 * Math.sin(time * 2)})`
        : isReached
          ? 'rgba(180, 200, 240, 0.55)'
          : 'rgba(160, 175, 220, 0.15)';

      const pctText = i === 0 ? '100%' : `${STAGE_PERCENTAGES[i].toFixed(1)}%`;
      ctx.fillText(pctText, px, height * 0.80);
    }
    ctx.restore();

    // --- Particles ---
    for (const p of particles) {
      if (p.state === 'gone') continue;
      if (p.currentOpacity <= 0.01) continue;

      // Final glow halo for arrived signal particles
      if (p.type === 'signal' && p.state === 'arrived' && currentPhase >= 9) {
        const glowR = p.radius * 4;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        glow.addColorStop(0, `rgba(${Math.round(p.r)}, ${Math.round(p.g)}, ${Math.round(p.b)}, ${p.currentOpacity * 0.35})`);
        glow.addColorStop(0.5, `rgba(${Math.round(p.r)}, ${Math.round(p.g)}, ${Math.round(p.b)}, ${p.currentOpacity * 0.1})`);
        glow.addColorStop(1, `rgba(${Math.round(p.r)}, ${Math.round(p.g)}, ${Math.round(p.b)}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core particle dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.round(p.r)}, ${Math.round(p.g)}, ${Math.round(p.b)}, ${p.currentOpacity})`;
      ctx.fill();
    }

    // --- "Signal" / "Noise" legend (top corners, subtle) ---
    if (currentPhase >= 1) {
      const legendFontSize = Math.max(8, Math.min(10, width * 0.015));
      ctx.font = `${legendFontSize}px ui-monospace, SFMono-Regular, monospace`;
      ctx.textBaseline = 'top';

      // Signal legend (top-right)
      ctx.fillStyle = 'rgba(100, 170, 255, 0.4)';
      ctx.textAlign = 'right';
      ctx.fillText('signal', width - 10, 8);
      ctx.beginPath();
      ctx.arc(width - ctx.measureText('signal').width - 16, 13, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100, 170, 255, 0.6)';
      ctx.fill();

      // Noise legend (top-left)
      ctx.fillStyle = 'rgba(230, 90, 55, 0.4)';
      ctx.textAlign = 'left';
      ctx.fillText('noise', 18, 8);
      ctx.beginPath();
      ctx.arc(12, 13, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(230, 90, 55, 0.45)';
      ctx.fill();
    }
  }, []);

  // Reduced motion detection
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Scroll trigger
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Canvas setup and animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimensionsRef.current = { width: rect.width, height: rect.height };
      const count = getParticleCount(rect.width);
      particlesRef.current = createParticles(count, rect.width, rect.height);
      phaseRef.current = 0;
      phaseStartTimeRef.current = 0;
      timeRef.current = 0;
    };

    resize();
    window.addEventListener('resize', resize);

    if (prefersReducedMotion) {
      const { width, height } = dimensionsRef.current;
      drawReducedMotion(ctx, width, height);
    } else {
      let lastTime = performance.now();

      const animate = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        timeRef.current += dt;

        const { width, height } = dimensionsRef.current;

        // Phase advancement
        if (isVisible && phaseRef.current < 9) {
          if (phaseRef.current === 0) {
            phaseRef.current = 1;
            phaseStartTimeRef.current = timeRef.current;
          } else {
            const phaseElapsed = timeRef.current - phaseStartTimeRef.current;
            if (phaseElapsed >= PHASE_DURATION) {
              phaseRef.current += 1;
              phaseStartTimeRef.current = timeRef.current;
            }
          }
        }

        updateParticles(
          particlesRef.current,
          dt,
          timeRef.current,
          phaseRef.current,
          width,
          height,
        );

        draw(ctx, width, height);
        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [prefersReducedMotion, isVisible, draw]);

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-white/10 bg-[#0a0a14]"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-[280px] sm:h-[340px] md:h-[420px]"
        aria-label="Animated diagram showing a particle stream passing through eight compression filters, where noise particles are stripped away at each layer while signal particles grow brighter and more cohesive, retaining 66 percent of the original as pure signal"
        role="img"
      />
    </div>
  );
}
