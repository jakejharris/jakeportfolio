'use client';

// Visualizes "The Architecture" — the recursive compression pipeline that
// takes raw data (Layer 0, 10TB) through progressively narrower layers down
// to dense semantic signal (~200K tokens). 220 particles fall through a
// five-layer tapering pyramid, and at each internal boundary a survival
// probability determines which particles pass through and which are
// eliminated. Survivors brighten as they descend, representing the article's
// claim that "each layer strips noise, preserves signal, and passes a denser
// representation upward." The pyramid shape itself encodes the logarithmic
// scaling: the narrowing is dramatic early and gentle late, just like the
// math in the article's compression table.

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Configuration ──────────────────────────────────────────────────────────
const POOL_SIZE = 220;
const PYR_Y0 = 0.07;
const PYR_Y1 = 0.93;
const PYR_TL = 0.08;
const PYR_TR = 0.92;
const PYR_BL = 0.44;
const PYR_BR = 0.56;

const LAYERS = [
  { label: 'Raw Data', short: 'Raw Data', size: '10 TB' },
  { label: 'Compressed Representations', short: 'Compressed', size: '' },
  { label: 'Higher-order Abstractions', short: 'Abstractions', size: '' },
  { label: 'Dense Semantic Signal', short: 'Dense Signal', size: '~200K tokens' },
  { label: 'Frontier Model Output', short: 'Model Output', size: '' },
];

const PROC_LABELS = [
  'Chunking + Parallel Agents',
  'Recursive Compression',
  'Abstraction Synthesis',
  'Full Reasoning',
];

// 4 internal boundaries between 5 layers
const BOUNDS_Y = [0.242, 0.414, 0.586, 0.758];
const SURVIVE = [0.40, 0.45, 0.40, 0.25];
const BRIGHT_BOOST = [0.14, 0.16, 0.20, 0.26];

// ─── Helpers ────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function pyrX(yNorm: number): [number, number] {
  const t = (yNorm - PYR_Y0) / (PYR_Y1 - PYR_Y0);
  return [lerp(PYR_TL, PYR_BL, t), lerp(PYR_TR, PYR_BR, t)];
}

// ─── Particle system ────────────────────────────────────────────────────────
interface Particle {
  xN: number;
  y: number;
  vy: number;
  wPhase: number;
  wSpeed: number;
  wAmp: number;
  r: number;
  bright: number;
  active: boolean;
  timer: number;
  crossed: number;
}

function respawn(p: Particle) {
  p.xN = 0.05 + Math.random() * 0.9;
  p.y = PYR_Y0 + Math.random() * 0.012;
  p.vy = 0.0012 + Math.random() * 0.0024;
  p.wPhase = Math.random() * Math.PI * 2;
  p.wSpeed = 1.5 + Math.random() * 2.5;
  p.wAmp = 0.012 + Math.random() * 0.03;
  p.r = 1.0 + Math.random() * 1.3;
  p.bright = 0.10 + Math.random() * 0.12;
  p.active = true;
  p.timer = 0;
  p.crossed = 0;
}

function makeParticle(): Particle {
  const p = {} as Particle;
  respawn(p);
  return p;
}

