'use client';

// Visualizes the three-tier agent hierarchy described in "What I Learned
// Running Three-Tier Agent Hierarchies." Six cheap Haiku explore agents feed
// into three mid-tier Sonnet workers, which feed into one Opus coordinator,
// which reports to the human. Flow particles travel upward along Bezier
// curves, and a compression threshold (4 Haiku arrivals spawn 1 Sonnet
// particle) demonstrates the key insight: "Every tier compresses information
// for the tier above it." The result is a live depiction of context cost
// dropping from O(file_size) to O(result_count) at each boundary.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { getCanvasTheme } from './theme-colors';

// --- Types ---

interface HierarchyNode {
  id: string;
  tier: 'haiku' | 'sonnet' | 'opus' | 'human';
  x: number;
  y: number;
  radius: number;
  color: string;
  pulsePhase: number;
}

interface Connection {
  from: HierarchyNode;
  to: HierarchyNode;
  color: string;
}

interface FlowParticle {
  connection: Connection;
  progress: number;
  speed: number;
  radius: number;
  colorBase: string; // e.g. "78, 205, 196"
  opacity: number;
  tier: 'haiku' | 'sonnet' | 'coordination';
}

interface TierConfig {
  tier: 'haiku' | 'sonnet' | 'opus' | 'human';
  nodeCount: number;
  yPosition: number;
  nodeRadius: number;
  color: string;
  colorRgb: string; // "r, g, b" for rgba construction
  label: string;
  subtitle: string;
  particleRadius: number;
}

interface Layout {
  nodes: HierarchyNode[];
  connections: Connection[];
  haikuConnections: Connection[];
  sonnetToOpusConnections: Connection[];
  downwardConnections: Connection[];
  verticalOffset: number; // responsive horizontal offset for vertically-aligned curves
}

// --- Constants ---

const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'haiku',
    nodeCount: 9,
    yPosition: 0.82,
    nodeRadius: 7,
    color: '#4ecdc4',
    colorRgb: '78, 205, 196',
    label: 'Haiku',
    subtitle: 'Readers',
    particleRadius: 2,
  },
  {
    tier: 'sonnet',
    nodeCount: 3,
    yPosition: 0.56,
    nodeRadius: 14,
    color: '#7c6cff',
    colorRgb: '124, 108, 255',
    label: 'Sonnet',
    subtitle: 'Workers',
    particleRadius: 3.2,
  },
  {
    tier: 'opus',
    nodeCount: 1,
    yPosition: 0.34,
    nodeRadius: 20,
    color: '#b794f6',
    colorRgb: '183, 148, 246',
    label: 'Opus',
    subtitle: 'Coordinator',
    particleRadius: 4,
  },
  {
    tier: 'human',
    nodeCount: 1,
    yPosition: 0.16,
    nodeRadius: 16,
    color: '#e8d5b7',
    colorRgb: '232, 213, 183',
    label: 'Me',
    subtitle: 'Human',
    particleRadius: 0,
  },
];

// Each group of 3 haiku nodes feeds into exactly one sonnet (no crossover)
const HAIKU_TO_SONNET: number[][] = [
  [0], // haiku-0 -> sonnet-0
  [0], // haiku-1 -> sonnet-0
  [0], // haiku-2 -> sonnet-0
  [1], // haiku-3 -> sonnet-1
  [1], // haiku-4 -> sonnet-1
  [1], // haiku-5 -> sonnet-1
  [2], // haiku-6 -> sonnet-2
  [2], // haiku-7 -> sonnet-2
  [2], // haiku-8 -> sonnet-2
];

const MAX_PARTICLES = 100;
const HAIKU_SPAWN_INTERVAL = 0.4; // seconds per spawn per connection
const COMPRESSION_THRESHOLD = 3;  // haiku arrivals before sonnet particle spawns

// Coordination (downward) particles
const COORDINATION_SPAWN_INTERVAL = 1.8;
const COORDINATION_PARTICLE_RADIUS = 1.8;
const COORDINATION_OPACITY_MAX = 0.45;
const COORDINATION_SPEED_BASE = 0.003;

// --- Layout ---

