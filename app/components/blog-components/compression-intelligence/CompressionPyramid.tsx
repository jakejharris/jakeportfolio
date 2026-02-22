'use client';

// Visualizes "The Architecture" — the recursive compression pipeline that
// takes raw data (Layer 0, 10TB) through progressively narrower layers down
// to dense semantic signal (~200K tokens). 350 particles fall through a
// five-layer tapering pyramid, with survival probability at each boundary
// determining noise dissolution vs signal survival. Survivors brighten and
// form neural mesh connections as they descend. Hover any layer for telemetry.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { getCanvasTheme } from './theme-colors';

// ─── Configuration & Types ────────────────────────────────────────────────
const POOL_SIZE = 350;
const PYR_Y0 = 0.08;
const PYR_Y1 = 0.92;
const PYR_TL = 0.10;
const PYR_TR = 0.90;
const PYR_BL = 0.45;
const PYR_BR = 0.55;

interface LayerConfig {
  label: string;
  size: string;
  ratio: string;
  process: string;
  objective: string;
  surviveProb: number;
}

const LAYERS: LayerConfig[] = [
  { label: 'Layer 0: Raw Data', size: '10 TB', ratio: '1x', process: 'Chunking & Parallel Agents', objective: 'Scan full codebase breadth.', surviveProb: 1.0 },
  { label: 'Layer 1: Compressed', size: '1 TB', ratio: '10x', process: 'Recursive Compression', objective: 'Preserve facts and entities.', surviveProb: 0.35 },
  { label: 'Layer 2: Mid-tier Abstractions', size: '100 GB', ratio: '100x', process: 'Relationship Mapping', objective: 'Preserve causal chains.', surviveProb: 0.40 },
  { label: 'Layer 3: High-order Abstractions', size: '10 GB', ratio: '1,000x', process: 'Structural Synthesis', objective: 'Preserve reasoning patterns.', surviveProb: 0.30 },
  { label: 'Layer 4: Dense Signal', size: '~200K Tokens', ratio: '10,000x', process: 'Frontier Model Evaluation', objective: 'Final decision making.', surviveProb: 0.20 },
];

const BOUNDS_Y = [0.248, 0.416, 0.584, 0.752];
const BRIGHT_BOOST = [0.15, 0.20, 0.25, 0.30];

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
  layerIdx: number;
}

