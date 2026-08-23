'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/app/components/ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

import {
  FC_END,
  HIST_END,
  SCENARIOS,
  seriesForScenario,
  type ScenarioKey,
  type Ym,
} from './data';

type PriceSeries = 'nvidia' | 'amd' | 'intel' | 'spark';
type ScaleMode = 'linear' | 'log';

const SERIES: ReadonlyArray<{
  key: PriceSeries;
  label: string;
  color: string;
}> = [
  { key: 'nvidia', label: 'NVIDIA', color: 'hsl(var(--chart-1))' },
  { key: 'amd', label: 'AMD', color: 'hsl(var(--chart-2))' },
  { key: 'intel', label: 'Intel', color: 'hsl(var(--chart-3))' },
  { key: 'spark', label: 'Spark', color: 'hsl(var(--chart-4))' },
];

const CHART_CONFIG = {
  nvidia: { label: 'NVIDIA', color: 'hsl(var(--chart-1))' },
  amd: { label: 'AMD', color: 'hsl(var(--chart-2))' },
  intel: { label: 'Intel', color: 'hsl(var(--chart-3))' },
  spark: { label: 'DGX Spark', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

const X_TICKS: Ym[] = [
  '2018-01',
  '2022-01',
  HIST_END,
  '2030-01',
  '2035-01',
  FC_END,
];

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAxisPrice(value: number): string {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `$${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }
  return `$${value}`;
}

function formatMonth(ym: Ym): string {
  const [year, month] = ym.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function formatXAxis(ym: Ym): string {
  return ym === HIST_END ? "Aug '26" : ym.slice(0, 4);
}

export default function DgxPriceChart() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('planA');
  const [scaleMode, setScaleMode] = useState<ScaleMode>('linear');
  const [visibleSeries, setVisibleSeries] = useState<Record<PriceSeries, boolean>>({
    nvidia: true,
    amd: true,
    intel: true,
    spark: true,
  });
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const data = useMemo(() => seriesForScenario(scenarioKey), [scenarioKey]);
  const scenario = SCENARIOS.find((item) => item.key === scenarioKey) ?? SCENARIOS[0];
  const isDark = mounted && resolvedTheme === 'dark';
  const animateLines = mounted && isVisible && !prefersReducedMotion;
  const hasVisibleSeries = SERIES.some(({ key }) => visibleSeries[key]);

  const toggleSeries = (key: PriceSeries) => {
    setVisibleSeries((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <Card
      ref={rootRef}
      className="my-8 overflow-hidden rounded-lg border-border bg-card shadow-none"
    >
      <CardHeader className="gap-4 border-b border-border p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <CardTitle className="text-base text-foreground sm:text-lg">
              DGX Spark price paths
            </CardTitle>
            <CardDescription className="mt-1">
              US street prices in real 2025 dollars · historical through Aug 2026
            </CardDescription>
          </div>
          <span
            className="mt-1 inline-flex w-fit items-center rounded-md border border-border px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em]"
            style={{ color: 'var(--accent-color)' }}
          >
            Projection
          </span>
        </div>

        <div className="w-full sm:max-w-sm">
          <label
            htmlFor="price-projection-scenario"
            className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
          >
            Price projection scenario
          </label>
          <Select
            value={scenarioKey}
            onValueChange={(value) => setScenarioKey(value as ScenarioKey)}
          >
            <SelectTrigger
              id="price-projection-scenario"
              className="w-full border-border bg-card text-foreground shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-card text-foreground">
              {SCENARIOS.map((item) => (
                <SelectItem
                  key={item.key}
                  value={item.key}
                  className="focus:bg-muted focus:text-foreground"
                >
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
          {scenario.desc}
        </p>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2" aria-label="Visible price series">
            <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Series
            </span>
            {SERIES.map((item) => {
              const active = visibleSeries[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSeries(item.key)}
                  className={`inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                    active
                      ? 'border-border bg-muted text-foreground'
                      : 'border-border bg-card text-muted-foreground opacity-60'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Y scale
            </span>
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
              {(['linear', 'log'] as const).map((mode) => {
                const active = scaleMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setScaleMode(mode)}
                    className={`h-7 rounded-md px-2.5 text-xs font-medium capitalize transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? 'bg-[var(--accent-color)] text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative rounded-lg border border-border bg-card p-2 sm:p-3">
          <ChartContainer
            config={CHART_CONFIG}
            className="h-[360px] w-full aspect-auto sm:h-[440px]"
          >
            <LineChart
              accessibilityLayer
              data={data}
              margin={{ top: 24, right: 12, bottom: 4, left: 4 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="2 4" />
              <ReferenceArea
                x1={HIST_END}
                x2={FC_END}
                fill="hsl(var(--muted))"
                fillOpacity={isDark ? 0.5 : 0.8}
                ifOverflow="extendDomain"
                label={{
                  value: `PROJECTION — ${scenario.short.toUpperCase()}`,
                  position: 'insideTopRight',
                  fill: 'var(--accent-color)',
                  fontSize: 10,
                  fontFamily: 'var(--font-geist-mono)',
                  letterSpacing: 1,
                }}
              />
              <ReferenceLine
                x={HIST_END}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
              />
              <XAxis
                dataKey="ym"
                ticks={X_TICKS}
                tickFormatter={formatXAxis}
                tickLine={false}
                axisLine={false}
                minTickGap={20}
                tickMargin={10}
                className="font-mono"
              />
              <YAxis
                scale={scaleMode === 'log' ? 'log' : 'linear'}
                domain={scaleMode === 'log' ? [10, 'auto'] : [0, 'auto']}
                tickFormatter={formatAxisPrice}
                tickLine={false}
                axisLine={false}
                width={54}
                className="font-mono"
              />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.45 }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(label) => formatMonth(String(label))}
                    formatter={(value, name, item) => (
                      <div className="flex min-w-[9rem] items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span
                            className="h-2 w-2 rounded-[2px]"
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                          />
                          {String(name)}
                        </span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {typeof value === 'number' ? formatCurrency(value) : String(value)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              {SERIES.map((item) =>
                visibleSeries[item.key] ? (
                  <Line
                    key={item.key}
                    type="linear"
                    dataKey={item.key}
                    name={item.key === 'spark' ? 'DGX Spark' : item.label}
                    stroke={`var(--color-${item.key})`}
                    strokeWidth={item.key === 'spark' ? 2.5 : 1.75}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    connectNulls={false}
                    isAnimationActive={animateLines}
                    animationDuration={550}
                  />
                ) : null
              )}
            </LineChart>
          </ChartContainer>

          {!hasVisibleSeries && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                Select at least one series to draw a price path.
              </span>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Lines left of the dashed boundary are recorded or interpolated historical street prices.
          Values to the right are scenario projections; a missing line means that scenario’s market has ended.
        </p>
      </CardContent>
    </Card>
  );
}
