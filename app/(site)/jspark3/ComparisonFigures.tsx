import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { AUTHOR_BENCHMARKS, SAME_TASK, SCREEN_COMPARISON } from './content';

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

function Bar({
  label,
  sparks,
  value,
  runs,
  max,
  ours,
  inlineSparkCount,
}: Entry & { max: number; ours?: boolean; inlineSparkCount?: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={ours ? 'font-semibold' : 'font-medium text-muted-foreground'}>
            {label}
            {inlineSparkCount ? `, ${sparks} Sparks` : null}
          </span>
          {!inlineSparkCount ? <SparkChip count={sparks} /> : null}
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
function MetricBlock({
  row,
  max,
  inlineSparkCount,
}: {
  row: PairedRow;
  max: number;
  inlineSparkCount?: boolean;
}) {
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
        <Bar {...row.ours} max={max} ours inlineSparkCount={inlineSparkCount} />
        <Bar {...row.other} max={max} inlineSparkCount={inlineSparkCount} />
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
      <h3 className="text-lg font-bold tracking-tight md:text-xl">{AUTHOR_BENCHMARKS.title}</h3>
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
      {/* Five source columns, regrouped by concurrency so the three value columns fit a
          phone: the estimator names the row, the concurrency heads each group. */}
      <div className="mt-3 overflow-hidden rounded-lg border border-border">
        <Table className="w-full table-fixed text-[13px] tabular-nums">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[31%] px-2.5 py-2 align-bottom text-[11px] uppercase leading-snug tracking-[0.05em] sm:w-[34%] sm:px-3">
                {sparkdash.columns[1].label}
              </TableHead>
              {sparkdash.columns.slice(2).map((column) => (
                <TableHead
                  key={column.label}
                  className="px-2 py-2 align-bottom text-[11px] normal-case leading-snug tracking-normal sm:px-3"
                >
                  {column.label}
                  {'sparks' in column ? (
                    <span className="mt-1 block">
                      <SparkChip count={column.sparks} />
                    </span>
                  ) : null}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from(new Set(sparkdash.rows.map((row) => row.concurrency))).map((concurrency) => (
              <React.Fragment key={concurrency}>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={4} className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] sm:px-3">
                    {sparkdash.columns[0].label} {concurrency}
                  </TableCell>
                </TableRow>
                {sparkdash.rows
                  .filter((row) => row.concurrency === concurrency)
                  .map((row) => (
                    <TableRow key={`${row.concurrency} ${row.estimator}`}>
                      <TableCell className="px-2.5 py-2 text-[12px] leading-snug text-muted-foreground sm:px-3 sm:text-[13px]">
                        {row.estimator}
                      </TableCell>
                      <TableCell className="px-2 py-2 sm:px-3">{row.mia}</TableCell>
                      <TableCell className="px-2 py-2 font-semibold sm:px-3">{row.structured}</TableCell>
                      <TableCell className="px-2 py-2 font-semibold sm:px-3">{row.clamp}</TableCell>
                    </TableRow>
                  ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
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
      <h3 className="text-lg font-bold tracking-tight md:text-xl">{SCREEN_COMPARISON.title}</h3>
      <UnitLabel>{SCREEN_COMPARISON.unit}</UnitLabel>
      <div className="mt-4 space-y-4">
        {SCREEN_COMPARISON.rows.map((row) => (
          <MetricBlock key={row.metric} row={row} max={max} inlineSparkCount />
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
