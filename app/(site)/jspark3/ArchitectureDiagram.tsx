import * as React from 'react';

/**
 * The shipped JSpark3 architecture diagram, inlined as SVG so its ink can be
 * mapped onto the site's theme tokens instead of the original's fixed slate and
 * amber palette. Geometry and text are transcribed verbatim from
 * docs/diagrams/architecture.svg (also shipped at /jspark3/architecture.svg);
 * only the colours and the two type faces are re-pointed at the design system,
 * so the figure stays legible in light and dark and under all five accents.
 */

const INK = 'hsl(var(--foreground))';
const SUBTLE_INK = 'hsl(var(--muted-foreground))';
const HAIRLINE = 'hsl(var(--foreground) / 0.35)';
const ACCENT = 'var(--accent-color)';

/** The legend calls the fabric legs "Orange lines", so they keep an amber tuned for both themes. */
const FABRIC_STROKE = 'stroke-amber-600 dark:stroke-amber-400';

const SANS = 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif';
const MONO = 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

const node: React.CSSProperties = {
  fill: 'hsl(var(--background))',
  stroke: HAIRLINE,
  strokeWidth: 1.5,
};
const ctl: React.CSSProperties = {
  fill: 'hsl(var(--secondary))',
  stroke: HAIRLINE,
  strokeWidth: 1.5,
};
const client: React.CSSProperties = {
  fill: 'hsl(var(--muted))',
  stroke: ACCENT,
  strokeWidth: 1.5,
};
const titleText: React.CSSProperties = { fontSize: 14, fontWeight: 700, fill: INK };
const subText: React.CSSProperties = { fill: SUBTLE_INK };
const monoText: React.CSSProperties = { fontFamily: MONO, fontSize: 11, fill: INK };
const fabric: React.CSSProperties = { strokeWidth: 3, fill: 'none' };
const mgmt: React.CSSProperties = {
  stroke: SUBTLE_INK,
  strokeWidth: 1.5,
  strokeDasharray: '5 4',
  fill: 'none',
};
const legBox: React.CSSProperties = {
  fill: 'hsl(var(--background))',
  strokeWidth: 1,
};
const legLabel: React.CSSProperties = { fontSize: 11, fontWeight: 600 };
const legend: React.CSSProperties = { fill: SUBTLE_INK };

