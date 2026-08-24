'use client';

// Scenario matrix for the DGX Spark price tracker post. Rows are the seven
// scenarios (Badged by family: Baseline / AI 2027 / AI 2040), columns are the
// December checkpoints (2027 / 2028 / 2030 / 2032 / 2035 / 2040), and each
// cell is that scenario's projected price at the checkpoint via the shared
// data module. A small toggle flips the displayed series between the DGX
// Spark-class lowest price and the NVIDIA flagship street price; "—" marks a
// null (the consumer hardware market has ended in that scenario). All values
// are static scenario projections ported from the original tracker: nothing
// here is invented, fetched, or computed beyond interpolation already done in
// ./data. Pure semantic-token styling, so dark/light needs no theme read.
// A plain-language layer keeps it readable for non-technical visitors: a
// "How to read this" primer in the header, a one-line English subtitle under
// each scenario name, and a dagger plus footnote on the extreme spike cells
// so the scariest numbers cannot be mistaken for predictions.

import { useState } from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  SCENARIOS,
  CHECKPOINTS,
  HIST_END,
  checkpointValue,
  type ScenarioKey,
} from './data';

// ─── Local types & helpers ────────────────────────────────────────────────

type Scenario = (typeof SCENARIOS)[number];
type Fam = Scenario['fam'];

// Subset of the data module's series union that this matrix can display.
type MatrixSeries = 'spark' | 'nvidia';

const FAM_LABEL: Record<Fam, string> = {
  base: 'Baseline',
  '27': 'AI 2027',
  '40': 'AI 2040',
};

// One restrained hue per family so the three blocks separate at a glance:
// muted slate for the no-takeoff control case, indigo for the near-term
// takeoff family, amber for the long-horizon one. Fills are soft HSL alphas
// to stay refined on this near-monochrome site, and the dark: variants hold
// contrast on the dark card. Color only ever rides along with the text
// label, it never replaces it. The family accent is an absolutely-
// positioned 2px bar inside the first cell rather than a border-l on the
// cell itself: cell borders count toward the table's width, and the old
// border was just enough to tip the card into horizontal scroll at desktop
// sizes. The bar paints the same edge with zero layout width.
const FAM_STYLE: Record<Fam, { badge: string; bar: string }> = {
  base: {
    badge:
      'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:border-slate-400/25 dark:bg-slate-400/10 dark:text-slate-300',
    bar: 'bg-slate-500/40 dark:bg-slate-400/35',
  },
  '27': {
    badge:
      'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-300',
    bar: 'bg-indigo-500/45 dark:bg-indigo-400/35',
  },
  '40': {
    badge:
      'border-amber-600/35 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300',
    bar: 'bg-amber-500/50 dark:bg-amber-400/35',
  },
};

