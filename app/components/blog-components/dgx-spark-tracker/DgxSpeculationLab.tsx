'use client';

// Speculation lab: the "buy a DGX Spark and sell it into the squeeze" trade,
// priced as a five-branch expected-value tree. Ported from the standalone
// tracker's `specCompute()` (rotary knobs → shadcn sliders, same arithmetic).
//
// The tree is resale-only on a ~5-year horizon: usage value is deliberately
// excluded, because that is the part of the purchase that does not need luck.
// Every constant below comes from the source artifact; nothing is invented.

import { useMemo, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { CircleHelp } from 'lucide-react';
import { Slider } from '@/app/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

// --- Fixed assumptions from the source model (not user-adjustable) ---
const EXIT_BASELINE = 2800; // resale of a two-generation-old box, no shock
const EXIT_MISSED = 1200; // you missed the spike window and sold late
const SHOCK_SHARE = 0.05; // share of the baseline world that still gets a memory shock
const SHOCK_DISCOUNT = 0.8; // a baseline memory shock clears at 80% of a full spike exit
const CAP_MISS_DISCOUNT = 0.5; // missing the cap window still leaves half a spike exit

// --- Dials ---
type DialKey =
  | 'price'
  | 'pT'
  | 'pB'
  | 'pCap'
  | 'pRuin'
  | 'exec'
  | 'exSpike'
  | 'exCap';

type Dial = {
  key: DialKey;
  label: string;
  technicalTerm: string;
  note: string;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
};

const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
const kUsd = (v: number) => '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
const pct = (v: number) => v + '%';

const DIALS: Dial[] = [
  {
    key: 'price',
    label: 'Price you pay',
    technicalTerm: 'Purchase price',
    note: 'What one box costs today. Similar GB10 systems cost about $3,000 to $3,300.',
    min: 2500,
    max: 5500,
    step: 100,
    fmt: usd,
  },
  {
    key: 'pT',
    label: 'Chance AI booms fast',
    technicalTerm: 'P(fast takeoff)',
    note: 'Your odds that AI demand surges by about 2028.',
    min: 0,
    max: 60,
    step: 1,
    fmt: pct,
  },
  {
    key: 'pB',
    label: 'Chance AI buildout strains supply',
    technicalTerm: 'P(big buildout)',
    note: 'Your odds of a huge AI hardware buildout without a sudden breakthrough.',
    min: 0,
    max: 80,
    step: 1,
    fmt: pct,
  },
  {
    key: 'pCap',
    label: 'Chance compute gets rationed',
    technicalTerm: 'P(cap regime)',
    note: 'Your odds that governments limit privately owned computing power.',
    min: 0,
    max: 30,
    step: 1,
    fmt: pct,
  },
  {
    key: 'pRuin',
    label: 'If AI booms, chance the market ends',
    technicalTerm: 'P(ruin | fast takeoff)',
    note: 'If AI booms fast, the chance there is no resale market left before you sell.',
    min: 0,
    max: 100,
    step: 5,
    fmt: pct,
  },
  {
    key: 'exec',
    label: 'Chance you sell in time',
    technicalTerm: 'Execution odds',
    note: 'Your odds of selling while prices are still high.',
    min: 0,
    max: 100,
    step: 5,
    fmt: pct,
  },
  {
    key: 'exSpike',
    label: 'Sell price during a shortage',
    technicalTerm: 'Spike exit',
    note: 'What you could sell the box for during an ordinary hardware shortage.',
    min: 5000,
    max: 20000,
    step: 500,
    fmt: kUsd,
  },
  {
    key: 'exCap',
    label: 'Sell price if compute gets rationed',
    technicalTerm: 'Cap exit',
    note: 'What you could sell the box for if existing units become scarce under rationing.',
    min: 5000,
    max: 45000,
    step: 1000,
    fmt: kUsd,
  },
];

const DEFAULTS: Record<DialKey, number> = {
  price: 4699,
  pT: 10,
  pB: 35,
  pCap: 5,
  pRuin: 30,
  exec: 60,
  exSpike: 8000,
  exCap: 16500,
};

// --- The tree ---
type Branch = { name: string; p: number; exit: number; contrib: number };

function specCompute(v: Record<DialKey, number>) {
  const price = v.price;
  let pT = v.pT / 100;
  let pB = v.pB / 100;
  const pCapDial = v.pCap / 100;
  const pRuin = v.pRuin / 100;
  const exec = v.exec / 100;

  // Takeoff and buildout are mutually exclusive worlds; if the dials oversubscribe
  // probability mass, rescale them proportionally rather than clipping one.
  if (pT + pB > 1) {
    const scale = 1 / (pT + pB);
    pT *= scale;
    pB *= scale;
  }
  const pBase = Math.max(0, 1 - pT - pB);

  const ruin = pT * pRuin; // takeoff, market gone before you sell
  const surviving = pT * (1 - pRuin) + pB; // squeeze worlds you live to trade in
  const cap = Math.min(pCapDial, surviving); // a cap regime is a subset of those
  const spike = Math.max(0, surviving - cap);

  const branches: Branch[] = [
    {
      name: 'Normal market: sell an older box',
      p: pBase * (1 - SHOCK_SHARE),
      exit: EXIT_BASELINE,
    },
    {
      name: 'Normal market with a memory shortage',
      p: pBase * SHOCK_SHARE,
      exit: exec * v.exSpike * SHOCK_DISCOUNT + (1 - exec) * EXIT_BASELINE,
    },
    {
      name: 'Hardware shortage without rationing',
      p: spike,
      exit: exec * v.exSpike + (1 - exec) * EXIT_MISSED,
    },
    {
      name: 'Compute is rationed and your box is allowed',
      p: cap,
      exit: exec * v.exCap + (1 - exec) * v.exSpike * CAP_MISS_DISCOUNT,
    },
    { name: 'The resale market ends first', p: ruin, exit: 0 },
  ].map((b) => ({ ...b, contrib: (b.exit - price) * b.p }));

  const ev = branches.reduce((acc, b) => acc + b.p * b.exit, 0) - price;
  const pProfit = branches.reduce((acc, b) => acc + (b.exit > price ? b.p : 0), 0);

  return { branches, ev, pProfit, price };
}

const signedUsd = (v: number) =>
  (v >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US');

export default function DgxSpeculationLab() {
  const [values, setValues] = useState<Record<DialKey, number>>(DEFAULTS);

  // Hydration-safe theme read (house pattern), used only to soften the
  // contribution bars in light mode, where full-strength fills read too loud.
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const barOpacity = isDark ? 0.85 : 0.7;

  const { branches, ev, pProfit, price } = useMemo(
    () => specCompute(values),
    [values]
  );

  const maxAbs = Math.max(...branches.map((b) => Math.abs(b.contrib)), 1);
  const isDefault = (Object.keys(DEFAULTS) as DialKey[]).every(
    (k) => values[k] === DEFAULTS[k]
  );
  const takeaway =
    ev >= 0
      ? `At these settings, the resale bet averages a ${usd(ev)} profit, but it still depends on an uncertain future.`
      : `At these settings, the resale bet averages a ${usd(Math.abs(ev))} loss. Buy the box to use, not to flip.`;

  return (
    <div className="my-8 rounded-lg border border-border bg-card text-card-foreground">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight">Speculation lab</h3>
          <button
            type="button"
            onClick={() => setValues(DEFAULTS)}
            disabled={isDefault}
            className="w-full rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 sm:w-auto sm:px-2.5 sm:py-1"
          >
            Reset to report defaults
          </button>
        </div>
        <div className="mt-2 max-w-3xl space-y-1.5 text-sm leading-relaxed">
          <p className="text-foreground">
            <span className="font-medium">What this is:</span> A calculator for
            whether buying a DGX Spark now and reselling it later is worth the bet.
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">How to use it:</span>{' '}
            Drag the sliders to set your own odds and prices. At the default settings,
            the average result is about a $571 loss, which is why the honest answer is
            to buy it to use, not to flip.
          </p>
        </div>
      </div>

      <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Dials */}
        <TooltipProvider delayDuration={250}>
          <div className="min-w-0 space-y-4">
            {DIALS.map((d) => (
              <div key={d.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      id={`dgx-dial-${d.key}-label`}
                      className="text-sm font-medium text-foreground"
                    >
                      {d.label}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Technical term: ${d.technicalTerm}`}
                        >
                          <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Technical term: {d.technicalTerm}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                    {d.fmt(values[d.key])}
                  </span>
                </div>
                <Slider
                  aria-label={d.label}
                  aria-labelledby={`dgx-dial-${d.key}-label`}
                  className="mt-2 py-2 sm:py-0 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 sm:[&_[role=slider]]:h-4 sm:[&_[role=slider]]:w-4"
                  min={d.min}
                  max={d.max}
                  step={d.step}
                  value={[values[d.key]]}
                  onValueChange={([v]) =>
                    setValues((prev) => ({ ...prev, [d.key]: v }))
                  }
                />
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  {d.note}
                </p>
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Outputs */}
        <div className="min-w-0">
          <div className="rounded-lg bg-muted/50 p-4">
            <div
              className="break-words font-mono text-3xl font-semibold tabular-nums sm:text-4xl"
              style={{ color: ev >= 0 ? 'var(--accent-color)' : 'hsl(var(--destructive))' }}
            >
              {signedUsd(ev)}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              average resale gain or loss for one box over about five years. This
              does not count the value of using it.{' '}
              <span className="font-mono text-foreground">
                {Math.round(pProfit * 100)}%
              </span>{' '}
              chance of any resale profit
            </p>
            <p className="mt-3 border-t border-border pt-3 text-sm font-medium leading-relaxed text-foreground">
              {takeaway}
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex flex-col gap-0.5 text-xs uppercase tracking-wide text-muted-foreground sm:flex-row sm:items-baseline sm:justify-between">
              <span>Possible outcome</span>
              <span>Odds · sale price · effect on average</span>
            </div>
            <div className="space-y-3">
              {branches.map((b) => (
                <div key={b.name}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="min-w-0 text-sm text-foreground">{b.name}</span>
                    <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                      {Math.round(b.p * 100)}% chance · {usd(b.exit)} sale ·{' '}
                      <span
                        style={{
                          color:
                            b.contrib >= 0
                              ? 'var(--accent-color)'
                              : 'hsl(var(--destructive))',
                        }}
                      >
                        {signedUsd(b.contrib)} avg.
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(Math.abs(b.contrib) / maxAbs) * 100}%`,
                        opacity: barOpacity,
                        backgroundColor:
                          b.contrib >= 0
                            ? 'var(--accent-color)'
                            : 'hsl(var(--destructive))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <details className="group mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            <summary className="w-fit cursor-pointer rounded-sm font-medium underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              How the math works
            </summary>
            <p className="mt-2 leading-relaxed">
              Each outcome&rsquo;s effect is{' '}
              <span className="font-mono">(sale price − {usd(price)}) × chance</span>,
              so every outcome is measured against what you paid. Usage value is
              deliberately excluded because it is the part that does not need luck.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
