'use client';

// Visualizes the article's core thesis: compression is intelligence. Particles
// scattered across four named layers (Raw Input → Features → Compression →
// Latent Space) drift toward a central convergence point, representing how
// raw, noisy data gets progressively compressed into dense latent
// representations. The movement mirrors the claim that "every optimization
// I'd made was the same operation at different scales" — information
// converging from chaos into signal.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { getCanvasTheme } from './theme-colors';

// --- Constants ---
const PARTICLE_COUNT = 60;
const CONVERGENCE_X = 0.5; // Normalized center
const CONVERGENCE_Y = 0.5;
const LAYER_LABELS = ['Raw Input', 'Features', 'Compression', 'Latent Space'];
const LAYER_POSITIONS = [0.1, 0.35, 0.65, 0.9]; // Normalized x-positions

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  baseX: number;
  baseY: number;
  radius: number;
  speed: number;
  phase: number;
  layer: number;
  opacity: number;
}

function createParticles(width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const layer = Math.floor(Math.random() * LAYER_POSITIONS.length);
    const layerX = LAYER_POSITIONS[layer] * width;
    // Spread decreases toward later layers (compression effect)
    const spread = (1 - layer / LAYER_POSITIONS.length) * 0.35 + 0.05;
    const baseX = layerX + (Math.random() - 0.5) * width * spread * 0.5;
    const baseY = height * CONVERGENCE_Y + (Math.random() - 0.5) * height * spread;

    particles.push({
      x: baseX,
      y: baseY,
      targetX: width * CONVERGENCE_X,
      targetY: height * CONVERGENCE_Y,
      baseX,
      baseY,
      radius: 1.5 + Math.random() * 2,
      speed: 0.003 + Math.random() * 0.004,
      phase: Math.random() * Math.PI * 2,
      layer,
      opacity: 0.4 + Math.random() * 0.5,
    });
  }
  return particles;
}

export default function HeroCompression() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const theme = getCanvasTheme(isDark);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const time = timeRef.current;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, theme.bg);
    bgGrad.addColorStop(0.5, theme.bgMid);
    bgGrad.addColorStop(1, theme.bg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Layer dividers and labels
    ctx.save();
    ctx.setLineDash([4, 8]);
    for (let i = 0; i < LAYER_POSITIONS.length; i++) {
      const lx = LAYER_POSITIONS[i] * width;
      ctx.strokeStyle = `rgba(${theme.structLine}, 0.12)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
      ctx.stroke();

      // Label
      ctx.fillStyle = `rgba(${theme.labelDim}, 0.45)`;
      ctx.font = `${Math.max(10, width * 0.022)}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(LAYER_LABELS[i], lx, height - 12);
    }
    ctx.restore();

    // Connection lines (faint arcs between particles in adjacent layers)
    const particles = particlesRef.current;
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.layer >= LAYER_POSITIONS.length - 1) continue;
      // Find a nearby particle in the next layer
      for (let j = 0; j < particles.length; j++) {
        const q = particles[j];
        if (q.layer !== p.layer + 1) continue;
        const dy = Math.abs(p.y - q.y);
        if (dy < height * 0.15) {
          ctx.strokeStyle = `rgba(${theme.blueMid}, ${0.04 + 0.02 * Math.sin(time * 2 + i)})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
          break; // One connection per particle
        }
      }
    }
    ctx.restore();

    // Convergence glow
    const cx = width * CONVERGENCE_X;
    const cy = height * CONVERGENCE_Y;
    const glowRadius = 30 + 8 * Math.sin(time * 1.5);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    glow.addColorStop(0, `rgba(${theme.blue}, 0.18)`);
    glow.addColorStop(0.5, `rgba(${theme.blue}, 0.06)`);
    glow.addColorStop(1, `rgba(${theme.blue}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Particles
    for (const p of particles) {
      // Animate: gentle oscillation around base position, drifting toward convergence
      if (!prefersReducedMotion) {
        const drift = 0.08 + p.layer * 0.06; // Later layers drift more toward center
        p.x = p.baseX + Math.sin(time * p.speed * 200 + p.phase) * 8
          + (p.targetX - p.baseX) * drift * Math.sin(time * 0.5 + p.phase);
        p.y = p.baseY + Math.cos(time * p.speed * 200 + p.phase * 1.3) * 6
          + (p.targetY - p.baseY) * drift * Math.sin(time * 0.5 + p.phase);
      }

      // Color: shift from warm (input) to cool (latent)
      const t = p.layer / (LAYER_POSITIONS.length - 1);
      const r = isDark ? Math.round(200 - t * 120) : Math.round(160 - t * 100);
      const g = isDark ? Math.round(120 + t * 60) : Math.round(80 + t * 60);
      const b = isDark ? Math.round(150 + t * 105) : Math.round(140 + t * 80);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
      ctx.fill();
    }
  }, [prefersReducedMotion, isDark, theme]);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
      ctx.scale(dpr, dpr);
      particlesRef.current = createParticles(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    if (prefersReducedMotion) {
      // Draw a single static frame
      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height);
    } else {
      const animate = () => {
        timeRef.current += 0.016;
        const rect = canvas.getBoundingClientRect();
        draw(ctx, rect.width, rect.height);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [prefersReducedMotion, draw]);

  return (
    <div className={`rounded-lg overflow-hidden border ${theme.wrapperClass}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-[260px] sm:h-[320px] md:h-[380px]"
        aria-label="Animated diagram showing data particles flowing through compression layers toward a convergent latent space"
        role="img"
      />
    </div>
  );
}
