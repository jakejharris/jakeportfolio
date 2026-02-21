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
  tier: 'haiku' | 'sonnet';
}

interface TierConfig {
  tier: 'haiku' | 'sonnet' | 'opus' | 'human';
  nodeCount: number;
  yPosition: number;
  nodeRadius: number;
  color: string;
  colorRgb: string; // "r, g, b" for rgba construction
  label: string;
  particleRadius: number;
}

interface Layout {
  nodes: HierarchyNode[];
  connections: Connection[];
  haikuConnections: Connection[];
  sonnetToOpusConnections: Connection[];
}

// --- Constants ---

const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'haiku',
    nodeCount: 6,
    yPosition: 0.78,
    nodeRadius: 9,
    color: '#4ecdc4',
    colorRgb: '78, 205, 196',
    label: 'Haiku — Readers',
    particleRadius: 2,
  },
  {
    tier: 'sonnet',
    nodeCount: 3,
    yPosition: 0.50,
    nodeRadius: 14,
    color: '#7c6cff',
    colorRgb: '124, 108, 255',
    label: 'Sonnet — Workers',
    particleRadius: 3.2,
  },
  {
    tier: 'opus',
    nodeCount: 1,
    yPosition: 0.27,
    nodeRadius: 20,
    color: '#b794f6',
    colorRgb: '183, 148, 246',
    label: 'Opus — Coordinator',
    particleRadius: 4,
  },
  {
    tier: 'human',
    nodeCount: 1,
    yPosition: 0.10,
    nodeRadius: 16,
    color: '#e8d5b7',
    colorRgb: '232, 213, 183',
    label: 'Me (human)',
    particleRadius: 0,
  },
];

// Which sonnet indices each haiku node connects to (minimizes crossings)
const HAIKU_TO_SONNET: number[][] = [
  [0],    // haiku-0 -> sonnet-0
  [0, 1], // haiku-1 -> sonnet-0, sonnet-1
  [0, 1], // haiku-2 -> sonnet-0, sonnet-1
  [1, 2], // haiku-3 -> sonnet-1, sonnet-2
  [1, 2], // haiku-4 -> sonnet-1, sonnet-2
  [2],    // haiku-5 -> sonnet-2
];

const MAX_PARTICLES = 80;
const HAIKU_SPAWN_INTERVAL = 0.4; // seconds per spawn per connection
const COMPRESSION_THRESHOLD = 3;  // haiku arrivals before sonnet particle spawns

// --- Layout ---

