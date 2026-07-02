'use client';

// Gantt-style strip of one Symphony run: 10 PRs, ~6,800 LOC, 34 tests,
// 70 minutes wall clock (15:08 to 16:18). Phase durations come from the
// run log. Static by design; the data reads fine without motion.

import type { CSSProperties } from 'react';

type Kind = 'build' | 'integrate' | 'verify';

interface Phase {
  label: string;
  minutes: number;
  kind: Kind;
}

const PHASES: Phase[] = [
  { label: 'Wave 1, 2 agents', minutes: 10, kind: 'build' },
  { label: 'Wave 2, 4 agents + 4 reviewers', minutes: 15, kind: 'build' },
  { label: 'Integrate', minutes: 5, kind: 'integrate' },
  { label: 'Wave 3, 2 agents', minutes: 10, kind: 'build' },
  { label: 'Integrate', minutes: 3, kind: 'integrate' },
  { label: 'PR 8, largest slice', minutes: 15, kind: 'build' },
  { label: 'Integrate', minutes: 3, kind: 'integrate' },
  { label: 'Smoke test + race fix', minutes: 10, kind: 'verify' },
];

const TOTAL = PHASES.reduce((sum, p) => sum + p.minutes, 0);

const KIND_STYLE: Record<Kind, CSSProperties> = {
  build: {
    backgroundColor: 'var(--accent-color)',
  },
  integrate: {
    backgroundColor:
      'color-mix(in srgb, hsl(var(--foreground)) 28%, transparent)',
  },
  verify: {
    backgroundColor: 'transparent',
    border:
      '1px solid color-mix(in srgb, hsl(var(--foreground)) 55%, transparent)',
  },
};

const LEGEND: { kind: Kind; label: string }[] = [
  { kind: 'build', label: 'parallel build' },
  { kind: 'integrate', label: 'integration' },
  { kind: 'verify', label: 'verification' },
];

export default function SymphonyTimeline() {
  let elapsed = 0;
  const rows = PHASES.map((phase) => {
    const start = elapsed;
    elapsed += phase.minutes;
    return { ...phase, start };
  });

  return (
    <div
      className="rounded-lg border border-foreground/10 p-4 font-mono sm:p-6"
      role="img"
      aria-label="Timeline of a 70 minute Symphony run from 15:08 to 16:18: three waves of parallel agent builds, short integration steps between them, one large final slice, and a closing smoke test that caught a race condition"
    >
      <div className="mb-4 flex items-baseline justify-between text-[10px] text-muted-foreground sm:text-[11px]">
        <span>15:08</span>
        <span className="text-foreground/70">
          10 PRs &middot; ~6,800 LOC &middot; 34 tests
        </span>
        <span>16:18</span>
      </div>

      <div className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 sm:grid-cols-[190px_1fr]">
        {rows.map((row, i) => (
          <div key={i} className="contents">
            <div className="flex items-center justify-between gap-1 text-[9px] leading-tight text-muted-foreground sm:text-[11px]">
              <span>{row.label}</span>
              <span className="shrink-0 text-foreground/40">
                {row.minutes}m
              </span>
            </div>
            <div className="relative h-3.5 sm:h-4">
              <div
                className="absolute inset-y-0 rounded-[3px]"
                style={{
                  left: `${(row.start / TOTAL) * 100}%`,
                  width: `${(row.minutes / TOTAL) * 100}%`,
                  ...KIND_STYLE[row.kind],
                }}
              />
            </div>
          </div>
        ))}

        <div aria-hidden="true" />
        <div className="flex justify-between border-t border-foreground/10 pt-1 text-[9px] text-foreground/40 sm:text-[10px]">
          <span>0m</span>
          <span>35m</span>
          <span>70m</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {LEGEND.map(({ kind, label }) => (
          <span
            key={kind}
            className="flex items-center gap-1.5 text-[9px] text-muted-foreground sm:text-[10px]"
          >
            <span
              className="inline-block h-2 w-3 rounded-[2px]"
              style={KIND_STYLE[kind]}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
