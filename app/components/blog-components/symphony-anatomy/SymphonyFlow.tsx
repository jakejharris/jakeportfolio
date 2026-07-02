'use client';

// Fan-out / fan-in shape of a Symphony run: one locked plan splits into
// file-disjoint slices built by parallel agents in separate worktrees,
// which converge into one consolidated PR that has to pass a review gate
// before main. Connector dashes drift slowly to suggest flow; the
// animation is removed under prefers-reduced-motion.

const LANES = [1, 2, 3, 4];

// Lane centers as percentages of the lane column height (justify-around).
const LANE_YS = LANES.map((_, i) => ((i + 0.5) / LANES.length) * 100);

function Connector({ mode }: { mode: 'out' | 'in' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden="true"
    >
      {LANE_YS.map((y) => (
        <path
          key={y}
          d={
            mode === 'out'
              ? `M 0 50 C 45 50, 55 ${y}, 100 ${y}`
              : `M 0 ${y} C 45 ${y}, 55 50, 100 50`
          }
          fill="none"
          stroke="color-mix(in srgb, hsl(var(--foreground)) 35%, transparent)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className="symflow-dash"
        />
      ))}
    </svg>
  );
}

function Card({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="rounded-md border border-foreground/15 px-1.5 py-1 text-center sm:px-3 sm:py-2">
      <div className="text-[10px] font-semibold tracking-wide text-foreground sm:text-[11px]">
        {title}
      </div>
      {sub && (
        <div className="mt-0.5 text-[8px] leading-tight text-muted-foreground sm:text-[9px]">
          {sub}
        </div>
      )}
    </div>
  );
}

export default function SymphonyFlow() {
  return (
    <div
      className="rounded-lg border border-foreground/10 p-3 font-mono sm:p-6"
      role="img"
      aria-label="Flow diagram: a locked plan fans out into four parallel agents, each in its own git worktree on a file-disjoint slice; their work fans back in to one consolidated pull request, which passes a review gate before merging to main"
    >
      <style>{`
        .symflow-dash {
          stroke-dasharray: 3 5;
          animation: symflow-drift 2.4s linear infinite;
        }
        @keyframes symflow-drift {
          to { stroke-dashoffset: -8; }
        }
        @media (prefers-reduced-motion: reduce) {
          .symflow-dash { animation: none; }
        }
      `}</style>

      <div className="flex items-stretch">
        <div className="flex items-center">
          <Card title="PLAN" sub="locked, file-disjoint slices" />
        </div>

        <div className="min-w-[10px] flex-1 sm:max-w-[64px]">
          <Connector mode="out" />
        </div>

        <div className="flex flex-col justify-around gap-1 py-0.5 sm:gap-1.5">
          {LANES.map((n) => (
            <div
              key={n}
              className="rounded-md border border-foreground/15 px-1.5 py-1 text-center sm:px-3"
            >
              <span className="text-[9px] text-foreground/80 sm:text-[10px]">
                agent {n}
              </span>
              <span className="ml-1 hidden text-[8px] text-muted-foreground sm:inline sm:text-[9px]">
                worktree
              </span>
            </div>
          ))}
        </div>

        <div className="min-w-[10px] flex-1 sm:max-w-[64px]">
          <Connector mode="in" />
        </div>

        <div className="flex items-center">
          <Card title="ONE PR" sub="consolidated" />
        </div>

        <div className="flex items-center">
          <div className="h-px w-2 bg-foreground/25 sm:w-6" />
          <div className="flex flex-col items-center">
            <div
              className="h-9 border-l border-dashed sm:h-10"
              style={{
                borderColor:
                  'color-mix(in srgb, hsl(var(--foreground)) 55%, transparent)',
              }}
            />
            <span className="mt-1 text-[8px] text-muted-foreground sm:text-[9px]">
              review
            </span>
          </div>
          <div className="h-px w-2 bg-foreground/25 sm:w-6" />
          <span className="text-[10px] font-semibold text-foreground sm:text-[11px]">
            main
          </span>
        </div>
      </div>
    </div>
  );
}
