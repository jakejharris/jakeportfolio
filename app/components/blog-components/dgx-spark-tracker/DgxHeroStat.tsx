'use client';

// DGX Spark Tracker — at-a-glance "key facts" card that opens the interactive
// section. Surfaces the fixed figures the rest of the tracker hangs on: the
// Spark FE reprice ($3,999 → $4,699 in Feb 2026), the ASUS GX10 partner MSRP,
// the end-2028 real-flat resale hurdles, today's street range, and the first
// verified sold comp. Numbers count up when the card scrolls into view, with a
// static fallback under prefers-reduced-motion. All figures are FIXED corpus
// values (see BUILDERS-BRIEF.md) — no fetch, no props, no ./data dependency.

import { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

// --- Count-up helpers ---
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function useCountUp(
  target: number,
  started: boolean,
  reducedMotion: boolean,
  durationMs = 900
): number {
  const [value, setValue] = useState(reducedMotion ? target : 0);

  useEffect(() => {
    if (reducedMotion) {
      setValue(target);
      return;
    }
    if (!started) return;

    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / durationMs, 1);
      setValue(Math.round(easeOutCubic(p) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target, reducedMotion, durationMs]);

  return value;
}

const fmtUsd = (n: number) => `$${n.toLocaleString('en-US')}`;

// --- Fixed figures (do not edit without updating the article + brief) ---
const SPARK_MSRP = 4699;
const SPARK_LAUNCH = 3999;
const GX10_MSRP = 3999;
const HURDLE_SPARK_2028 = 4922; // ~ nominal resale for real-flat, end-2028
const HURDLE_GX10_2028 = 4189; //  ~ nominal resale for real-flat, end-2028
const STREET_LOW = 4999;
const STREET_HIGH = 5449;
const SOLD_COMP_PCT = 97; // ~% of MSRP on first verified sold listing

export default function DgxHeroStat() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Hydration-safe mount gate, used to stage the entrance. Dark/light needs no
  // branching here: everything is semantic Tailwind tokens + var(--accent-color).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Reduced motion detection ---
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // --- Scroll-in trigger (one-shot) ---
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const started = inView || prefersReducedMotion;
  const entered = mounted && (inView || prefersReducedMotion);

  const spark = useCountUp(SPARK_MSRP, started, prefersReducedMotion);
  const gx10 = useCountUp(GX10_MSRP, started, prefersReducedMotion);
  const hurdleSpark = useCountUp(
    HURDLE_SPARK_2028,
    started,
    prefersReducedMotion,
    1000
  );
  const hurdleGx10 = useCountUp(
    HURDLE_GX10_2028,
    started,
    prefersReducedMotion,
    1000
  );
  const streetLow = useCountUp(STREET_LOW, started, prefersReducedMotion, 1100);
  const streetHigh = useCountUp(
    STREET_HIGH,
    started,
    prefersReducedMotion,
    1100
  );
  const soldComp = useCountUp(SOLD_COMP_PCT, started, prefersReducedMotion, 800);

  return (
    <div ref={rootRef} className="my-8">
      <Card
        className="rounded-lg shadow-sm transition-all duration-500 ease-out"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'none' : 'translateY(12px)',
          transition: prefersReducedMotion ? 'none' : undefined,
        }}
      >
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg tracking-tight">
              DGX Spark price tracker — key facts
            </CardTitle>
            <Badge variant="outline" className="font-mono uppercase">
              As of Feb 2026 reprice
            </Badge>
          </div>
          <CardDescription>
            The five numbers every scenario below is anchored to.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Featured stat: Spark FE reprice */}
          <div className="rounded-lg border border-border bg-muted/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  DGX Spark Founders Edition · current MSRP
                </p>
                <p className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                  {fmtUsd(spark)}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                  Launched at{' '}
                  <span className="font-mono tabular-nums">
                    {fmtUsd(SPARK_LAUNCH)}
                  </span>{' '}
                  in Oct 2025; raised amid memory constraints.
                </p>
              </div>
              <Badge
                variant="secondary"
                className="font-mono tabular-nums"
                style={{ color: 'var(--accent-color)' }}
              >
                +17.5% · Feb 2026
              </Badge>
            </div>
          </div>

          {/* Stat grid */}
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <dt className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                ASUS Ascent GX10 · MSRP
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                {fmtUsd(gx10)}
              </dd>
              <dd className="mt-1 text-xs text-muted-foreground">
                Partner GB10 alternative to the FE.
              </dd>
            </div>

            <div className="rounded-lg border border-border p-4">
              <dt className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                End-2028 real-flat hurdle
              </dt>
              <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                <span className="whitespace-nowrap">
                  ~{fmtUsd(hurdleSpark)}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    Spark
                  </span>
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="whitespace-nowrap">
                  ~{fmtUsd(hurdleGx10)}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    GX10
                  </span>
                </span>
              </dd>
              <dd className="mt-1 text-xs text-muted-foreground">
                Nominal resale needed to break even in real terms.
              </dd>
            </div>

            <div className="rounded-lg border border-border p-4">
              <dt className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Current street
              </dt>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                {fmtUsd(streetLow)}–{fmtUsd(streetHigh)}
              </dd>
              <dd className="mt-1 text-xs text-muted-foreground">
                Asking range across tracked retailers.
              </dd>
            </div>

            <div className="rounded-lg border border-border p-4">
              <dt className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                First verified sold comp
              </dt>
              <dd
                className="mt-1 font-mono text-xl font-semibold tabular-nums sm:text-2xl"
                style={{ color: 'var(--accent-color)' }}
              >
                ~{soldComp}%{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  of MSRP
                </span>
              </dd>
              <dd className="mt-1 text-xs text-muted-foreground">
                The only confirmed resale transaction to date.
              </dd>
            </div>
          </dl>
        </CardContent>

        <CardFooter className="pt-2">
          <p className="text-xs text-muted-foreground">
            Spark FE launched Oct 15, 2025 at{' '}
            <span className="font-mono tabular-nums">{fmtUsd(SPARK_LAUNCH)}</span>
            ; MSRP raised to{' '}
            <span className="font-mono tabular-nums">{fmtUsd(SPARK_MSRP)}</span>{' '}
            the week of Feb 23, 2026. Street prices and the sold comp are
            snapshots, not quotes.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