function calculateLayout(width: number, height: number): Layout {
  const nodes: HierarchyNode[] = [];
  const nodesByTier: Record<string, HierarchyNode[]> = {};

  // On short canvases, shift tiers down to prevent top clipping
  const yOffsets: Record<string, number> = {};
  if (height < 380) {
    // Compress spread and add top margin so human label isn't clipped
    yOffsets['human'] = 0.20;
    yOffsets['opus'] = 0.40;
    yOffsets['sonnet'] = 0.60;
    yOffsets['haiku'] = 0.82;
  }

  const horizontalPadding = width < 400 ? 0.12 : 0.10;
  const nodeUsableWidth = width * (1 - 2 * horizontalPadding);
  const nodeStartX = width * horizontalPadding;

  for (const config of TIER_CONFIGS) {
    const tierNodes: HierarchyNode[] = [];
    const yPos = yOffsets[config.tier] ?? config.yPosition;
    const y = yPos * height;

    for (let i = 0; i < config.nodeCount; i++) {
      let x: number;
      if (config.nodeCount === 1) {
        x = nodeStartX + nodeUsableWidth / 2;
      } else {
        x = nodeStartX + (nodeUsableWidth * i) / (config.nodeCount - 1);
      }

      tierNodes.push({
        id: `${config.tier}-${i}`,
        tier: config.tier,
        x,
        y,
        radius: config.nodeRadius,
        color: config.color,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    nodesByTier[config.tier] = tierNodes;
    nodes.push(...tierNodes);
  }

  const connections: Connection[] = [];
  const haikuNodes = nodesByTier['haiku'];
  const sonnetNodes = nodesByTier['sonnet'];
  const opusNodes = nodesByTier['opus'];
  const humanNodes = nodesByTier['human'];

  // Haiku -> Sonnet
  const haikuConnections: Connection[] = [];
  HAIKU_TO_SONNET.forEach((sonnetIndices, haikuIdx) => {
    sonnetIndices.forEach(sonnetIdx => {
      const conn: Connection = {
        from: haikuNodes[haikuIdx],
        to: sonnetNodes[sonnetIdx],
        color: `rgba(78, 205, 196, 0.12)`,
      };
      connections.push(conn);
      haikuConnections.push(conn);
    });
  });

  // Sonnet -> Opus
  const sonnetToOpusConnections: Connection[] = [];
  sonnetNodes.forEach(sonnet => {
    const conn: Connection = {
      from: sonnet,
      to: opusNodes[0],
      color: `rgba(124, 108, 255, 0.12)`,
    };
    connections.push(conn);
    sonnetToOpusConnections.push(conn);
  });

  // Opus -> Human
  if (humanNodes.length > 0) {
    connections.push({
      from: opusNodes[0],
      to: humanNodes[0],
      color: `rgba(183, 148, 246, 0.12)`,
    });
  }

  // --- Downward coordination connections (separate from main connections) ---
  const downwardConnections: Connection[] = [];

  // Human -> Opus (human gold color)
  if (humanNodes.length > 0) {
    downwardConnections.push({
      from: humanNodes[0],
      to: opusNodes[0],
      color: `rgba(232, 213, 183, 0.08)`,
    });
  }

  // Opus -> each Sonnet (opus purple color)
  for (const sonnet of sonnetNodes) {
    downwardConnections.push({
      from: opusNodes[0],
      to: sonnet,
      color: `rgba(183, 148, 246, 0.08)`,
    });
  }

  // Responsive horizontal offset for vertically-aligned bezier curves
  const verticalOffset = Math.min(25, width * 0.04);

  return { nodes, connections, haikuConnections, sonnetToOpusConnections, downwardConnections, verticalOffset };
}

// --- Particle helpers ---

function spawnParticle(connection: Connection, tier: 'haiku' | 'sonnet'): FlowParticle {
  const config = TIER_CONFIGS.find(t => t.tier === tier)!;
  return {
    connection,
    progress: 0,
    speed: 0.004 + Math.random() * 0.004,
    radius: config.particleRadius + (Math.random() - 0.5) * 0.6,
    colorBase: config.colorRgb,
    opacity: 0,
    tier,
  };
}

function spawnCoordinationParticle(connection: Connection, colorBase: string): FlowParticle {
  return {
    connection,
    progress: 0,
    speed: COORDINATION_SPEED_BASE + Math.random() * 0.002,
    radius: COORDINATION_PARTICLE_RADIUS + (Math.random() - 0.5) * 0.4,
    colorBase,
    opacity: 0,
    tier: 'coordination',
  };
}

// Bezier control point for a connection (slight horizontal offset for organic curves)
function getControlPoint(from: HierarchyNode, to: HierarchyNode): { cx: number; cy: number } {
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  return { cx: from.x + dx * 0.5 + dx * 0.15, cy: midY };
}

// Mirrored control point for downward connections — bows opposite direction to form a lens shape
function getDownwardControlPoint(
  from: HierarchyNode,
  to: HierarchyNode,
  verticalOffset: number
): { cx: number; cy: number } {
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  // For vertically aligned nodes (dx ≈ 0), use a fixed pixel offset
  if (Math.abs(dx) < 5) {
    return { cx: from.x - verticalOffset, cy: midY };
  }
  return { cx: from.x + dx * 0.5 - dx * 0.15, cy: midY };
}

// Position along quadratic bezier at t
function bezierPoint(
  from: HierarchyNode,
  to: HierarchyNode,
  ctrl: { cx: number; cy: number },
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * ctrl.cx + t * t * to.x,
    y: u * u * from.y + 2 * u * t * ctrl.cy + t * t * to.y,
  };
}

// --- Component ---

export default function AgentHierarchy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<FlowParticle[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const layoutRef = useRef<Layout>({ nodes: [], connections: [], haikuConnections: [], sonnetToOpusConnections: [], downwardConnections: [], verticalOffset: 25 });
  const accumulatorsRef = useRef<Record<string, number>>({});
  const spawnTimersRef = useRef<Record<string, number>>({});
  const arrivalPulseRef = useRef<Record<string, number>>({});
  const visibleRef = useRef(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const canvasTheme = getCanvasTheme(isDark);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const time = timeRef.current;
    const layout = layoutRef.current;
    const { nodes, connections, downwardConnections, verticalOffset } = layout;
    const particles = particlesRef.current;
    const arrivalPulses = arrivalPulseRef.current;

    // --- Decay arrival pulses ---
    for (const id in arrivalPulses) {
      arrivalPulses[id] *= 0.92;
      if (arrivalPulses[id] < 0.001) delete arrivalPulses[id];
    }

    // --- Background ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, canvasTheme.bg);
    bgGrad.addColorStop(0.5, canvasTheme.bgMid);
    bgGrad.addColorStop(1, canvasTheme.bg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // --- Upward connection lines (solid) ---
    ctx.save();
    for (const conn of connections) {
      const ctrl = getControlPoint(conn.from, conn.to);
      const pulse = 0.12 + 0.03 * Math.sin(time * 1.5);
      const baseColor = conn.color.replace(/[\d.]+\)$/, `${pulse})`);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(conn.from.x, conn.from.y);
      ctx.quadraticCurveTo(ctrl.cx, ctrl.cy, conn.to.x, conn.to.y);
      ctx.stroke();
    }
    ctx.restore();

    // --- Downward connection lines (dashed) ---
    ctx.save();
    ctx.setLineDash([4, 6]);
    for (const conn of downwardConnections) {
      const ctrl = getDownwardControlPoint(conn.from, conn.to, verticalOffset);
      const pulse = 0.08 + 0.02 * Math.sin(time * 1.2 + 1.0);
      const baseColor = conn.color.replace(/[\d.]+\)$/, `${pulse})`);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(conn.from.x, conn.from.y);
      ctx.quadraticCurveTo(ctrl.cx, ctrl.cy, conn.to.x, conn.to.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // --- Particles (upward + coordination) ---
    for (const p of particles) {
      const ctrl = p.tier === 'coordination'
        ? getDownwardControlPoint(p.connection.from, p.connection.to, verticalOffset)
        : getControlPoint(p.connection.from, p.connection.to);
      const pos = bezierPoint(p.connection.from, p.connection.to, ctrl, p.progress);

      // Glow
      const glowR = p.radius * 3;
      const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
      glow.addColorStop(0, `rgba(${p.colorBase}, ${p.opacity * 0.5})`);
      glow.addColorStop(0.5, `rgba(${p.colorBase}, ${p.opacity * 0.15})`);
      glow.addColorStop(1, `rgba(${p.colorBase}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = `rgba(${p.colorBase}, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Nodes (with arrival pulse) ---
    for (const node of nodes) {
      const config = TIER_CONFIGS.find(t => t.tier === node.tier)!;
      const arrivalBump = arrivalPulses[node.id] || 0;
      const pulseScale = prefersReducedMotion
        ? 1 + arrivalBump
        : 1 + 0.06 * Math.sin(time * 1.2 + node.pulsePhase) + arrivalBump;
      const r = node.radius * pulseScale;

      // Outer glow (brightened during arrival pulse)
      const glowAlpha = 0.25 + arrivalBump * 0.6;
      const glowR = r * 2.8;
      const glow = ctx.createRadialGradient(node.x, node.y, r * 0.4, node.x, node.y, glowR);
      glow.addColorStop(0, `rgba(${config.colorRgb}, ${glowAlpha})`);
      glow.addColorStop(1, `rgba(${config.colorRgb}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Solid circle
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Center highlight
      ctx.fillStyle = canvasTheme.centerHighlight;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Labels ---
    const fontSize = Math.max(10, Math.min(13, width * 0.026));
    const subFontSize = Math.max(9, fontSize - 2);

    for (const config of TIER_CONFIGS) {
      const tierNodes = nodes.filter(n => n.tier === config.tier);
      const tierY = tierNodes[0]?.y ?? config.yPosition * height;

      if (config.nodeCount === 1) {
        // Single-node tiers: annotation to the right of the node
        const nodeX = tierNodes[0]?.x ?? width / 2;
        const labelX = nodeX + config.nodeRadius + 10;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Bold model name
        ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, monospace`;
        ctx.fillStyle = `rgba(${canvasTheme.labelDim}, 0.6)`;
        ctx.fillText(config.label, labelX, tierY - subFontSize * 0.4);

        // Lighter subtitle below
        ctx.font = `${subFontSize}px ui-monospace, SFMono-Regular, monospace`;
        ctx.fillStyle = `rgba(${canvasTheme.labelDim}, 0.35)`;
        ctx.fillText(config.subtitle, labelX, tierY + subFontSize * 0.7);
      } else {
        // Multi-node tiers: name + subtitle centered as a group above the nodes
        const tierCenterX = tierNodes.reduce((sum, n) => sum + n.x, 0) / tierNodes.length;
        const labelY = tierY - config.nodeRadius - 8;
        const gap = 5;

        // Measure both to center the combined text
        ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, monospace`;
        const nameWidth = ctx.measureText(config.label).width;
        ctx.font = `${subFontSize}px ui-monospace, SFMono-Regular, monospace`;
        const subWidth = ctx.measureText(config.subtitle).width;
        const totalWidth = nameWidth + gap + subWidth;
        const startX = tierCenterX - totalWidth / 2;

        // Draw both left-aligned from the computed start
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, monospace`;
        ctx.fillStyle = `rgba(${canvasTheme.labelDim}, 0.6)`;
        ctx.fillText(config.label, startX, labelY);

        ctx.font = `${subFontSize}px ui-monospace, SFMono-Regular, monospace`;
        ctx.fillStyle = `rgba(${canvasTheme.labelDim}, 0.35)`;
        ctx.fillText(config.subtitle, startX + nameWidth + gap, labelY);
      }
    }

  }, [prefersReducedMotion, canvasTheme]);

  // Reduced motion detection
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // --- Visibility gating (skip draw when off-screen) ---
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

  // Main canvas and animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let prevDims = { w: 0, h: 0 };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (prevDims.w > 0 && Math.abs(rect.width - prevDims.w) < 1 && Math.abs(rect.height - prevDims.h) < 1) return;
      prevDims = { w: rect.width, h: rect.height };
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutRef.current = calculateLayout(rect.width, rect.height);
      particlesRef.current = [];
      accumulatorsRef.current = {};
      spawnTimersRef.current = {};
      arrivalPulseRef.current = {};
    };

    resize();
    window.addEventListener('resize', resize);

    if (prefersReducedMotion) {
      // Static frame with particles placed along connections to suggest flow
      const { haikuConnections, sonnetToOpusConnections, downwardConnections: downConns } = layoutRef.current;
      const staticParticles: FlowParticle[] = [];
      for (const conn of haikuConnections) {
        const p = spawnParticle(conn, 'haiku');
        p.progress = 0.2 + Math.random() * 0.6;
        p.opacity = 0.55;
        staticParticles.push(p);
      }
      for (const conn of sonnetToOpusConnections) {
        const p = spawnParticle(conn, 'sonnet');
        p.progress = 0.3 + Math.random() * 0.4;
        p.opacity = 0.55;
        staticParticles.push(p);
      }
      // Static coordination particles (1 per downward connection)
      for (let i = 0; i < downConns.length; i++) {
        const colorBase = i === 0 ? '232, 213, 183' : '183, 148, 246';
        const p = spawnCoordinationParticle(downConns[i], colorBase);
        p.progress = 0.3 + Math.random() * 0.4;
        p.opacity = 0.7 * COORDINATION_OPACITY_MAX;
        staticParticles.push(p);
      }
      particlesRef.current = staticParticles;
      const rect = canvas.getBoundingClientRect();
      draw(ctx, rect.width, rect.height);
    } else {
      let lastTime = performance.now();

      const animate = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        timeRef.current += dt;

        const particles = particlesRef.current;
        const accumulators = accumulatorsRef.current;
        const spawnTimers = spawnTimersRef.current;
        const arrivalPulses = arrivalPulseRef.current;
        const { haikuConnections, sonnetToOpusConnections, downwardConnections: downConns } = layoutRef.current;

        // --- Spawn haiku particles ---
        for (let i = 0; i < haikuConnections.length; i++) {
          const key = `h${i}`;
          spawnTimers[key] = (spawnTimers[key] || 0) + dt;
          const interval = HAIKU_SPAWN_INTERVAL + (i % 3) * 0.08; // slight per-connection variation
          if (spawnTimers[key] >= interval && particles.length < MAX_PARTICLES) {
            particles.push(spawnParticle(haikuConnections[i], 'haiku'));
            spawnTimers[key] = 0;
          }
        }

        // --- Spawn coordination particles ---
        for (let i = 0; i < downConns.length; i++) {
          const key = `coord${i}`;
          spawnTimers[key] = (spawnTimers[key] || 0) + dt;
          const interval = COORDINATION_SPAWN_INTERVAL + i * 0.15;
          if (spawnTimers[key] >= interval && particles.length < MAX_PARTICLES) {
            const colorBase = i === 0 ? '232, 213, 183' : '183, 148, 246';
            particles.push(spawnCoordinationParticle(downConns[i], colorBase));
            spawnTimers[key] = 0;
          }
        }

        // --- Update particles ---
        const toRemove: number[] = [];
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.progress += p.speed;

          // Fade in/out envelope
          if (p.progress < 0.1) {
            p.opacity = p.progress / 0.1;
          } else if (p.progress > 0.85) {
            p.opacity = Math.max(0, (1 - p.progress) / 0.15);
          } else {
            p.opacity = 0.85;
          }

          // Cap coordination particles at lower opacity
          if (p.tier === 'coordination' && p.opacity > COORDINATION_OPACITY_MAX) {
            p.opacity = COORDINATION_OPACITY_MAX;
          }

          if (p.progress >= 1.0) {
            toRemove.push(i);
            const destId = p.connection.to.id;

            if (p.tier === 'haiku') {
              // Arrival pulse on sonnet node
              arrivalPulses[destId] = 0.10;
              accumulators[destId] = (accumulators[destId] || 0) + 1;
              if (accumulators[destId] >= COMPRESSION_THRESHOLD) {
                accumulators[destId] = 0;
                const outConn = sonnetToOpusConnections.find(c => c.from.id === destId);
                if (outConn && particles.length < MAX_PARTICLES) {
                  particles.push(spawnParticle(outConn, 'sonnet'));
                }
              }
            } else if (p.tier === 'sonnet') {
              // Arrival pulse on opus node (stronger)
              arrivalPulses[destId] = 0.14;
            } else if (p.tier === 'coordination') {
              // Subtle arrival pulse
              arrivalPulses[destId] = 0.05;
            }
          }
        }

        // Remove completed particles (reverse order)
        for (let i = toRemove.length - 1; i >= 0; i--) {
          particles.splice(toRemove[i], 1);
        }

        if (visibleRef.current) {
          const rect = canvas.getBoundingClientRect();
          draw(ctx, rect.width, rect.height);
        }
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
    <div className={`rounded-lg overflow-hidden border ${canvasTheme.wrapperClass}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-[300px] sm:h-[380px] md:h-[440px] touch-pan-y"
        aria-label="Animated diagram showing a three-tier agent hierarchy: many small Haiku reader nodes at the bottom send data particles upward to Sonnet worker nodes in the middle, which compress and forward fewer, larger particles to a single Opus coordinator at the top, demonstrating data compression at each tier"
        role="img"
      />
    </div>
  );
}