export default function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 1000 620"
      role="img"
      aria-labelledby="js3-arch-title"
      className="h-auto w-full min-w-[880px]"
      style={{ fontFamily: SANS, fontSize: 11.5 }}
    >
      <title id="js3-arch-title">
        JSpark3 v1 architecture: one GLM-5.3 Flash endpoint across three DGX Sparks
      </title>
      <defs>
        <marker
          id="js3-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: SUBTLE_INK }} />
        </marker>
      </defs>
      <rect x="0" y="0" width="1000" height="620" style={{ fill: 'hsl(var(--card))' }} />
      <text x="24" y="34" style={{ ...titleText, fontSize: 19 }}>
        JSpark3 v1: one GLM-5.3 Flash endpoint across three NVIDIA DGX Sparks
      </text>
      <text x="24" y="56" style={{ ...subText, fontSize: 12 }}>
        TP 3 · EP 3 · EXL3/TR3 4-bpw target · DFlash2 k=7 draft · FP8 KV cache · 1,000,000-token
        configured context
      </text>

      {/* client */}
      <rect x="24" y="96" width="190" height="96" rx="10" style={client} />
      <text x="40" y="120" style={titleText}>
        Client
      </text>
      <text x="40" y="140" style={subText}>
        OpenAI-compatible HTTP
      </text>
      <text x="40" y="160" style={monoText}>
        POST /v1/chat/completions
      </text>
      <text x="40" y="178" style={monoText}>
        model: glm-5.3-flash
      </text>
      <text x="250" y="128" style={{ ...legend, fontSize: 10.5 }} textAnchor="middle">
        HTTP :8000
      </text>
      <text x="250" y="140" style={{ ...legend, fontSize: 10.5 }} textAnchor="middle">
        rank 0 only
      </text>
      <line x1="214" y1="152" x2="286" y2="152" style={mgmt} markerEnd="url(#js3-arrow)" />

      {/* rank 0 */}
      <rect x="290" y="96" width="340" height="152" rx="10" style={node} />
      <text x="306" y="120" style={titleText}>
        DGX Spark · rank 0 · API head
      </text>
      <text x="306" y="140" style={subText}>
        GB10 (SM 12.1), aarch64 · vLLM mp worker
      </text>
      <text x="306" y="158" style={subText}>
        TP 1/3: attention, KDA, shared expert,
      </text>
      <text x="306" y="176" style={subText}>
        LM head · EP: 96 of 288 routed experts
      </text>
      <text x="306" y="194" style={subText}>
        DFlash2 draft, TP 3 · FP8 KV · prefix cache
      </text>
      <text x="306" y="212" style={subText}>
        64 GiB cgroup · CUDA graphs 8/16/24/32/48
      </text>
      <text x="306" y="232" style={monoText}>
        W8A16 overlay: 169 modules / 225 tensors
      </text>

      {/* control and identity */}
      <rect x="650" y="96" width="326" height="152" rx="10" style={ctl} />
      <text x="666" y="120" style={titleText}>
        Control and identity
      </text>
      <text x="666" y="140" style={subText}>
        Management LAN: SSH, Gloo/TP sockets, API
      </text>
      <text x="666" y="158" style={subText}>
        Per-rank preflight: GID, MTU, routes, image
      </text>
      <text x="666" y="176" style={subText}>
        digest, checkpoint bytes, manifest, memory
      </text>
      <text x="666" y="194" style={subText}>
        Start order 2 → 1 → 0 · hash-bound manifest
      </text>
      <text x="666" y="212" style={subText}>
        Refuses cgroup, NCCL, overlay, loader drift
      </text>
      <text x="666" y="232" style={subText}>
        Verify: shards, graphs, focused witness
      </text>
      <line x1="630" y1="172" x2="650" y2="172" style={mgmt} />

      {/* rank 1 */}
      <rect x="60" y="330" width="340" height="136" rx="10" style={node} />
      <text x="76" y="354" style={titleText}>
        DGX Spark · rank 1 · headless
      </text>
      <text x="76" y="374" style={subText}>
        GB10 (SM 12.1), aarch64 · vLLM mp worker
      </text>
      <text x="76" y="392" style={subText}>
        TP shard 2/3 · EP: 96 of 288 routed experts
      </text>
      <text x="76" y="410" style={subText}>
        DFlash2 draft, TP 3 · FP8 KV · prefix cache
      </text>
      <text x="76" y="428" style={subText}>
        64 GiB cgroup · CUDA graphs 8/16/24/32/48
      </text>
      <text x="76" y="448" style={monoText}>
        same overlay, same hash-gated transforms
      </text>

      {/* rank 2 */}
      <rect x="600" y="330" width="340" height="136" rx="10" style={node} />
      <text x="616" y="354" style={titleText}>
        DGX Spark · rank 2 · headless
      </text>
      <text x="616" y="374" style={subText}>
        GB10 (SM 12.1), aarch64 · vLLM mp worker
      </text>
      <text x="616" y="392" style={subText}>
        TP shard 3/3 · EP: 96 of 288 routed experts
      </text>
      <text x="616" y="410" style={subText}>
        DFlash2 draft, TP 3 · FP8 KV · prefix cache
      </text>
      <text x="616" y="428" style={subText}>
        64 GiB cgroup · CUDA graphs 8/16/24/32/48
      </text>
      <text x="616" y="448" style={monoText}>
        same overlay, same hash-gated transforms
      </text>

      {/* fabric triangle: three RoCE-v2 legs, each its own network */}
      <line x1="380" y1="248" x2="230" y2="330" className={FABRIC_STROKE} style={fabric} />
      <line x1="540" y1="248" x2="770" y2="330" className={FABRIC_STROKE} style={fabric} />
      <line x1="400" y1="398" x2="600" y2="398" className={FABRIC_STROKE} style={fabric} />
      <rect x="220" y="278" width="170" height="22" rx="5" className={FABRIC_STROKE} style={legBox} />
      <text x="305" y="293" className="fill-amber-800 dark:fill-amber-300" style={legLabel} textAnchor="middle">
        leg A · rank 0 ⇄ rank 1
      </text>
      <rect x="570" y="278" width="170" height="22" rx="5" className={FABRIC_STROKE} style={legBox} />
      <text x="655" y="293" className="fill-amber-800 dark:fill-amber-300" style={legLabel} textAnchor="middle">
        leg B · rank 0 ⇄ rank 2
      </text>
      <rect x="415" y="408" width="170" height="22" rx="5" className={FABRIC_STROKE} style={legBox} />
      <text x="500" y="423" className="fill-amber-800 dark:fill-amber-300" style={legLabel} textAnchor="middle">
        leg C · rank 1 ⇄ rank 2
      </text>

      {/* legend */}
      <rect
        x="24"
        y="496"
        width="952"
        height="110"
        rx="8"
        style={{ fill: 'hsl(var(--muted))', stroke: 'hsl(var(--border))' }}
      />
      <text x="40" y="518" style={{ ...legend, fontWeight: 700, fontSize: 12, fill: INK }}>
        Reading the diagram
      </text>
      <text x="40" y="538" style={legend}>
        Orange lines: three RoCE-v2 fabric legs, each on its own network at MTU 9000; every Spark
        owns two. Dashed: management.
      </text>
      <text x="40" y="556" style={legend}>
        Model bytes are never inside the image or the recipe; each rank bind-mounts the pinned
        checkpoint read-only.
      </text>
      <text x="40" y="574" style={legend}>
        Every serving byte is validated before start. W8A16 converts the BF16 trunk to INT8 Marlin at
        load; experts stay EXL3,
      </text>
      <text x="40" y="592" style={legend}>
        the 34 KDA f/g modules are excluded. The DFlash2 draft is built over all three ranks (draft TP
        1 in the profile is ignored).
      </text>
    </svg>
  );
}
