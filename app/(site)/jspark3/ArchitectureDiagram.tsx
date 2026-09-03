import * as React from 'react';
import './architecture.css';
import FabricTriangle from './FabricTriangle';
import MotionScope from './MotionScope';

/**
 * The JSpark3 architecture, laid out for the site's reading column.
 *
 * The shipped figure (docs/diagrams/architecture.svg, also at
 * /jspark3/architecture.svg) is a 1000px-wide canvas. Here its boxes become
 * cards that stack on a phone and pair up when there is room, joined by
 * connectors that are drawn as lines, and only the part that is truly a
 * picture, the RoCE-v2 triangle between the three ranks, stays an SVG. Every
 * line of text is the figure's own; only the layout moved.
 *
 * The figure moves as one system on one clock (architecture.css): a request
 * comes down the HTTP link, Rank 0 takes it, the ranks exchange on every
 * fabric leg, and the answer goes back up. Nothing in the management path
 * moves, because nothing on it is in the serving path.
 */

const MONO = 'font-mono text-[12px] leading-relaxed text-foreground';

function NodeCard({
  title,
  lines,
  mono,
  tone = 'node',
}: {
  title: string;
  lines: ReadonlyArray<string>;
  mono?: ReadonlyArray<string>;
  tone?: 'node' | 'client' | 'control';
}) {
  const frame =
    tone === 'client'
      ? 'border-[color:var(--accent-color)] bg-muted'
      : tone === 'control'
        ? 'border-dashed border-foreground/35 bg-secondary'
        : 'border-foreground/35 bg-background';
  return (
    <div className={`rounded-lg border p-3.5 ${frame}`}>
      <p className="text-[15px] font-bold leading-snug">{title}</p>
      {lines.map((line) => (
        <p key={line} className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {line}
        </p>
      ))}
      {mono ? (
        <div className="mt-1.5 space-y-0.5">
          {mono.map((line) => (
            <p key={line} className={MONO}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const LINK_HEIGHT = 52;

/**
 * A connector between two stacked cards, drawn as a real line with its label
 * beside it. The HTTP link is the serving path: solid, in the accent colour of
 * the client card, arrowed both ways, and carrying the request and the answer.
 * The management link is dashed and still, like the control card it leads to.
 */
function Link({ label, kind }: { label: string; kind: 'http' | 'management' }) {
  const h = LINK_HEIGHT;
  return (
    <div className="flex items-center gap-3 pl-6" aria-hidden="true">
      <svg width="14" height={h} viewBox={`0 0 14 ${h}`} className="shrink-0 overflow-visible">
        {kind === 'http' ? (
          <>
            <line x1="7" y1="0" x2="7" y2={h} stroke="var(--accent-color)" strokeWidth={2} />
            <polygon points="2,7 12,7 7,0" fill="var(--accent-color)" />
            <polygon points={`2,${h - 7} 12,${h - 7} 7,${h}`} fill="var(--accent-color)" />
            <g fill="none" strokeWidth={3} strokeLinecap="round">
              <line className="js3-link-packet js3-link-packet-down" pathLength={100} x1="7" y1="0" x2="7" y2={h} />
              <line className="js3-link-packet js3-link-packet-up" pathLength={100} x1="7" y1={h} x2="7" y2="0" />
            </g>
          </>
        ) : (
          <line
            x1="7"
            y1="0"
            x2="7"
            y2={h}
            className="stroke-muted-foreground"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}
      </svg>
      <span
        className={
          kind === 'http'
            ? 'rounded-md border border-[color:var(--accent-color)] bg-background px-2 py-0.5 text-[11px] font-semibold leading-tight text-foreground'
            : 'rounded-md border border-dashed border-muted-foreground/70 px-2 py-0.5 text-[11px] font-medium leading-tight text-muted-foreground'
        }
      >
        {label}
      </span>
    </div>
  );
}

const RANK_LINES = {
  head: [
    'GB10 (SM 12.1), aarch64 · vLLM mp worker',
    'TP 1/3: attention, KDA, shared expert, LM head · EP: 96 of 288 routed experts',
    'DFlash2 draft, TP 3 · FP8 KV · prefix cache',
    '64 GiB cgroup · CUDA graphs 8/16/24/32/48',
  ],
  peer: (shard: string) => [
    'GB10 (SM 12.1), aarch64 · vLLM mp worker',
    `TP shard ${shard} · EP: 96 of 288 routed experts`,
    'DFlash2 draft, TP 3 · FP8 KV · prefix cache',
    '64 GiB cgroup · CUDA graphs 8/16/24/32/48',
  ],
} as const;

export default function ArchitectureDiagram() {
  return (
    <MotionScope className="js3-motion rounded-lg border border-border bg-card p-4 sm:p-5">
      <p className="text-base font-bold leading-snug">
        JSpark3 v1: one GLM-5.3 Flash endpoint across three NVIDIA DGX Sparks
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        TP 3 · EP 3 · EXL3/TR3 4-bpw target · DFlash2 k=7 draft · FP8 KV cache · 1,000,000-token
        configured context
      </p>

      <div className="mt-4">
        <NodeCard
          tone="client"
          title="Client"
          lines={['OpenAI-compatible HTTP']}
          mono={['POST /v1/chat/completions', 'model: glm-5.3-flash']}
        />
        <Link kind="http" label="HTTP :8000 · Rank 0 Only" />
        <NodeCard
          title="DGX Spark · Rank 0 · API Head"
          lines={RANK_LINES.head}
          mono={['W8A16 overlay: 169 modules / 225 tensors']}
        />
        <Link kind="management" label="Management LAN" />
        <NodeCard
          tone="control"
          title="Control and Identity"
          lines={[
            'Management LAN: SSH, Gloo/TP sockets, API',
            'Per-rank preflight: GID, MTU, routes, image digest, checkpoint bytes, manifest, memory',
            'Start order 2 → 1 → 0 · hash-bound manifest',
            'Refuses cgroup, NCCL, overlay, loader drift',
            'Verify: shards, graphs, focused witness',
          ]}
        />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
          RoCE-v2 Fabric · TP 3 / EP 3
        </p>
        <div className="mt-3">
          <FabricTriangle />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <NodeCard
          title="DGX Spark · Rank 1 · Headless"
          lines={RANK_LINES.peer('2/3')}
          mono={['same overlay, same hash-gated transforms']}
        />
        <NodeCard
          title="DGX Spark · Rank 2 · Headless"
          lines={RANK_LINES.peer('3/3')}
          mono={['same overlay, same hash-gated transforms']}
        />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted p-3.5 text-[13px] leading-relaxed text-muted-foreground">
        <p className="text-xs font-bold text-foreground">Reading the Diagram</p>
        <p className="mt-1.5">
          Orange lines: three RoCE-v2 fabric legs, each on its own network at MTU 9000; every Spark
          owns two. Solid arrowed line: the HTTP serving path, Rank 0 only. Dashed: management.
        </p>
        <p className="js3-motion-note mt-1.5">
          In motion: one request. It comes down the HTTP link, Rank 0 takes it, the three ranks
          exchange on every leg, and the answer goes back up the same link.
        </p>
        <p className="mt-1.5">
          Model bytes are never inside the image or the recipe; each rank bind-mounts the pinned
          checkpoint read-only.
        </p>
        <p className="mt-1.5">
          Every serving byte is validated before start. W8A16 converts the BF16 trunk to INT8 Marlin
          at load; experts stay EXL3, the 34 KDA f/g modules are excluded. The DFlash2 draft is built
          over all three ranks (draft TP 1 in the profile is ignored).
        </p>
      </div>
    </MotionScope>
  );
}
