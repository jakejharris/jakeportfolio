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

const COMPACT_X_TICKS: Ym[] = ['2018-01', HIST_END, '2035-01', FC_END];

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
  const [isCompactChart, setIsCompactChart] = useState(false);
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

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const updateCompactState = (width: number) => setIsCompactChart(width < 520);
    updateCompactState(element.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      updateCompactState(entry.contentRect.width);
    });

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
      className="my-8 w-full max-w-full overflow-hidden rounded-lg border-border bg-card shadow-none"
    >
      <CardHeader className="gap-4 border-b border-border p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <CardTitle className="text-base text-foreground sm:text-lg">
              DGX Spark price paths
            </CardTitle>
            <CardDescription className="mt-1 leading-relaxed">
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

        <div className="min-w-0 w-full sm:max-w-sm">
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
              className="h-11 w-full min-w-0 border-border bg-card text-foreground shadow-none [&>span]:truncate sm:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-2rem)] border-border bg-card text-foreground">
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

      <CardContent className="min-w-0 p-4 sm:p-5">
        <div className="mb-4 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center"
            aria-label="Visible price series"
          >
            <span className="col-span-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:col-auto sm:mr-1">
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
                  className={`inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:h-8 sm:w-auto sm:px-2.5 ${
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

          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Y scale
            </span>
            <div className="grid min-w-0 flex-1 grid-cols-2 rounded-lg border border-border bg-card p-0.5 sm:inline-flex sm:flex-none">
              {(['linear', 'log'] as const).map((mode) => {
                const active = scaleMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setScaleMode(mode)}
                    className={`h-11 rounded-md px-3 text-xs font-medium capitalize transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-7 sm:px-2.5 ${
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

        <div className="relative min-w-0 rounded-lg border border-border bg-card p-1 sm:p-3">
          <ChartContainer
            config={CHART_CONFIG}
            className="h-[360px] min-w-0 w-full aspect-auto text-[10px] sm:h-[440px] sm:text-xs"
          >
            <LineChart
              accessibilityLayer
              data={data}
              margin={
                isCompactChart
                  ? { top: 20, right: 16, bottom: 0, left: 0 }
                  : { top: 24, right: 12, bottom: 4, left: 4 }
              }
            >
              <CartesianGrid vertical={false} strokeDasharray="2 4" />
              <ReferenceArea
                x1={HIST_END}
                x2={FC_END}
                fill="hsl(var(--muted))"
                fillOpacity={isDark ? 0.5 : 0.8}
                ifOverflow="extendDomain"
                label={{
                  value: isCompactChart
                    ? 'PROJECTION'
                    : `PROJECTION — ${scenario.short.toUpperCase()}`,
                  position: 'insideTopRight',
                  fill: 'var(--accent-color)',
                  fontSize: isCompactChart ? 9 : 10,
                  fontFamily: 'var(--font-geist-mono)',
                  letterSpacing: isCompactChart ? 0.7 : 1,
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
                ticks={isCompactChart ? COMPACT_X_TICKS : X_TICKS}
                tickFormatter={formatXAxis}
                interval={isCompactChart ? 0 : 'preserveStartEnd'}
                tick={{ fontSize: isCompactChart ? 10 : 12 }}
                tickLine={false}
                axisLine={false}
                minTickGap={isCompactChart ? 8 : 20}
                tickMargin={isCompactChart ? 8 : 10}
                className="font-mono"
              />
              <YAxis
                scale={scaleMode === 'log' ? 'log' : 'linear'}
                domain={scaleMode === 'log' ? [10, 'auto'] : [0, 'auto']}
                tickFormatter={formatAxisPrice}
                tick={{ fontSize: isCompactChart ? 10 : 12 }}
                tickLine={false}
                axisLine={false}
                tickMargin={isCompactChart ? 4 : 5}
                width={isCompactChart ? 46 : 54}
                className="font-mono"
              />
              <ChartTooltip
                cursor={{
                  stroke: 'hsl(var(--muted-foreground))',
                  strokeOpacity: 0.45,
                }}
                allowEscapeViewBox={{ x: false, y: false }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    className="max-w-[calc(100vw-3rem)] px-2 py-1.5 text-[11px] sm:px-2.5 sm:text-xs"
                    labelFormatter={(label) => formatMonth(String(label))}
                    formatter={(value, name, item) => (
                      <div className="flex w-full min-w-[8rem] max-w-[calc(100vw-5rem)] items-center justify-between gap-3 sm:min-w-[9rem] sm:gap-4">
                        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <span
                            className="h-2 w-2 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                          />
                          {String(name)}
                        </span>
                        <span className="shrink-0 font-mono font-medium tabular-nums text-foreground">
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
              <span className="mx-4 max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-center text-sm text-muted-foreground">
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
