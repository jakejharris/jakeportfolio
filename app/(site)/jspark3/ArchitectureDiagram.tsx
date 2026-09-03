import * as React from 'react';

/**
 * The JSpark3 architecture, laid out for the site's reading column.
 *
 * The shipped figure (docs/diagrams/architecture.svg, also at
 * /jspark3/architecture.svg) is a 1000px-wide canvas. Here its boxes become
 * cards that stack on a phone and pair up when there is room, and only the
 * part that is truly a picture, the RoCE-v2 triangle between the three ranks,
 * stays an SVG. Every line of text is the figure's own; only the layout moved.
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

/** A dashed management link between two stacked cards, with its label alongside. */
function ManagementLink({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1 pl-5" aria-hidden="true">
      <span className="h-6 w-0 border-l-[1.5px] border-dashed border-muted-foreground" />
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

/** The three fabric legs, one per pair of ranks; the only part that needs a picture. */
function FabricTriangle() {
  const legs = 'stroke-amber-600 dark:stroke-amber-400';
  const legInk = 'fill-amber-800 dark:fill-amber-300';
  const legBox = 'fill-background stroke-amber-600 dark:stroke-amber-400';
  return (
    <svg
      viewBox="0 0 320 252"
      role="img"
      aria-labelledby="js3-fabric-title"
      className="mx-auto h-auto w-full max-w-[400px]"
      style={{ fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif' }}
    >
      <title id="js3-fabric-title">
        Three RoCE-v2 fabric legs: leg A joins rank 0 and rank 1, leg B joins rank 0 and rank 2,
        leg C joins rank 1 and rank 2
      </title>
      <g className={legs} strokeWidth={3} fill="none">
        <line x1="160" y1="52" x2="52" y2="200" />
        <line x1="160" y1="52" x2="268" y2="200" />
        <line x1="52" y1="200" x2="268" y2="200" />
      </g>
      {[
        { x: 160, y: 52, title: 'rank 0', sub: 'API head' },
        { x: 52, y: 200, title: 'rank 1', sub: 'headless' },
        { x: 268, y: 200, title: 'rank 2', sub: 'headless' },
      ].map((node) => (
        <g key={node.title}>
          <circle cx={node.x} cy={node.y} r="16" className="fill-background stroke-foreground/35" strokeWidth={1.5} />
          <circle cx={node.x} cy={node.y} r="5" fill="var(--accent-color)" />
          <text
            x={node.x}
            y={node.y < 100 ? node.y - 33 : node.y + 32}
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: 12, fontWeight: 700 }}
          >
            {node.title}
          </text>
          <text
            x={node.x}
            y={node.y < 100 ? node.y - 20 : node.y + 45}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10.5 }}
          >
            {node.sub}
          </text>
        </g>
      ))}
      {[
        { x: 92, y: 122, label: 'leg A · rank 0 ⇄ rank 1' },
        { x: 228, y: 122, label: 'leg B · rank 0 ⇄ rank 2' },
        { x: 160, y: 200, label: 'leg C · rank 1 ⇄ rank 2' },
      ].map((leg) => (
        <g key={leg.label}>
          <rect x={leg.x - 62} y={leg.y - 10} width="124" height="20" rx="5" className={legBox} strokeWidth={1} />
          <text
            x={leg.x}
            y={leg.y + 4}
            textAnchor="middle"
            className={legInk}
            style={{ fontSize: 10.5, fontWeight: 600 }}
          >
            {leg.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function ArchitectureDiagram() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
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
        <ManagementLink label="HTTP :8000 · rank 0 only" />
        <NodeCard
          title="DGX Spark · rank 0 · API head"
          lines={[
            'GB10 (SM 12.1), aarch64 · vLLM mp worker',
            'TP 1/3: attention, KDA, shared expert, LM head · EP: 96 of 288 routed experts',
            'DFlash2 draft, TP 3 · FP8 KV · prefix cache',
            '64 GiB cgroup · CUDA graphs 8/16/24/32/48',
          ]}
          mono={['W8A16 overlay: 169 modules / 225 tensors']}
        />
        <ManagementLink label="Management LAN" />
        <NodeCard
          tone="control"
          title="Control and identity"
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
        <FabricTriangle />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <NodeCard
          title="DGX Spark · rank 1 · headless"
          lines={[
            'GB10 (SM 12.1), aarch64 · vLLM mp worker',
            'TP shard 2/3 · EP: 96 of 288 routed experts',
            'DFlash2 draft, TP 3 · FP8 KV · prefix cache',
            '64 GiB cgroup · CUDA graphs 8/16/24/32/48',
          ]}
          mono={['same overlay, same hash-gated transforms']}
        />
        <NodeCard
          title="DGX Spark · rank 2 · headless"
          lines={[
            'GB10 (SM 12.1), aarch64 · vLLM mp worker',
            'TP shard 3/3 · EP: 96 of 288 routed experts',
            'DFlash2 draft, TP 3 · FP8 KV · prefix cache',
            '64 GiB cgroup · CUDA graphs 8/16/24/32/48',
          ]}
          mono={['same overlay, same hash-gated transforms']}
        />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted p-3.5 text-[13px] leading-relaxed text-muted-foreground">
        <p className="text-xs font-bold text-foreground">Reading the diagram</p>
        <p className="mt-1.5">
          Orange lines: three RoCE-v2 fabric legs, each on its own network at MTU 9000; every Spark
          owns two. Dashed: management.
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
    </div>
  );
}