const SERIES_LABEL: Record<MatrixSeries, string> = {
  spark: 'DGX Spark',
  nvidia: 'NVIDIA flagship',
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const ymLabel = (ym: string): string => {
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

const fmtDollars = (v: number): string =>
  '$' + Math.round(v).toLocaleString('en-US');

// Purchase price of the tracked DGX Spark (its street price from March 2026
// in the historical series). Cells at or above it get a light emphasis so
// the appreciation story reads at a glance, while market-ended ("—") cells
// stay muted.
const PURCHASE_PRICE = 4699;

// Cells at or above three times the purchase price are extreme spike cells.
// They only occur in the stretch years of the two most aggressive scenarios
// (Plan A's rationed-compute deal and Plan D's no-brakes race), so they carry
// a small dagger and a footnote rather than standing alone as scary numbers.
const EXTREME_MARK = PURCHASE_PRICE * 3;

// One-line, jargon-free description of each scenario, shown as a small
// subtitle under the row label. Written for a reader who has never heard of
// AI 2027 or AI 2040: each says what kind of world the row imagines and what
// generally happens to prices in it. The scenario names stay as-is; this is
// the translation, not a replacement.
const PLAIN: Record<ScenarioKey, string> = {
  baseline: 'AI cools off and the normal upgrade cycle resumes',
  race: 'Runaway AI race: prices spike through 2027, then crash',
  slowdown: 'The boom stalls: a longer squeeze, then very cheap hardware',
  planA:
    'A US-China deal rations computing power; boxes get very expensive, then crash',
  planS: 'AI research halts worldwide; prices level off instead of crashing',
  planC: 'No deal, just regulation; a longer squeeze, then cheap hardware again',
  planD: 'An all-out race: the wildest spike of all, then the market ends in 2034',
};

// Row label: the scenario name with the family prefix stripped (the badge
// carries it), mirroring the original tracker's matrix. Derived from the
// data's own strings: nothing new.
function planLabel(name: string): string {
  if (name === 'Baseline (no takeoff)') return 'No takeoff';
  return name.replace(/^AI 20\d\d · /, '');
}

interface MatrixRow {
  key: ScenarioKey;
  label: string;
  fam: Fam;
  driver: string;
  // True when this row starts a new family block (heavier separator above).
  newFamily: boolean;
}

const ROWS: MatrixRow[] = SCENARIOS.map((sc, i) => ({
  key: sc.key,
  label: planLabel(sc.name),
  fam: sc.fam,
  driver: sc.driver,
  newFamily: i === 0 || SCENARIOS[i - 1].fam !== sc.fam,
}));

// ─── Component ────────────────────────────────────────────────────────────

export default function DgxScenarioMatrix() {
  const [series, setSeries] = useState<MatrixSeries>('spark');

  return (
    <div className="my-8">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Header + series toggle */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Scenario matrix
            </h3>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                How to read this:{' '}
              </span>
              each of the seven rows is a different guess about how AI plays
              out, and each number is what a DGX Spark might cost in that
              world at that December, in today’s dollars. Everything past 2026
              is a projection, not a fact. The toggle switches the numbers to
              NVIDIA’s flagship card.
            </p>
          </div>
          <Tabs
            value={series}
            onValueChange={(v) => setSeries(v as MatrixSeries)}
          >
            <TabsList className="h-8 shrink-0" aria-label="Displayed series">
              <TabsTrigger value="spark" className="px-2.5 py-0.5 text-xs">
                DGX Spark
              </TabsTrigger>
              <TabsTrigger value="nvidia" className="px-2.5 py-0.5 text-xs">
                NVIDIA flagship
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Table. Gutters and type are sized compactly (px-1 cells, text-xs
            mono values, 13px labels) so the full 7-column matrix fits inside
            the card with ZERO horizontal scroll at desktop widths; the shadcn
            overflow-auto wrapper around it only ever engages as a clean,
            contained scroll on narrow mobile, where the first column stays
            sticky and its label wraps instead of hogging width. */}
        <Table
          aria-label={`Projected ${SERIES_LABEL[series]} price by scenario at each December checkpoint`}
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-card pl-2 pr-3 text-xs text-muted-foreground">
                Scenario
              </TableHead>
              {CHECKPOINTS.map((cp) => (
                <TableHead
                  key={cp.ym}
                  scope="col"
                  title={ymLabel(cp.ym)}
                  className="whitespace-nowrap px-1 py-1 text-right font-mono text-xs text-muted-foreground"
                >
                  {cp.ym.slice(0, 4)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow
                key={row.key}
                className={
                  row.newFamily ? 'border-t-2 border-border group/row' : 'group/row'
                }
              >
                <TableCell
                  scope="row"
                  className="sticky left-0 z-10 bg-card py-1.5 pl-2 pr-3 group-hover/row:bg-muted/50 md:whitespace-nowrap"
                >
                  {/* Family accent bar — absolutely positioned (the sticky
                      cell is its containing block), so it adds no width. */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-0.5 ${FAM_STYLE[row.fam].bar}`}
                  />
                  {/* Label stack: the badge + name line behaves exactly as
                      before (wraps on mobile, one line on desktop), with a
                      plain-language subtitle beneath it. The subtitle is
                      whitespace-normal and width-capped so it wraps to a
                      second line instead of widening the sticky column; the
                      15rem cap matches the widest existing label line, so
                      desktop column width is unchanged. Hover anywhere in
                      the stack for the scenario mechanism. */}
                  <div
                    className="flex max-w-[13rem] flex-col items-start gap-y-0.5 md:max-w-none"
                    title={row.driver}
                  >
                    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 md:flex-nowrap">
                      <Badge
                        variant="outline"
                        className={`px-1 py-0 font-mono text-[10px] font-medium uppercase tracking-wider ${FAM_STYLE[row.fam].badge}`}
                      >
                        {FAM_LABEL[row.fam]}
                      </Badge>
                      <span className="text-[13px] font-medium leading-snug text-foreground">
                        {row.label}
                      </span>
                    </span>
                    <span className="max-w-[13rem] whitespace-normal text-[11px] leading-snug text-muted-foreground md:max-w-[15rem]">
                      {PLAIN[row.key]}
                    </span>
                  </div>
                </TableCell>
                {CHECKPOINTS.map((cp) => {
                  const v = checkpointValue(row.key, series, cp.ym);
                  return (
                    <TableCell
                      key={cp.ym}
                      className="whitespace-nowrap px-1 py-1 text-right font-mono text-xs tabular-nums"
                    >
                      {v == null ? (
                        <span
                          className="text-muted-foreground/60"
                          title="No market: the series has ended in this scenario"
                        >
                          —
                        </span>
                      ) : (
                        <>
                          <span
                            className={
                              v >= PURCHASE_PRICE
                                ? 'font-medium text-foreground'
                                : 'text-foreground/75'
                            }
                            title={
                              v >= EXTREME_MARK
                                ? 'Extreme scenario value: the outer edge of these projections, not a prediction'
                                : v >= PURCHASE_PRICE
                                  ? `At or above the ${fmtDollars(PURCHASE_PRICE)} purchase price`
                                  : undefined
                            }
                          >
                            {fmtDollars(v)}
                          </span>
                          {/* Extreme-spike dagger: same amber hue as the AI
                              2040 family these cells belong to, explained in
                              the footnote. */}
                          {v >= EXTREME_MARK && (
                            <sup
                              aria-hidden="true"
                              className="ml-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300"
                            >
                              †
                            </sup>
                          )}
                        </>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Footnote */}
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Every value shown is a scenario projection. Recorded history ends{' '}
            {ymLabel(HIST_END)}. “—” means the consumer hardware market has
            ended in that scenario by that date. Hover a scenario for the
            mechanism behind its path.
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-amber-700 dark:text-amber-300">
              †
            </span>{' '}
            Marks the extreme spike cells. They come from the stretch years of
            the most aggressive scenarios, like the deal world where computing
            power is rationed and a Spark briefly costs as much as a car. Even
            inside those stories, prices crash back down soon after. These
            numbers are the outer edge of what the scenarios imagine, not a
            prediction.
          </p>
        </div>
      </div>
    </div>
  );
}
