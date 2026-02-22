'use client';

// Visualizes "Lossy drift" from "The Hard Problems." Signal particles (blue)
// and noise particles (red/orange) flow left-to-right through eight
// sequential compression filters. At each filter, ~5% of remaining noise is
// caught and dissolves (red sparks), while signal passes through unimpeded.
// After all eight layers, 66.34% of the original stream survives as pure
// signal. Hover over filter barriers for real-time purge statistics.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { getCanvasTheme } from './theme-colors';

// ─── Configuration & Math ─────────────────────────────────────────────────
const MAX_PARTICLES = 350;
const STAGE_PERCENTAGES = [100, 95.0, 90.3, 85.7, 81.5, 77.4, 73.5, 69.8, 66.3];
const FILTER_POSITIONS = [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85];

// How much of the original 100% is lost at each specific filter (totaling ~33.66%)
const STAGE_DROPS = [5.0, 4.75, 4.51, 4.29, 4.07, 3.87, 3.68, 3.49];
const TOTAL_NOISE = 33.66; // 100 - 66.34

type ParticleType = 'signal' | 'noise';

interface Particle {
  id: number;
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseY: number;
  targetY: number;
  radius: number;
  phase: number;
  jitter: number;
  deathFilter: number; // -1 if signal, 0-7 if noise
  history: { x: number; y: number }[];
  active: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  rgb: string;
}

