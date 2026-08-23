'use client';

// Scenario matrix for the DGX Spark price tracker post. Rows are the seven
// scenarios (Badged by family: Baseline / AI 2027 / AI 2040), columns are the
// December checkpoints (2027 / 2028 / 2030 / 2032 / 2035 / 2040), and each
// cell is that scenario's projected price at the checkpoint via the shared
// data module. A small toggle flips the displayed series between the DGX
// Spark-class lowest price and the NVIDIA flagship street price; "—" marks a
// null (the consumer hardware market has ended in that scenario). All values
// are static scenario projections ported from the original tracker — nothing
// here is invented, fetched, or computed beyond interpolation already done in
// ./data. Pure semantic-token styling, so dark/light needs no theme read.

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

// Row label: the scenario name with the family prefix stripped (the badge
// carries it), mirroring the original tracker's matrix. Derived from the
// data's own strings — nothing new.
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Scenario matrix
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Projection
              </span>
            </div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              Projected price at each December checkpoint under all seven
              scenarios, in real 2025 dollars. Flip the series between the DGX
              Spark-class lowest price and the NVIDIA flagship street price.
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

        {/* Table (shadcn Table wraps in an overflow-auto div → scrolls on mobile) */}
        <Table
          className="min-w-[640px]"
          aria-label={`Projected ${SERIES_LABEL[series]} price by scenario at each December checkpoint`}
        >
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-card text-xs text-muted-foreground">
                Scenario
              </TableHead>
              {CHECKPOINTS.map((cp) => (
                <TableHead
                  key={cp.ym}
                  scope="col"
                  className="whitespace-nowrap p-2 text-right font-mono text-xs text-muted-foreground"
                >
                  {ymLabel(cp.ym)}
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
                  className="sticky left-0 z-10 whitespace-nowrap bg-card p-2 group-hover/row:bg-muted/50"
                >
                  <span
                    className="inline-flex items-baseline gap-2"
                    title={row.driver}
                  >
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {FAM_LABEL[row.fam]}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">
                      {row.label}
                    </span>
                  </span>
                </TableCell>
                {CHECKPOINTS.map((cp) => {
                  const v = checkpointValue(row.key, series, cp.ym);
                  return (
                    <TableCell
                      key={cp.ym}
                      className="whitespace-nowrap p-2 text-right font-mono text-sm tabular-nums text-foreground"
                    >
                      {v == null ? (
                        <span
                          className="text-muted-foreground/60"
                          title="No market — the series has ended in this scenario"
                        >
                          —
                        </span>
                      ) : (
                        fmtDollars(v)
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
            Every value shown is a scenario projection — recorded history ends{' '}
            {ymLabel(HIST_END)}. “—” means the consumer hardware market has
            ended in that scenario by that date. Hover a scenario for the
            mechanism behind its path.
          </p>
        </div>
      </div>
    </div>
  );
}