function initPool(): Particle[] {
  const pool: Particle[] = [];
  const counts = [82, 44, 26, 15, 7];
  const yMins = [PYR_Y0, ...BOUNDS_Y];
  const yMaxs = [...BOUNDS_Y, PYR_Y1];

  for (let layer = 0; layer < 5; layer++) {
    for (let i = 0; i < counts[layer]; i++) {
      const p = makeParticle();
      p.y = yMins[layer] + Math.random() * (yMaxs[layer] - yMins[layer]);
      p.crossed = layer;
      for (let b = 0; b < layer; b++) p.bright += BRIGHT_BOOST[b];
      pool.push(p);
    }
  }

  while (pool.length < POOL_SIZE) {
    const p = makeParticle();
    p.active = false;
    p.timer = Math.floor(Math.random() * 50);
    pool.push(p);
  }
  return pool;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function CompressionPyramid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poolRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const tRef = useRef(0);
  const visRef = useRef(true);
  const dimsRef = useRef({ w: 0, h: 0 });
  const [noMotion, setNoMotion] = useState(false);

  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (w === 0 || h === 0) return;
      const t = tRef.current;
      const pool = poolRef.current;
      const compact = w < 480;
      const yMins = [PYR_Y0, ...BOUNDS_Y];
      const yMaxs = [...BOUNDS_Y, PYR_Y1];

      // ── Background ──
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0a0a14');
      bg.addColorStop(0.5, '#0e0e1c');
      bg.addColorStop(1, '#0a0a14');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // ── Layer zone fills ──
      for (let i = 0; i < 5; i++) {
        const [tL, tR] = pyrX(yMins[i]);
        const [bL, bR] = pyrX(yMaxs[i]);
        ctx.fillStyle = `rgba(25, 45, 90, ${0.015 + i * 0.012})`;
        ctx.beginPath();
        ctx.moveTo(tL * w, yMins[i] * h);
        ctx.lineTo(tR * w, yMins[i] * h);
        ctx.lineTo(bR * w, yMaxs[i] * h);
        ctx.lineTo(bL * w, yMaxs[i] * h);
        ctx.closePath();
        ctx.fill();
      }

      // ── Pyramid outline ──
      const [topL, topR] = pyrX(PYR_Y0);
      const [botL, botR] = pyrX(PYR_Y1);
      const ea = 0.08 + 0.03 * Math.sin(t * 0.8);
      ctx.strokeStyle = `rgba(75, 125, 200, ${ea})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(topL * w, PYR_Y0 * h);
      ctx.lineTo(botL * w, PYR_Y1 * h);
      ctx.lineTo(botR * w, PYR_Y1 * h);
      ctx.lineTo(topR * w, PYR_Y0 * h);
      ctx.closePath();
      ctx.stroke();

      // ── Boundary lines with glow ──
      for (let i = 0; i < BOUNDS_Y.length; i++) {
        const by = BOUNDS_Y[i] * h;
        const [bL, bR] = pyrX(BOUNDS_Y[i]);
        const bxL = bL * w;
        const bxR = bR * w;
        const bCx = (bxL + bxR) / 2;

        const pulse = 0.055 + 0.03 * Math.sin(t * 1.3 + i * 1.1);
        const gr = (bxR - bxL) * 0.55;
        const glow = ctx.createRadialGradient(bCx, by, 0, bCx, by, Math.max(1, gr));
        glow.addColorStop(0, `rgba(75, 135, 255, ${pulse})`);
        glow.addColorStop(0.5, `rgba(75, 135, 255, ${pulse * 0.35})`);
        glow.addColorStop(1, 'rgba(75, 135, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(bCx, by, Math.max(1, gr), 16, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.setLineDash([5, 7]);
        ctx.strokeStyle = `rgba(95, 155, 255, ${0.12 + 0.04 * Math.sin(t * 1.4 + i)})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(bxL, by);
        ctx.lineTo(bxR, by);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── Labels ──
      const fs = Math.max(9, Math.min(14, w * 0.022));
      const sfs = Math.max(7, fs - 2.5);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      for (let i = 0; i < LAYERS.length; i++) {
        const midY = ((yMins[i] + yMaxs[i]) / 2) * h;
        const [lL, lR] = pyrX((yMins[i] + yMaxs[i]) / 2);
        const cx = ((lL + lR) / 2) * w;
        const hasSize = LAYERS[i].size !== '';

        ctx.font = `600 ${fs}px ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace`;
        ctx.fillStyle = 'rgba(160, 178, 220, 0.48)';
        ctx.fillText(compact ? LAYERS[i].short : LAYERS[i].label, cx, midY - (hasSize ? 7 : 0));

        if (hasSize) {
          ctx.font = `${sfs}px ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace`;
          ctx.fillStyle = 'rgba(138, 155, 210, 0.35)';
          ctx.fillText(LAYERS[i].size, cx, midY + fs * 0.55);
        }
      }

      if (!compact) {
        const pfs = Math.max(7, Math.min(10, w * 0.015));
        for (let i = 0; i < PROC_LABELS.length; i++) {
          const by = BOUNDS_Y[i] * h;
          const [pL, pR] = pyrX(BOUNDS_Y[i] + 0.015);
          ctx.font = `${pfs}px ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace`;
          ctx.fillStyle = 'rgba(105, 140, 200, 0.22)';
          ctx.textAlign = 'center';
          ctx.fillText(PROC_LABELS[i], ((pL + pR) / 2) * w, by + pfs + 5);
        }
      }

      // ── Update particles ──
      if (!noMotion) {
        for (const p of pool) {
          if (!p.active) {
            p.timer--;
            if (p.timer <= 0) respawn(p);
            continue;
          }
          p.y += p.vy;
          if (p.crossed < BOUNDS_Y.length && p.y >= BOUNDS_Y[p.crossed]) {
            if (Math.random() > SURVIVE[p.crossed]) {
              p.active = false;
              p.timer = 18 + Math.floor(Math.random() * 42);
              p.crossed++;
              continue;
            }
            p.bright += BRIGHT_BOOST[p.crossed];
            p.crossed++;
          }
          if (p.y > PYR_Y1 + 0.01) {
            p.active = false;
            p.timer = 8 + Math.floor(Math.random() * 25);
          }
        }
      }

      // ── Precompute positions ──
      const pos: { x: number; y: number; p: Particle }[] = [];
      for (const p of pool) {
        if (!p.active) continue;
        const [pL, pR] = pyrX(p.y);
        const wb = noMotion ? 0 : Math.sin(t * p.wSpeed + p.wPhase) * p.wAmp;
        const xn = Math.max(0.02, Math.min(0.98, p.xN + wb));
        pos.push({ x: lerp(pL * w, pR * w, xn), y: p.y * h, p });
      }

      // ── Connection lines (bright particles) ──
      for (let i = 0; i < pos.length; i++) {
        const a = pos[i];
        if (a.p.bright < 0.35) continue;
        for (let j = i + 1; j < pos.length; j++) {
          const b = pos[j];
          if (b.p.bright < 0.35) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 2500) {
            const d = Math.sqrt(d2);
            ctx.strokeStyle = `rgba(100, 160, 255, ${(1 - d / 50) * 0.06})`;
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // ── Draw particles ──
      for (const { x, y, p } of pos) {
        const b = Math.min(1, p.bright);
        const cr = Math.round(lerp(120, 170, b));
        const cg = Math.round(lerp(148, 225, b));
        const cb = Math.round(lerp(210, 255, b));
        const ca = lerp(0.20, 0.90, b);
        const radius = p.r * (1 + b * 2.2);

        // Motion trail
        if (!noMotion) {
          const tLen = p.vy * h * 3.5;
          const tGrad = ctx.createLinearGradient(x, y, x, y - tLen);
          tGrad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${ca * 0.35})`);
          tGrad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
          ctx.strokeStyle = tGrad;
          ctx.lineWidth = Math.max(0.5, radius * 0.5);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - tLen);
          ctx.stroke();
        }

        // Glow halo for brighter particles
        if (b > 0.32) {
          const gr = radius * (2.5 + b * 2);
          const halo = ctx.createRadialGradient(x, y, 0, x, y, gr);
          halo.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${ca * 0.22})`);
          halo.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(x, y, gr, 0, Math.PI * 2);
          ctx.fill();
        }

        // Particle dot
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${ca})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Output convergence glow ──
      const [oL, oR] = pyrX(PYR_Y1);
      const oCx = ((oL + oR) / 2) * w;
      const oCy = PYR_Y1 * h;
      const oGr = 32 + 14 * Math.sin(t * 1.0);
      const oGlow = ctx.createRadialGradient(oCx, oCy, 0, oCx, oCy, oGr);
      oGlow.addColorStop(0, 'rgba(110, 195, 255, 0.30)');
      oGlow.addColorStop(0.35, 'rgba(110, 195, 255, 0.10)');
      oGlow.addColorStop(1, 'rgba(110, 195, 255, 0)');
      ctx.fillStyle = oGlow;
      ctx.beginPath();
      ctx.arc(oCx, oCy, oGr, 0, Math.PI * 2);
      ctx.fill();
    },
    [noMotion]
  );

  // Reduced-motion detection
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setNoMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setNoMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Canvas setup, resize, animation loop
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
      ctx.scale(dpr, dpr);
      dimsRef.current = { w: rect.width, h: rect.height };
      poolRef.current = initPool();
    };

    resize();
    window.addEventListener('resize', resize);

    const obs = new IntersectionObserver(
      ([entry]) => {
        visRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    obs.observe(cvs);

    if (noMotion) {
      paint(ctx, dimsRef.current.w, dimsRef.current.h);
    } else {
      const loop = () => {
        if (visRef.current) {
          tRef.current += 0.016;
          paint(ctx, dimsRef.current.w, dimsRef.current.h);
        }
        frameRef.current = requestAnimationFrame(loop);
      };
      frameRef.current = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', resize);
      obs.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [noMotion, paint]);

  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0a0a14]">
      <canvas
        ref={canvasRef}
        className="w-full h-[420px] sm:h-[500px] md:h-[580px] lg:h-[660px]"
        aria-label="Animated compression pyramid: data particles flow from 10TB of raw data at the top through progressively narrower layers of parallel agent compression down to 200K tokens of dense semantic signal at the bottom, where a frontier model processes the result"
        role="img"
      />
    </div>
  );
}
