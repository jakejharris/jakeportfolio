import * as React from 'react';
import { SAME_TASK, SCREEN_COMPARISON } from './content';

/**
 * The two headline comparison figures at the top of the evidence section.
 * Pure CSS and JSX, no charting library and no client JavaScript; bar widths are
 * layout geometry against the largest value in each figure, and every printed
 * figure is a verbatim string from content.ts.
 */

/** Node count, kept visible on every bar. */
function SparkChip({ count }: { count: string }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-border bg-muted px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      <span className="tabular-nums">{count}</span> Sparks
    </span>
  );
}

function Bar({
  label,
  sparks,
  flag,
  value,
  max,
  ours,
}: {
  label: string;
  sparks: string;
  flag?: string;
  value: string;
  max: number;
  ours?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={ours ? 'font-semibold' : 'font-medium text-muted-foreground'}>
            {label}
          </span>
          <SparkChip count={sparks} />
          {flag ? (
            <span className="whitespace-nowrap rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.06em] text-amber-700 dark:text-amber-300">
              {flag}
            </span>
          ) : null}
        </span>
        <span
          className={`ml-auto text-sm font-semibold tabular-nums ${
            ours ? '' : 'text-muted-foreground'
          }`}
        >
          {value}
        </span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-sm bg-muted">
        <span
          aria-hidden="true"
          className={`block h-full rounded-sm ${
            ours ? 'bg-[color:var(--accent-color)]' : 'bg-muted-foreground/40'
          }`}
          style={{ width: `${((Number(value) / max) * 100).toFixed(3)}%` }}
        />
      </div>
    </div>
  );
}

function UnitLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </p>
  );
}

export function ScreenComparison() {
  const max = Math.max(
    ...SCREEN_COMPARISON.rows.flatMap((row) => [Number(row.ours.value), Number(row.other.value)])
  );

  return (
    <section
      aria-label={SCREEN_COMPARISON.title}
      className="rounded-lg border border-border border-t-2 border-t-[color:var(--accent-color)] bg-card p-5 md:p-6"
    >
      <h3 className="text-xl font-bold tracking-tight md:text-2xl">{SCREEN_COMPARISON.title}</h3>
      <UnitLabel>{SCREEN_COMPARISON.unit}</UnitLabel>
      <div className="mt-4 space-y-4">
        {SCREEN_COMPARISON.rows.map((row) => (
          <div
            key={row.metric}
            className="border-t border-border pt-4 first:border-t-0 first:pt-0"
          >
            <div className="flex items-end justify-between gap-3">
              <h4 className="text-sm font-semibold">{row.metric}</h4>
              <p className="flex items-end gap-1.5">
                <span className="text-2xl font-bold tabular-nums text-[color:var(--accent-color)] md:text-3xl">
                  {row.ratio}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  ratio
                </span>
              </p>
            </div>
            <div className="mt-2.5 space-y-2">
              <Bar
                label={row.ours.label}
                sparks={row.ours.sparks}
                value={row.ours.value}
                max={max}
                ours
              />
              <Bar
                label={row.other.label}
                sparks={row.other.sparks}
                flag={row.other.flag}
                value={row.other.value}
                max={max}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
        {SCREEN_COMPARISON.condition}
      </p>
    </section>
  );
}

export function SameTaskComparison() {
  const max = Math.max(...SAME_TASK.rows.map((row) => Number(row.value)));

  return (
    <section
      aria-label={SAME_TASK.title}
      className="rounded-lg border border-border bg-card p-5 md:p-6"
    >
      <h3 className="text-lg font-bold tracking-tight md:text-xl">{SAME_TASK.title}</h3>
      <UnitLabel>{SAME_TASK.unit}</UnitLabel>
      <div className="mt-4 space-y-2.5">
        {SAME_TASK.rows.map((row) => (
          <Bar
            key={row.label}
            label={row.label}
            sparks={row.sparks}
            value={row.value}
            max={max}
            ours={'ours' in row ? row.ours : undefined}
          />
        ))}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">{SAME_TASK.note}</p>
    </section>
  );
}