interface FilterStats {
  purgedCount: number;
  pulseTime: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getDeathFilter(): number {
  let r = Math.random() * TOTAL_NOISE;
  for (let i = 0; i < 8; i++) {
    if (r < STAGE_DROPS[i]) return i;
    r -= STAGE_DROPS[i];
  }
  return 7;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function LossyDrift() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const particlesRef = useRef<Particle[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const filterStatsRef = useRef<FilterStats[]>(
    Array(8).fill(null).map(() => ({ purgedCount: 0, pulseTime: 0 }))
  );
  const particleIdCounter = useRef(0);

  const mouseRef = useRef({ x: -1000, y: -1000, activeFilter: -1 });
  const dimsRef = useRef({ w: 0, h: 0 });
  const timeRef = useRef(0);
  const [noMotion, setNoMotion] = useState(false);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const theme = getCanvasTheme(isDark);

  // --- Spawner ---
  const spawnParticle = useCallback((w: number, h: number, startX: number = 0) => {
    const isNoise = Math.random() < (TOTAL_NOISE / 100);
    const type: ParticleType = isNoise ? 'noise' : 'signal';
    const baseY = h * 0.50 + (Math.random() - 0.5) * (h * 0.35);

    particlesRef.current.push({
      id: particleIdCounter.current++,
      type,
      x: startX,
      y: baseY,
      vx: w * 0.0012 + Math.random() * (w * 0.0005),
      vy: 0,
      baseY,
      targetY: h * 0.50,
      radius: type === 'signal' ? 2.5 + Math.random() * 1.0 : 1.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      jitter: type === 'noise' ? 3 + Math.random() * 3 : 0.5 + Math.random() * 1,
      deathFilter: isNoise ? getDeathFilter() : -1,
      history: [],
      active: true,
    });
  }, []);

  // --- Main Render Loop ---
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => {
    if (w === 0 || h === 0) return;
    const time = timeRef.current;
    const particles = particlesRef.current;
    const sparks = sparksRef.current;
    const filterStats = filterStatsRef.current;
    const mouse = mouseRef.current;

    // 1. Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, theme.bg);
    bgGrad.addColorStop(0.5, theme.bgMid);
    bgGrad.addColorStop(1, theme.bg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle horizontal flow lines
    ctx.save();
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    for (let y = h * 0.25; y <= h * 0.75; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Filter Barriers & Percentages
    let hoveredFilterIndex = -1;

    for (let i = 0; i < 8; i++) {
      const fx = FILTER_POSITIONS[i] * w;
      const isHovered = Math.abs(mouse.x - fx) < w * 0.04 && mouse.y < h * 0.92;
      if (isHovered) hoveredFilterIndex = i;

      // Pulse effect from catching noise
      const timeSincePulse = time - filterStats[i].pulseTime;
      const pulseIntensity = Math.max(0, 1 - timeSincePulse * 2);

      // Filter Line
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -time * 10;
      ctx.strokeStyle = `rgba(${theme.filterLine}, ${0.15 + pulseIntensity * 0.5})`;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(fx, h * 0.15);
      ctx.lineTo(fx, h * 0.80);
      ctx.stroke();
      ctx.restore();

      // Glow when active or hit
      if (isHovered || pulseIntensity > 0) {
        const glowGrad = ctx.createLinearGradient(fx - 15, 0, fx + 15, 0);
        const glowAlpha = isHovered ? 0.1 : pulseIntensity * 0.2;
        glowGrad.addColorStop(0, `rgba(${theme.filterLine}, 0)`);
        glowGrad.addColorStop(0.5, `rgba(${theme.filterLine}, ${glowAlpha})`);
        glowGrad.addColorStop(1, `rgba(${theme.filterLine}, 0)`);
        ctx.fillStyle = glowGrad;
        ctx.fillRect(fx - 15, h * 0.15, 30, h * 0.65);
      }

      // Filter label (top)
      ctx.fillStyle = `rgba(${theme.labelDim}, 0.6)`;
      ctx.font = `600 ${Math.max(10, w * 0.012)}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`L${i + 1}`, fx, h * 0.12);

      // Percentage label (bottom)
      ctx.fillStyle = isHovered
        ? `rgba(${theme.labelBright}, 1)`
        : `rgba(${theme.blue}, ${0.4 + (i / 8) * 0.4})`;
      ctx.fillText(`${STAGE_PERCENTAGES[i + 1]}%`, fx, h * 0.87);
    }
    mouse.activeFilter = hoveredFilterIndex;

    // Start/End labels
    ctx.font = `600 ${Math.max(10, w * 0.012)}px ui-monospace, monospace`;
    ctx.fillStyle = `rgba(${theme.noise}, 0.7)`;
    ctx.textAlign = 'left';
    ctx.fillText('100% INPUT', w * 0.02, h * 0.87);

    ctx.fillStyle = `rgba(${theme.signal}, 0.9)`;
    ctx.textAlign = 'right';
    ctx.fillText(`${STAGE_PERCENTAGES[8]}% SIGNAL`, w * 0.98, h * 0.87);

    // 3. Update & Draw Particles
    if (!noMotion) {
      if (particles.length < MAX_PARTICLES && Math.random() < 0.7) {
        spawnParticle(w, h, -20);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > (p.type === 'signal' ? 12 : 6)) p.history.shift();

        // Check Filter Crossings
        let crossedFilter = -1;
        for (let j = 0; j < 8; j++) {
          const fx = FILTER_POSITIONS[j] * w;
          if (p.x < fx && p.x + p.vx >= fx) {
            crossedFilter = j;
            break;
          }
        }

        if (crossedFilter !== -1) {
          if (p.type === 'noise' && p.deathFilter === crossedFilter) {
            // CAUGHT! Strip the noise
            filterStats[crossedFilter].purgedCount++;
            filterStats[crossedFilter].pulseTime = time;

            // Shatter into sparks
            for (let s = 0; s < 4; s++) {
              sparks.push({
                x: FILTER_POSITIONS[crossedFilter] * w,
                y: p.y,
                vx: (Math.random() - 0.5) * 60,
                vy: (Math.random() * 40) + 20,
                life: 0,
                maxLife: 0.5 + Math.random() * 0.5,
                rgb: theme.noise,
              });
            }
            particles.splice(i, 1);
            continue;
          }
        }

        // Physics
        p.x += p.vx;
        const funnelStrength = p.type === 'signal' ? 0.02 * (p.x / w) : 0.005;
        p.vy += (p.targetY - p.y) * funnelStrength;
        p.vy *= 0.9;
        const wobble = Math.sin(time * 5 + p.phase) * p.jitter;
        p.y += p.vy + wobble;

        // Cleanup off-screen
        if (p.x > w + 20) particles.splice(i, 1);
      }
    }

    // 4. Render Particles
    ctx.save();
    for (const p of particles) {
      const isSignal = p.type === 'signal';
      const alpha = isSignal ? 0.85 : 0.6;
      const rgb = isSignal ? theme.signal : theme.noise;

      // Trails
      if (p.history.length > 1 && !noMotion) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (let i = 1; i < p.history.length; i++) {
          ctx.lineTo(p.history[i].x, p.history[i].y);
        }
        const grad = ctx.createLinearGradient(p.history[0].x, p.history[0].y, p.x, p.y);
        grad.addColorStop(0, `rgba(${rgb}, 0)`);
        grad.addColorStop(1, `rgba(${rgb}, ${alpha * 0.5})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = p.radius * 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
      ctx.fill();

      // Glow for signal
      if (isSignal) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        glow.addColorStop(0, `rgba(${rgb}, 0.3)`);
        glow.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 5. Render Sparks (Caught Noise)
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        sparks.splice(i, 1);
        continue;
      }

      s.vy += 200 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const alpha = 1 - (s.life / s.maxLife);
      ctx.fillStyle = `rgba(${s.rgb}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${s.rgb}, ${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * dt * 2, s.y - s.vy * dt * 2);
      ctx.stroke();
    }

    // 6. Output Collector Glow (Right side)
    const oCx = w;
    const oCy = h * 0.50;
    const oGr = 80 + 10 * Math.sin(time * 2);
    const oGlow = ctx.createRadialGradient(oCx, oCy, 0, oCx, oCy, oGr);
    oGlow.addColorStop(0, `rgba(${theme.signal}, 0.25)`);
    oGlow.addColorStop(0.5, `rgba(${theme.signal}, 0.05)`);
    oGlow.addColorStop(1, `rgba(${theme.signal}, 0)`);
    ctx.fillStyle = oGlow;
    ctx.beginPath();
    ctx.arc(oCx, oCy, oGr, 0, Math.PI * 2);
    ctx.fill();

    // 7. Interactive HUD
    if (hoveredFilterIndex !== -1) {
      const stats = filterStats[hoveredFilterIndex];
      const tWidth = 180;
      const tHeight = 85;

      let tx = mouse.x + 15;
      let ty = mouse.y + 15;
      if (tx + tWidth > w) tx = mouse.x - tWidth - 15;
      if (ty + tHeight > h) ty = mouse.y - tHeight - 15;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      // Tooltip BG
      ctx.fillStyle = isDark ? 'rgba(15, 15, 25, 0.95)' : 'rgba(240, 242, 248, 0.95)';
      ctx.strokeStyle = `rgba(${theme.filterLine}, 0.5)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tWidth, tHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      const pad = 12;
      const lh = 20;

      ctx.fillStyle = isDark ? '#FFFFFF' : '#1a1a2e';
      ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Layer ${hoveredFilterIndex + 1} Filter`, tx + pad, ty + pad);

      ctx.fillStyle = `rgba(${theme.signal}, 1)`;
      ctx.font = '11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(`Passing : ${STAGE_PERCENTAGES[hoveredFilterIndex + 1]}%`, tx + pad, ty + pad + lh * 1.3);

      ctx.fillStyle = `rgba(${theme.noise}, 1)`;
      ctx.fillText(`Noise Purged: ${stats.purgedCount}`, tx + pad, ty + pad + lh * 2.3);

      ctx.restore();
    }

  }, [noMotion, spawnParticle, theme, isDark]);

  // --- Reduced motion detection ---
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setNoMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setNoMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // --- Initialization & Loop ---
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = cvs.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimsRef.current = { w: rect.width, h: rect.height };

      // Pre-fill particles
      particlesRef.current = [];
      filterStatsRef.current = Array(8).fill(null).map(() => ({ purgedCount: 0, pulseTime: 0 }));
      particleIdCounter.current = 0;
      for (let i = 0; i < MAX_PARTICLES * 0.7; i++) {
        spawnParticle(rect.width, rect.height, Math.random() * rect.width);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = cvs.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };
    cvs.addEventListener('mousemove', handleMouseMove);
    cvs.addEventListener('mouseleave', handleMouseLeave);

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      timeRef.current += dt;

      if (mouseRef.current.activeFilter !== -1) {
        cvs.style.cursor = 'crosshair';
      } else {
        cvs.style.cursor = 'default';
      }

      draw(ctx, dimsRef.current.w, dimsRef.current.h, dt);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cvs.removeEventListener('mousemove', handleMouseMove);
      cvs.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [noMotion, draw, spawnParticle]);

  return (
    <div className="w-full flex justify-center items-center">
      <div className="w-full max-w-5xl">
        <div
          ref={containerRef}
          className={`relative rounded-xl overflow-hidden border shadow-2xl group ${
            isDark
              ? 'border-white/10 shadow-blue-900/10'
              : 'border-black/10 shadow-blue-200/20'
          }`}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-[320px] sm:h-[400px] md:h-[480px] outline-none"
            aria-label="Interactive simulation showing red noise particles being filtered out of a blue signal stream across 8 sequential layers. Hover over filter barriers for real-time purge statistics."
            role="img"
          />
          <div className={`absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ${
            isDark ? 'ring-white/10' : 'ring-black/5'
          }`} />
        </div>
      </div>
    </div>
  );
}
