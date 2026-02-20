'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// --- Phase Configuration ---
const PHASES = [
  { label: 'tree', startCount: 15000, endCount: 4000, duration: 800, pause: 400 },
  { label: 'rg', startCount: 4000, endCount: 1500, duration: 600, pause: 400 },
  { label: 'sed -n', startCount: 1500, endCount: 670, duration: 500, pause: 0 },
] as const;

const INITIAL_PAUSE = 500;
const FINAL_SAVINGS_DELAY = 300;
const MAX_DISPLAY_BLOCKS = 600;
const BLOCK_GAP = 1;
const BLOCK_MIN_SIZE = 3;
const BLOCK_MAX_SIZE = 6;

// Colors (matching HeroCompression palette)
const BG_COLOR = '#0a0a14';
const BG_MID = '#0d0d1a';
const LABEL_DIM = 'rgba(160, 175, 220, 0.3)';
const LABEL_ACTIVE = 'rgba(160, 200, 255, 0.85)';
const COUNTER_COLOR = 'rgba(200, 215, 240, 0.9)';
const SAVINGS_COLOR = 'rgba(140, 200, 255, 0.95)';
const MONOSPACE = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// --- Helpers ---
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// --- Types ---
type AnimPhase =
  | 'idle'
  | 'initial-hold'
  | 'phase-0'
  | 'pause-0'
  | 'phase-1'
  | 'pause-1'
  | 'phase-2'
  | 'complete';

interface Block {
  col: number;
  row: number;
  initX: number;
  initY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  initSize: number;
  size: number;
  opacity: number;
  eliminatedInPhase: number; // 0, 1, 2, or -1 (survivor)
  distFromCenter: number;
  stagger: number; // 0..1 normalized stagger delay
  alive: boolean;
}

// --- Block creation ---
function createBlocks(width: number, height: number): Block[] {
  const padding = { top: 52, bottom: 16, left: 20, right: 20 };
  const usableW = width - padding.left - padding.right;
  const usableH = height - padding.top - padding.bottom;

  const blockSize = clamp(BLOCK_MIN_SIZE, Math.floor(Math.min(usableW, usableH) / 28), BLOCK_MAX_SIZE);
  const stride = blockSize + BLOCK_GAP;

  const cols = Math.floor(usableW / stride);
  const rows = Math.floor(usableH / stride);
  const totalSlots = cols * rows;
  const blockCount = Math.min(totalSlots, MAX_DISPLAY_BLOCKS);

  const gridW = cols * stride - BLOCK_GAP;
  const gridH = Math.ceil(blockCount / cols) * stride - BLOCK_GAP;
  const offsetX = padding.left + (usableW - gridW) / 2;
  const offsetY = padding.top + (usableH - gridH) / 2;

  // Center of grid in grid-coordinate space
  const actualRows = Math.ceil(blockCount / cols);
  const centerCol = (cols - 1) / 2;
  const centerRow = (actualRows - 1) / 2;

  // Build blocks with distance from center
  const blocks: Block[] = [];
  for (let i = 0; i < blockCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = offsetX + col * stride + blockSize / 2;
    const py = offsetY + row * stride + blockSize / 2;

    const dc = Math.sqrt(
      Math.pow((col - centerCol) / Math.max(centerCol, 1), 2) +
      Math.pow((row - centerRow) / Math.max(centerRow, 1), 2)
    );

    blocks.push({
      col, row,
      initX: px, initY: py,
      x: px, y: py,
      targetX: offsetX + centerCol * stride + blockSize / 2,
      targetY: offsetY + centerRow * stride + blockSize / 2,
      initSize: blockSize,
      size: blockSize,
      opacity: 0.55 + Math.random() * 0.35,
      eliminatedInPhase: -1, // assigned below
      distFromCenter: dc,
      stagger: 0,
      alive: true,
    });
  }

  // Sort by distance (ascending — center first)
  const sorted = [...blocks].sort((a, b) => a.distFromCenter - b.distFromCenter);

  // Assign phases based on proportional token counts
  const survivorCount = Math.max(1, Math.round(blockCount * (670 / 15000)));
  const phase2Deaths = Math.round(blockCount * ((1500 - 670) / 15000));
  const phase1Deaths = Math.round(blockCount * ((4000 - 1500) / 15000));

  for (let i = 0; i < sorted.length; i++) {
    if (i < survivorCount) {
      sorted[i].eliminatedInPhase = -1; // survives
    } else if (i < survivorCount + phase2Deaths) {
      sorted[i].eliminatedInPhase = 2;
    } else if (i < survivorCount + phase2Deaths + phase1Deaths) {
      sorted[i].eliminatedInPhase = 1;
    } else {
      sorted[i].eliminatedInPhase = 0;
    }
  }

  // Compute stagger within each phase group (normalized 0..1, edge-first)
  for (const phase of [0, 1, 2]) {
    const group = blocks.filter((b) => b.eliminatedInPhase === phase);
    if (group.length === 0) continue;
    const maxDist = Math.max(...group.map((b) => b.distFromCenter));
    const minDist = Math.min(...group.map((b) => b.distFromCenter));
    const range = maxDist - minDist || 1;
    for (const b of group) {
      // Invert: farther blocks get lower stagger (start first)
      b.stagger = 1 - (b.distFromCenter - minDist) / range;
      // Add small random perturbation
      b.stagger = clamp(0, b.stagger + (Math.random() - 0.5) * 0.15, 1);
    }
  }

  return blocks;
}

