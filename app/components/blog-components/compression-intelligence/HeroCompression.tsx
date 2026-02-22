'use client';

// Visualizes the article's core thesis: compression is intelligence. Particles
// flow left-to-right through four layers (Raw Input → Features → Compression →
// Latent Space), transitioning from chaotic, noisy red to dense, ordered
// purple/cyan. At each layer boundary, noise particles are stripped (red sparks)
// while signal survives (cyan flash). Emergent connection lines form as
// particles converge, representing latent structure. Hover for telemetry.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { getCanvasTheme } from './theme-colors';

// ─── Configuration & Types ────────────────────────────────────────────────
const MAX_PARTICLES = 400;
const LAYER_LABELS = ['Raw Input', 'Features', 'Compression', 'Latent Space'];
const LAYER_BOUNDS = [0.0, 0.25, 0.55, 0.85];

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseY: number;
  targetY: number;
  radius: number;
  layer: number;
  active: boolean;
  history: { x: number; y: number }[];
}

interface Spark {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  rgb: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

// Theme-aware layer colors: chaotic warm → cool ordered
function getLayerColors(isDark: boolean) {
  return isDark
    ? [
        { r: 255, g: 95, b: 95 },   // Red (Raw/Chaos)
        { r: 255, g: 184, b: 108 }, // Orange (Features)
        { r: 139, g: 233, b: 253 }, // Cyan (Compression)
        { r: 189, g: 147, b: 249 }, // Purple (Latent Space)
      ]
    : [
        { r: 200, g: 60, b: 60 },   // Muted red
        { r: 200, g: 130, b: 60 },  // Muted orange
        { r: 30, g: 140, b: 200 },  // Blue
        { r: 120, g: 80, b: 200 },  // Muted purple
      ];
}

function getLayerColor(xNorm: number, colors: ReturnType<typeof getLayerColors>) {
  if (xNorm <= LAYER_BOUNDS[0]) return colors[0];
  if (xNorm >= LAYER_BOUNDS[3]) return colors[3];

  for (let i = 0; i < LAYER_BOUNDS.length - 1; i++) {
    if (xNorm >= LAYER_BOUNDS[i] && xNorm < LAYER_BOUNDS[i + 1]) {
      const t = (xNorm - LAYER_BOUNDS[i]) / (LAYER_BOUNDS[i + 1] - LAYER_BOUNDS[i]);
      return {
        r: lerp(colors[i].r, colors[i + 1].r, t),
        g: lerp(colors[i].g, colors[i + 1].g, t),
        b: lerp(colors[i].b, colors[i + 1].b, t),
      };
    }
  }
  return colors[3];
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function HeroCompression() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const particlesRef = useRef<Particle[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const particleIdCounter = useRef(0);

  const mouseRef = useRef({ x: -1000, y: -1000, activeNormX: -1 });
  const dimsRef = useRef({ w: 0, h: 0 });
  const [noMotion, setNoMotion] = useState(false);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const theme = getCanvasTheme(isDark);
  const layerColors = getLayerColors(isDark);

  // --- Particle Spawner ---
  const spawnParticle = useCallback((w: number, h: number, startX: number = 0) => {
    const spreadMultiplier = 0.45;
    const baseY = h / 2 + (Math.random() - 0.5) * h * spreadMultiplier;

    particlesRef.current.push({
      id: particleIdCounter.current++,
      x: startX,
      y: baseY,
      vx: w * 0.001 + Math.random() * (w * 0.001),
      vy: 0,
      baseY,
      targetY: h / 2,
      radius: 1.5 + Math.random() * 2,
      layer: 0,
      active: true,
      history: [],
    });
  }, []);

  // --- Main Render Loop ---
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => {
    if (w === 0 || h === 0) return;
    const particles = particlesRef.current;
    const sparks = sparksRef.current;
    const mouse = mouseRef.current;
    const isMobile = w < 600;

    // 1. Background
    const bgGrad = ctx.createLinearGradient(0, 0, w, 0);
    if (isDark) {
      bgGrad.addColorStop(0, '#05050A');
      bgGrad.addColorStop(0.5, '#0A0A15');
      bgGrad.addColorStop(1, '#0F0B1A');
    } else {
      bgGrad.addColorStop(0, '#f8f9fc');
      bgGrad.addColorStop(0.5, '#eef1f8');
      bgGrad.addColorStop(1, '#e8e4f0');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Layer Dividers & Labels
    ctx.save();
    for (let i = 0; i < LAYER_BOUNDS.length; i++) {
      const lx = LAYER_BOUNDS[i] * w;

      ctx.setLineDash([4, 12]);
      ctx.strokeStyle = isDark
        ? `rgba(255, 255, 255, ${i === 0 ? 0 : 0.08})`
        : `rgba(0, 0, 0, ${i === 0 ? 0 : 0.06})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, h);
      ctx.stroke();

      if (!isMobile || i % 2 === 0) {
        ctx.fillStyle = `rgba(${theme.labelDim}, 0.4)`;
        ctx.font = `600 ${Math.max(10, w * 0.012)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = i === 0 ? 'left' : 'center';
        ctx.fillText(LAYER_LABELS[i].toUpperCase(), i === 0 ? 16 : lx, h - 20);
      }
    }
    ctx.restore();

    // Latent Space Core Glow (Right side)
    const cx = w * 0.95;
    const cy = h / 2;
    const pulse = Math.sin(Date.now() * 0.002) * 0.5 + 0.5;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.6);
    const lc3 = layerColors[3];
    const lc2 = layerColors[2];
    coreGrad.addColorStop(0, `rgba(${lc3.r}, ${lc3.g}, ${lc3.b}, ${0.15 + 0.05 * pulse})`);
    coreGrad.addColorStop(0.3, `rgba(${lc2.r}, ${lc2.g}, ${lc2.b}, ${0.05 + 0.02 * pulse})`);
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(0, 0, w, h);

    if (!noMotion) {
      // 2. Spawn
      if (particles.length < MAX_PARTICLES && Math.random() < 0.6) {
        spawnParticle(w, h, -10);
      }

      // 3. Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 8) p.history.shift();

        const xNorm = p.x / w;

        // Determine current layer
        let currentLayer = 0;
        for (let j = LAYER_BOUNDS.length - 1; j >= 0; j--) {
          if (xNorm >= LAYER_BOUNDS[j]) {
            currentLayer = j;
            break;
          }
        }

        // Layer crossing — noise stripping
        if (currentLayer > p.layer) {
          p.layer = currentLayer;
          const survivalChance = currentLayer === 1 ? 0.7 : currentLayer === 2 ? 0.6 : 0.8;

          if (Math.random() > survivalChance) {
            p.active = false;
            sparks.push({
              x: p.x, y: p.y,
              radius: p.radius, maxRadius: p.radius * 6,
              alpha: 0.6,
              rgb: `${layerColors[0].r}, ${layerColors[0].g}, ${layerColors[0].b}`,
            });
            particles.splice(i, 1);
            continue;
          } else {
            sparks.push({
              x: p.x, y: p.y,
              radius: p.radius, maxRadius: p.radius * 4,
              alpha: 0.8,
              rgb: `${lc2.r}, ${lc2.g}, ${lc2.b}`,
            });
          }
        }

        // Physics: convergence toward center Y
        const convergenceStrength = Math.pow(xNorm, 2) * 0.08;
        p.vy += (p.targetY - p.y) * convergenceStrength;
        p.vy *= 0.85;

        const noiseScale = Math.max(0, 1 - xNorm * 1.5) * 2;
        p.y += (Math.random() - 0.5) * noiseScale + p.vy;
        p.x += p.vx * (1 - xNorm * 0.4);

        if (p.x > w + 20) {
          particles.splice(i, 1);
        }
      }
    }

    // 4. Neural Mesh Connections
    ctx.save();
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const xNorm = p.x / w;

      const connectThreshold = lerp(20, 100, xNorm);
      const connectMax = Math.floor(lerp(0, 5, xNorm));
      let connections = 0;

      for (let j = i + 1; j < particles.length; j++) {
        if (connections >= connectMax) break;

        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectThreshold) {
          const col = getLayerColor(xNorm, layerColors);
          const baseAlpha = lerp(0.0, 0.4, xNorm);
          const alpha = (1 - dist / connectThreshold) * baseAlpha;

          if (alpha > 0.01) {
            ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
            connections++;
          }
        }
      }
    }
    ctx.restore();