function calculateLayout(width: number, height: number): Layout {
  const nodes: HierarchyNode[] = [];
  const nodesByTier: Record<string, HierarchyNode[]> = {};

  // On short canvases, shift tiers down to prevent top clipping
  const yOffsets: Record<string, number> = {};
  if (height < 380) {
    // Compress spread and add top margin so human label isn't clipped
    yOffsets['human'] = 0.18;
    yOffsets['opus'] = 0.35;
    yOffsets['sonnet'] = 0.56;
    yOffsets['haiku'] = 0.80;
  }

  const horizontalPadding = width < 400 ? 0.15 : 0.12;
  const usableWidth = width * (1 - 2 * horizontalPadding);
  const startX = width * horizontalPadding;

  // Label offset: leave space on the left for labels on wider screens
  const labelSpace = width < 400 ? 0 : width * 0.18;
  const nodeStartX = startX + labelSpace;
  const nodeUsableWidth = usableWidth - labelSpace;

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

  return { nodes, connections, haikuConnections, sonnetToOpusConnections };
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

// Bezier control point for a connection (slight horizontal offset for organic curves)
function getControlPoint(from: HierarchyNode, to: HierarchyNode): { cx: number; cy: number } {
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  return { cx: from.x + dx * 0.5 + dx * 0.15, cy: midY };
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
  const layoutRef = useRef<Layout>({ nodes: [], connections: [], haikuConnections: [], sonnetToOpusConnections: [] });
  const accumulatorsRef = useRef<Record<string, number>>({});
  const spawnTimersRef = useRef<Record<string, number>>({});
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const time = timeRef.current;
    const { nodes, connections } = layoutRef.current;
    const particles = particlesRef.current;
    const isNarrow = width < 400;

    // --- Background ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0a14');
    bgGrad.addColorStop(0.5, '#0d0d1a');
    bgGrad.addColorStop(1, '#0a0a14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // --- Connection lines ---
    ctx.save();
    for (const conn of connections) {
      const ctrl = getControlPoint(conn.from, conn.to);
      const pulse = 0.12 + 0.03 * Math.sin(time * 1.5);
      // Extract base color from the connection and apply pulsing alpha
      const baseColor = conn.color.replace(/[\d.]+\)$/, `${pulse})`);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(conn.from.x, conn.from.y);
      ctx.quadraticCurveTo(ctrl.cx, ctrl.cy, conn.to.x, conn.to.y);
      ctx.stroke();
    }
    ctx.restore();

    // --- Particles ---
    for (const p of particles) {
      const ctrl = getControlPoint(p.connection.from, p.connection.to);
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

    // --- Nodes ---
    for (const node of nodes) {
      const config = TIER_CONFIGS.find(t => t.tier === node.tier)!;
      const pulseScale = prefersReducedMotion ? 1 : 1 + 0.06 * Math.sin(time * 1.2 + node.pulsePhase);
      const r = node.radius * pulseScale;

      // Outer glow
      const glowR = r * 2.8;
      const glow = ctx.createRadialGradient(node.x, node.y, r * 0.4, node.x, node.y, glowR);
      glow.addColorStop(0, `rgba(${config.colorRgb}, 0.25)`);
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Labels ---
    const fontSize = Math.max(10, Math.min(14, width * 0.026));
    ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, monospace`;

    for (const config of TIER_CONFIGS) {
      // Use actual node y from layout (respects mobile adjustments)
      const tierNode = nodes.find(n => n.tier === config.tier);
      const y = tierNode ? tierNode.y : config.yPosition * height;
      ctx.fillStyle = `rgba(${config.colorRgb}, 0.55)`;

      if (isNarrow) {
        // On narrow screens, center labels above tier
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(config.label, width / 2, y - config.nodeRadius - 10);
      } else {
        // On wider screens, labels on the left
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.label, 14, y);
      }
    }

    // --- Upward flow arrow hint (subtle) ---
    // Small upward arrows between tiers to reinforce flow direction
    const arrowAlpha = 0.12 + 0.04 * Math.sin(time * 2);
    ctx.save();
    ctx.strokeStyle = `rgba(160, 175, 220, ${arrowAlpha})`;
    ctx.lineWidth = 1;
    const arrowX = isNarrow ? width - 20 : width - 30;
    const arrowTiers = [0.64, 0.38]; // between haiku-sonnet and sonnet-opus
    for (const yNorm of arrowTiers) {
      const ay = yNorm * height;
      ctx.beginPath();
      ctx.moveTo(arrowX, ay + 8);
      ctx.lineTo(arrowX, ay - 8);
      ctx.moveTo(arrowX - 4, ay - 4);
      ctx.lineTo(arrowX, ay - 8);
      ctx.lineTo(arrowX + 4, ay - 4);
      ctx.stroke();
    }
    ctx.restore();
  }, [prefersReducedMotion]);

  // Reduced motion detection
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Main canvas and animation loop
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
      layoutRef.current = calculateLayout(rect.width, rect.height);
      particlesRef.current = [];
      accumulatorsRef.current = {};
      spawnTimersRef.current = {};
    };

    resize();
    window.addEventListener('resize', resize);

    if (prefersReducedMotion) {
      // Static frame with particles placed along connections to suggest flow
      const { haikuConnections, sonnetToOpusConnections } = layoutRef.current;
      const staticParticles: FlowParticle[] = [];
      for (const conn of haikuConnections) {
        for (let i = 0; i < 2; i++) {
          const p = spawnParticle(conn, 'haiku');
          p.progress = 0.2 + Math.random() * 0.6;
          p.opacity = 0.55;
          staticParticles.push(p);
        }
      }
      for (const conn of sonnetToOpusConnections) {
        const p = spawnParticle(conn, 'sonnet');
        p.progress = 0.3 + Math.random() * 0.4;
        p.opacity = 0.55;
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
        const { haikuConnections, sonnetToOpusConnections } = layoutRef.current;

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

        // --- Update particles ---
        const toRemove: number[] = [];
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.progress += p.speed;

          // Fade in/out
          if (p.progress < 0.1) {
            p.opacity = p.progress / 0.1;
          } else if (p.progress > 0.85) {
            p.opacity = Math.max(0, (1 - p.progress) / 0.15);
          } else {
            p.opacity = 0.85;
          }

          if (p.progress >= 1.0) {
            toRemove.push(i);
            const destId = p.connection.to.id;

            if (p.tier === 'haiku') {
              accumulators[destId] = (accumulators[destId] || 0) + 1;
              if (accumulators[destId] >= COMPRESSION_THRESHOLD) {
                accumulators[destId] = 0;
                const outConn = sonnetToOpusConnections.find(c => c.from.id === destId);
                if (outConn && particles.length < MAX_PARTICLES) {
                  particles.push(spawnParticle(outConn, 'sonnet'));
                }
              }
            }
          }
        }

        // Remove completed particles (reverse order)
        for (let i = toRemove.length - 1; i >= 0; i--) {
          particles.splice(toRemove[i], 1);
        }

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
    <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0a0a14]">
      <canvas
        ref={canvasRef}
        className="w-full h-[300px] sm:h-[380px] md:h-[440px]"
        aria-label="Animated diagram showing a three-tier agent hierarchy: many small Haiku reader nodes at the bottom send data particles upward to Sonnet worker nodes in the middle, which compress and forward fewer, larger particles to a single Opus coordinator at the top, demonstrating data compression at each tier"
        role="img"
      />
    </div>
  );
}
