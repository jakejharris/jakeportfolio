"use client";

import * as React from 'react';

/**
 * The JSpark3 mark: three nodes joined in a triangle. On the page it turns as a
 * physical object, three spheres on three rods tumbling slowly in perspective.
 * The server renders the flat mark, the client takes over on the same geometry
 * so nothing shifts on hydration, and under prefers-reduced-motion (or before
 * hydration) the flat mark is all there is. No dependencies: six SVG elements
 * updated from one requestAnimationFrame loop.
 */

const CX = 20;
const CY = 22;
const RADIUS = 16.5;
const DOT = 4.2;
const ROD = 2.4;
/** Camera distance in units of RADIUS; lower is more perspective. */
const CAMERA = 4.4;
/** One turn every 14 seconds. */
const SPIN = (2 * Math.PI) / 14000;
/** Tilt of the triangle off its spin axis, and of the spin axis off the viewer. */
const TILT_FACE = 0.5;
const TILT_AXIS = 0.82;
/** The first turn eases in from the flat mark over this many milliseconds. */
const ENTRY = 1800;

/** Vertex angles: apex up, then lower right, lower left, matching the flat mark. */
const ANGLES = [-90, 30, 150].map((deg) => (deg * Math.PI) / 180);
const EDGES: ReadonlyArray<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 0],
];

interface Projected {
  x: number;
  y: number;
  z: number;
  scale: number;
}

function rotateX([x, y, z]: number[], a: number): number[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
}

function rotateZ([x, y, z]: number[], a: number): number[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c, z];
}

function easeOutCubic(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - u, 3);
}

/** The three vertices at time t (ms since the animation began), in viewBox units. */
function frame(t: number): Projected[] {
  const entry = easeOutCubic(t / ENTRY);
  const spin = SPIN * t * entry;
  // A slow sway of the axis so the tumble never settles into an exact loop.
  const sway = 0.28 * Math.sin(t / 5200) * entry;
  const face = TILT_FACE * entry * (1 + 0.12 * Math.sin(t / 3700));
  const axis = TILT_AXIS * entry;

  return ANGLES.map((angle) => {
    let p = [Math.cos(angle), Math.sin(angle), 0];
    p = rotateX(p, face);
    p = rotateZ(p, spin);
    p = rotateX(p, axis);
    p = rotateZ(p, sway);
    const [x, y, z] = p;
    const scale = CAMERA / (CAMERA - z);
    return { x: CX + x * RADIUS * scale, y: CY + y * RADIUS * scale, z, scale };
  });
}

const FLAT = frame(0);

function num(v: number): string {
  return v.toFixed(2);
}

/** The flat mark: what the server renders and what reduced motion keeps. */
function StaticMark({ className }: { className?: string }) {
  const [a, b, c] = FLAT;
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className} data-js3-mark="static">
      <path
        d={`M${num(a.x)} ${num(a.y)} L${num(b.x)} ${num(b.y)} L${num(c.x)} ${num(c.y)} Z`}
        fill="none"
        stroke="currentColor"
        strokeWidth={ROD}
        strokeLinejoin="round"
      />
      {FLAT.map((p, i) => (
        <circle key={i} cx={num(p.x)} cy={num(p.y)} r={DOT} fill="currentColor" />
      ))}
    </svg>
  );
}

function MotionMark({ className }: { className?: string }) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const rodRefs = React.useRef<Array<SVGLineElement | null>>([]);
  const nodeRefs = React.useRef<Array<SVGGElement | null>>([]);
  const gradientId = React.useId().replace(/:/g, '');

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rods = rodRefs.current;
    const nodes = nodeRefs.current;
    const nodeLayer = nodes[0]?.parentElement;
    const start = performance.now();
    let handle = 0;

    const tick = (now: number) => {
      const points = frame(now - start);
      EDGES.forEach(([i, j], e) => {
        const rod = rods[e];
        if (!rod) return;
        const a = points[i];
        const b = points[j];
        const depth = (a.scale + b.scale) / 2;
        rod.setAttribute('x1', num(a.x));
        rod.setAttribute('y1', num(a.y));
        rod.setAttribute('x2', num(b.x));
        rod.setAttribute('y2', num(b.y));
        rod.setAttribute('stroke-width', num(ROD * depth));
        rod.setAttribute('opacity', num(0.55 + 0.45 * Math.min(1, Math.max(0, (depth - 0.75) / 0.5))));
      });
      points.forEach((p, i) => {
        const node = nodes[i];
        if (!node) return;
        node.setAttribute('transform', `translate(${num(p.x)} ${num(p.y)}) scale(${num(p.scale)})`);
      });
      // Painter's order: the nearest sphere is drawn last.
      if (nodeLayer) {
        points
          .map((p, i) => ({ z: p.z, i }))
          .sort((a, b) => a.z - b.z)
          .forEach(({ i }) => {
            const node = nodes[i];
            if (node) nodeLayer.appendChild(node);
          });
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, []);

  const [a, b, c] = FLAT;
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={className}
      style={{ overflow: 'visible' }}
      data-js3-mark="motion"
    >
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="32%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.42" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </radialGradient>
      </defs>
      <g stroke="currentColor" strokeLinecap="round">
        {EDGES.map(([i, j], e) => {
          const from = [a, b, c][i];
          const to = [a, b, c][j];
          return (
            <line
              key={e}
              ref={(el) => {
                rodRefs.current[e] = el;
              }}
              x1={num(from.x)}
              y1={num(from.y)}
              x2={num(to.x)}
              y2={num(to.y)}
              strokeWidth={ROD}
            />
          );
        })}
      </g>
      <g>
        {FLAT.map((p, i) => (
          <g
            key={i}
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
            transform={`translate(${num(p.x)} ${num(p.y)})`}
          >
            <circle r={DOT} fill="currentColor" />
            <circle r={DOT} fill={`url(#${gradientId})`} />
          </g>
        ))}
      </g>
    </svg>
  );
}

export default function JSpark3Mark({ className }: { className?: string }) {
  const [mode, setMode] = React.useState<'static' | 'motion'>('static');

  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setMode(query.matches ? 'static' : 'motion');
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  return mode === 'motion' ? <MotionMark className={className} /> : <StaticMark className={className} />;
}