    // 5. Draw Particles
    for (const p of particles) {
      const xNorm = p.x / w;
      const col = getLayerColor(xNorm, layerColors);
      const intensity = lerp(0.4, 1.0, xNorm);

      // Trail
      if (p.history.length > 1 && !noMotion) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (let k = 1; k < p.history.length; k++) {
          ctx.lineTo(p.history[k].x, p.history[k].y);
        }
        const grad = ctx.createLinearGradient(p.history[0].x, p.history[0].y, p.x, p.y);
        grad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`);
        grad.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, ${intensity * 0.5})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = p.radius * 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${intensity})`;
      ctx.fill();
    }

    // 6. Sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.radius += dt * 30;
      s.alpha -= dt * 1.5;

      if (s.alpha <= 0 || s.radius >= s.maxRadius) {
        sparks.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${s.rgb}, ${s.alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 7. Interactive Hover Telemetry
    if (mouse.x > 0 && mouse.x < w && mouse.y > 0 && mouse.y < h) {
      mouse.activeNormX = mouse.x / w;

      const zoneName = mouse.activeNormX < 0.25 ? 'Raw Data'
        : mouse.activeNormX < 0.55 ? 'Features'
        : mouse.activeNormX < 0.85 ? 'Compressed'
        : 'Latent Space';

      const entropy = (1 - mouse.activeNormX).toFixed(2);
      const snr = (mouse.activeNormX * 100).toFixed(1) + ' dB';
      const density = (Math.pow(mouse.activeNormX, 3) * 1000).toFixed(0) + 'x';

      ctx.save();
      // Scanner line
      const scanGrad = ctx.createLinearGradient(0, 0, 0, h);
      const scanColor = isDark ? '255,255,255' : '0,0,0';
      scanGrad.addColorStop(0, `rgba(${scanColor},0)`);
      scanGrad.addColorStop(mouse.y / h, `rgba(${scanColor},${isDark ? 0.4 : 0.2})`);
      scanGrad.addColorStop(1, `rgba(${scanColor},0)`);
      ctx.strokeStyle = scanGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mouse.x, 0);
      ctx.lineTo(mouse.x, h);
      ctx.stroke();

      // Tooltip
      const pad = 12;
      const lh = 18;
      const boxW = 160;
      const boxH = pad * 2 + lh * 3 + 14;

      let tx = mouse.x + 20;
      let ty = mouse.y - 40;

      // Clamp to canvas bounds
      if (tx + boxW > w - 8) tx = mouse.x - boxW - 12;
      if (ty < 8) ty = 8;
      if (ty + boxH > h - 8) ty = h - boxH - 8;

      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = isDark ? 'rgba(15, 15, 20, 0.9)' : 'rgba(240, 242, 248, 0.95)';
      ctx.strokeStyle = `rgba(${theme.signal}, 0.5)`;
      ctx.beginPath();
      ctx.roundRect(tx, ty, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowColor = 'transparent';

      const col = getLayerColor(mouse.activeNormX, layerColors);
      ctx.fillStyle = `rgb(${col.r}, ${col.g}, ${col.b})`;
      ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(zoneName, tx + pad, ty + pad);

      ctx.fillStyle = isDark ? '#A0A0B0' : '#505060';
      ctx.font = '11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(`Entropy : ${entropy}`, tx + pad, ty + pad + lh);
      ctx.fillText(`SNR     : ${snr}`, tx + pad, ty + pad + lh * 2);
      ctx.fillText(`Density : ${density}`, tx + pad, ty + pad + lh * 3);

      ctx.restore();
    } else {
      mouse.activeNormX = -1;
    }

  }, [noMotion, spawnParticle, isDark, theme, layerColors]);

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

      particlesRef.current = [];
      particleIdCounter.current = 0;
      for (let i = 0; i < MAX_PARTICLES * 0.8; i++) {
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

      if (mouseRef.current.activeNormX !== -1) {
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
        <div className={`relative rounded-xl overflow-hidden border shadow-2xl group ${
          isDark
            ? 'border-white/10 shadow-purple-900/20'
            : 'border-black/10 shadow-purple-200/20'
        }`}>
          <canvas
            ref={canvasRef}
            className="w-full h-[320px] sm:h-[400px] md:h-[480px] outline-none"
            aria-label="Interactive simulation of chaotic raw data being stripped of noise and compressed into dense, structured latent signal. Hover for telemetry."
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
