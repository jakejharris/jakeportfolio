import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  AUTHOR_BENCHMARKS,
  REFERENCE_SCROLL_HINT,
  SAME_TASK,
  SCREEN_COMPARISON,
} from './content';

/**
 * The headline comparison figures at the top of the evidence section.
 * Pure CSS and JSX, no charting library and no client JavaScript; bar widths are
 * layout geometry against the largest value in each figure, and every printed
 * figure is a verbatim string from content.ts.
 */

interface Entry {
  label: string;
  sparks: string;
  value: string;
  runs?: string;
  flag?: string;
}

interface PairedRow {
  metric: string;
  ratio: string;
  ours: Entry;
  other: Entry;
}

/** Node count, kept visible on every bar and on the JSpark3 table columns. */
function SparkChip({ count }: { count: string }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-border bg-muted px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      <span className="tabular-nums">{count}</span> Sparks
    </span>
  );
}

function Bar({ label, sparks, flag, value, runs, max, ours }: Entry & { max: number; ours?: boolean }) {
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
      {runs ? (
        <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
          <span className="uppercase tracking-[0.06em]">runs</span> {runs}
        </p>
      ) : null}
    </div>
  );
}

/** One metric: its name, the supplied ratio, and the two bars on a shared scale. */
function MetricBlock({ row, max }: { row: PairedRow; max: number }) {
  return (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm font-semibold">{row.metric}</p>
        <p className="flex items-end gap-1.5">
          <span className="text-2xl font-bold tabular-nums text-[color:var(--accent-color)] md:text-3xl">
            {row.ratio}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            ratio
          </span>
        </p>
      </div>
      <div className="mt-2.5 space-y-2.5">
        <Bar {...row.ours} max={max} ours />
        <Bar {...row.other} max={max} />
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

function Panel({
  ariaLabel,
  lead,
  children,
}: {
  ariaLabel: string;
  lead?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={`rounded-lg border border-border bg-card p-5 md:p-6 ${
        lead ? 'border-t-2 border-t-[color:var(--accent-color)]' : ''
      }`}
    >
      {children}
    </section>
  );
}

/** Scale each figure to its own largest value. */
function scaleOf(rows: ReadonlyArray<PairedRow>): number {
  return Math.max(...rows.flatMap((row) => [Number(row.ours.value), Number(row.other.value)]));
}

export function AuthorBenchmarks() {
  const { flycockpit, mia, sparkdash } = AUTHOR_BENCHMARKS;
  const flycockpitMax = scaleOf(flycockpit.rows);
  const miaMax = scaleOf(mia.rows);

  return (
    <Panel ariaLabel={AUTHOR_BENCHMARKS.title} lead>
      <h3 className="text-xl font-bold tracking-tight md:text-2xl">{AUTHOR_BENCHMARKS.title}</h3>
      <p className="mt-2 max-w-[82ch] text-sm leading-relaxed text-muted-foreground">
        {AUTHOR_BENCHMARKS.subtitle}
      </p>

      <h4 className="mt-6 text-[15px] font-semibold">{flycockpit.heading}</h4>
      <UnitLabel>{flycockpit.unit}</UnitLabel>
      <div className="mt-3 space-y-4">
        {flycockpit.rows.map((row) => (
          <MetricBlock key={row.metric} row={row} max={flycockpitMax} />
        ))}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{flycockpit.note}</p>

      <h4 className="mt-7 border-t border-border pt-6 text-[15px] font-semibold">{mia.heading}</h4>
      <UnitLabel>{mia.unit}</UnitLabel>
      <div className="mt-3 space-y-4">
        {mia.rows.map((row) => (
          <MetricBlock key={row.metric} row={row} max={miaMax} />
        ))}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{mia.note}</p>

      <h4 className="mt-7 border-t border-border pt-6 text-[15px] font-semibold">
        {sparkdash.heading}
      </h4>
      <div className="mt-3 overflow-hidden rounded-lg border border-border">
        <Table className="min-w-[720px] text-[13px] tabular-nums">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {sparkdash.columns.map((column) => (
                <TableHead
                  key={column.label}
                  className="px-3 py-2.5 align-bottom text-xs uppercase tracking-[0.05em]"
                >
                  {column.label}
                  {'sparks' in column ? (
                    <span className="mt-1 block normal-case tracking-normal">
                      <SparkChip count={column.sparks} />
                    </span>
                  ) : null}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sparkdash.rows.map((row) => (
              <TableRow key={`${row.concurrency} ${row.estimator}`}>
                <TableCell className="px-3 py-2 font-semibold">{row.concurrency}</TableCell>
                <TableCell className="px-3 py-2 text-muted-foreground">{row.estimator}</TableCell>
                <TableCell className="px-3 py-2">{row.mia}</TableCell>
                <TableCell className="px-3 py-2">{row.structured}</TableCell>
                <TableCell className="px-3 py-2">{row.clamp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Same hint, style and narrow-screen visibility as the published reference table. */}
      <p className="mt-1.5 text-xs text-muted-foreground min-[560px]:hidden">
        {REFERENCE_SCROLL_HINT}
      </p>
      <div className="mt-3 space-y-1.5">
        {sparkdash.notes.map((note) => (
          <p key={note} className="text-[13px] leading-relaxed text-muted-foreground">
            {note}
          </p>
        ))}
      </div>

      <p className="mt-5 border-t border-border pt-4 text-[13px] leading-relaxed text-muted-foreground">
        {AUTHOR_BENCHMARKS.condition}
      </p>
    </Panel>
  );
}

export function ScreenComparison() {
  const max = scaleOf(SCREEN_COMPARISON.rows);

  return (
    <Panel ariaLabel={SCREEN_COMPARISON.title}>
      <h3 className="text-xl font-bold tracking-tight md:text-2xl">{SCREEN_COMPARISON.title}</h3>
      <UnitLabel>{SCREEN_COMPARISON.unit}</UnitLabel>
      <div className="mt-4 space-y-4">
        {SCREEN_COMPARISON.rows.map((row) => (
          <MetricBlock key={row.metric} row={row} max={max} />
        ))}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
        {SCREEN_COMPARISON.condition}
      </p>
    </Panel>
  );
}

export function SameTaskComparison() {
  const max = Math.max(...SAME_TASK.rows.map((row) => Number(row.value)));

  return (
    <Panel ariaLabel={SAME_TASK.title}>
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
    </Panel>
  );
}
