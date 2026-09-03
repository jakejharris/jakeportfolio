import * as React from 'react';

/**
 * The three RoCE-v2 fabric legs between the ranks: the only part of the
 * architecture that is truly a picture.
 *
 * It moves in two ways, and only two. Accent-coloured packets travel each leg
 * in both directions, which is the TP3/EP3 exchange every decode step makes,
 * and a halo leaves Rank 0 once per cycle, which is the head taking a request.
 * The motion is CSS (architecture.css) on stroke-dashoffset, transform and
 * opacity; no script runs per frame. Under prefers-reduced-motion the packets
 * and halo are not drawn and the still triangle is all there is.
 */

const NODES = [
  { x: 160, y: 52, title: 'Rank 0', sub: 'API Head', head: true },
  { x: 52, y: 200, title: 'Rank 1', sub: 'Headless', head: false },
  { x: 268, y: 200, title: 'Rank 2', sub: 'Headless', head: false },
] as const;

/** One leg per pair of ranks, drawn from the lower-indexed rank. */
const LEGS = [
  { from: NODES[0], to: NODES[1], x: 92, y: 122, label: 'Leg A · Rank 0 ⇄ Rank 1' },
  { from: NODES[0], to: NODES[2], x: 228, y: 122, label: 'Leg B · Rank 0 ⇄ Rank 2' },
  { from: NODES[1], to: NODES[2], x: 160, y: 200, label: 'Leg C · Rank 1 ⇄ Rank 2' },
] as const;

const LEG_STROKE = 'stroke-amber-600 dark:stroke-amber-400';
const LEG_INK = 'fill-amber-800 dark:fill-amber-300';
const LEG_BOX = 'fill-background stroke-amber-600 dark:stroke-amber-400';

export default function FabricTriangle() {
  return (
    <svg
      viewBox="0 0 320 252"
      role="img"
      aria-labelledby="js3-fabric-title"
      className="mx-auto h-auto w-full max-w-[400px]"
      style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif' }}
    >
      <title id="js3-fabric-title">
        Three RoCE-v2 fabric legs: Leg A joins Rank 0 and Rank 1, Leg B joins Rank 0 and Rank 2,
        Leg C joins Rank 1 and Rank 2. Traffic moves both ways on every leg; Rank 0 is the API
        head.
      </title>

      <g className={LEG_STROKE} strokeWidth={3} fill="none">
        {LEGS.map((leg) => (
          <line key={leg.label} x1={leg.from.x} y1={leg.from.y} x2={leg.to.x} y2={leg.to.y} />
        ))}
      </g>

      {/* Packets: one dash per direction per leg, on a normalised path length so every
          leg takes the same time whatever its drawn length. */}
      <g fill="none" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
        {LEGS.map((leg) => (
          <React.Fragment key={leg.label}>
            <line
              className="js3-fabric-packet"
              pathLength={100}
              x1={leg.from.x}
              y1={leg.from.y}
              x2={leg.to.x}
              y2={leg.to.y}
            />
            <line
              className="js3-fabric-packet js3-fabric-packet-back"
              pathLength={100}
              x1={leg.to.x}
              y1={leg.to.y}
              x2={leg.from.x}
              y2={leg.from.y}
            />
          </React.Fragment>
        ))}
      </g>

      {NODES.map((node) => (
        <g key={node.title}>
          {node.head ? (
            <circle
              className="js3-halo"
              cx={node.x}
              cy={node.y}
              r="16"
              fill="none"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          ) : null}
          <circle
            cx={node.x}
            cy={node.y}
            r="16"
            className="fill-background stroke-foreground/35"
            strokeWidth={1.5}
          />
          <circle cx={node.x} cy={node.y} r="5" fill="var(--accent-color)" />
          <text
            x={node.x}
            y={node.head ? node.y - 33 : node.y + 32}
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: 12, fontWeight: 700 }}
          >
            {node.title}
          </text>
          <text
            x={node.x}
            y={node.head ? node.y - 20 : node.y + 45}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10.5 }}
          >
            {node.sub}
          </text>
        </g>
      ))}

      {LEGS.map((leg) => (
        <g key={leg.label}>
          <rect
            x={leg.x - 62}
            y={leg.y - 10}
            width="124"
            height="20"
            rx="5"
            className={LEG_BOX}
            strokeWidth={1}
          />
          <text
            x={leg.x}
            y={leg.y + 4}
            textAnchor="middle"
            className={LEG_INK}
            style={{ fontSize: 10.5, fontWeight: 600 }}
          >
            {leg.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