function resetBlocks(blocks: Block[]) {
  for (const b of blocks) {
    b.x = b.initX;
    b.y = b.initY;
    b.size = b.initSize;
    b.opacity = 0.55 + Math.random() * 0.35;
    b.alive = true;
  }
}

// --- Component ---
export default function TokenCompression() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<Block[]>([]);
  const animFrameRef = useRef<number>(0);

  // Animation state
  const phaseRef = useRef<AnimPhase>('idle');
  const phaseStartRef = useRef(0);
  const globalTimeRef = useRef(0);

  // Counter
  const displayCountRef = useRef(15000);
  const countFromRef = useRef(15000);
  const countToRef = useRef(15000);
  const countStartRef = useRef(0);
  const countDurRef = useRef(800);

  // Labels & final
  const activeLabelIdx = useRef(-1);
  const showSavingsRef = useRef(false);
  const savingsTimeRef = useRef(0);
  const hasPlayedRef = useRef(false);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // --- Counter helper ---
  const startCount = useCallback((from: number, to: number, dur: number) => {
    countFromRef.current = from;
    countToRef.current = to;
    countStartRef.current = performance.now();
    countDurRef.current = dur;
  }, []);

  // --- Phase transition logic ---
  const advancePhase = useCallback(
    (now: number) => {
      const phase = phaseRef.current;
      const elapsed = now - phaseStartRef.current;

      if (phase === 'initial-hold' && elapsed >= INITIAL_PAUSE) {
        phaseRef.current = 'phase-0';
        phaseStartRef.current = now;
        activeLabelIdx.current = 0;
        startCount(15000, 4000, PHASES[0].duration);
      } else if (phase === 'phase-0' && elapsed >= PHASES[0].duration) {
        // Mark phase-0 blocks dead
        for (const b of blocksRef.current) {
          if (b.eliminatedInPhase === 0) b.alive = false;
        }
        phaseRef.current = 'pause-0';
        phaseStartRef.current = now;
      } else if (phase === 'pause-0' && elapsed >= PHASES[0].pause) {
        phaseRef.current = 'phase-1';
        phaseStartRef.current = now;
        activeLabelIdx.current = 1;
        startCount(4000, 1500, PHASES[1].duration);
      } else if (phase === 'phase-1' && elapsed >= PHASES[1].duration) {
        for (const b of blocksRef.current) {
          if (b.eliminatedInPhase === 1) b.alive = false;
        }
        phaseRef.current = 'pause-1';
        phaseStartRef.current = now;
      } else if (phase === 'pause-1' && elapsed >= PHASES[1].pause) {
        phaseRef.current = 'phase-2';
        phaseStartRef.current = now;
        activeLabelIdx.current = 2;
        startCount(1500, 670, PHASES[2].duration);
      } else if (phase === 'phase-2' && elapsed >= PHASES[2].duration) {
        for (const b of blocksRef.current) {
          if (b.eliminatedInPhase === 2) b.alive = false;
        }
        phaseRef.current = 'complete';
        phaseStartRef.current = now;
        hasPlayedRef.current = true;
        // Schedule savings text
        savingsTimeRef.current = now + FINAL_SAVINGS_DELAY;
        showSavingsRef.current = false;
      } else if (phase === 'complete' && !showSavingsRef.current && now >= savingsTimeRef.current) {
        showSavingsRef.current = true;
        savingsTimeRef.current = now; // reuse as appearance time for fade-in
      }
    },
    [startCount]
  );

  // --- Draw ---
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, now: number) => {
      const phase = phaseRef.current;
      const phaseElapsed = now - phaseStartRef.current;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, BG_COLOR);
      bgGrad.addColorStop(0.5, BG_MID);
      bgGrad.addColorStop(1, BG_COLOR);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // --- Phase labels (top-left) ---
      const labelFontSize = Math.max(10, w * 0.022);
      ctx.font = `${labelFontSize}px ${MONOSPACE}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      let labelX = 16;
      const labelY = 16;
      for (let i = 0; i < PHASES.length; i++) {
        if (i > 0) {
          ctx.fillStyle = LABEL_DIM;
          ctx.fillText('>', labelX, labelY);
          labelX += ctx.measureText('>').width + 8;
        }

        const isActive = i === activeLabelIdx.current;
        const isPast = i < activeLabelIdx.current;

        if (isActive) {
          // Fade in over 150ms
          const fadeT = clamp(0, phaseElapsed / 150, 1);
          const alpha = 0.3 + fadeT * 0.55;
          ctx.fillStyle = `rgba(160, 200, 255, ${alpha})`;
        } else if (isPast) {
          ctx.fillStyle = 'rgba(160, 200, 255, 0.5)';
        } else {
          ctx.fillStyle = LABEL_DIM;
        }

        ctx.fillText(PHASES[i].label, labelX, labelY);
        labelX += ctx.measureText(PHASES[i].label).width + 10;
      }

      // --- Counter (top-right) ---
      const countElapsed = now - countStartRef.current;
      const countProgress = clamp(0, countElapsed / countDurRef.current, 1);
      const countEased = easeOutCubic(countProgress);
      displayCountRef.current =
        countFromRef.current + (countToRef.current - countFromRef.current) * countEased;

      const counterFontSize = Math.max(14, w * 0.035);
      ctx.font = `600 ${counterFontSize}px ${MONOSPACE}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = COUNTER_COLOR;
      const countStr = Math.round(displayCountRef.current).toLocaleString() + ' tokens';
      ctx.fillText(countStr, w - 16, 14);

      // --- "95% compression" text ---
      if (showSavingsRef.current) {
        const savingsAge = now - savingsTimeRef.current;
        const savingsAlpha = clamp(0, savingsAge / 400, 1);
        const savFontSize = Math.max(11, w * 0.024);
        ctx.font = `500 ${savFontSize}px ${MONOSPACE}`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = `rgba(140, 200, 255, ${savingsAlpha * 0.95})`;
        ctx.fillText('95% compression', w - 16, 18 + counterFontSize);
      }

      // --- Blocks ---
      const blocks = blocksRef.current;

      // Determine current phase index for elimination animation
      let currentPhaseIdx = -1;
      let phaseDur = 0;
      if (phase === 'phase-0') { currentPhaseIdx = 0; phaseDur = PHASES[0].duration; }
      else if (phase === 'phase-1') { currentPhaseIdx = 1; phaseDur = PHASES[1].duration; }
      else if (phase === 'phase-2') { currentPhaseIdx = 2; phaseDur = PHASES[2].duration; }

      // Compute survivor cluster center for glow
      let scx = 0, scy = 0, sCount = 0;

      for (const b of blocks) {
        // Skip already dead blocks
        if (!b.alive && b.eliminatedInPhase !== currentPhaseIdx) {
          continue;
        }

        // Animate blocks being eliminated in current phase
        if (b.eliminatedInPhase === currentPhaseIdx && currentPhaseIdx >= 0) {
          const blockDelay = b.stagger * phaseDur * 0.4;
          const blockElapsed = Math.max(0, phaseElapsed - blockDelay);
          const blockDur = phaseDur - blockDelay;
          const t = clamp(0, blockElapsed / blockDur, 1);
          const e = easeOutCubic(t);

          b.x = lerp(b.initX, b.targetX, e * 0.5);
          b.y = lerp(b.initY, b.targetY, e * 0.5);
          b.size = lerp(b.initSize, 0, e);
          b.opacity = lerp(0.55 + 0.35 * b.stagger, 0, e);
        }

        // Skip invisible
        if (b.opacity < 0.01 || b.size < 0.3) continue;

        // Track survivor center
        if (b.eliminatedInPhase === -1) {
          scx += b.x;
          scy += b.y;
          sCount++;
        }

        // Color: survivors glow brighter, dying blocks dim
        let r: number, g: number, bv: number;
        if (b.eliminatedInPhase === -1) {
          // Survivors: brighter blue, pulse in complete state
          const pulse =
            phase === 'complete'
              ? 0.8 + 0.2 * Math.sin(globalTimeRef.current * 2.5 + b.stagger * Math.PI * 2)
              : 0.85;
          r = Math.round(100 + pulse * 40);
          g = Math.round(160 + pulse * 40);
          bv = 255;
        } else {
          // Being eliminated: shift toward dim
          r = 70;
          g = 100;
          bv = 180;
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${bv}, ${b.opacity})`;
        ctx.fillRect(
          Math.round(b.x - b.size / 2),
          Math.round(b.y - b.size / 2),
          Math.round(b.size),
          Math.round(b.size)
        );
      }

      // --- Survivor glow (complete state) ---
      if (phase === 'complete' && sCount > 0) {
        const cx = scx / sCount;
        const cy = scy / sCount;
        const glowR = 35 + 8 * Math.sin(globalTimeRef.current * 1.5);
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        glow.addColorStop(0, 'rgba(100, 180, 255, 0.18)');
        glow.addColorStop(0.5, 'rgba(100, 180, 255, 0.06)');
        glow.addColorStop(1, 'rgba(100, 180, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    []
  );

  // --- Draw static reduced-motion frame ---
  const drawStatic = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, BG_COLOR);
      bgGrad.addColorStop(0.5, BG_MID);
      bgGrad.addColorStop(1, BG_COLOR);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const blocks = blocksRef.current;
      const midX = w / 2;

      // Left side: dense grid (before)
      const leftBlocks = blocks.filter(() => true); // all blocks
      for (const b of leftBlocks) {
        // Shift blocks to left half
        const shiftedX = b.initX * 0.45 + w * 0.02;
        const shiftedY = b.initY;
        ctx.fillStyle = `rgba(70, 100, 180, 0.5)`;
        ctx.fillRect(
          Math.round(shiftedX - b.initSize / 2),
          Math.round(shiftedY - b.initSize / 2),
          Math.round(b.initSize),
          Math.round(b.initSize)
        );
      }

      // Right side: only survivors
      const survivors = blocks.filter((b) => b.eliminatedInPhase === -1);
      // Cluster survivors in right half center
      const rightCX = w * 0.75;
      const rightCY = h * 0.5;
      const spacing = Math.max(4, w * 0.012);
      const survCols = Math.ceil(Math.sqrt(survivors.length));
      for (let i = 0; i < survivors.length; i++) {
        const col = i % survCols;
        const row = Math.floor(i / survCols);
        const sx = rightCX + (col - survCols / 2) * spacing;
        const sy = rightCY + (row - Math.ceil(survivors.length / survCols) / 2) * spacing;
        ctx.fillStyle = 'rgba(140, 200, 255, 0.85)';
        ctx.fillRect(
          Math.round(sx - survivors[0].initSize / 2),
          Math.round(sy - survivors[0].initSize / 2),
          Math.round(survivors[0].initSize),
          Math.round(survivors[0].initSize)
        );
      }

      // Arrow
      const arrowY = h / 2;
      ctx.strokeStyle = 'rgba(160, 200, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(midX - 30, arrowY);
      ctx.lineTo(midX + 20, arrowY);
      ctx.moveTo(midX + 12, arrowY - 6);
      ctx.lineTo(midX + 20, arrowY);
      ctx.lineTo(midX + 12, arrowY + 6);
      ctx.stroke();

      // Labels
      const labelFont = Math.max(10, w * 0.022);
      ctx.font = `${labelFont}px ${MONOSPACE}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      ctx.fillStyle = COUNTER_COLOR;
      ctx.fillText('15,000 tokens', w * 0.24, h - 14);
      ctx.fillText('670 tokens', w * 0.75, h - 14);

      // Phase labels
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(160, 200, 255, 0.5)';
      ctx.fillText('tree  >  rg  >  sed -n', midX, 16);

      // 95% compression
      ctx.fillStyle = SAVINGS_COLOR;
      ctx.font = `500 ${Math.max(12, w * 0.028)}px ${MONOSPACE}`;
      ctx.fillText('95% compression', midX, 16 + labelFont + 6);
    },
    []
  );

  // --- Prefers reduced motion ---
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // --- Intersection Observer ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else if (hasPlayedRef.current) {
          setIsVisible(false);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // --- Canvas setup & animation loop ---
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
      blocksRef.current = createBlocks(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    if (prefersReducedMotion) {
      const rect = canvas.getBoundingClientRect();
      drawStatic(ctx, rect.width, rect.height);
    } else if (isVisible) {
      // Reset state for fresh play
      resetBlocks(blocksRef.current);
      phaseRef.current = 'initial-hold';
      phaseStartRef.current = performance.now();
      globalTimeRef.current = 0;
      displayCountRef.current = 15000;
      countFromRef.current = 15000;
      countToRef.current = 15000;
      countStartRef.current = performance.now();
      activeLabelIdx.current = -1;
      showSavingsRef.current = false;

      const animate = () => {
        const now = performance.now();
        globalTimeRef.current += 0.016;

        advancePhase(now);

        const rect = canvas.getBoundingClientRect();
        draw(ctx, rect.width, rect.height, now);
        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Not visible, draw idle state (full grid)
      const rect = canvas.getBoundingClientRect();
      displayCountRef.current = 15000;
      draw(ctx, rect.width, rect.height, performance.now());
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isVisible, prefersReducedMotion, draw, drawStatic, advancePhase]);

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-white/10 bg-[#0a0a14]"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-[260px] sm:h-[320px] md:h-[380px]"
        aria-label="Animated visualization showing token compression: a graduated reading protocol using tree, ripgrep, and sed reduces 15,000 tokens to 670 tokens, achieving 95% compression"
        role="img"
      />
    </div>
  );
}
