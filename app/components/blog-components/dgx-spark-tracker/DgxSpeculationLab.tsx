'use client';

// Speculation lab — the "buy a DGX Spark and sell it into the squeeze" trade,
// priced as a five-branch expected-value tree. Ported from the standalone
// tracker's `specCompute()` (rotary knobs → shadcn sliders, same arithmetic).
//
// The tree is resale-only on a ~5-year horizon: usage value is deliberately
// excluded, because that is the part of the purchase that does not need luck.
// Every constant below comes from the source artifact; nothing is invented.

import { useMemo, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Slider } from '@/app/components/ui/slider';

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
    label: 'Purchase price',
    note: 'What you pay per unit today (partner GB10 ≈ $3.0–3.3k)',
    min: 2500,
    max: 5500,
    step: 100,
    fmt: usd,
  },
  {
    key: 'pT',
    label: 'P fast takeoff',
    note: 'AI 2027-style takeoff by ~2028',
    min: 0,
    max: 60,
    step: 1,
    fmt: pct,
  },
  {
    key: 'pB',
    label: 'P big buildout',
    note: 'AI 2040-style squeeze, no takeoff yet',
    min: 0,
    max: 80,
    step: 1,
    fmt: pct,
  },
  {
    key: 'pCap',
    label: 'P cap regime',
    note: 'Plan A-style edge-compute caps (grandfathered units)',
    min: 0,
    max: 30,
    step: 1,
    fmt: pct,
  },
  {
    key: 'pRuin',
    label: 'P ruin | takeoff',
    note: 'Takeoff ends the market before you sell',
    min: 0,
    max: 100,
    step: 5,
    fmt: pct,
  },
  {
    key: 'exec',
    label: 'Execution odds',
    note: 'You actually sell inside the spike window',
    min: 0,
    max: 100,
    step: 5,
    fmt: pct,
  },
  {
    key: 'exSpike',
    label: 'Spike exit',
    note: 'Sale price in an ordinary squeeze',
    min: 5000,
    max: 20000,
    step: 500,
    fmt: kUsd,
  },
  {
    key: 'exCap',
    label: 'Cap exit',
    note: 'Sale price under a cap regime',
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
      name: 'Baseline — sell a 2-gen-old box',
      p: pBase * (1 - SHOCK_SHARE),
      exit: EXIT_BASELINE,
    },
    {
      name: 'Baseline + memory shock',
      p: pBase * SHOCK_SHARE,
      exit: exec * v.exSpike * SHOCK_DISCOUNT + (1 - exec) * EXIT_BASELINE,
    },
    {
      name: 'Squeeze spike, no cap',
      p: spike,
      exit: exec * v.exSpike + (1 - exec) * EXIT_MISSED,
    },
    {
      name: 'Cap regime (grandfathered)',
      p: cap,
      exit: exec * v.exCap + (1 - exec) * v.exSpike * CAP_MISS_DISCOUNT,
    },
    { name: 'Market ends first', p: ruin, exit: 0 },
  ].map((b) => ({ ...b, contrib: (b.exit - price) * b.p }));

  const ev = branches.reduce((acc, b) => acc + b.p * b.exit, 0) - price;
  const pProfit = branches.reduce((acc, b) => acc + (b.exit > price ? b.p : 0), 0);

  return { branches, ev, pProfit, price };
}

const signedUsd = (v: number) =>
  (v >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US');

export default function DgxSpeculationLab() {
  const [values, setValues] = useState<Record<DialKey, number>>(DEFAULTS);

  // Hydration-safe theme read (house pattern) — used only to soften the
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

  return (
    <div className="my-8 rounded-lg border border-border bg-card text-card-foreground">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight">Speculation lab</h3>
          <button
            type="button"
            onClick={() => setValues(DEFAULTS)}
            disabled={isDefault}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          >
            Reset to report defaults
          </button>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The sell-before-the-crash trade, priced. Turn the dials to set your own
          odds and exits; the five-branch tree and expected resale profit update
          live. Defaults are the report&rsquo;s assumptions.
        </p>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Dials */}
        <div className="space-y-4">
          {DIALS.map((d) => (
            <div key={d.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span
                  id={`dgx-dial-${d.key}-label`}
                  className="text-sm font-medium text-foreground"
                >
                  {d.label}
                </span>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {d.fmt(values[d.key])}
                </span>
              </div>
              <Slider
                aria-label={d.label}
                aria-labelledby={`dgx-dial-${d.key}-label`}
                className="mt-2"
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

        {/* Outputs */}
        <div>
          <div className="rounded-lg bg-muted/50 p-4">
            <div
              className="font-mono text-4xl font-semibold tabular-nums"
              style={{ color: ev >= 0 ? 'var(--accent-color)' : 'hsl(var(--destructive))' }}
            >
              {signedUsd(ev)}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              expected resale profit per unit, ~5-year horizon, ignoring usage
              value ·{' '}
              <span className="font-mono text-foreground">
                {Math.round(pProfit * 100)}%
              </span>{' '}
              chance of any resale profit
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>Branch</span>
              <span>P → exit · contribution</span>
            </div>
            <div className="space-y-3">
              {branches.map((b) => (
                <div key={b.name}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-sm text-foreground">{b.name}</span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {Math.round(b.p * 100)}% → {usd(b.exit)} ·{' '}
                      <span
                        style={{
                          color:
                            b.contrib >= 0
                              ? 'var(--accent-color)'
                              : 'hsl(var(--destructive))',
                        }}
                      >
                        {signedUsd(b.contrib)}
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

          <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            Contribution is <span className="font-mono">(exit − {usd(price)}) × P</span>,
            so every branch is measured against what you paid. Usage value is
            deliberately excluded — it is the part that does not need luck.
          </p>
        </div>
      </div>
    </div>
  );
}