interface Spark {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  type: 'survive' | 'dissolve';
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

function pyrX(yNorm: number): [number, number] {
  const t = (yNorm - PYR_Y0) / (PYR_Y1 - PYR_Y0);
  return [lerp(PYR_TL, PYR_BL, t), lerp(PYR_TR, PYR_BR, t)];
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function CompressionPyramid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poolRef = useRef<Particle[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const frameRef = useRef(0);
  const tRef = useRef(0);
  const mouseRef = useRef({ x: -1000, y: -1000, activeLayer: -1 });
  const visibleRef = useRef(true);
  const dimsRef = useRef({ w: 0, h: 0 });
  const [noMotion, setNoMotion] = useState(false);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const theme = getCanvasTheme(isDark);

  // Theme-aware accent RGB triplets
  const purple = isDark ? '183, 148, 246' : '120, 80, 200';
  const teal = isDark ? '78, 205, 196' : '30, 160, 150';
  const dissolveRgb = isDark ? '120, 40, 60' : '180, 60, 80';

  // --- Particle Management ---
  const respawn = useCallback((p: Particle) => {
    p.xN = 0.05 + Math.random() * 0.9;
    p.y = PYR_Y0 + Math.random() * 0.02;
    p.vy = 0.0015 + Math.random() * 0.002;
    p.wPhase = Math.random() * Math.PI * 2;
    p.wSpeed = 1.0 + Math.random() * 2.0;
    p.wAmp = 0.015 + Math.random() * 0.035;
    p.r = 1.2 + Math.random() * 1.5;
    p.bright = 0.10 + Math.random() * 0.15;
    p.active = true;
    p.timer = 0;
    p.layerIdx = 0;
  }, []);

  const makeParticle = useCallback((): Particle => {
    const p = {} as Particle;
    respawn(p);
    return p;
  }, [respawn]);

  const initPool = useCallback((): Particle[] => {
    const pool: Particle[] = [];
    const counts = [120, 70, 40, 25, 15];
    const yMins = [PYR_Y0, ...BOUNDS_Y];
    const yMaxs = [...BOUNDS_Y, PYR_Y1];

    for (let layer = 0; layer < 5; layer++) {
      for (let i = 0; i < counts[layer]; i++) {
        const p = makeParticle();
        p.y = yMins[layer] + Math.random() * (yMaxs[layer] - yMins[layer]);
        p.layerIdx = layer;
        for (let b = 0; b < layer; b++) p.bright += BRIGHT_BOOST[b];
        pool.push(p);
      }
    }

    while (pool.length < POOL_SIZE) {
      const p = makeParticle();
      p.active = false;
      p.timer = Math.floor(Math.random() * 60);
      pool.push(p);
    }
    return pool;
  }, [makeParticle]);

  // --- Render Loop ---
  const paint = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => {
    if (w === 0 || h === 0) return;
    const t = tRef.current;
    const pool = poolRef.current;
    const sparks = sparksRef.current;
    const mouse = mouseRef.current;
    const isMobile = w < 600;
    const yMins = [PYR_Y0, ...BOUNDS_Y];
    const yMaxs = [...BOUNDS_Y, PYR_Y1];

    // ── Background ──
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, theme.bg);
    bg.addColorStop(0.5, theme.bgMid);
    bg.addColorStop(1, theme.bg);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // ── Determine Hovered Layer ──
    let hoveredLayer = -1;
    if (mouse.x > 0 && mouse.y > 0 && mouse.y < h) {
      for (let i = 0; i < 5; i++) {
        if (mouse.y / h >= yMins[i] && mouse.y / h <= yMaxs[i]) {
          const [l, r] = pyrX(mouse.y / h);
          if (mouse.x / w >= l - 0.1 && mouse.x / w <= r + 0.1) {
            hoveredLayer = i;
          }
          break;
        }
      }
    }
    mouse.activeLayer = hoveredLayer;

    // ── Layer Zones ──
    for (let i = 0; i < 5; i++) {
      const isHovered = i === hoveredLayer;
      const [tL, tR] = pyrX(yMins[i]);
      const [bL, bR] = pyrX(yMaxs[i]);

      ctx.beginPath();
      ctx.moveTo(tL * w, yMins[i] * h);
      ctx.lineTo(tR * w, yMins[i] * h);
      ctx.lineTo(bR * w, yMaxs[i] * h);
      ctx.lineTo(bL * w, yMaxs[i] * h);
      ctx.closePath();

      const baseAlpha = 0.02 + i * 0.015;
      ctx.fillStyle = `rgba(${theme.layerFill}, ${isHovered ? baseAlpha * 2.5 : baseAlpha})`;
      ctx.fill();

      // Horizontal scan line on hover
      if (isHovered && !noMotion) {
        const scanY = yMins[i] * h + ((t * 0.5) % (yMaxs[i] - yMins[i])) * h;
        const [sL, sR] = pyrX(scanY / h);
        const grad = ctx.createLinearGradient(sL * w, 0, sR * w, 0);
        grad.addColorStop(0, `rgba(${teal}, 0)`);
        grad.addColorStop(0.5, `rgba(${teal}, 0.3)`);
        grad.addColorStop(1, `rgba(${teal}, 0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sL * w, scanY);
        ctx.lineTo(sR * w, scanY);
        ctx.stroke();
      }
    }

    // ── Pyramid Outline ──
    const [topL, topR] = pyrX(PYR_Y0);
    const [botL, botR] = pyrX(PYR_Y1);

    ctx.beginPath();
    ctx.moveTo(topL * w, PYR_Y0 * h);
    ctx.lineTo(botL * w, PYR_Y1 * h);
    ctx.moveTo(topR * w, PYR_Y0 * h);
    ctx.lineTo(botR * w, PYR_Y1 * h);

    ctx.strokeStyle = `rgba(${theme.outline}, 0.1)`;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = `rgba(${theme.outline}, ${0.15 + 0.05 * Math.sin(t)})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Internal Boundaries ──
    for (let i = 0; i < BOUNDS_Y.length; i++) {
      const by = BOUNDS_Y[i] * h;
      const [bL, bR] = pyrX(BOUNDS_Y[i]);

      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -t * 15;
      ctx.strokeStyle = `rgba(${theme.boundaryAccent}, ${0.2 + 0.1 * Math.sin(t * 2 + i)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bL * w, by);
      ctx.lineTo(bR * w, by);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Update Particles ──
    const pos: { x: number; y: number; p: Particle }[] = [];

    if (!noMotion) {
      for (const p of pool) {
        if (!p.active) {
          p.timer -= dt * 60;
          if (p.timer <= 0) respawn(p);
          continue;
        }

        p.y += p.vy;

        // Boundary crossing
        if (p.layerIdx < BOUNDS_Y.length && p.y >= BOUNDS_Y[p.layerIdx]) {
          const boundaryProb = LAYERS[p.layerIdx + 1].surviveProb;

          if (Math.random() > boundaryProb) {
            // Dissolved
            p.active = false;
            p.timer = 15 + Math.random() * 30;
            const [bL, bR] = pyrX(p.y);
            const px = lerp(bL * w, bR * w, p.xN);
            sparks.push({ x: px, y: p.y * h, life: 0, maxLife: 0.8, type: 'dissolve' });
            p.layerIdx++;
            continue;
          }

          // Survived
          const [bL, bR] = pyrX(p.y);
          const px = lerp(bL * w, bR * w, p.xN);
          sparks.push({ x: px, y: p.y * h, life: 0, maxLife: 0.5, type: 'survive' });
          p.bright += BRIGHT_BOOST[p.layerIdx];
          p.layerIdx++;
        }

        if (p.y > PYR_Y1 + 0.02) {
          p.active = false;
          p.timer = 10 + Math.random() * 20;
        }
      }
    }

    // ── Calculate Positions ──
    for (const p of pool) {
      if (!p.active) continue;
      const [pL, pR] = pyrX(p.y);
      const wb = noMotion ? 0 : Math.sin(t * p.wSpeed + p.wPhase) * p.wAmp;
      const xn = Math.max(0.02, Math.min(0.98, p.xN + wb));
      pos.push({ x: lerp(pL * w, pR * w, xn), y: p.y * h, p });
    }

    // ── Neural Mesh ──
    ctx.save();
    for (let i = 0; i < pos.length; i++) {
      const a = pos[i];
      if (a.p.bright < 0.4) continue;

      for (let j = i + 1; j < pos.length; j++) {
        const b = pos[j];
        if (b.p.bright < 0.4) continue;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        const connectRadius = lerp(2000, 8000, a.p.layerIdx / 4);

        if (distSq < connectRadius) {
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / Math.sqrt(connectRadius)) * (a.p.bright * 0.2);
          ctx.strokeStyle = `rgba(${purple}, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // ── Draw Particles ──
    for (const { x, y, p } of pos) {
      const b = Math.min(1, p.bright);
      const cr = isDark ? Math.round(lerp(78, 255, b)) : Math.round(lerp(30, 80, b));
      const cg = isDark ? Math.round(lerp(205, 230, b)) : Math.round(lerp(130, 80, b));
      const cb = isDark ? Math.round(lerp(196, 255, b)) : Math.round(lerp(150, 200, b));
      const ca = lerp(0.3, 0.95, b);
      const radius = p.r * (1 + b * 1.5);

      // Motion trail
      if (!noMotion) {
        const tLen = p.vy * h * 4;
        const tGrad = ctx.createLinearGradient(x, y, x, y - tLen);
        tGrad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${ca * 0.4})`);
        tGrad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
        ctx.strokeStyle = tGrad;
        ctx.lineWidth = Math.max(0.5, radius * 0.5);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - tLen);
        ctx.stroke();
      }

      // Glow halo
      if (b > 0.3) {
        const gr = radius * (3 + b * 2);
        const halo = ctx.createRadialGradient(x, y, 0, x, y, gr);
        halo.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${ca * 0.25})`);
        halo.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, gr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${ca})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Sparks ──
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        sparks.splice(i, 1);
        continue;
      }

      const progress = s.life / s.maxLife;
      const alpha = 1 - progress;

      if (s.type === 'survive') {
        const radius = lerp(2, 6, progress);
        ctx.fillStyle = `rgba(${purple}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const radius = lerp(1, 10, progress);
        ctx.strokeStyle = `rgba(${dissolveRgb}, ${alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ── Side Labels (Desktop) ──
    if (!isMobile) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < LAYERS.length; i++) {
        const midY = ((yMins[i] + yMaxs[i]) / 2) * h;
        const isHovered = i === hoveredLayer;

        ctx.font = `bold ${isHovered ? 13 : 11}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = `rgba(${theme.labelBright}, ${isHovered ? 0.9 : 0.3})`;
        ctx.fillText(LAYERS[i].size, w - 20, midY - 8);

        ctx.font = `${isHovered ? 12 : 10}px ui-monospace, SFMono-Regular, monospace`;
        ctx.fillStyle = `rgba(${purple}, ${isHovered ? 0.8 : 0.2})`;
        ctx.fillText(`Compress: ${LAYERS[i].ratio}`, w - 20, midY + 8);
      }
    }

    // ── Output Convergence Glow ──
    const [oL, oR] = pyrX(PYR_Y1);
    const oCx = ((oL + oR) / 2) * w;
    const oCy = PYR_Y1 * h;
    const oGr = 40 + 20 * Math.sin(t * 1.5);
    const oGlow = ctx.createRadialGradient(oCx, oCy, 0, oCx, oCy, oGr);
    oGlow.addColorStop(0, `rgba(${theme.glow}, 0.25)`);
    oGlow.addColorStop(0.2, `rgba(${purple}, 0.15)`);
    oGlow.addColorStop(1, `rgba(${purple}, 0)`);
    ctx.fillStyle = oGlow;
    ctx.beginPath();
    ctx.arc(oCx, oCy, oGr, 0, Math.PI * 2);
    ctx.fill();

    // ── Interactive Tooltip ──
    if (hoveredLayer !== -1) {
      const layer = LAYERS[hoveredLayer];
      const pad = 14;
      const lh = 20;
      const boxW = 220;
      const boxH = pad * 2 + lh * 3.5;

      let tx = mouse.x + 20;
      let ty = mouse.y + 20;
      if (tx + boxW > w - 8) tx = mouse.x - boxW - 20;
      if (ty + boxH > h - 8) ty = mouse.y - boxH - 20;
      if (tx < 8) tx = 8;
      if (ty < 8) ty = 8;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;

      ctx.fillStyle = isDark ? 'rgba(10, 10, 20, 0.95)' : 'rgba(240, 242, 248, 0.95)';
      ctx.strokeStyle = `rgba(${teal}, 0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowColor = 'transparent';

      ctx.fillStyle = isDark ? '#FFFFFF' : '#1a1a2e';
      ctx.font = 'bold 13px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(layer.label, tx + pad, ty + pad);

      ctx.fillStyle = isDark ? '#4ecdc4' : '#1a9e94';
      ctx.font = '11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(`Scale: ${layer.size} (${layer.ratio})`, tx + pad, ty + pad + lh * 1.2);

      ctx.fillStyle = isDark ? '#A0A0B0' : '#505060';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`Mode: ${layer.process}`, tx + pad, ty + pad + lh * 2.1);

      ctx.fillStyle = isDark ? '#b794f6' : '#8050d0';
      ctx.font = 'italic 11px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`Target: ${layer.objective}`, tx + pad, ty + pad + lh * 3.0);

      ctx.restore();
    }

  }, [noMotion, respawn, isDark, theme, purple, teal, dissolveRgb]);

  // --- Reduced motion ---
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setNoMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setNoMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // --- Visibility gating (skip paint when off-screen) ---
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const obs = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.05 }
    );
    obs.observe(cvs);
    return () => obs.disconnect();
  }, []);

  // --- Init & Loop ---
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = cvs.getBoundingClientRect();
      const { w: prevW, h: prevH } = dimsRef.current;
      if (prevW > 0 && Math.abs(rect.width - prevW) < 1 && Math.abs(rect.height - prevH) < 1) return;
      const dpr = window.devicePixelRatio || 1;
      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimsRef.current = { w: rect.width, h: rect.height };
      poolRef.current = initPool();
      sparksRef.current = [];
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
    if (dimsRef.current.w >= 768) {
      cvs.addEventListener('mousemove', handleMouseMove);
      cvs.addEventListener('mouseleave', handleMouseLeave);
    }

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      tRef.current += dt;

      if (visibleRef.current) {
        if (mouseRef.current.activeLayer !== -1) {
          cvs.style.cursor = 'crosshair';
        } else {
          cvs.style.cursor = 'default';
        }

        paint(ctx, dimsRef.current.w, dimsRef.current.h, dt);
      }
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cvs.removeEventListener('mousemove', handleMouseMove);
      cvs.removeEventListener('mouseleave', handleMouseLeave);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [noMotion, paint, initPool]);

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
            className="w-full h-[550px] sm:h-[650px] md:h-[750px] outline-none touch-pan-y"
            aria-label="Interactive animated compression pipeline: data particles fall through a 5-layer funnel, visually being compressed and stripped of noise until yielding a dense semantic output. Hover over any layer to inspect its objective and compression ratio."
            role="img"
          />
          <div className={`absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ${
            isDark ? 'ring-white/10' : 'ring-black/5'
          }`} />
          <div className={`absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t pointer-events-none ${
            isDark ? 'from-[#0a0a14]' : 'from-[#f8f9fc]'
          } to-transparent`} />
          <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b pointer-events-none ${
            isDark ? 'from-[#0a0a14]' : 'from-[#f8f9fc]'
          } to-transparent`} />
        </div>
      </div>
    </div>
  );
}
